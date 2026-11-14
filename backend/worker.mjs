// Optional Cloudflare adapter; the deployed portfolio uses Vercel.
export { createHandler } from "./core.mjs";
import { createHandler } from "./core.mjs";
export default { fetch: createHandler() };
