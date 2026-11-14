import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const pages = [
  "index.html",
  "resume.html",
  ...(await readdir(path.join(root, "projects")))
    .filter((f) => f.endsWith(".html"))
    .map((f) => `projects/${f}`),
];
const errors = [];
for (const file of pages) {
  const html = await readFile(path.join(root, file), "utf8");
  if ((html.match(/<h1\b/g) || []).length !== 1)
    errors.push(`${file}: needs one h1`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate ids`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = match[1];
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    const [target, anchor] = href.split("#");
    const resolved = path.resolve(
      root,
      path.dirname(file),
      target || path.basename(file),
    );
    const actual = href === "./" ? path.join(root, "index.html") : resolved;
    try {
      await access(actual);
      if (anchor && actual.endsWith(".html")) {
        const content = await readFile(actual, "utf8");
        if (!content.includes(`id="${anchor}"`))
          errors.push(`${file}: missing anchor ${href}`);
      }
    } catch {
      errors.push(`${file}: broken link ${href}`);
    }
  }
  for (const img of html.matchAll(/<img\b[^>]*>/g))
    if (!/\balt="[^"]*"/.test(img[0]))
      errors.push(`${file}: image missing alt`);
}
const { evidence } = await import("../assets/knowledge.mjs");
for (const doc of evidence) {
  const [file, id] = doc.url.split("#");
  const html = await readFile(path.join(root, file), "utf8");
  if (id && !html.includes(`id="${id}"`))
    errors.push(`Evidence ${doc.id}: missing source anchor`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${pages.length} pages, local links, image descriptions, and ${evidence.length} evidence references.`,
  );
