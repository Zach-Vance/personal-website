import { hasValidCitations } from "../assets/answer.mjs";

export const MAX_ANSWER_CHARS = 16000;

// Evidence entries that describe Setwise; an answer citing any of them must
// state that the project is in active development.
const SETWISE_SOURCE_IDS = [
  "setwise",
  "offline",
  "recommendations",
  "verification",
];

// Throws a short, static reason if a completed model answer must be rejected.
export function assertAnswerAllowed(answer, docs) {
  if (!hasValidCitations(answer, docs.length))
    throw new Error("Invalid citations");
  const citesSetwise = [...answer.matchAll(/\[(\d+)\]/g)].some((match) =>
    SETWISE_SOURCE_IDS.includes(docs[Number(match[1]) - 1]?.id),
  );
  if (
    (/\bsetwise\b/i.test(answer) || citesSetwise) &&
    !/\bactive development\b/i.test(answer)
  )
    throw new Error("Missing project status");
}
