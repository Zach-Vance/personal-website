import {
  track,
  tangent,
  nearest,
  gates,
  crossesGate,
  ROAD_WIDTH,
} from "./track.mjs";
export const STEP = 1 / 60;
export const MAX_TIME = 180;
export const PHYSICS_VERSION = 1;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const wrapAngle = (angle) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));
export function createRace() {
  const direction = tangent(0);
  return {
    car: {
      x: track[0].x + direction.x * 9,
      y: track[0].y + direction.y * 9,
      angle: Math.atan2(direction.y, direction.x),
      vx: 0,
      vy: 0,
      slip: 0,
      impact: 0,
    },
    ticks: 0,
    time: 0,
    laps: 0,
    nextGate: 1,
    finished: false,
    timedOut: false,
  };
}
export function stepCar(car, input) {
  const throttle = clamp(Number(input.throttle) || 0, 0, 1);
  const brake = clamp(Number(input.brake) || 0, 0, 1);
  const steer = clamp(Number(input.steer) || 0, -1, 1);
  let forward = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);
  const reverse = forward < -5 ? -1 : 1;
  car.angle = wrapAngle(
    car.angle +
      steer * reverse * 2.45 * clamp(Math.abs(forward) / 145, 0, 1) * STEP,
  );
  const cos = Math.cos(car.angle),
    sin = Math.sin(car.angle);
  forward = car.vx * cos + car.vy * sin;
  let lateral = -car.vx * sin + car.vy * cos;
  const acceleration = throttle * 255 - brake * (forward > 15 ? 490 : 180);
  forward = clamp(forward + (acceleration - forward * 0.72) * STEP, -100, 350);
  lateral *= Math.exp(-(input.drift ? 2.1 : 7.4) * STEP);
  if (input.drift) forward *= Math.exp(-0.45 * STEP);
  car.vx = forward * cos - lateral * sin;
  car.vy = forward * sin + lateral * cos;
  car.x += car.vx * STEP;
  car.y += car.vy * STEP;
  car.slip = Math.abs(lateral);
  car.impact *= 0.88;
  const close = nearest(car);
  const allowed = ROAD_WIDTH / 2 - 12;
  if (close.distance > allowed) {
    const nx = (car.x - close.x) / close.distance,
      ny = (car.y - close.y) / close.distance;
    car.x = close.x + nx * allowed;
    car.y = close.y + ny * allowed;
    const outward = Math.max(0, car.vx * nx + car.vy * ny);
    car.vx = (car.vx - nx * outward * 1.1) * 0.85;
    car.vy = (car.vy - ny * outward * 1.1) * 0.85;
    car.impact = Math.min(1, outward / 100);
  }
}
export function stepRace(race, input) {
  if (race.finished || race.timedOut) return;
  const before = { x: race.car.x, y: race.car.y };
  stepCar(race.car, input);
  race.ticks++;
  race.time = race.ticks * STEP;
  if (crossesGate(before, race.car, gates[race.nextGate])) {
    if (race.nextGate === 0) {
      race.laps++;
      if (race.laps === 2) race.finished = true;
    }
    race.nextGate = (race.nextGate + 1) % gates.length;
  }
  if (!race.finished && race.time >= MAX_TIME) race.timedOut = true;
}
// Rendering calls this clock with elapsed wall time. Hidden tabs pause instead of catching up.
export function createClock() {
  let remainder = 0;
  return {
    advance(seconds, update) {
      remainder += clamp(seconds, 0, STEP * 5);
      let steps = 0;
      while (remainder + 1e-10 >= STEP && steps < 5) {
        update();
        remainder -= STEP;
        steps++;
      }
      return Math.max(0, remainder / STEP);
    },
    reset() {
      remainder = 0;
    },
  };
}
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  const milliseconds = Math.round(Math.max(0, seconds) * 1000);
  return `${String(Math.floor(milliseconds / 60000)).padStart(2, "0")}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0")}.${String(milliseconds % 1000).padStart(3, "0")}`;
}
