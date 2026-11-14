import { createHandler } from "./core.mjs";
import { createLimits } from "./limits.mjs";

export function createVercelHandler({
  getClientIp,
  env,
  upstreamFetch = fetch,
  limits = createLimits(),
}) {
  const handle = createHandler(upstreamFetch);
  return async function handleVercel(request) {
    return handle(request, {
      ...limits,
      API_TOKEN: env.GROQ_API_KEY,
      MODEL: env.GROQ_MODEL || "openai/gpt-oss-20b",
      PROVIDER: "groq",
      REASONING_EFFORT: "low",
      MAX_OUTPUT_TOKENS: 1536,
      ASK_PATH: "/api/ask",
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN,
      clientKey: getClientIp,
    });
  };
}
