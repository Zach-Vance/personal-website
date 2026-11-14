import {
  createWeather,
  PRESETS,
  setWeather,
  updateWeather,
} from "./simulation.mjs";
import { createWeatherRenderer } from "./render.mjs";
import { createAnimation } from "../shared/lifecycle.mjs";
const $ = (id) => document.getElementById(id);
const canvas = $("weather-canvas"),
  stage = $("weather-stage"),
  scene = createWeather();
const motion = matchMedia("(prefers-reduced-motion: reduce)");
let renderer,
  loop,
  playing = !motion.matches,
  preset = "evening";
try {
  renderer = createWeatherRenderer(canvas);
  loop = createAnimation(stage, (dt) => {
    updateWeather(scene, dt);
    renderer.draw(scene);
  });
  new ResizeObserver(() => {
    renderer.resize();
    renderer.draw(scene);
  }).observe(stage);
  loop.setPlaying(playing);
} catch {
  $("scene-error").hidden = false;
}
function syncControls() {
  for (const key of ["rain", "wind", "light"]) {
    $(key).value = Math.round(scene.target[key] * 100);
    $(key + "-value").textContent =
      key === "wind"
        ? `${Math.abs(Math.round(scene.target.wind * 100))}% ${scene.target.wind < 0 ? "←" : "→"}`
        : `${Math.round(scene.target[key] * 100)}%`;
  }
  document
    .querySelectorAll("[data-preset]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.preset === preset),
      ),
    );
  $("scene-name").textContent = preset
    ? PRESETS[preset].label
    : "Your kind of weather";
  $("pause-weather").textContent = playing
    ? "Pause motion Ⅱ"
    : "Resume motion ▷";
  $("motion-state").textContent = playing ? "MOTION ON" : "STILL SCENE";
}
function apply(params) {
  setWeather(scene, params, !playing);
  syncControls();
  loop?.invalidate();
}
document.querySelectorAll("[data-preset]").forEach((button) =>
  button.addEventListener("click", () => {
    preset = button.dataset.preset;
    apply(PRESETS[preset]);
  }),
);
for (const key of ["rain", "wind", "light"])
  $(key).addEventListener("input", () => {
    preset = null;
    apply({ ...scene.target, [key]: Number($(key).value) / 100 });
  });
$("pause-weather").addEventListener("click", () => {
  playing = !playing;
  if (!playing) setWeather(scene, scene.target, true);
  loop?.setPlaying(playing);
  syncControls();
});
$("reset-weather").addEventListener("click", () => {
  preset = "evening";
  apply(PRESETS.evening);
});
motion.addEventListener("change", (event) => {
  playing = !event.matches;
  setWeather(scene, scene.target, true);
  loop?.setPlaying(playing);
  syncControls();
});
syncControls();
