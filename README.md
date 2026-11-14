# Zach Vance · Personal portfolio

Static-first portfolio for **GitHub Pages**, with project case studies, a printable résumé, and evidence-linked portfolio search. No frontend dependencies or build-time credentials.

## Develop and verify

Node.js 24 recommended. No installation step is needed.

```sh
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

With `assets/config.js` unchanged, the panel performs local lexical retrieval over the curated public facts in `assets/knowledge.mjs`, displaying excerpts and verified links. It is labeled **Portfolio search**, never presented as live AI. It does not send questions to a server or simulate token streaming.

### Optional: grounded, streamed AI answers

`backend/worker.mjs` is a Cloudflare Worker adapter using OpenAI’s Responses API. It retrieves the same public corpus on the server, supplies numbered evidence to the model, and forwards text-delta events to the browser. The browser only constructs source links from its approved evidence IDs, and renders model text as text rather than HTML. Conversations are not stored by this app; each question is independent. The request uses `store: false` with OpenAI, which is not a promise of zero provider retention.

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
