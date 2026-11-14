import { writeFile, readFile } from "node:fs/promises";
import { format, resolveConfig } from "prettier";
import { evaluate } from "../evaluation/run.mjs";
const report = await evaluate();
const file = new URL("../assets/evaluation.json", import.meta.url);
const output = await format(JSON.stringify(report), {
  ...(await resolveConfig(
    new URL("../.prettierrc.json", import.meta.url).pathname,
  )),
  parser: "json",
});
if (process.argv.includes("--check")) {
  if ((await readFile(file, "utf8")) !== output)
    throw Error("Evaluation report is stale. Run npm run evaluate.");
} else await writeFile(file, output);
console.log(JSON.stringify(report.summary));
if (
  Object.values(report.summary).some((metric) => metric.passed !== metric.total)
)
  process.exitCode = 1;
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const metric = (key) =>
  `${report.summary[key].passed}/${report.summary[key].total}`;
const body = `      <header class="case-hero">
        <p class="eyebrow">PORTFOLIO ASSISTANT / PUBLIC EVALUATION</p>
        <h1>Show how the assistant holds up.</h1>
        <p>A reproducible regression suite for evidence selection, response requirements,
          citation references, and failure behavior. Synthetic questions only.</p>
      </header>
      <div class="case-body">
        <section id="methodology">
          <h2>What these results measure.</h2>
          <p>${escape(report.methodology)}</p>
          <p>The fixture date is ${escape(asOfDate(report.asOf))}. Required-phrase checks catch specific regressions;
            a passing result is not a claim that the live model always answers correctly.</p>
          <ul>
            <li>Expected source selection: <strong>${metric("sourceSelection")}</strong></li>
            <li>Required content and exclusions: <strong>${metric("contentChecks")}</strong></li>
            <li>Valid citation references in sourced answers: <strong>${metric("citationReferences")}</strong></li>
            <li>Mocked API failures producing a fallback signal and usable local evidence: <strong>${metric("fallback")}</strong></li>
          </ul>
          <p>Source checks verify that expected documents were retrieved. Citation checks
            verify that reference numbers exist; they do not establish that each cited source
            supports every claim. Live-model semantic accuracy still needs human review.</p>
        </section>
        <section id="cases">
          <h2>The questions and evidence-mode answers.</h2>
          ${report.rows
            .map(
              (row) => `<details><summary>${escape(row.question)}</summary>
          ${row.history.length ? `<p>Previous question: ${escape(row.history.join(" → "))}</p>` : ""}
          <p>${escape(row.answer)}</p><p>Content: ${row.contentPass ? "pass" : "fail"} · Expected sources: ${row.sourcesPass ? "pass" : "fail"} · Citation references: ${row.citationsPass === null ? "not applicable" : row.citationsPass ? "pass" : "fail"}</p></details>`,
            )
            .join("\n")}
        </section>
        <section id="fallback">
          <h2>Failures are part of the evaluation.</h2>
          <ul>${report.fallback.map((row) => `<li>${escape(row.id.replaceAll("-", " "))}: <strong>${row.pass ? "pass" : "fail"}</strong></li>`).join("")}</ul>
          <p>The API scenarios use synthetic upstream responses. Separate browser tests
            check streaming, provider failure, API version mismatch, and useful workflow
            and hiring answers during fallback.</p>
        </section>
        <section id="reproduce">
          <h2>Reproduce the results.</h2>
          <p>Run <code>npm run evaluate</code> to regenerate this report and
            <code>npm run evaluate:check</code> to check the published artifacts in CI.
            These commands do not call Groq or consume model quota.</p>
          <p><a href="../assets/evaluation.json">Download the synthetic results as JSON</a> ·
            <a href="https://github.com/Zach-Vance/personal-website">Browse the source</a></p>
          <p>Private visitor logs can help identify future test cases. They are not published,
            automatically trusted as correct answers, or automatically used to train a model.</p>
        </section>
      </div>
`;
function asOfDate(value) {
  return value.slice(0, 10);
}
const template = await readFile(
  new URL("../projects/portfolio.html", import.meta.url),
  "utf8",
);
const html =
  template.slice(0, template.indexOf('      <header class="case-hero">')) +
  body +
  template.slice(template.indexOf('      <div class="case-next">'));
const page = html
  .replace(
    "Portfolio assistant &amp; website — Zach Vance",
    "Assistant evaluation — Zach Vance",
  )
  .replace(
    "An AI-powered portfolio assistant with cited sources, conversational context, streaming, and local evidence fallback.",
    "Reproducible synthetic evaluation of portfolio source selection, response requirements, citation references, and API failure behavior.",
  )
  .replace(/[ \t]+$/gm, "");
const pageFile = new URL(
  "../projects/assistant-evaluation.html",
  import.meta.url,
);
if (process.argv.includes("--check")) {
  if ((await readFile(pageFile, "utf8")) !== page)
    throw Error("Evaluation page is stale. Run npm run evaluate.");
} else await writeFile(pageFile, page);
