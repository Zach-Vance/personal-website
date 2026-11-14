import { redact, runtimeLogger } from "./call-log.mjs";

export function supabaseLogger({
  url,
  token,
  waitUntil,
  enabled = true,
  content = true,
  send = fetch,
  write = console.info,
}) {
  const metadataLog = runtimeLogger({ enabled, content: false, write });
  return (event) => {
    metadataLog(event);
    if (!enabled || !url || !token) return;
    const { question, response, ...metadata } = event;
    const payload = {
      ...metadata,
      ...(content && question !== undefined
        ? { question: redact(question, 600) }
        : {}),
      ...(content && response !== undefined
        ? { response: redact(response) }
        : {}),
    };
    const task = (async () => {
      try {
        const result = await send(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Ingest-Token": token,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3000),
        });
        await result.body?.cancel();
        if (!result.ok) throw Error("Log rejected");
      } catch {
        // No payload, exception text, URL, or credential in operational logs.
        write(
          JSON.stringify({
            event: "portfolio_ai_log_failure",
            callId: event.callId,
          }),
        );
      }
    })();
    if (waitUntil) waitUntil(task);
    return task;
  };
}
