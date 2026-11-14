import { createHandler } from "./core.mjs";
import { createLimits } from "./limits.mjs";

export function createVercelHandler({
  getToken,
  getClientIp,
  env,
  upstreamFetch = fetch,
  limits = createLimits(),
}) {
  const handle = createHandler(upstreamFetch);
  return async function handleVercel(request) {
    let token;
    if (
      request.method === "POST" &&
      request.headers.get("Origin") === env.ALLOWED_ORIGIN
    ) {
      try {
        token = await getToken();
      } catch {
        console.error("portfolio_ask_identity_unavailable");
      }
    }
    return handle(request, {
      ...limits,
      API_TOKEN: token,
      MODEL: env.AI_GATEWAY_MODEL,
      GATEWAY: true,
      REASONING_EFFORT: "none",
      ASK_PATH: "/api/ask",
      ALLOWED_ORIGIN: env.ALLOWED_ORIGIN,
      clientKey: getClientIp,
    });
  };
}
