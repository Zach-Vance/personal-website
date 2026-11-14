import { randomFrom, clamp } from "../shared/random.mjs";
export const PRESETS = Object.freeze({
  clear: { label: "Clear day", rain: 0, wind: 0.12, light: 0.84 },
  evening: { label: "Rainy evening", rain: 0.63, wind: 0.32, light: 0.36 },
  night: { label: "Stormy night", rain: 0.94, wind: 0.72, light: 0.03 },
});
export function normalizeWeather(params) {
  return {
    rain: clamp(params.rain),
    wind: clamp(params.wind, -1, 1),
    light: clamp(params.light),
  };
}
export function createWeather(seed = 73) {
  const random = randomFrom(seed);
  return {
    params: normalizeWeather(PRESETS.evening),
    target: normalizeWeather(PRESETS.evening),
    time: 0,
    drops: Array.from({ length: 280 }, () => ({
      x: random() * 1400 - 100,
      y: random() * 800 - 100,
      speed: 340 + random() * 300,
      size: 0.4 + random() * 0.6,
    })),
    clouds: Array.from({ length: 12 }, () => ({
      x: random() * 1400,
      y: 50 + random() * 160,
      size: 0.55 + random() * 1.2,
    })),
    stars: Array.from({ length: 65 }, () => ({
      x: random() * 1200,
      y: random() * 295,
      size: 0.5 + random(),
    })),
  };
}
export function setWeather(scene, target, immediate = false) {
  scene.target = normalizeWeather(target);
  if (immediate) scene.params = { ...scene.target };
}
export function updateWeather(scene, seconds) {
  const dt = clamp(seconds, 0, 0.05);
  scene.time += dt;
  const amount = 1 - Math.exp(-dt * 3.2);
  for (const key of ["rain", "wind", "light"])
    scene.params[key] += (scene.target[key] - scene.params[key]) * amount;
  for (const drop of scene.drops) {
    drop.x += scene.params.wind * 200 * dt * drop.size;
    drop.y += drop.speed * dt;
    if (drop.y > 790) drop.y -= 900;
    if (drop.x > 1300) drop.x -= 1400;
    if (drop.x < -100) drop.x += 1400;
  }
}
