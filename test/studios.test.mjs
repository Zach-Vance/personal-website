import test from "node:test";
import assert from "node:assert/strict";
import {
  createWeather,
  setWeather,
  updateWeather,
  normalizeWeather,
  PRESETS,
} from "../play/weather-window/simulation.mjs";
import {
  createDocument,
  validDocument,
  addStroke,
  createHistory,
  commit,
  undo,
  redo,
  exampleDocument,
  loadDraft,
  saveDraft,
} from "../play/living-sketchbook/document.mjs";
import { generate } from "../play/living-sketchbook/generators.mjs";

test("weather clamps controls and approaches a preset without unbounded particle allocation", () => {
  assert.deepEqual(normalizeWeather({ rain: 5, wind: -9, light: NaN }), {
    rain: 1,
    wind: -1,
    light: 0,
  });
  const scene = createWeather(),
    count = scene.drops.length;
  setWeather(scene, PRESETS.night);
  for (let i = 0; i < 20000; i++) updateWeather(scene, 1 / 60);
  assert.equal(scene.drops.length, count);
  assert.ok(Math.abs(scene.params.rain - PRESETS.night.rain) < 1e-8);
  assert.ok(
    scene.drops.every(
      (d) =>
        Number.isFinite(d.x) &&
        Number.isFinite(d.y) &&
        d.x >= -100 &&
        d.x <= 1300 &&
        d.y >= -110 &&
        d.y <= 790,
    ),
  );
  const before = scene.time;
  updateWeather(scene, 200);
  assert.ok(scene.time - before <= 0.050001);
  setWeather(scene, PRESETS.clear, true);
  assert.deepEqual(scene.params, normalizeWeather(PRESETS.clear));
});
test("weather seed reproduces scene layout and zero elapsed time freezes motion", () => {
  assert.deepEqual(createWeather(73), createWeather(73));
  const scene = createWeather(),
    before = structuredClone(scene);
  updateWeather(scene, 0);
  assert.deepEqual(scene, before);
});
test("sketch history restores cleared work, supports redo, and discards an abandoned redo branch", () => {
  const original = exampleDocument("garden"),
    history = createHistory(original);
  commit(history, { ...original, strokes: [] });
  assert.deepEqual(undo(history), original);
  assert.equal(redo(history).strokes.length, 0);
  undo(history);
  commit(history, { ...original, seed: 900 });
  assert.equal(redo(history).seed, 900);
  for (let i = 1; i < 40; i++) commit(history, { ...original, seed: i });
  assert.equal(history.entries.length, 25);
});
test("sketch documents reject invalid coordinates, seeds, enums, and work above the point limit", () => {
  const doc = createDocument();
  assert.ok(validDocument(doc));
  assert.equal(
    addStroke(doc, [
      [0.1, 0.1, 0.5],
      [0.2, 0.2, 0.6],
    ]).strokes.length,
    1,
  );
  for (const bad of [
    { ...doc, seed: -1 },
    { ...doc, growth: Infinity },
    { ...doc, mode: "unknown" },
    { ...doc, palette: "toString" },
    {
      ...doc,
      strokes: [
        [
          [2, 0.1, 0.5],
          [0.2, 0.2, 0.5],
        ],
      ],
    },
    { ...doc, strokes: Array(20).fill(Array(400).fill([0.5, 0.5, 0.5])) },
  ])
    assert.equal(validDocument(bad), false);
});
test("seeded sketch generation is reproducible and respects branch/leaf/particle budgets", () => {
  const doc = exampleDocument("garden");
  assert.deepEqual(generate(doc), generate(structuredClone(doc)));
  assert.notDeepEqual(generate(doc), generate({ ...doc, seed: doc.seed + 1 }));
  const large = { ...doc, strokes: Array(30).fill(doc.strokes[0]) };
  const botanical = generate(large),
    flow = generate({ ...large, mode: "flow" });
  assert.ok(
    botanical.branches.length <= 400 && botanical.leaves.length <= 1800,
  );
  assert.ok(flow.particles.length <= 1600);
  assert.ok(
    flow.particles.every((p) =>
      [p.x, p.y, p.angle, p.phase, p.size].every(Number.isFinite),
    ),
  );
});
test("draft persistence validates stored data and handles blocked or full storage", () => {
  const doc = exampleDocument();
  let raw;
  const storage = { setItem: (_, value) => (raw = value), getItem: () => raw };
  assert.ok(saveDraft(storage, doc));
  assert.deepEqual(loadDraft(storage), doc);
  raw = "invalid json";
  assert.equal(loadDraft(storage), null);
  raw = JSON.stringify({ ...doc, version: 0 });
  assert.equal(loadDraft(storage), null);
  assert.equal(
    saveDraft(
      {
        setItem: () => {
          throw Error("quota");
        },
      },
      doc,
    ),
    false,
  );
  assert.equal(
    loadDraft({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    null,
  );
});
