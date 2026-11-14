import {
  createDocument,
  validDocument,
  addStroke,
  createHistory,
  current,
  commit,
  undo,
  redo,
  exampleDocument,
  loadDraft,
  saveDraft,
  PALETTES,
  MAX_POINTS,
  MAX_STROKES,
} from "./document.mjs";
import { generate } from "./generators.mjs";
import { createSketchRenderer, paintArtwork } from "./render.mjs";
import { createAnimation } from "../shared/lifecycle.mjs";
const $ = (id) => document.getElementById(id);
const canvas = $("sketch-canvas"),
  stage = $("sketch-stage"),
  motion = matchMedia("(prefers-reduced-motion: reduce)");
let doc = exampleDocument("garden"),
  history = createHistory(doc),
  geometry = generate(doc),
  time = 0;
let active = null,
  example = true,
  playing = !motion.matches,
  renderer,
  loop,
  storage,
  draft;
try {
  storage = window.localStorage;
} catch {
  /* Optional local drafts. */
}
draft = loadDraft(storage);
const say = (message) => {
  $("sketch-status").textContent = message;
};
try {
  renderer = createSketchRenderer(canvas);
  loop = createAnimation(stage, (dt) => {
    time += dt;
    renderer.draw(doc, geometry, time);
  });
  new ResizeObserver(() => {
    renderer.resize();
    renderer.draw(doc, geometry, time);
  }).observe(stage);
  loop.setPlaying(playing);
} catch {
  $("sketch-error").hidden = false;
}
function sync() {
  document
    .querySelectorAll("main button, main input")
    .forEach((control) => (control.disabled = !!active));
  $("undo").disabled = history.index === 0 || !!active;
  $("redo").disabled = history.index === history.entries.length - 1 || !!active;
  $("load-draft").disabled = !draft || !!active;
  $("seed").value = doc.seed;
  $("growth").value = Math.round(doc.growth * 100);
  $("growth-value").textContent = `${Math.round(doc.growth * 100)}%`;
  $("palette-name").textContent = PALETTES[doc.palette].label;
  document
    .querySelectorAll("[data-mode]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.mode === doc.mode),
      ),
    );
  document
    .querySelectorAll("[data-palette]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.palette === doc.palette),
      ),
    );
  $("pause-sketch").textContent = playing
    ? "Pause motion Ⅱ"
    : "Resume motion ▷";
  $("drawing-state").textContent = example
    ? "EXAMPLE / DRAW TO START YOUR OWN"
    : `${doc.strokes.length} STROKE${doc.strokes.length === 1 ? "" : "S"} / SEED ${doc.seed}`;
}
function repaint() {
  geometry = generate(doc);
  loop?.invalidate();
}
function change(next, message, { isExample = false } = {}) {
  if (!validDocument(next)) {
    say(
      "That change exceeds the drawing limits. Undo or clear a few strokes to make room.",
    );
    return;
  }
  doc = next;
  commit(history, doc);
  example = isExample;
  time = 0;
  repaint();
  sync();
  if (message) say(message);
}
function cancelStroke() {
  if (!active) return;
  active = null;
  doc = current(history);
  repaint();
  sync();
}
canvas.addEventListener("pointerdown", (event) => {
  if (!renderer || active || event.button !== 0) return;
  const point = renderer.point(event);
  if (!point) return;
  if (
    (!example && doc.strokes.length >= MAX_STROKES) ||
    (!example &&
      doc.strokes.reduce((n, s) => n + s.length, 0) >= MAX_POINTS - 1)
  ) {
    say(
      "This piece has reached its drawing limit. Undo a stroke or clear the canvas to keep exploring.",
    );
    return;
  }
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  active = {
    id: event.pointerId,
    points: [point],
    base: example ? { ...doc, strokes: [] } : structuredClone(doc),
    limited: false,
  };
  canvas.focus({ preventScroll: true });
  sync();
});
canvas.addEventListener("pointermove", (event) => {
  if (!active || event.pointerId !== active.id) return;
  const point = renderer.point(event);
  if (!point) return;
  const last = active.points.at(-1);
  if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.003) return;
  const used = active.base.strokes.reduce((n, s) => n + s.length, 0);
  if (
    active.points.length >= 450 ||
    used + active.points.length >= MAX_POINTS
  ) {
    if (!active.limited)
      say("This stroke has reached its limit. Lift your pointer to finish it.");
    active.limited = true;
    return;
  }
  active.points.push(point);
  doc = { ...active.base, strokes: [...active.base.strokes, active.points] };
  repaint();
});
canvas.addEventListener("pointerup", (event) => {
  if (!active || event.pointerId !== active.id) return;
  const stroke = active.points,
    base = active.base;
  active = null;
  const next = stroke.length > 1 ? addStroke(base, stroke) : null;
  if (next)
    change(
      next,
      "A new stroke, a little growth. Undo or try another variation whenever you like.",
    );
  else {
    doc = current(history);
    repaint();
    sync();
    say("Draw a short line to give the sketch something to grow from.");
  }
});
canvas.addEventListener("pointercancel", cancelStroke);
canvas.addEventListener("lostpointercapture", cancelStroke);
window.addEventListener("blur", cancelStroke);
document
  .querySelectorAll("[data-mode]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      change(
        { ...doc, mode: button.dataset.mode },
        `Switched to ${button.textContent.trim()}. Your strokes are preserved.`,
      ),
    ),
  );
document
  .querySelectorAll("[data-palette]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      change(
        { ...doc, palette: button.dataset.palette },
        "Palette changed. Your strokes are preserved.",
      ),
    ),
  );
document
  .querySelectorAll("[data-example]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      change(
        exampleDocument(button.dataset.example, { ...doc, strokes: [] }),
        "Example loaded. Draw to start a new piece, or change its palette and variation.",
        { isExample: true },
      ),
    ),
  );
$("undo").addEventListener("click", () => {
  doc = undo(history);
  example = false;
  time = 0;
  repaint();
  sync();
  say("Undid the last change.");
});
$("redo").addEventListener("click", () => {
  doc = redo(history);
  example = false;
  time = 0;
  repaint();
  sync();
  say("Redid the change.");
});
$("clear-sketch").addEventListener("click", () =>
  change(
    { ...doc, strokes: [] },
    "Canvas cleared. Undo will bring your piece back.",
  ),
);
$("new-variation").addEventListener("click", () =>
  change(
    { ...doc, seed: 1 + Math.floor(Math.random() * 999999) },
    "A new variation of the same strokes.",
  ),
);
$("seed").addEventListener("change", () => {
  const seed = Number($("seed").value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 999999) {
    sync();
    say("Choose a seed between 1 and 999999.");
    return;
  }
  change({ ...doc, seed }, "Variation seed updated.");
});
$("growth").addEventListener("input", () => {
  doc = { ...doc, growth: Number($("growth").value) / 100 };
  $("growth-value").textContent = `${Math.round(doc.growth * 100)}%`;
  repaint();
});
$("growth").addEventListener("change", () => change(doc, "Growth adjusted."));
$("pause-sketch").addEventListener("click", () => {
  playing = !playing;
  loop?.setPlaying(playing);
  sync();
});
motion.addEventListener("change", (event) => {
  playing = !event.matches;
  loop?.setPlaying(playing);
  sync();
});
$("save-draft").addEventListener("click", () => {
  if (saveDraft(storage, doc)) {
    draft = structuredClone(doc);
    sync();
    say("Draft saved on this browser. It is not uploaded.");
  } else
    say("This browser couldn’t save the draft. You can still export a PNG.");
});
$("load-draft").addEventListener("click", () => {
  if (draft)
    change(
      structuredClone(draft),
      "Local draft loaded. Undo returns to your previous piece.",
    );
});
$("export").addEventListener("click", async () => {
  if (!renderer) return;
  const button = $("export");
  button.disabled = true;
  try {
    const image = document.createElement("canvas");
    image.width = 1800;
    image.height = 1200;
    const ctx = image.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    paintArtwork(ctx, doc, geometry, time, image.width, image.height);
    const blob = await new Promise((resolve) =>
      image.toBlob(resolve, "image/png"),
    );
    if (!blob) throw Error("Export unavailable");
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `living-sketchbook-${doc.seed}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    say("PNG ready: 1800 × 1200 pixels, with your selected paper background.");
  } catch {
    say(
      "This browser couldn’t export the image. Your drawing is still here; try again.",
    );
  } finally {
    button.disabled = false;
  }
});
canvas.addEventListener("keydown", (event) => {
  if (event.key === "Escape") cancelStroke();
});
sync();
