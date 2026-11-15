import { createHandler } from "./core.mjs";
import { supabaseLogger } from "./supabase-log.mjs";
import { createLimits } from "./limits.mjs";

export function createVercelHandler({
  getClientIp,
  env,
  upstreamFetch = fetch,
  limits = createLimits(),
  waitUntil,
  logCall = supabaseLogger({
    url: env.AI_LOG_INGEST_URL,
    token: env.AI_LOG_INGEST_TOKEN,
    waitUntil,
    enabled: env.AI_CALL_LOGGING !== "off",
    content: env.AI_LOG_CONTENT !== "off",
  }),
}) {
  const handle = createHandler(upstreamFetch, logCall);
  return async function handleVercel(request) {
    return handle(request, {
      ...limits,
      API_TOKEN: env.GROQ_API_KEY,
      MODEL: env.GROQ_MODEL || "openai/gpt-oss-120b",
      PROVIDER: "groq",
      REASONING_EFFORT: "low",
      MAX_OUTPUT_TOKENS: 1536,
      ASK_PATH: "/api/ask",
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN,
      clientKey: getClientIp,
    });
  };
}
