import { ipAddress, waitUntil } from "@vercel/functions";
import { createVercelHandler } from "../backend/vercel-handler.mjs";

const handle = createVercelHandler({
  getClientIp: ipAddress,
  env: process.env,
  waitUntil,
});
export const POST = handle;
export const OPTIONS = handle;
