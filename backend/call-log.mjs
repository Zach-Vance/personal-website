import { randomUUID } from "node:crypto";

// Best-effort scrubbing, not anonymization. Never pass headers, IPs, or history here.
export function redact(value, limit = 16000) {
  return String(value ?? "")
    .slice(0, limit)
    .replace(/\bBearer\s+[^\s]+/gi, "[REDACTED_TOKEN]")
    .replace(/\b(?:sk|gsk|sb_secret)[_-][a-z0-9_-]{8,}\b/gi, "[REDACTED_KEY]")
    .replace(/\beyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+\b/gi, "[REDACTED_JWT]")
    .replace(/\b[a-f0-9]{32,}\b/gi, "[REDACTED_SECRET]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/https?:\/\/[^\s]+/gi, "[REDACTED_URL]")
    .replace(/(?:\+?\d[\d ().-]{7,}\d)/g, "[REDACTED_NUMBER]");
}

export function runtimeLogger({
  enabled = true,
  content = false,
  write = console.info,
} = {}) {
  return (event) => {
    if (!enabled) return;
    const { question, response, ...metadata } = event;
    const text = content ? redact(response) : "";
    // Bound individual lines even for long Unicode responses; reconstruct by callId/part.
    const chunks = text.match(/[\s\S]{1,1800}/gu) || [""];
    chunks.forEach((chunk, part) =>
      write(
        JSON.stringify({
          ...metadata,
          contentLogged: content && question !== undefined,
          ...(content && question !== undefined
            ? { question: redact(question, 600) }
            : {}),
          ...(content && response !== undefined ? { response: chunk } : {}),
          part,
          parts: chunks.length,
        }),
      ),
    );
  };
}

export function startCallLog(write) {
  const started = Date.now();
  const context = {};
  let finished = false;
  return {
    context,
    finish(fields) {
      if (finished) return;
      finished = true;
      try {
        const pending = write({
          event: "portfolio_ai_call",
          schema: 1,
          callId: randomUUID(),
          at: new Date().toISOString(),
          durationMs: Date.now() - started,
          ...context,
          ...fields,
        });
        pending?.catch?.(() => {});
      } catch {
        /* Observability must never break an answer. */
      }
    },
  };
}
