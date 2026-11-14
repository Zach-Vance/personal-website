import { TRACK_ID, WIDTH, HEIGHT } from "./track.mjs";
import { MAX_TIME, PHYSICS_VERSION, wrapAngle } from "./simulation.mjs";
export const SAVE_KEY = "zv.neon-drift.best.v1";
export function makeRecord(duration, frames) {
  return {
    version: 1,
    track: TRACK_ID,
    physics: PHYSICS_VERSION,
    laps: 2,
    duration,
    frames,
  };
}
export function validRecord(record) {
  if (
    !record ||
    record.version !== 1 ||
    record.track !== TRACK_ID ||
    record.physics !== PHYSICS_VERSION ||
    record.laps !== 2
  )
    return false;
  if (
    !Number.isFinite(record.duration) ||
    record.duration < 5 ||
    record.duration > MAX_TIME
  )
    return false;
  if (
    !Array.isArray(record.frames) ||
    record.frames.length < 2 ||
    record.frames.length > 5402
  )
    return false;
  let previous = -1;
  for (const frame of record.frames) {
    if (
      !Array.isArray(frame) ||
      frame.length !== 4 ||
      !frame.every(Number.isFinite)
    )
      return false;
    const [t, x, y, angle] = frame;
    if (
      t <= previous ||
      t < 0 ||
      t > record.duration + 0.02 ||
      x < 0 ||
      x > WIDTH ||
      y < 0 ||
      y > HEIGHT ||
      Math.abs(angle) > Math.PI + 0.01
    )
      return false;
    previous = t;
  }
  return (
    record.frames[0][0] === 0 && Math.abs(previous - record.duration) < 0.04
  );
}
export function loadBest(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw || raw.length > 600000) return null;
    const record = JSON.parse(raw);
    return validRecord(record) ? record : null;
  } catch {
    return null;
  }
}
export function saveBest(storage, record) {
  if (!validRecord(record)) return false;
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
export function poseAt(record, time) {
  if (!record || time > record.duration || time < 0) return null;
  const frames = record.frames;
  let low = 0,
    high = frames.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (frames[mid][0] <= time) low = mid;
    else high = mid;
  }
  const a = frames[low],
    b = frames[high];
  const t = Math.max(0, Math.min(1, (time - a[0]) / (b[0] - a[0])));
  return {
    x: a[1] + (b[1] - a[1]) * t,
    y: a[2] + (b[2] - a[2]) * t,
    angle: wrapAngle(a[3] + wrapAngle(b[3] - a[3]) * t),
  };
}
