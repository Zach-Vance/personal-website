import {
  portfolioAnswer,
  API_CONTRACT_VERSION,
} from "../assets/conversation.mjs";
import { readEvents } from "../assets/stream.mjs";
import { hasValidCitations } from "../assets/answer.mjs";
import { evidence } from "../assets/knowledge.mjs";
import { startCallLog } from "./call-log.mjs";
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
// whole public corpus. Keep named projects and workflow AI questions focused.
function selectDocs(answerPlan) {
  if (
    answerPlan.kind !== "evidence" ||
    /\b(setwise|mesonet|super sod|portfolio|website|chatbot|assistant|this site|personal site)\b/.test(
      answerPlan.query,
    ) ||
    answerPlan.docs.every((doc) =>
      ["ai-reconciliation", "portfolio-agent"].includes(doc.id),
    )
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
// to local evidence. `call.finish` records only the first outcome.
function streamModelAnswer({ upstream, docs, headers, abort, cleanup, call }) {
  let answer = "";
  let complete = false;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          frame({ type: "sources", ids: docs.map((doc) => doc.id) }),
        );
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
        call.finish({
          status: 200,
          outcome: "completed",
          accepted: true,
          citationsValid: true,
          providerCompleted: true,
          response: answer,
        });
      } catch (reason) {
        // Reasons are static strings; never log question or answer text here.
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
        call.finish({
          status: 200,
          outcome: abort.signal.aborted ? "aborted_or_timeout" : "stream_error",
          accepted: false,
          providerCompleted: complete,
          citationsValid: hasValidCitations(answer, docs.length),
          response: answer,
        });
        cleanup();
      }
    },
    cancel() {
      call.finish({
        status: 200,
        outcome: "cancelled",
        accepted: false,
        response: answer,
      });
      abort.abort();
      cleanup();
    },
  });
  return sseResponse(stream, headers);
}

export function createHandler(upstreamFetch = fetch, logCall = () => {}) {
  return async function handle(request, env) {
    const call = startCallLog(logCall);
    call.context.apiVersion = API_CONTRACT_VERSION;
    const origin = request.headers.get("Origin");
    const headers = baseHeaders(env);
    const error = (status, message) => {
      call.finish({ status, outcome: `http_${status}`, response: message });
      return Response.json({ error: message }, { status, headers });
    };
    if (!origin || origin !== env.ALLOWED_ORIGIN)
      return error(403, "Origin not allowed.");
    if (new URL(request.url).pathname !== (env.ASK_PATH || "/ask"))
      return error(404, "Not found.");
    if (request.method === "OPTIONS") {
      call.finish({ status: 204, outcome: "preflight" });
      return new Response(null, { status: 204, headers });
    }
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
    Object.assign(call.context, { question, historyCount: history.length });
    const answerPlan = portfolioAnswer(question, history);
    const docs = selectDocs(answerPlan);
    Object.assign(call.context, {
      sourceIds: docs.map((doc) => doc.id),
      kind: answerPlan.kind,
      provider: env.PROVIDER || "openai",
      model: env.MODEL || env.OPENAI_MODEL,
    });
    if (!["evidence", "discovery"].includes(answerPlan.kind)) {
      // The stream's start() runs on construction, so the answer is already
      // enqueued when the call is recorded.
      const response = staticAnswerResponse(docs, answerPlan.text, headers);
      call.finish({
        status: 200,
        outcome: answerPlan.kind,
        accepted: true,
        response: answerPlan.text,
      });
      return response;
    }

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
    return streamModelAnswer({ upstream, docs, headers, abort, cleanup, call });
  };
}
