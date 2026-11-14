import { mkdir, cp, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(root, "dist");
// Output is always a fixed child of the checkout. Never publish the repository root.
await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, "images"), { recursive: true });
for (const file of [
  "index.html",
  "resume.html",
  ".nojekyll",
  "assets",
  "projects",
  "play",
])
  await cp(path.join(root, file), path.join(out, file), { recursive: true });
await cp(
  path.join(root, "images", "favicon.svg"),
  path.join(out, "images", "favicon.svg"),
);
// The source headshot is large; publish a 3:4 image sized for the page.
const headshot = sharp(path.join(root, "images", "vanceZach.jpg"))
  .rotate()
  .resize(720, 960, { fit: "cover" });
await headshot
  .clone()
  .jpeg({ quality: 78, mozjpeg: true })
  .toFile(path.join(out, "images", "vanceZach.jpg"));
await headshot
  .clone()
  .webp({ quality: 74 })
  .toFile(path.join(out, "images", "vanceZach.webp"));
// Keep existing external demo URLs useful while the old experiments are retired.
for (const file of ["MortgageCalc.html", "tickers.html"])
  await writeFile(
    path.join(out, file),
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./index.html#work"><title>Selected work — Zach Vance</title></head><body><p>This experiment has moved to the archive. <a href="./index.html#work">Explore Zach’s current work.</a></p></body></html>',
  );
await writeFile(
  path.join(out, "404.html"),
  '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Zach Vance</title><style>body{font:18px/1.7 system-ui;background:#f5f5ef;color:#193d33;max-width:650px;margin:12vh auto;padding:24px}h1{font-size:48px;letter-spacing:-2px}a{color:inherit}</style></head><body><p>ZACH VANCE / 404</p><h1>A loose connection.</h1><p>That page isn’t here. Let’s get you back to something useful.</p><a href="/personal-website/">Back to the portfolio ↗</a></body></html>',
);
await writeFile(path.join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
console.log("Built GitHub Pages site in dist/");
