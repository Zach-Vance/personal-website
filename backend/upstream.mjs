import { buildInstructions } from "./prompt.mjs";

const PROVIDER_URLS = {
  groq: "https://api.groq.com/openai/v1/responses",
  openai: "https://api.openai.com/v1/responses",
};

// Starts a streaming Responses API call. The caller owns the abort signal and
// handling of non-OK responses.
export function requestCompletion({
  upstreamFetch,
  env,
  signal,
  question,
  reference,
  docs,
}) {
  const groq = env.PROVIDER === "groq";
  return upstreamFetch(groq ? PROVIDER_URLS.groq : PROVIDER_URLS.openai, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.API_TOKEN || env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: env.MODEL || env.OPENAI_MODEL,
      stream: true,
      ...(groq ? { temperature: 0.2 } : { store: false }),
      max_output_tokens: env.MAX_OUTPUT_TOKENS || 650,
      ...(env.REASONING_EFFORT
        ? { reasoning: { effort: env.REASONING_EFFORT } }
        : {}),
      instructions: buildInstructions(docs),
      input: [
        {
          role: "user",
          content: JSON.stringify({ question, reference }),
        },
      ],
    }),
  });
}
