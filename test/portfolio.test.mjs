import test from "node:test";
import assert from "node:assert/strict";
import { retrieve } from "../assets/knowledge.mjs";
import { readEvents } from "../assets/stream.mjs";
import { createHandler } from "../backend/core.mjs";

function stream(events, chunkSize = 9) {
  const bytes = new TextEncoder().encode(
    events.map((value) => `data: ${JSON.stringify(value)}\r\n\r\n`).join(""),
  );
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize)
        controller.enqueue(bytes.slice(i, i + chunkSize));
      controller.close();
    },
  });
}
const env = () => ({
  ALLOWED_ORIGIN: "https://zach-vance.github.io",
  OPENAI_API_KEY: "test-only-key",
  OPENAI_MODEL: "test-model",
  ASK_LIMITER: { limit: async () => ({ success: true }) },
  SITE_LIMITER: { limit: async () => ({ success: true }) },
});
function request(
  question = "How does Setwise handle offline logging?",
  extra = {},
) {
  return new Request("https://worker.example/ask", {
    method: "POST",
    headers: {
      Origin: "https://zach-vance.github.io",
      "Content-Type": "application/json",
      "CF-Connecting-IP": "192.0.2.1",
      ...extra.headers,
    },
    body: JSON.stringify({ question }),
    ...extra,
  });
}
async function events(response) {
  const result = [];
  for await (const event of readEvents(response.body)) result.push(event);
  return result;
}

test("retrieval separates offline, backend, ML, and unsupported questions", () => {
  assert.equal(
    retrieve("How does Setwise handle offline logging?")[0].id,
    "offline",
  );
  assert.equal(
    retrieve("What backend APIs has Zach developed?")[0].id,
    "backend",
  );
  assert.equal(
    retrieve("Tell me about the TensorFlow image recognition model.")[0].id,
    "mesonet",
  );
  assert.equal(retrieve("Who is Zach?")[0].id, "overview");
  assert.equal(retrieve("What have you built?")[0].id, "setwise");
  assert.deepEqual(retrieve("What is the capital of France?"), []);
  assert.deepEqual(retrieve("What is his salary?"), []);
  assert.deepEqual(retrieve(""), []);
});
test("SSE parser survives split multibyte characters and CRLF frame boundaries", async () => {
  const result = [];
  for await (const e of readEvents(
    stream([{ type: "delta", text: "résumé ↗" }, { type: "done" }], 1),
  ))
    result.push(e);
  assert.deepEqual(result, [
    { type: "delta", text: "résumé ↗" },
    { type: "done" },
  ]);
});
test("SSE parser rejects truncated final events", async () => {
  const incomplete = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode('data: {"type":"delta"}'));
      c.close();
    },
  });
  await assert.rejects(async () => {
    for await (const e of readEvents(incomplete)) void e;
  }, /Incomplete/);
});
test("handler rejects untrusted origins, absent configuration, and malformed input before provider calls", async () => {
  const handle = createHandler(() => {
    throw new Error("Must not call provider");
  });
  assert.equal(
    (
      await handle(
        request("backend", { headers: { Origin: "https://other.example" } }),
        env(),
      )
    ).status,
    403,
  );
  assert.equal(
    (await handle(request(), { ...env(), OPENAI_API_KEY: "" })).status,
    503,
  );
  assert.equal(
    (await handle(request(), { ...env(), SITE_LIMITER: undefined })).status,
    503,
  );
  assert.equal((await handle(request("x".repeat(601)), env())).status, 400);
  assert.equal((await handle(request("x".repeat(5000)), env())).status, 400);
  assert.equal((await handle(request("   "), env())).status, 400);
});
test("handler enforces both client and site rate limits", async () => {
  const handle = createHandler(() => {
    throw new Error("Must not call provider");
  });
  const deny = { limit: async () => ({ success: false }) };
  assert.equal(
    (await handle(request(), { ...env(), ASK_LIMITER: deny })).status,
    429,
  );
  assert.equal(
    (await handle(request(), { ...env(), SITE_LIMITER: deny })).status,
    429,
  );
});
test("unsupported question gets an honest answer without a model call", async () => {
  const handle = createHandler(() => {
    throw new Error("Must not call provider");
  });
  const response = await handle(request("What is his salary?"), env());
  const result = await events(response);
  assert.equal(response.status, 200);
  assert.match(
    result.find((e) => e.type === "answer").text,
    /don’t have published evidence/,
  );
  assert.deepEqual(result.find((e) => e.type === "sources").ids, []);
});
test("grounded provider request streams text and verified source identifiers", async () => {
  let payload;
  const handle = createHandler(async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    payload = JSON.parse(options.body);
    return new Response(
      stream([
        {
          type: "response.output_text.delta",
          delta: "Setwise is in active development and is designed for durable offline logging [1].",
        },
        { type: "response.completed" },
      ]),
    );
  });
  const response = await handle(request(), env());
  const result = await events(response);
  assert.equal(payload.store, false);
  assert.equal(payload.max_output_tokens, 650);
  assert.match(payload.instructions, /ONLY the supplied portfolio evidence/);
  assert.match(payload.instructions, /durable through connectivity/);
  assert.equal(payload.model, "test-model");
  assert.equal(result[0].ids[0], "offline");
  assert.equal(result[1].text, "Setwise is in active development and is designed for durable offline logging [1].");
  assert.equal(result.at(-1).type, "done");
  assert.equal(
    response.headers.get("Access-Control-Allow-Origin"),
    env().ALLOWED_ORIGIN,
  );
});
test("provider errors are sanitized and interrupted streams never report success", async () => {
  const fail = createHandler(
    async () => new Response("upstream-sensitive-detail", { status: 401 }),
  );
  const failure = await fail(request(), env());
  assert.equal(failure.status, 502);
  assert.doesNotMatch(await failure.text(), /sensitive/);
  const truncate = createHandler(
    async () =>
      new Response(
        stream([{ type: "response.output_text.delta", delta: "Partial" }]),
      ),
  );
  const result = await events(await truncate(request(), env()));
  assert.equal(result.at(-1).type, "error");
  assert.ok(!result.some((e) => e.type === "done"));
});
test("preflight does not need provider credentials and only permits POST", async () => {
  const handle = createHandler();
  const response = await handle(
    new Request("https://worker.example/ask", {
      method: "OPTIONS",
      headers: { Origin: env().ALLOWED_ORIGIN },
    }),
    { ALLOWED_ORIGIN: env().ALLOWED_ORIGIN },
  );
  assert.equal(response.status, 204);
  const get = await handle(
    new Request("https://worker.example/ask", {
      headers: { Origin: env().ALLOWED_ORIGIN },
    }),
    env(),
  );
  assert.equal(get.status, 405);
});
