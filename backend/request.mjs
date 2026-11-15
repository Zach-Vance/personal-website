import { MAX_HISTORY } from "../assets/conversation.mjs";

const MAX_BYTES = 16384;
const MAX_TEXT = 600;

// Reads and validates the JSON body. Throws a short reason string on any
// violation; callers map every failure to the same 400 response.
export async function readQuestion(request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new Error("content-type");
  if (!request.body) throw new Error("empty");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new Error("size");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (typeof body.question !== "string") throw new Error("question");
    const question = body.question.trim();
    if (!question || question.length > MAX_TEXT) throw new Error("length");
    const history = body.history ?? [];
    if (
      !Array.isArray(history) ||
      history.length > MAX_HISTORY ||
      history.some(
        (item) =>
          typeof item !== "string" || !item.trim() || item.length > MAX_TEXT,
      )
    )
      throw new Error("history");
    return { question, history: history.map((item) => item.trim()) };
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
