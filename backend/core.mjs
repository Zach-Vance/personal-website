import { portfolioAnswer } from "../assets/conversation.mjs";
import { readEvents } from "../assets/stream.mjs";
import { evidence } from "../assets/knowledge.mjs";
import { readQuestion } from "./request.mjs";
import {
  baseHeaders,
  frame,
  sseResponse,
  staticAnswerResponse,
} from "./sse.mjs";
import { requestCompletion } from "./upstream.mjs";
import { MAX_ANSWER_CHARS, assertAnswerAllowed } from "./guardrails.mjs";

const UPSTREAM_TIMEOUT_MS = 25000;

// Lead with retrieved evidence but let broad portfolio questions draw on the
// whole public corpus. Keep named-project questions within their own scope.
function selectDocs(answerPlan) {
  if (
    answerPlan.kind !== "evidence" ||
    /\b(setwise|mesonet|super sod)\b/.test(answerPlan.query)
  )
    return answerPlan.docs;
  return [
    ...answerPlan.docs,
    ...evidence.filter(
      (doc) => !answerPlan.docs.some((selected) => selected.id === doc.id),
    ),
  ];
}

// Streams validated model text to the browser. Any provider failure or
// guardrail rejection becomes a single `error` event so the page can fall back
// to local evidence.
function streamModelAnswer(upstream, docs, headers, abort, cleanup) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          frame({ type: "sources", ids: docs.map((doc) => doc.id) }),
        );
        let complete = false;
        let answer = "";
        for await (const event of readEvents(upstream.body)) {
          if (event.type === "response.output_text.delta") {
            if (typeof event.delta !== "string")
              throw new Error("Invalid text event");
            answer += event.delta;
            if (answer.length > MAX_ANSWER_CHARS)
              throw new Error("Answer exceeds limit");
            controller.enqueue(frame({ type: "delta", text: event.delta }));
          } else if (event.type === "response.completed") complete = true;
          else if (
            ["response.failed", "response.incomplete", "error"].includes(
              event.type,
            )
          )
            throw new Error("Generation failed");
        }
        if (!complete) throw new Error("Incomplete generation");
        assertAnswerAllowed(answer, docs);
        controller.enqueue(frame({ type: "done" }));
        controller.close();
      } catch (reason) {
        // Reasons are static strings; never log question or answer text.
        console.error("portfolio_ai_stream_rejected", {
          reason: reason instanceof Error ? reason.message : "unknown",
        });
        try {
          controller.enqueue(frame({ type: "error" }));
          controller.close();
        } catch {
          /* client disconnected */
        }
      } finally {
        cleanup();
      }
    },
    cancel() {
      abort.abort();
      cleanup();
    },
  });
  return sseResponse(stream, headers);
}

export function createHandler(upstreamFetch = fetch) {
  return async function handle(request, env) {
    const origin = request.headers.get("Origin");
    const headers = baseHeaders(env);
    const error = (status, message) =>
      Response.json({ error: message }, { status, headers });
    if (!origin || origin !== env.ALLOWED_ORIGIN)
      return error(403, "Origin not allowed.");
    if (new URL(request.url).pathname !== (env.ASK_PATH || "/ask"))
      return error(404, "Not found.");
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return error(405, "Use POST.");
    if (
      !(env.API_TOKEN || env.OPENAI_API_KEY) ||
      !(env.MODEL || env.OPENAI_MODEL) ||
      !env.ASK_LIMITER ||
      !env.SITE_LIMITER
    )
      return error(503, "AI answers are not configured.");
    let question, history;
    try {
      ({ question, history } = await readQuestion(request));
    } catch {
      return error(
        400,
        "Send a question of 1–600 characters and up to four recent questions as JSON.",
      );
    }
    const answerPlan = portfolioAnswer(question, history);
    const docs = selectDocs(answerPlan);
    if (!["evidence", "discovery"].includes(answerPlan.kind))
      return staticAnswerResponse(docs, answerPlan.text, headers);

    const ip = env.clientKey
      ? env.clientKey(request)
      : request.headers.get("CF-Connecting-IP");
    if (!ip) return error(403, "Client identity unavailable.");
    try {
      if (
        !(await env.ASK_LIMITER.limit({ key: ip })).success ||
        !(await env.SITE_LIMITER.limit({ key: "portfolio" })).success
      )
        return error(429, "Please try again in a minute.");
    } catch {
      return error(503, "Please try again later.");
    }

    const abort = new AbortController();
    const onAbort = () => abort.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) onAbort();
    const timeout = setTimeout(onAbort, UPSTREAM_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      request.signal.removeEventListener("abort", onAbort);
    };
    let upstream;
    try {
      upstream = await requestCompletion({
        upstreamFetch,
        env,
        signal: abort.signal,
        question,
        reference: answerPlan.query,
        docs,
      });
      if (!upstream.ok || !upstream.body) {
        console.error("portfolio_ai_upstream_failure", {
          status: upstream.status,
        });
        await upstream.body?.cancel();
        cleanup();
        return error(502, "AI service unavailable.");
      }
    } catch {
      cleanup();
      return error(502, "AI service unavailable.");
    }
    return streamModelAnswer(upstream, docs, headers, abort, cleanup);
  };
}
