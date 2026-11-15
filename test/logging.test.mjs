import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createHandler } from "../backend/core.mjs";
import { readEvents } from "../assets/stream.mjs";
import { redact, startCallLog } from "../backend/call-log.mjs";
import { supabaseLogger } from "../backend/supabase-log.mjs";
import { createIngestHandler } from "../supabase/functions/ingest-ai-call/handler.mjs";
import { normalizeRecord } from "../supabase/functions/ingest-ai-call/record.mjs";
import { portfolioAnswer } from "../assets/conversation.mjs";

const allow = { limit: async () => ({ success: true }) };
const env = {
  ALLOWED_ORIGIN: "https://test.example",
  API_TOKEN: "test-secret",
  MODEL: "test-model",
  ASK_LIMITER: allow,
  SITE_LIMITER: allow,
};
function request(
  question = "How does Zach integrate AI into systems?",
  extra = {},
) {
  return new Request("https://test.example/ask", {
    method: "POST",
    headers: {
      Origin: env.ALLOWED_ORIGIN,
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.42",
      Authorization: "Bearer do-not-log",
    },
    body: JSON.stringify({ question, ...extra }),
  });
}
async function events(response) {
  const list = [];
  for await (const event of readEvents(response.body)) list.push(event);
  return list;
}
function upstream(text, done = true) {
  return new Response(
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: text })}\n\n${done ? 'data: {"type":"response.completed"}\n\n' : ""}`,
  );
}

test("API calls log final accepted answers once, without headers, IP, or history text", async () => {
  const logs = [];
  const handle = createHandler(
    async () => upstream("He built a portfolio assistant [1][2]."),
    (event) => logs.push(event),
  );
  const result = await events(
    await handle(
      request(undefined, { history: ["private previous question"] }),
      env,
    ),
  );
  assert.equal(result.at(-1).type, "done");
  assert.equal(logs.length, 1);
  assert.equal(logs[0].accepted, true);
  assert.equal(logs[0].citationsValid, true);
  assert.equal(logs[0].response, "He built a portfolio assistant [1][2].");
  assert.deepEqual(logs[0].sourceIds, ["ai-reconciliation", "portfolio-agent"]);
  assert.doesNotMatch(
    JSON.stringify(logs),
    /192\.0\.2|test-secret|do-not-log|private previous/,
  );
});

test("bad requests, provider failures, and invalid streams have distinct log outcomes", async () => {
  const logs = [];
  const handle = createHandler(
    async () => new Response(null, { status: 503 }),
    (event) => logs.push(event),
  );
  assert.equal((await handle(request(42), env)).status, 400);
  assert.equal(logs[0].question, undefined);
  assert.equal((await handle(request(), env)).status, 502);
  assert.equal(logs[1].outcome, "http_502");
  for (const [text, done] of [
    ["Wrong [99].", true],
    ["Incomplete [1].", false],
  ]) {
    const broken = createHandler(
      async () => upstream(text, done),
      (event) => logs.push(event),
    );
    const result = await events(await broken(request(), env));
    assert.equal(result.at(-1).type, "error");
    assert.equal(logs.at(-1).accepted, false);
    assert.equal(logs.at(-1).outcome, "stream_error");
    assert.equal(logs.at(-1).response, text);
  }
  const prepared = createHandler(
    () => {
      throw Error("Not called");
    },
    (event) => logs.push(event),
  );
  await events(await prepared(request("Should I hire Zach?"), env));
  assert.equal(logs.at(-1).outcome, "prepared");
});

test("logging failures and repeated finalization cannot break or duplicate calls", async () => {
  const handle = createHandler(
    async () => upstream("Assistant [1]."),
    () => {
      throw Error("Storage failed");
    },
  );
  assert.equal(
    (await events(await handle(request(), env))).at(-1).type,
    "done",
  );
  const calls = [];
  const call = startCallLog((event) => calls.push(event));
  call.finish({ status: 200 });
  call.finish({ status: 500 });
  assert.equal(calls.length, 1);
});

test("Supabase persistence redacts content, keeps runtime logs metadata-only, and registers completion", async () => {
  let payload;
  const logs = [],
    pending = [];
  const log = supabaseLogger({
    url: "https://example.test/ingest",
    token: "private-token",
    write: (line) => logs.push(line),
    waitUntil: (p) => pending.push(p),
    send: async (url, options) => {
      payload = JSON.parse(options.body);
      assert.equal(options.headers["X-Ingest-Token"], "private-token");
      return new Response(null, { status: 204 });
    },
  });
  await log({
    event: "portfolio_ai_call",
    callId: "id",
    question: "Contact person@example.com +1 (843) 555-0199",
    response:
      "Bearer abc.secret and sk_testabcdefghijk https://example.com/?token=secret",
  });
  await Promise.all(pending);
  assert.equal(pending.length, 1);
  assert.match(payload.question, /REDACTED_EMAIL/);
  assert.match(payload.question, /REDACTED_NUMBER/);
  assert.doesNotMatch(
    JSON.stringify(payload),
    /person@example|843|abc.secret|sk_test|token=secret/,
  );
  assert.doesNotMatch(logs.join(""), /Contact|person@|Bearer|private-token/);
  assert.equal(redact("x".repeat(20000)).length, 16000);
});

test("failed ingestion logs only a call ID, and the content-off switch omits text", async () => {
  let payload;
  const output = [];
  const log = supabaseLogger({
    url: "https://example.test/ingest",
    token: "secret",
    content: false,
    write: (line) => output.push(line),
    send: async (url, options) => {
      payload = JSON.parse(options.body);
      throw Error("Do not echo secret");
    },
  });
  await log({
    callId: "id",
    question: "private question",
    response: "private answer",
  });
  assert.equal(payload.question, undefined);
  assert.equal(payload.response, undefined);
  assert.doesNotMatch(output.join(""), /private|secret/);
  assert.match(output.join(""), /portfolio_ai_log_failure/);
});

const token = "a".repeat(64),
  tokenHash = createHash("sha256").update(token).digest("hex");
const fixture = {
  event: "portfolio_ai_call",
  schema: 1,
  callId: "00000000-0000-4000-8000-000000000001",
  status: 200,
  durationMs: 12,
  outcome: "completed",
  question: "Synthetic question",
  response: "Synthetic response [1].",
  sourceIds: ["portfolio-agent"],
  accepted: true,
};
function ingestRequest(value = fixture, secret = token) {
  return new Request("https://ingest.test", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Ingest-Token": secret },
    body: JSON.stringify(value),
  });
}

test("ingestion authenticates before writing and rejects malformed or oversized records", async () => {
  let writes = 0;
  const ingest = createIngestHandler({
    tokenHash,
    url: "https://database.test",
    key: "server-only",
    send: async (url, options) => {
      writes++;
      const row = JSON.parse(options.body);
      assert.equal(row.id, fixture.callId);
      assert.equal(row.headers, undefined);
      assert.equal(row.history, undefined);
      assert.equal(row.created_at, undefined);
      return new Response(null, { status: 201 });
    },
  });
  assert.equal(
    (await ingest(ingestRequest(fixture, "b".repeat(64)))).status,
    401,
  );
  assert.equal(writes, 0);
  for (const value of [
    { ...fixture, response: "x".repeat(16001) },
    { ...fixture, callId: "bad" },
    { ...fixture, accepted: "yes" },
  ])
    assert.equal((await ingest(ingestRequest(value))).status, 400);
  assert.equal(
    (await ingest(ingestRequest({ ...fixture, padding: "x".repeat(80000) })))
      .status,
    400,
  );
  assert.equal(
    (
      await ingest(
        ingestRequest({
          ...fixture,
          headers: { Authorization: "never store" },
          history: ["never store"],
          created_at: "1900-01-01",
        }),
      )
    ).status,
    204,
  );
  assert.equal(writes, 1);
  assert.equal(normalizeRecord(fixture).accepted, true);
});

test("questions about other people get no joke answer", () => {
  for (const question of ["Who is Kyle?", "Does Kyle suck?"])
    assert.notEqual(portfolioAnswer(question).text, "Kyle Sucks");
});

test("cancelling a response records a single partial outcome and aborts upstream", async () => {
  const logs = [];
  let sourceController;
  let wasAborted = false;
  const handle = createHandler(
    async (url, options) => {
      options.signal.addEventListener(
        "abort",
        () => {
          wasAborted = true;
          sourceController.error(new Error("Aborted"));
        },
        { once: true },
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            sourceController = controller;
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"response.output_text.delta","delta":"Partial [1]."}\n\n',
              ),
            );
          },
        }),
      );
    },
    (event) => logs.push(event),
  );
  const response = await handle(request(), env);
  const reader = response.body.getReader();
  await reader.read();
  await reader.cancel();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(wasAborted, true);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].outcome, "cancelled");
  assert.equal(logs[0].accepted, false);
});
