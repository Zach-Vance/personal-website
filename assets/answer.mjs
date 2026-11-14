// Citation syntax checks complement the model prompt; they do not verify semantics.
export function hasValidCitations(text, sourceCount) {
  if (typeof text !== "string" || !text.trim() || text.length > 16000)
    return false;
  const citations = [...text.matchAll(/\[(\d+)\]/g)].map((match) =>
    Number(match[1]),
  );
  return (
    citations.length > 0 &&
    citations.every(
      (id) => Number.isSafeInteger(id) && id >= 1 && id <= sourceCount,
    )
  );
}
