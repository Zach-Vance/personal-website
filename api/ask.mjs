import { getVercelOidcToken } from "@vercel/oidc";
import { ipAddress } from "@vercel/functions";
import { createVercelHandler } from "../backend/vercel-handler.mjs";

const handle = createVercelHandler({
  getToken: getVercelOidcToken,
  getClientIp: ipAddress,
  env: process.env,
});
export const POST = handle;
export const OPTIONS = handle;
