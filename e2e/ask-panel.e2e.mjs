import { test, expect } from "@playwright/test";
import { API_CONTRACT_VERSION } from "../assets/conversation.mjs";
import { config } from "../assets/config.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "X-Portfolio-API-Version",
};

const frame = (value) => `data: ${JSON.stringify(value)}\n\n`;
const FALLBACK_LABEL = "AI UNAVAILABLE · SHOWING PORTFOLIO EVIDENCE";

// Routes the production endpoint to `respond` and counts requests so a test
// fails if the mock never matched (which would otherwise look like a fallback).
async function mockApi(page, respond) {
  const calls = { count: 0 };
  await page.route(config.askEndpoint, (route) => {
    calls.count += 1;
    return respond(route);
  });
  return calls;
}

async function ask(page, question) {
  await page.goto("#ask");
  await page.locator("#question").fill(question);
  await page.locator("#ask-submit").click();
}

test("renders a streamed answer with validated citations", async ({ page }) => {
  const calls = await mockApi(page, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Portfolio-API-Version": API_CONTRACT_VERSION,
      },
      body: [
        frame({ type: "sources", ids: ["setwise"] }),
        frame({ type: "delta", text: "Setwise is in active " }),
        frame({ type: "delta", text: "development [1]." }),
        frame({ type: "done" }),
      ].join(""),
    }),
  );
  await ask(page, "What is Setwise?");
  const turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-label")).toHaveText(
    "ANSWER · PORTFOLIO SOURCES",
  );
  await expect(turn.locator(".chat-answer")).toContainText(
    "Setwise is in active development",
  );
  await expect(turn.locator(".chat-answer a")).toHaveText("[1]");
  await expect(turn.locator(".answer-sources a")).toHaveCount(1);
  expect(calls.count).toBe(1);
});

test("falls back to local evidence when the API fails", async ({ page }) => {
  const calls = await mockApi(page, (route) =>
    route.fulfill({
      status: 502,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify({ error: "AI service unavailable." }),
    }),
  );
  await ask(page, "What is Setwise?");
  const turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-label")).toHaveText(FALLBACK_LABEL);
  await expect(turn.locator(".chat-answer")).toContainText("Setwise");
  await expect(turn.locator(".answer-sources a").first()).toBeVisible();
  expect(calls.count).toBe(1);
});

test("rejects a stale API contract version and shows local evidence instead", async ({
  page,
}) => {
  const calls = await mockApi(page, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Portfolio-API-Version": "0",
      },
      // A well-formed answer: only the version header should cause rejection.
      body: [
        frame({ type: "sources", ids: ["setwise"] }),
        frame({ type: "delta", text: "STALE API ANSWER [1]" }),
        frame({ type: "done" }),
      ].join(""),
    }),
  );
  await ask(page, "What is Setwise?");
  const turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-label")).toHaveText(FALLBACK_LABEL);
  await expect(turn.locator(".chat-answer")).not.toContainText(
    "STALE API ANSWER",
  );
  expect(calls.count).toBe(1);
});
