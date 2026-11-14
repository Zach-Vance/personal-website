import { API_CONTRACT_VERSION } from "../assets/conversation.mjs";

const encoder = new TextEncoder();

export const frame = (value) =>
  encoder.encode(`data: ${JSON.stringify(value)}\n\n`);

export function baseHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Portfolio-API-Version",
    "X-Portfolio-API-Version": API_CONTRACT_VERSION,
    Vary: "Origin",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export function sseResponse(body, headers) {
  return new Response(body, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}

// A complete, non-model answer delivered in the same event shape.
export function staticAnswerResponse(docs, text, headers) {
  return sseResponse(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          frame({ type: "sources", ids: docs.map((doc) => doc.id) }),
        );
        controller.enqueue(frame({ type: "answer", text }));
        controller.enqueue(frame({ type: "done" }));
        controller.close();
      },
    }),
    headers,
  );
}
