# Zach Vance · Personal portfolio

Static-first portfolio for **GitHub Pages**, with project case studies, a printable résumé, and evidence-linked portfolio search. No frontend dependencies or build-time credentials.

## Develop and verify

Node.js 24 is used for development and deployment. The static frontend has no runtime dependencies; the Vercel request helper is server-only.

```sh
npm ci
npm run check
npm test
npm run build
npm run dev
```

Open `http://127.0.0.1:4173/personal-website/`. The preview deliberately tests the repository subpath. Rebuild after editing. Only `dist/` is served and deployed.

## GitHub Pages

In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. `.github/workflows/pages.yml` validates PRs and deploys `dist/` on pushes to `main` or a manual run on `main`.

The deployment allowlist excludes backend code, tests, and development files. Old `MortgageCalc.html` and `tickers.html` URLs redirect to selected work; the retired source remains in Git history. The homepage does not feature those retired experiments.

## “Ask about my work”

### Works immediately: evidence search

With `askEndpoint` empty in `assets/config.js`, the panel performs local lexical retrieval over the curated public facts in `assets/knowledge.mjs`, displaying excerpts and verified links. It is labeled **Portfolio search**, never presented as live AI. It does not send questions to a server or simulate token streaming. Production currently points to `https://zach-vance-portfolio-api.vercel.app/api/ask` and uses this evidence search as the fallback.

### Grounded, streamed AI answers on Vercel

The API runs in a separate Vercel project; the website remains on GitHub Pages. `api/ask.mjs` calls Groq's Responses API through the shared `backend/core.mjs` handler. No provider key is sent to the browser or committed. There is no automatic switch to a paid provider.

Runtime configuration: `ALLOWED_ORIGIN=https://zach-vance.github.io`, secret `GROQ_API_KEY`, and optional `GROQ_MODEL` (defaults to `openai/gpt-oss-120b`). The model and free-tier availability were checked against Groq's documentation on November 13, 2026. Low reasoning effort and a 1,536-token total output budget leave room for reasoning and a short cited answer. Groq does not support the Responses `store` parameter, so the adapter omits it; the API can log redacted questions and responses to a private Supabase table, while provider retention is governed by Groq's policies.

Keep the Groq account on the Free plan. Its published base limits for this model are 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, and 200,000 tokens/day; check your account for exact limits. Exhaustion returns an error and the browser falls back to evidence search. Upgrading the Groq account changes billing behavior; the code cannot enforce the account's billing tier. No credits were purchased or auto top-up enabled.

The Origin check is a browser-side restriction, not authentication; anyone can send a spoofed Origin header with curl. The server also applies bounded **per-instance** request throttles (six per client/minute, thirty aggregate/minute); these reset on cold starts and are not distributed limits. For a larger public audience, use a shared rate-limit store or configure platform rate limits.

To configure the key securely:

1. Create a key at [Groq API keys](https://console.groq.com/keys), keeping the account on Free.
2. In the [Vercel project's environment settings](https://vercel.com/docs/projects/environment-variables), add `GROQ_API_KEY` as a Sensitive variable for Production. Never paste it into chat or commit it.
3. Deploy a new staged production build; environment changes do not update existing deployments.
4. Test cited answers and failure fallback before promotion and before setting the frontend endpoint.

References: [Groq Responses compatibility](https://console.groq.com/docs/responses-api), [Groq free-tier limits](https://console.groq.com/docs/rate-limits), [Groq billing](https://console.groq.com/docs/billing-faqs).

The frontend validates citation numbers against the retrieved sources before accepting an AI answer. This checks reference integrity, not semantic truth. The backend additionally rejects answers that name or cite Setwise without its active-development status. Unsupported or interrupted answers fall back to published evidence using the same question interpretation as the server. The browser cancels requests after thirty seconds.

The browser keeps up to four recent questions in memory and sends them with the current question so follow-ups such as “does it use React?” can refer to the previous project. Start over clears that context; stopped answers are excluded. No generated answer is reused as factual evidence, and the server validates history length and shape. Shared retrieval handles common frontend/backend phrasing and small spelling errors. Evidence-only answers cover React and frontend work across projects, work-history dates, and role-fit questions. Missing personal details receive a specific limitation: current location is not treated as birthplace, and age is not inferred from graduation dates.

Common questions about tenure, hiring, and Setwise’s purpose return cited portfolio answers without consuming model quota. Tenure is approximated from the published month-level role dates, includes the internship, and is labeled with the current month. Topic normalization handles abbreviations such as “exp” and transpositions such as “abckend” and “stewise.” Unfamiliar portfolio questions can reach the model with the full public corpus instead of being refused solely because lexical retrieval found no match. General coding exercises remain outside the portfolio scope.

**Release both services:** the frontend deploys through GitHub Pages. When the API project is connected to GitHub, Vercel also builds branch previews and deploys its configured production branch. Verify both deployment results; a successful Pages deployment alone does not confirm the API release. Without the Git integration, deploy the API separately. From a clean, tested checkout linked to a separate privately managed API deployment, stage with `vercel deploy --prod --skip-domain`, test `/api/ask` on that deployment using `vercel curl`, then promote the tested deployment with `vercel promote`. Verify the stable API URL after promotion. The browser checks the exposed `X-Portfolio-API-Version` header and uses local evidence if the API contract is stale, rather than accepting the old scope refusals.

Build the backend with `node scripts/build-api.mjs`; `vercel.json` deploys only its landing page and API function. `scripts/build.mjs` remains the separate allowlisted Pages build. A staged production API deployment should be tested before promotion and before setting `assets/config.js` to its stable `/api/ask` URL.

References: [GitHub Pages deployment](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically).

## AI evidence and positioning

Broad AI questions prioritize data integration improvements and this website’s
conversational assistant. Coding assistants are supporting tools, discussed when relevant
to a coding question. The assistant’s retrieval, citations, context, failure handling,
static delivery, and playground features have public references in
`projects/portfolio.html`. Keep those references aligned with the implementation.
Hiring answers lead with a positive recommendation backed by published work and engineering experience, without promising fit for every role. API contract version 4 prevents the
updated frontend from accepting the previous API’s answer behavior; deploy both services
to enable updated live answers. Until then, the browser uses updated local evidence.

## Content

- `index.html`: homepage and Q&A surface.
- `projects/`: engineering write-ups, including the portfolio assistant itself.
- `resume.html`: printable résumé (Print / Save as PDF).
- `assets/knowledge.mjs`: public evidence corpus shared with the backend. Update it alongside page content.
- Setwise’s preview is explicitly an **interface study**, not a screenshot of the live product.

## Private API analytics

A privately managed Supabase project hosts optional analytics.
The browser never connects to the log database. `public.ai_api_calls` has RLS enabled,
no public policies, and no `anon`/`authenticated` grants. The server sends an allowlisted,
best-effort redacted record to the `ingest-ai-call` Edge Function using a dedicated
256-bit token. Only its one-way hash is committed. The Edge Function authenticates the
request and uses its built-in server credential to insert the record. Duplicate call IDs
are ignored. Rejected API requests log status metadata, not submitted content.

The API logs final provider responses (including rejected/partial responses marked
`accepted: false`), prepared answers, errors, source IDs, latency, and history count.
Headers, IPs, user agents, and prior question text are not included in application logs.
Hosting/provider infrastructure may keep its own logs. Redaction catches common emails,
phone numbers, URLs, and secret formats; it is not anonymization. Logs are untrusted
input for manual review, never automatic training labels or portfolio facts.
Logging is best effort: outages, process termination, or timeouts can lose records.

Retention is **three calendar months**, shortened under storage pressure. An hourly
cleanup keeps at most **100,000 rows** and **150 MiB estimated live data** (payload size
with a conservative overhead factor). Allocated PostgreSQL size can differ; deletes
leave reusable pages and autovacuum maintains reuse. The private notebook shows actual
database/table allocation too. This is a conservative free-tier budget, not a provider
billing guarantee. Existing API spam limits are unchanged. No paid services were enabled.

Open analytics using your authenticated Supabase dashboard.
The report highlights **possible hiring interest**, a database keyword heuristic for
hiring/interview/availability/role-fit questions. It does not identify visitors, prove
that they are employers, or send notifications. Use the report to inspect real questions,
spot weak answers, and manually create sanitized regression cases with reviewed expected
answers. Never publish raw visitor logs.

Configuration in the existing Vercel API project (server-only):

- `AI_LOG_INGEST_URL`: your private Edge Function ingestion URL
- `AI_LOG_INGEST_TOKEN`: dedicated secret from the ignored local `.env.local`; copy securely
  into the Vercel secret store, never chat or Git. Only Production should write production logs.
- Optional `AI_CALL_LOGGING=off` disables app logging; `AI_LOG_CONTENT=off` retains metadata only.

`waitUntil` keeps the bounded asynchronous database write alive after the answer finishes;
write failures leave only a call ID in Vercel runtime logs and never fail the answer.
Runtime logs contain metadata only. The existing privacy note accurately mentions logging;
there is no popup or separate announcement. Publish that note before enabling live logging.

The Supabase project, table, retention job, authenticated ingestion function, and private
notebook are provisioned. Configure the production ingestion variables before verifying
that a production API call is saved. Git deployment checks can confirm a release even
when a connected management account cannot inspect the API project. Keep production
logging credentials out of preview environments.

Schema snapshots are in `supabase/schema.sql`, `supabase/retention.sql`, and
`supabase/hiring-analytics.sql`, in application order; hosted migration history records
the corresponding changes. Notebook definitions are in `supabase/analytics-notebook.json`.
To rotate ingestion access, generate a fresh token, deploy its SHA-256 hash in
`supabase/functions/ingest-ai-call/token-hash.mjs`, update the Vercel secret, and redeploy.
No Supabase service-role key is needed in Vercel or the browser.

## Published assistant evaluation

`npm run evaluate` regenerates `assets/evaluation.json` and
`projects/assistant-evaluation.html`. `npm run evaluate:check` verifies the published
artifacts in CI. The suite uses 12 public synthetic questions and four mocked API
failures. It checks expected sources, required content/exclusions, and citation-number
validity. These are deterministic evidence-mode regressions, not a live-model accuracy
benchmark or proof of semantic citation support. Browser tests cover the fallback UI.
No visitor logs or secrets are included in the published evaluation.
