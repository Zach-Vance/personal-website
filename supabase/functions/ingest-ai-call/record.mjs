// Strict allowlist: no headers, client IPs, user agents, conversation history, or arbitrary JSON.
export function normalizeRecord(event) {
  if (
    !event ||
    event.event !== "portfolio_ai_call" ||
    event.schema !== 1 ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.callId) ||
    !Number.isInteger(event.status) ||
    event.status < 100 ||
    event.status > 599 ||
    !Number.isInteger(event.durationMs) ||
    event.durationMs < 0 ||
    typeof event.outcome !== "string" ||
    event.outcome.length > 64
  )
    throw Error("Invalid event");
  const text = (key, max) => {
    if (event[key] === undefined) return null;
    if (typeof event[key] !== "string" || event[key].length > max)
      throw Error("Invalid field");
    return event[key];
  };
  const sourceIds = event.sourceIds ?? [];
  if (
    !Array.isArray(sourceIds) ||
    sourceIds.length > 32 ||
    sourceIds.some((id) => typeof id !== "string" || !/^[a-z-]{1,64}$/.test(id))
  )
    throw Error("Invalid sources");
  const bool = (key) => {
    if (event[key] === undefined) return null;
    if (typeof event[key] !== "boolean") throw Error("Invalid flag");
    return event[key];
  };
  const historyCount = event.historyCount ?? 0;
  if (!Number.isInteger(historyCount) || historyCount < 0 || historyCount > 4)
    throw Error("Invalid history count");
  return {
    id: event.callId,
    duration_ms: event.durationMs,
    status: event.status,
    outcome: event.outcome,
    api_version: text("apiVersion", 16),
    kind: text("kind", 32),
    provider: text("provider", 64),
    model: text("model", 128),
    source_ids: sourceIds,
    question: text("question", 600),
    response: text("response", 16000),
    history_count: historyCount,
    accepted: bool("accepted"),
    citations_valid: bool("citationsValid"),
    provider_completed: bool("providerCompleted"),
  };
}
