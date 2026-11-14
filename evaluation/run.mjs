import { portfolioAnswer } from "../assets/conversation.mjs";
import { hasValidCitations } from "../assets/answer.mjs";
import { createHandler } from "../backend/core.mjs";
import { readEvents } from "../assets/stream.mjs";
import { cases, asOf } from "./cases.mjs";

export async function evaluate() {
  const rows = cases.map((item) => {
    const plan = portfolioAnswer(
      item.question,
      item.history || [],
      new Date(asOf),
    );
    return {
      id: item.id,
      question: item.question,
      history: item.history || [],
      kind: plan.kind,
      sourceIds: plan.docs.map((doc) => doc.id),
      answer: plan.text,
      sourcesPass: item.sources.every((id) =>
        plan.docs.some((doc) => doc.id === id),
      ),
      contentPass:
        item.includes.every((text) => plan.text.includes(text)) &&
        (item.excludes || []).every((text) => !plan.text.includes(text)) &&
        (!item.kind || plan.kind === item.kind),
      citationsPass: plan.docs.length
        ? hasValidCitations(plan.text, plan.docs.length)
        : null,
    };
  });
  const allow = { limit: async () => ({ success: true }) };
  const env = {
    ALLOWED_ORIGIN: "https://evaluation.test",
    API_TOKEN: "synthetic",
    MODEL: "synthetic",
    ASK_LIMITER: allow,
    SITE_LIMITER: allow,
  };
  const upstreamCases = [
    {
      id: "provider-unavailable",
      response: () => new Response(null, { status: 503 }),
      expectedStatus: 502,
    },
    {
      id: "invalid-citation",
      response: () =>
        sse([
          {
            type: "response.output_text.delta",
            delta: "Unsupported source [99].",
          },
          { type: "response.completed" },
        ]),
    },
    {
      id: "incomplete-stream",
      response: () =>
        sse([
          { type: "response.output_text.delta", delta: "Partial answer [1]." },
        ]),
    },
    {
      id: "quota-exhausted",
      response: () => {
        throw Error("Provider must not be called");
      },
      expectedStatus: 429,
      deny: true,
    },
  ];
  const fallback = [];
  for (const scenario of upstreamCases) {
    const question = cases[0].question;
    const handle = createHandler(scenario.response);
    const response = await handle(
      new Request("https://evaluation.test/ask", {
        method: "POST",
        headers: {
          Origin: env.ALLOWED_ORIGIN,
          "Content-Type": "application/json",
          "CF-Connecting-IP": "192.0.2.1",
        },
        body: JSON.stringify({ question }),
      }),
      {
        ...env,
        ...(scenario.deny
          ? { ASK_LIMITER: { limit: async () => ({ success: false }) } }
          : {}),
      },
    );
    const events = [];
    if (response.ok)
      for await (const event of readEvents(response.body)) events.push(event);
    const triggersFallback = scenario.expectedStatus
      ? response.status === scenario.expectedStatus
      : events.at(-1)?.type === "error";
    const plan = portfolioAnswer(question);
    fallback.push({
      id: scenario.id,
      status: response.status,
      pass:
        triggersFallback &&
        hasValidCitations(plan.text, plan.docs.length) &&
        plan.docs.some((doc) => doc.id === "portfolio-agent"),
    });
  }
  return {
    suite: "portfolio-regression-v1",
    asOf,
    methodology:
      "Synthetic fixtures evaluated against deterministic evidence-mode answers and mocked API failures. Content checks test required phrases and exclusions, not semantic truth. Citation checks verify reference numbers, not claim support. No live model accuracy measurement or visitor data.",
    rows,
    fallback,
    summary: {
      sourceSelection: {
        passed: rows.filter((r) => r.sourcesPass).length,
        total: rows.length,
      },
      contentChecks: {
        passed: rows.filter((r) => r.contentPass).length,
        total: rows.length,
      },
      citationReferences: {
        passed: rows.filter((r) => r.citationsPass === true).length,
        total: rows.filter((r) => r.citationsPass !== null).length,
      },
      fallback: {
        passed: fallback.filter((r) => r.pass).length,
        total: fallback.length,
      },
    },
  };
}
function sse(events) {
  return new Response(
    events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""),
  );
}
