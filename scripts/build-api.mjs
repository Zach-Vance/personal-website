import { mkdir, writeFile } from "node:fs/promises";
const out = new URL("../.api-static/", import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(
  new URL("index.html", out),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zach Vance · Portfolio API</title></head><body><p>This service supports Zach Vance’s portfolio.</p><a href="https://zach-vance.github.io/personal-website/">Visit the portfolio</a></body></html>',
);
console.log("Built API landing page. Website remains on GitHub Pages.");
