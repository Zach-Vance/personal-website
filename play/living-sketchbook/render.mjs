import { PALETTES } from "./document.mjs";
export function paintArtwork(ctx, doc, geometry, time, width, height) {
  const palette = PALETTES[doc.palette],
    W = 1200,
    H = 800;
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / W, height / H),
    ox = (width - W * scale) / 2,
    oy = (height - H * scale) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  // A restrained paper grain, stable across redraws and export sizes.
  ctx.fillStyle = "#344d3810";
  for (let i = 0; i < 300; i++) {
    const x = (i * 137.51) % W,
      y = (i * 231.73) % H;
    ctx.fillRect(x, y, 0.8, 0.8);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of doc.strokes) {
    ctx.beginPath();
    stroke.forEach(([x, y], i) =>
      i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H),
    );
    ctx.strokeStyle = palette.colors[0];
    ctx.globalAlpha = doc.mode === "botanical" ? 0.65 : 0.2;
    ctx.lineWidth = doc.mode === "botanical" ? 1.5 : 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (doc.mode === "botanical") {
    for (const branch of geometry.branches) {
      ctx.beginPath();
      ctx.moveTo(branch.start[0] * W, branch.start[1] * H);
      ctx.quadraticCurveTo(
        branch.bend[0] * W,
        branch.bend[1] * H,
        branch.end[0] * W,
        branch.end[1] * H,
      );
      ctx.strokeStyle = palette.colors[branch.color];
      ctx.lineWidth = branch.width;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
    }
    for (const leaf of geometry.leaves) {
      const sway = Math.sin(time * 0.7 + leaf.phase) * 0.045;
      ctx.save();
      ctx.translate(leaf.x * W, leaf.y * H);
      ctx.rotate(leaf.angle + sway);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(leaf.length * 0.45, -leaf.width, leaf.length, 0);
      ctx.quadraticCurveTo(leaf.length * 0.45, leaf.width, 0, 0);
      ctx.fillStyle = palette.colors[leaf.color];
      ctx.globalAlpha = 0.72;
      ctx.fill();
      ctx.restore();
    }
  } else {
    for (const particle of geometry.particles) {
      const phase = particle.phase + time * particle.speed;
      const tangent = Math.sin(phase * 0.7) * particle.spread * 0.7,
        normal = Math.cos(phase) * particle.spread;
      const x =
        particle.x * W +
        Math.cos(particle.angle) * tangent -
        Math.sin(particle.angle) * normal;
      const y =
        particle.y * H +
        Math.sin(particle.angle) * tangent +
        Math.cos(particle.angle) * normal;
      ctx.strokeStyle = palette.colors[particle.color];
      ctx.globalAlpha = 0.18 + 0.35 * (0.5 + 0.5 * Math.sin(phase));
      ctx.lineWidth = particle.size;
      const angle = particle.angle + phase * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(
        x + Math.cos(angle) * 6 - Math.sin(phase) * 3,
        y + Math.sin(angle) * 6 + Math.cos(phase) * 3,
        x + Math.cos(angle) * 13,
        y + Math.sin(angle) * 13,
      );
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.restore();
}
export function createSketchRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas unavailable");
  let width = 0,
    height = 0;
  return {
    resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    draw(doc, geometry, time) {
      if (!width) this.resize();
      paintArtwork(ctx, doc, geometry, time, width, height);
    },
    point(event) {
      const r = canvas.getBoundingClientRect(),
        scale = Math.min(r.width / 1200, r.height / 800),
        ox = (r.width - 1200 * scale) / 2,
        oy = (r.height - 800 * scale) / 2;
      const x = (event.clientX - r.left - ox) / scale / 1200,
        y = (event.clientY - r.top - oy) / scale / 800;
      return x >= 0 && x <= 1 && y >= 0 && y <= 1
        ? [x, y, event.pressure > 0 ? event.pressure : 0.5]
        : null;
    },
  };
}
