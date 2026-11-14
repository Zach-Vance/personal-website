import { test, expect } from "@playwright/test";
import { API_CONTRACT_VERSION } from "../assets/conversation.mjs";
import { config } from "../assets/config.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "X-Portfolio-API-Version",
};

const frame = (value) => `data: ${JSON.stringify(value)}\n\n`;

async function mockApi(page, respond) {
  await page.route(config.askEndpoint, (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: corsHeaders });
    return respond(route);
  });
}

async function ask(page, question) {
  await page.goto("#ask");
  await page.locator("#question").fill(question);
  await page.locator("#ask-submit").click();
}

test("renders a streamed answer with validated citations", async ({ page }) => {
  await mockApi(page, (route) =>
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
});

test("falls back to portfolio evidence when the API fails", async ({
  page,
}) => {
  await mockApi(page, (route) =>
    route.fulfill({
      status: 502,
      headers: corsHeaders,
      contentType: "application/json",
      body: JSON.stringify({ error: "AI service unavailable." }),
    }),
  );
  await ask(page, "What is Setwise?");
  const turn = page.locator(".chat-turn").last();
  await expect(turn.locator(".chat-label")).toHaveText(
    "AI UNAVAILABLE · SHOWING PORTFOLIO EVIDENCE",
  );
  await expect(turn.locator(".chat-answer")).not.toBeEmpty();
  await expect(turn.locator(".answer-sources a").first()).toBeVisible();
});

test("rejects a stale API contract version and uses local evidence", async ({
  page,
}) => {
  await mockApi(page, (route) =>
    route.fulfill({
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Portfolio-API-Version": "0",
      },
      body: frame({ type: "done" }),
    }),
  );
  await ask(page, "What is Setwise?");
  await expect(page.locator(".chat-label").last()).toHaveText(
    "AI UNAVAILABLE · SHOWING PORTFOLIO EVIDENCE",
  );
});
