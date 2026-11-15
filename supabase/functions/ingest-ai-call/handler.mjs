import { normalizeRecord } from "./record.mjs";

export function createIngestHandler({ tokenHash, url, key, send = fetch }) {
  return async (request) => {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    const token = request.headers.get("X-Ingest-Token") || "";
    if (token.length !== 64) return new Response(null, { status: 401 });
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
      ),
    ]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Hash only is deployed; the high-entropy token lives in the Vercel secret store.
    if (hash !== tokenHash) return new Response(null, { status: 401 });
    let record;
    try {
      if (
        !request.headers.get("content-type")?.startsWith("application/json") ||
        !request.body
      )
        throw Error();
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let bytes = 0,
        body = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 80000) throw Error();
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      record = normalizeRecord(JSON.parse(body));
    } catch {
      return new Response(null, { status: 400 });
    }
    try {
      const result = await send(`${url}/rest/v1/ai_api_calls?on_conflict=id`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(2000),
      });
      await result.body?.cancel();
      return new Response(null, { status: result.ok ? 204 : 503 });
    } catch {
      return new Response(null, { status: 503 });
    }
  };
}
