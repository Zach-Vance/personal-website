export const WIDTH = 1200;
export const HEIGHT = 760;
export const ROAD_WIDTH = 126;
export const TRACK_ID = "night-shift-1";
const points = [
  [310, 145],
  [565, 150],
  [748, 250],
  [950, 170],
  [1070, 280],
  [1010, 490],
  [835, 585],
  [625, 525],
  [440, 625],
  [220, 550],
  [140, 385],
  [175, 230],
];
function catmull(a, b, c, d, t) {
  return (
    b +
    0.5 *
      t *
      (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)))
  );
}
export const track = points.flatMap((b, i) => {
  const a = points[(i + points.length - 1) % points.length];
  const c = points[(i + 1) % points.length];
  const d = points[(i + 2) % points.length];
  return Array.from({ length: 20 }, (_, j) => ({
    x: catmull(a[0], b[0], c[0], d[0], j / 20),
    y: catmull(a[1], b[1], c[1], d[1], j / 20),
  }));
});
export function tangent(index) {
  const a = track[(index + track.length - 1) % track.length];
  const b = track[(index + 1) % track.length];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
}
export const gates = [0, 60, 120, 180].map((index) => ({
  ...track[index],
  ...{ tangent: tangent(index) },
  index,
}));
export function nearest(position) {
  let best = { distance: Infinity };
  for (let i = 0; i < track.length; i++) {
    const a = track[i],
      b = track[(i + 1) % track.length];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const amount = Math.max(
      0,
      Math.min(
        1,
        ((position.x - a.x) * dx + (position.y - a.y) * dy) /
          (dx * dx + dy * dy),
      ),
    );
    const x = a.x + dx * amount,
      y = a.y + dy * amount;
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance < best.distance) best = { x, y, distance, index: i, amount };
  }
  return best;
}
export function crossesGate(before, after, gate) {
  const signed = (p) =>
    (p.x - gate.x) * gate.tangent.x + (p.y - gate.y) * gate.tangent.y;
  const a = signed(before),
    b = signed(after);
  if (a >= 0 || b < 0 || b - a < 0.000001) return false;
  const t = -a / (b - a);
  const x = before.x + (after.x - before.x) * t - gate.x;
  const y = before.y + (after.y - before.y) * t - gate.y;
  return Math.abs(x * -gate.tangent.y + y * gate.tangent.x) < ROAD_WIDTH / 2;
}
