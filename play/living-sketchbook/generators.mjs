import { randomFrom } from "../shared/random.mjs";
export function generate(doc) {
  const random = randomFrom(doc.seed),
    branches = [],
    leaves = [],
    particles = [];
  const W = 1200,
    H = 800;
  for (const stroke of doc.strokes) {
    if (doc.mode === "botanical") {
      for (let i = 3; i < stroke.length - 1; i += 3) {
        if (branches.length >= 400) break;
        const p = stroke[i],
          a = stroke[i - 2],
          b = stroke[Math.min(i + 1, stroke.length - 1)];
        const tangent = Math.atan2((b[1] - a[1]) * H, (b[0] - a[0]) * W);
        const side = i % 2 ? 1 : -1,
          angle = tangent + side * (0.55 + random() * 0.65);
        const length = (20 + random() * 63) * doc.growth * (0.6 + p[2] * 0.6);
        const end = [
          p[0] + (Math.cos(angle) * length) / W,
          p[1] + (Math.sin(angle) * length) / H,
        ];
        const bend = [
          (p[0] + end[0]) / 2 + Math.cos(angle + side * 0.7) * 0.009,
          (p[1] + end[1]) / 2 + Math.sin(angle + side * 0.7) * 0.009,
        ];
        branches.push({
          start: p,
          end,
          bend,
          width: 0.6 + random(),
          color: Math.floor(random() * 4),
        });
        const count = 3 + Math.floor(random() * 4);
        for (let j = 1; j <= count && leaves.length < 1800; j++) {
          const t = j / count,
            x = p[0] + (end[0] - p[0]) * t,
            y = p[1] + (end[1] - p[1]) * t;
          const direction = angle + (j % 2 ? 0.55 : -0.55);
          leaves.push({
            x,
            y,
            angle: direction,
            length: (14 + random() * 22) * doc.growth,
            width: (4 + random() * 7) * doc.growth,
            color: Math.floor(random() * 4),
            phase: random() * Math.PI * 2,
          });
        }
      }
    } else {
      const count = Math.min(
        1600 - particles.length,
        Math.max(200, stroke.length * 20),
      );
      for (let i = 0; i < count; i++) {
        const progress = random() * (stroke.length - 1),
          index = Math.min(stroke.length - 2, Math.floor(progress)),
          t = progress - index;
        const a = stroke[index],
          b = stroke[index + 1];
        particles.push({
          x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t,
          angle: Math.atan2((b[1] - a[1]) * H, (b[0] - a[0]) * W),
          spread: (12 + random() * 100) * doc.growth,
          phase: random() * Math.PI * 2,
          speed: 0.2 + random() * 0.6,
          size: 0.7 + random() * 1.8,
          color: Math.floor(random() * 4),
        });
      }
    }
  }
  return { branches, leaves, particles };
}
