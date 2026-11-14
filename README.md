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

Merge the redesign branch after reviewing it. In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. `.github/workflows/pages.yml` validates PRs and deploys `dist/` on pushes to `main` or a manual run on `main`.

The deployment allowlist excludes backend code, source notes, tests, and development files. Existing `MortgageCalc.html` and `tickers.html` URLs redirect to selected work; their original source remains in Git history and the checkout. The homepage does not feature those retired experiments.

## “Ask about my work”

### Works immediately: evidence search

With `askEndpoint` empty in `assets/config.js`, the panel performs local lexical retrieval over the curated public facts in `assets/knowledge.mjs`, displaying excerpts and verified links. It is labeled **Portfolio search**, never presented as live AI. It does not send questions to a server or simulate token streaming. Production currently points to `https://zach-vance-portfolio-api.vercel.app/api/ask` and uses this evidence search as the fallback.

### Grounded, streamed AI answers on Vercel

The API is a separate Vercel project, `purple-toad/zach-vance-portfolio-api`; the website remains on GitHub Pages. `api/ask.mjs` calls Groq's Responses API through the shared `backend/core.mjs` handler. No provider key is sent to the browser or committed. There is no automatic switch to a paid provider.

Runtime configuration: `ALLOWED_ORIGIN=https://zach-vance.github.io`, secret `GROQ_API_KEY`, and optional `GROQ_MODEL` (defaults to `openai/gpt-oss-120b`). The model and free-tier availability were checked against Groq's documentation on November 13, 2026. Low reasoning effort and a 1,536-token total output budget leave room for reasoning and a short cited answer. Groq does not support the Responses `store` parameter, so the adapter omits it; this app does not persist questions or conversations, but provider retention is governed by Groq's policies.

Keep the Groq account on the Free plan. Its published base limits for this model are 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, and 200,000 tokens/day; check your account for exact limits. Exhaustion returns an error and the browser falls back to evidence search. Upgrading the Groq account changes billing behavior; the code cannot enforce the account's billing tier. No credits were purchased or auto top-up enabled. The earlier $1/month AI Gateway budget is unused by this adapter.

The server also applies bounded **per-instance** request throttles (six per client/minute, thirty aggregate/minute); these reset on cold starts and are not distributed limits. For a larger public audience, use a shared rate-limit store or configure platform rate limits.

To configure the key securely:

1. Create a key at [Groq API keys](https://console.groq.com/keys), keeping the account on Free.
2. In the [Vercel project's environment settings](https://vercel.com/purple-toad/zach-vance-portfolio-api/settings/environment-variables), add `GROQ_API_KEY` as a Sensitive variable for Production. Never paste it into chat or commit it.
3. Deploy a new staged production build; environment changes do not update existing deployments.
4. Test cited answers and failure fallback before promotion and before setting the frontend endpoint.

References: [Groq Responses compatibility](https://console.groq.com/docs/responses-api), [Groq free-tier limits](https://console.groq.com/docs/rate-limits), [Groq billing](https://console.groq.com/docs/billing-faqs).

The frontend validates citation numbers against the retrieved sources before accepting an AI answer. This checks reference integrity, not semantic truth. The backend additionally rejects Setwise answers that omit its active-development status. Unsupported or interrupted answers fall back to the original published evidence. Each question is independent; Start over clears the in-memory conversation. The browser cancels requests after thirty seconds.

Build the backend with `node scripts/build-api.mjs`; `vercel.json` deploys only its landing page and API function. `scripts/build.mjs` remains the separate allowlisted Pages build. A staged production API deployment should be tested before promotion and before setting `assets/config.js` to its stable `/api/ask` URL.

### Alternative Cloudflare adapter

`backend/worker.mjs` is an optional Cloudflare Worker adapter using the same shared handler and OpenAI’s Responses API directly. Both adapters retrieve the same public corpus on the server, supply numbered evidence to the model, and forward text-delta events to the browser. The browser only constructs source links from its approved evidence IDs, and renders model text as text rather than HTML. Conversations are not stored by this app; each question is independent. The request uses `store: false`, which is not a promise of zero provider retention.

To activate it:

1. Use an existing Cloudflare account and install the official Wrangler CLI. Run commands from `backend/`.
2. Add `OPENAI_API_KEY` with `wrangler secret put OPENAI_API_KEY` (interactive input; never commit the key).
3. Set `OPENAI_MODEL` in the Worker’s environment to a Responses-compatible text model available to your account. There is no hard-coded model selection.
4. Confirm `ALLOWED_ORIGIN` is the exact website origin: `https://zach-vance.github.io` (without the repository path). The included rate-limit namespaces must be unique within your Cloudflare account.
5. Deploy with `wrangler deploy --config wrangler.jsonc`.
6. Set `askEndpoint` in `assets/config.js` to the deployed HTTPS Worker URL ending in `/ask`, then rebuild/redeploy the Pages frontend.

The endpoint fails closed without its credentials, model, and two rate-limit bindings. It bounds request length, accepts only the configured origin, requests at most 650 output tokens, times out upstream calls, and limits requests per client and site per Cloudflare location. Those platform limits are approximate local limits, **not a hard global spending cap**. Configure provider billing limits and alerts before exposing the paid endpoint. CORS is a browser restriction, not authentication.

On upstream failures or interrupted generation, the UI replaces the partial response with published evidence and explains the fallback. Stop cancels an active request. Unknown questions receive a limitation instead of invented facts. No employer code, private evidence bank, internal metrics, or résumé source documents are included in the corpus.

Live model calls and hosted Worker deployment require account configuration; automated tests use a mock provider stream, not paid requests. Review answer grounding with a real configured model before enabling public AI mode. Prompt constraints reduce hallucinations but cannot guarantee factual correctness.

References: [GitHub Pages deployment](https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically), [OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [Cloudflare rate limits](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Content

- `index.html`: homepage and Q&A surface.
- `projects/`: engineering write-ups, not claims of public employer source access.
- `resume.html`: printable résumé (Print / Save as PDF).
- `assets/knowledge.mjs`: public evidence corpus shared with the backend. Update it alongside page content.
- Setwise’s preview is explicitly an **interface study**, not a screenshot of the live product.

Professional content is based on the supplied résumé and career conversations. The public copy omits internal counts and employer metrics pending a public-disclosure decision. Setwise is presented as actively developing, not a fully accepted or completed product.
