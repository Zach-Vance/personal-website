import test from "node:test";
import assert from "node:assert/strict";
import { hasValidCitations } from "../assets/answer.mjs";
import { createLimits } from "../backend/limits.mjs";
import { createVercelHandler } from "../backend/vercel-handler.mjs";
import { createHandler } from "../backend/core.mjs";
import { readEvents } from "../assets/stream.mjs";

const allowed = "https://zach-vance.github.io";
const makeRequest = (method = "POST", origin = allowed) =>
  new Request("https://example.vercel.app/api/ask", {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(method === "POST"
      ? {
          body: JSON.stringify({
            question: "How does Setwise handle offline logging?",
          }),
        }
      : {}),
  });
const allow = { limit: async () => ({ success: true }) };
const limits = { ASK_LIMITER: allow, SITE_LIMITER: allow };
function provider(text) {
  return new Response(
    new ReadableStream({
      start(c) {
        const e = new TextEncoder();
        for (const event of [
          { type: "response.output_text.delta", delta: text },
          { type: "response.completed" },
        ])
          c.enqueue(e.encode(`data: ${JSON.stringify(event)}\n\n`));
        c.close();
      },
    }),
  );
}
async function collect(response) {
  const list = [];
  for await (const e of readEvents(response.body)) list.push(e);
  return list;
}

test("citation checks reject missing, fabricated, and zero-indexed sources", () => {
  assert.ok(hasValidCitations("Durable logging [1]. Tests [2].", 2));
  assert.ok(!hasValidCitations("An unsupported assertion.", 2));
  assert.ok(!hasValidCitations("Claim [99].", 2));
  assert.ok(!hasValidCitations("Claim [0].", 2));
});
test("per-instance limits separate clients, cap aggregate traffic, and reset", async () => {
  let now = 0;
  const l = createLimits(() => now);
  for (let i = 0; i < 6; i++)
    assert.ok((await l.ASK_LIMITER.limit({ key: "a" })).success);
  assert.ok(!(await l.ASK_LIMITER.limit({ key: "a" })).success);
  assert.ok((await l.ASK_LIMITER.limit({ key: "b" })).success);
  for (let i = 0; i < 30; i++)
    assert.ok((await l.SITE_LIMITER.limit()).success);
  assert.ok(!(await l.SITE_LIMITER.limit()).success);
  now = 60001;
  assert.ok((await l.ASK_LIMITER.limit({ key: "a" })).success);
  assert.ok((await l.SITE_LIMITER.limit()).success);
});
test("Vercel adapter uses only the server-side Groq key and compatible Responses parameters", async () => {
  let calls = 0;
  const handle = createVercelHandler({
    env: { ALLOWED_ORIGIN: allowed, GROQ_API_KEY: "test-groq-key" },
    limits,
    getClientIp: () => "192.0.2.1",
    upstreamFetch: async (url, options) => {
      calls++;
      assert.equal(url, "https://api.groq.com/openai/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-groq-key");
      const data = JSON.parse(options.body);
      assert.equal(data.model, "openai/gpt-oss-120b");
      assert.equal(data.reasoning.effort, "low");
      assert.equal(data.max_output_tokens, 1536);
      assert.equal(data.stream, true);
      assert.ok(!Object.hasOwn(data, "store"));
      return provider(
        "Setwise is in active development and is designed for durable offline logging [1].",
      );
    },
  });
  for (let i = 0; i < 2; i++) {
    const result = await collect(await handle(makeRequest()));
    assert.equal(result.at(-1).type, "done");
  }
  assert.equal(calls, 2);
});
test("Vercel preflight works without a key; missing Groq configuration cannot fall back to Gateway", async () => {
  const handle = createVercelHandler({
    env: {
      ALLOWED_ORIGIN: allowed,
      AI_GATEWAY_MODEL: "unused-model",
      OPENAI_API_KEY: "unused-key",
    },
    limits,
    getClientIp: () => "a",
    upstreamFetch: async () => {
      throw new Error("Must not call provider");
    },
  });
  assert.equal((await handle(makeRequest("OPTIONS"))).status, 204);
  assert.equal((await handle(makeRequest())).status, 503);
  assert.equal(
    (await handle(makeRequest("POST", "https://untrusted.example"))).status,
    403,
  );
});
test("Groq free-tier exhaustion returns a sanitized failure for evidence fallback", async () => {
  const handle = createVercelHandler({
    env: { ALLOWED_ORIGIN: allowed, GROQ_API_KEY: "test-groq-key" },
    limits,
    getClientIp: () => "a",
    upstreamFetch: async () =>
      new Response("private-provider-detail", { status: 429 }),
  });
  const response = await handle(makeRequest());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "AI service unavailable.");
});
test("Setwise answers must preserve the active-development qualification", async () => {
  for (const [answer, expected] of [
    ["Setwise syncs every workout reliably [1].", "error"],
    [
      "Setwise is in active development, with offline sync as a design goal [1].",
      "done",
    ],
  ]) {
    const handle = createVercelHandler({
      env: { ALLOWED_ORIGIN: allowed, GROQ_API_KEY: "test-groq-key" },
      limits,
      getClientIp: () => "a",
      upstreamFetch: async () => provider(answer),
    });
    const result = await collect(await handle(makeRequest()));
    assert.equal(result.at(-1).type, expected);
  }
});
test("complete generation with invalid citations produces an error, never done", async () => {
  const handle = createHandler(async () =>
    provider("An answer with a fabricated reference [99]."),
  );
  const request = new Request("https://worker.example/ask", {
    method: "POST",
    headers: {
      Origin: allowed,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "a",
    },
    body: JSON.stringify({ question: "offline Setwise" }),
  });
  const result = await collect(
    await handle(request, {
      ...limits,
      ALLOWED_ORIGIN: allowed,
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model",
    }),
  );
  assert.equal(result.at(-1).type, "error");
  assert.ok(!result.some((e) => e.type === "done"));
});
