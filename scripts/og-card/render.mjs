// Renders images/og-card.png (1200×630) for link previews from card.html.
// Usage: node scripts/og-card/render.mjs   (BROWSER_CHANNEL=msedge to use Edge)
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
const card = new URL("./card.html", import.meta.url);
const out = fileURLToPath(new URL("../../images/og-card.png", import.meta.url));
const browser = await chromium.launch(
  process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {},
);
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(fileURLToPath(card)).href, { waitUntil: "load" });
await page.screenshot({ path: out });
await browser.close();
console.log(`Wrote ${out}`);
