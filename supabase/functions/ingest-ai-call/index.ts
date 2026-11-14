import { createIngestHandler } from "./handler.mjs";
import { tokenHash } from "./token-hash.mjs";
Deno.serve(
  createIngestHandler({
    tokenHash,
    url: Deno.env.get("SUPABASE_URL"),
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  }),
);
