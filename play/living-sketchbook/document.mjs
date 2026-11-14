export const MAX_STROKES = 32;
export const MAX_POINTS = 6000;
export const PALETTES = {
  fern: {
    label: "Fern",
    paper: "#f6f2e6",
    colors: ["#345d4c", "#72966d", "#b9b376", "#4c7866"],
  },
  coral: {
    label: "Terracotta",
    paper: "#f8eee3",
    colors: ["#a45445", "#d29474", "#c4aa78", "#745b58"],
  },
  indigo: {
    label: "Indigo",
    paper: "#f0f1eb",
    colors: ["#3b537c", "#778bb0", "#b8a7b8", "#567f87"],
  },
};
export function createDocument() {
  return {
    version: 1,
    mode: "botanical",
    palette: "fern",
    seed: 1482,
    growth: 0.7,
    strokes: [],
  };
}
export function validDocument(doc) {
  if (
    !doc ||
    doc.version !== 1 ||
    !["botanical", "flow"].includes(doc.mode) ||
    !Object.hasOwn(PALETTES, doc.palette)
  )
    return false;
  if (
    !Number.isInteger(doc.seed) ||
    doc.seed < 1 ||
    doc.seed > 999999 ||
    !Number.isFinite(doc.growth) ||
    doc.growth < 0.2 ||
    doc.growth > 1
  )
    return false;
  if (!Array.isArray(doc.strokes) || doc.strokes.length > MAX_STROKES)
    return false;
  let count = 0;
  for (const stroke of doc.strokes) {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length > 450)
      return false;
    count += stroke.length;
    for (const point of stroke)
      if (
        !Array.isArray(point) ||
        point.length !== 3 ||
        !point.every(
          (value) => Number.isFinite(value) && value >= 0 && value <= 1,
        )
      )
        return false;
  }
  return count <= MAX_POINTS;
}
export function addStroke(doc, stroke) {
  const candidate = { ...doc, strokes: [...doc.strokes, stroke] };
  return validDocument(candidate) ? candidate : null;
}
export function createHistory(doc) {
  return { entries: [structuredClone(doc)], index: 0 };
}
export function current(history) {
  return structuredClone(history.entries[history.index]);
}
export function commit(history, doc) {
  if (!validDocument(doc)) return false;
  history.entries = history.entries.slice(0, history.index + 1);
  history.entries.push(structuredClone(doc));
  if (history.entries.length > 25) history.entries.shift();
  history.index = history.entries.length - 1;
  return true;
}
export function undo(history) {
  history.index = Math.max(0, history.index - 1);
  return current(history);
}
export function redo(history) {
  history.index = Math.min(history.entries.length - 1, history.index + 1);
  return current(history);
}
export function exampleDocument(kind = "sprig", base = createDocument()) {
  const line = (fn, count = 70) =>
    Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      return [...fn(t), 0.55];
    });
  let strokes;
  if (kind === "ribbon")
    strokes = [
      line((t) => [0.2 + 0.6 * t, 0.5 + Math.sin(t * Math.PI * 2) * 0.15], 100),
    ];
  else if (kind === "garden")
    strokes = [
      line((t) => [0.3 + Math.sin(t * 3) * 0.07, 0.85 - t * 0.58]),
      line((t) => [0.58 - Math.sin(t * 3) * 0.08, 0.86 - t * 0.69]),
      line((t) => [0.76 - Math.sin(t * 3) * 0.08, 0.88 - t * 0.5]),
    ];
  else
    strokes = [line((t) => [0.47 + Math.sin(t * 3.6) * 0.09, 0.88 - t * 0.73])];
  return { ...base, strokes };
}
export function loadDraft(storage) {
  try {
    const raw = storage.getItem("zv.sketchbook.draft.v1");
    if (!raw || raw.length > 450000) return null;
    const doc = JSON.parse(raw);
    return validDocument(doc) ? doc : null;
  } catch {
    return null;
  }
}
export function saveDraft(storage, doc) {
  if (!validDocument(doc)) return false;
  try {
    storage.setItem("zv.sketchbook.draft.v1", JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}
