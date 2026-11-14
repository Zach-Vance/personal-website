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

test("AI workflow and hiring answers remain persuasive when the provider fails", async ({
  page,
}) => {
  await mockApi(page, (route) =>
    route.fulfill({
      status: 502,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify({ error: "Unavailable" }),
    }),
  );
  await ask(page, "How does Zach integrate AI into systems?");
  let turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-answer")).toContainText("Shopify-to-ERP");
  await expect(turn.locator(".chat-answer")).toContainText(
    "conversational AI assistant",
  );
  await expect(turn.locator(".chat-answer")).not.toContainText("Claude");
  await expect(turn.locator(".answer-sources a")).toHaveCount(2);
  await expect(turn.locator(".answer-sources a").last()).toHaveAttribute(
    "href",
    "projects/portfolio.html#assistant",
  );
  await page.locator("#question").fill("Should I hire Zach?");
  await page.locator("#ask-submit").click();
  turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-answer")).toContainText(
    "Yes—Zach makes a strong case",
  );
  await expect(turn.locator(".chat-answer")).toContainText("17% to under 1%");
});

test("the Kyle joke stays limited to direct questions, including local fallback", async ({
  page,
}) => {
  await mockApi(page, (route) =>
    route.fulfill({ status: 502, headers: corsHeaders, body: "Unavailable" }),
  );
  await ask(page, "Who is Kyle?");
  await expect(
    page.locator(".chat-turn").last().locator(".chat-answer"),
  ).toHaveText("Kyle Sucks");
  await page
    .locator("#question")
    .fill("What backend experience does Zach have?");
  await page.locator("#ask-submit").click();
  const answer = page.locator(".chat-turn").last().locator(".chat-answer");
  await expect(answer).toContainText("Go REST APIs");
  await expect(answer).not.toContainText("Kyle Sucks");
});

test("the public evaluation links to synthetic results and states its measurement limits", async ({
  page,
}) => {
  await page.goto("projects/portfolio.html");
  await page
    .getByRole("link", { name: "published assistant evaluation" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Show how the assistant holds up.",
  );
  await expect(page.locator("#methodology")).toContainText(
    "No live model accuracy measurement or visitor data.",
  );
  await expect(page.locator("#cases details")).toHaveCount(12);
  const href = await page
    .getByRole("link", { name: "Download the synthetic results as JSON" })
    .getAttribute("href");
  const response = await page.request.get(new URL(href, page.url()).toString());
  expect(response.ok()).toBe(true);
  const report = await response.json();
  expect(report.summary.fallback).toEqual({ passed: 4, total: 4 });
  expect(JSON.stringify(report)).not.toContain("Kyle");
});
