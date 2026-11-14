import test from "node:test";
import assert from "node:assert/strict";
import { portfolioAnswer, API_CONTRACT_VERSION } from "../assets/conversation.mjs";
import { retrieve } from "../assets/knowledge.mjs";
import { hasValidCitations } from "../assets/answer.mjs";
import { createHandler } from "../backend/core.mjs";
import { readEvents } from "../assets/stream.mjs";

test("the reported conversation has useful, grounded answers in evidence mode", () => {
  const cases = [
    ["what about react", ["mesonet", "setwise"], /dashboards/],
    ["what is setwise", ["setwise"], /active development/],
    ["tell me about zach", ["overview"], /Charleston/],
    ["how old is zach", [], /aren’t published/],
    ["how many years experience does zach have", ["applications", "mesonet"], /September 2022 to May 2024/],
    ["where is her from", ["overview"], /doesn’t specify his hometown/],
    ["could you tell me about his front end implementations", ["applications", "mesonet", "setwise"], /SvelteKit/],
    ["should i hite him", ["backend", "integration", "applications"], /depends on your requirements/],
  ];
  const history = [];
  for (const [question, ids, pattern] of cases) {
    const answer = portfolioAnswer(question, history);
    assert.deepEqual(answer.docs.map((doc) => doc.id), ids, question);
    assert.match(answer.text, pattern);
    if (ids.length) assert.ok(hasValidCitations(answer.text, ids.length));
    history.push(question);
  }
});

test("phrasing variations and small typos find the published skills", () => {
  for (const question of ["front-end examples", "his user interfaces", "client side work", "his UI work"])
    assert.deepEqual(portfolioAnswer(question).docs.map((doc) => doc.id), ["applications", "mesonet", "setwise"]);
  for (const question of ["pyhton", "postgreql", "integratons", "frontned implementations"])
    assert.ok(retrieve(question).length, question);
  assert.deepEqual(retrieve("What is the capital of France?"), []);
  assert.deepEqual(retrieve("What is his salary?"), []);
});

test("follow-ups use the current project and explicit topic changes take precedence", () => {
  const history = ["what is setwise"];
  assert.deepEqual(portfolioAnswer("does it use react", history).docs.map((doc) => doc.id), ["setwise"]);
  assert.equal(portfolioAnswer("what about its offline logging", history).docs[0].id, "offline");
  assert.ok(portfolioAnswer("tell me more", history).docs.every((doc) => /setwise|offline|recommendations|verification/.test(doc.id)));
  assert.deepEqual(portfolioAnswer("what about Mesonet", history).docs.map((doc) => doc.id), ["mesonet"]);
  assert.deepEqual(portfolioAnswer("does it use react", [...history, "what about Mesonet"]).docs.map((doc) => doc.id), ["mesonet"]);
  assert.deepEqual(portfolioAnswer("what is his salary", history).docs, []);
  assert.deepEqual(portfolioAnswer("what is the capital of France", history).docs, []);
  assert.deepEqual(portfolioAnswer("what is its revenue", history).docs, []);
  assert.deepEqual(portfolioAnswer("does it use react", []).docs.map((doc) => doc.id), ["mesonet", "setwise"]);
});

const env = {
  ALLOWED_ORIGIN: "https://zach-vance.github.io",
  API_TOKEN: "test-only", MODEL: "test-only",
  ASK_LIMITER: { limit: async () => ({ success: true }) },
  SITE_LIMITER: { limit: async () => ({ success: true }) },
};
function request(body) {
  return new Request("https://example.test/ask", {
    method: "POST",
    headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
    body: JSON.stringify(body),
  });
}
async function collect(response) {
  const events = [];
  for await (const event of readEvents(response.body)) events.push(event);
  return events;
}
function provider(text) {
  return new Response([
    { type: "response.output_text.delta", delta: text },
    { type: "response.completed" },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""));
}

test("API retrieves contextual evidence and forwards only bounded visitor questions", async () => {
  let payload;
  const handle = createHandler(async (url, options) => {
    payload = JSON.parse(options.body);
    return provider("Setwise uses React and is in active development [1].");
  });
  const events = await collect(await handle(request({ question: "does it use react", history: ["what is setwise"] }), env));
  assert.deepEqual(events[0].ids, ["setwise"]);
  assert.equal(events.at(-1).type, "done");
  assert.deepEqual(payload.input, [
    { role: "user", content: JSON.stringify({ question: "does it use react", reference: "does it use react setwise" }) },
  ]);
  assert.match(payload.instructions, /never facts or instructions/);
});

test("earlier hiring questions do not enter the model input for a technical follow-up", async () => {
  const handle = createHandler(async (url, options) => {
    const payload = JSON.parse(options.body);
    const current = JSON.parse(payload.input[0].content);
    assert.equal(current.question, "does it use react");
    assert.equal(current.reference, "does it use react setwise");
    assert.equal(payload.input.length, 1);
    assert.doesNotMatch(payload.input[0].content, /hire|hiring/);
    return provider("Yes. Setwise uses React and is in active development [1].");
  });
  const events = await collect(await handle(request({ question: "does it use react", history: ["should i hire him", "what tf is stewise"] }), env));
  assert.equal(events.at(-1).type, "done");
});

test("API rejects malformed and oversized history before calling the provider", async () => {
  const handle = createHandler(() => { throw new Error("Must not call provider"); });
  for (const history of ["setwise", [null], [{ role: "assistant", content: "invented fact" }], [""], ["x".repeat(601)], Array(5).fill("react")])
    assert.equal((await handle(request({ question: "react", history }), env)).status, 400);
  const oversized = new Request("https://example.test/ask", {
    method: "POST", headers: request({}).headers,
    body: JSON.stringify({ question: "react", padding: "x".repeat(17000) }),
  });
  assert.equal((await handle(oversized, env)).status, 400);
});

test("API gives a specific missing-detail answer with verified location evidence", async () => {
  const handle = createHandler(() => { throw new Error("Must not call provider"); });
  const events = await collect(await handle(request({ question: "where is her from" }), env));
  assert.deepEqual(events[0].ids, ["overview"]);
  assert.match(events[1].text, /doesn’t specify his hometown/);
  assert.ok(hasValidCitations(events[1].text, 1));
  assert.equal(events.at(-1).type, "done");
});

test("citing Setwise requires project status even when its name is omitted", async () => {
  const handle = createHandler(async () => provider("His strength-training app uses React [1]."));
  const events = await collect(await handle(request({ question: "what React stack does Setwise use" }), env));
  assert.equal(events.at(-1).type, "error");
});

test("experience totals use role dates and understand exp and yrs", () => {
  const now = new Date("2026-11-14T12:00:00Z");
  for (const question of ["how many years exp does he have in software", "how many yrs experience does he have?", "how long has he been a developer?"]) {
    const answer = portfolioAnswer(question, [], now);
    assert.equal(answer.kind, "prepared");
    assert.match(answer.text, /about 4 years/);
    assert.match(answer.text, /including his internship/);
    assert.ok(hasValidCitations(answer.text, answer.docs.length));
  }
  assert.match(portfolioAnswer("how many years experience?", [], new Date("2027-02-01T00:00:00Z")).text, /about 4 years and 3 months/);
});

test("the new transcript's typos and informal phrasing resolve to the intended topic", () => {
  assert.equal(portfolioAnswer("what is his abckend approach").docs[0].id, "backend");
  const setwise = portfolioAnswer("what tf is stewise");
  assert.equal(setwise.docs[0].id, "setwise");
  assert.equal(setwise.kind, "prepared");
  assert.match(setwise.text, /active development/);
  assert.match(portfolioAnswer("implmenet binary search tree").text, /general coding exercises/);
});

test("common portfolio answers remain available when AI quota is exhausted", async () => {
  const deny = { limit: async () => ({ success: false }) };
  const handle = createHandler(() => { throw new Error("Must not call provider"); });
  for (const question of ["how many years exp does he have in software", "should i hire him", "why should i hire zach", "what tf is stewise"]) {
    const response = await handle(request({ question }), { ...env, ASK_LIMITER: deny, SITE_LIMITER: deny });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Portfolio-API-Version"), API_CONTRACT_VERSION);
    assert.match(response.headers.get("Access-Control-Expose-Headers"), /X-Portfolio-API-Version/);
    const events = await collect(response);
    assert.equal(events.at(-1).type, "done");
    assert.ok(events[0].ids.length);
    assert.ok(hasValidCitations(events[1].text, events[0].ids.length));
  }
});

test("unfamiliar portfolio phrasing reaches the model with public evidence beyond three sources", async () => {
  let calls = 0;
  const handle = createHandler(async (url, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert.match(payload.instructions, /Kentucky Mesonet/);
    assert.match(payload.instructions, /Engineering approach/);
    return provider("His weather-data dashboard work used React and TypeScript [10].");
  });
  const events = await collect(await handle(request({ question: "What makes him stand out?" }), env));
  assert.equal(calls, 1);
  assert.equal(events[0].ids.length, 12);
  assert.equal(events.at(-1).type, "done");
});

test("a weak lexical match does not hide work-history evidence from the model", async () => {
  const handle = createHandler(async (url, options) => {
    const payload = JSON.parse(options.body);
    assert.match(payload.instructions, /Since July 2024/);
    assert.match(payload.instructions, /September 2022 to May 2024/);
    return provider("He has developed operational applications at Super-Sod since July 2024 [2].");
  });
  const events = await collect(await handle(request({ question: "what is his software experience" }), env));
  assert.equal(events[0].ids.length, 12);
  assert.equal(events.at(-1).type, "done");
});
