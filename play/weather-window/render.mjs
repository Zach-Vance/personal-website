const mix = (a, b, t) =>
  `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
export function createWeatherRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas unavailable");
  let width, height;
  const W = 1200,
    H = 700;
  function path(points, fill) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
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
    draw(scene) {
      if (!width) this.resize();
      const { light, rain, wind } = scene.params,
        time = scene.time;
      const scale = Math.max(width / W, height / H);
      ctx.save();
      ctx.translate((width - W * scale) / 2, (height - H * scale) * 0.48);
      ctx.scale(scale, scale);
      const sky = ctx.createLinearGradient(0, 0, 0, 430);
      sky.addColorStop(0, mix([18, 34, 56], [117, 174, 183], light));
      sky.addColorStop(0.65, mix([44, 58, 77], [192, 212, 196], light));
      sky.addColorStop(
        1,
        mix([78, 76, 91], [245, 215, 170], Math.min(1, light * 1.6)),
      );
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, 1 - light * 3.5) * (1 - rain * 0.7);
      ctx.fillStyle = "#e9ece0";
      for (const star of scene.stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const sunX = 860,
        sunY = light > 0.14 ? 310 - light * 205 : 135;
      const glow = ctx.createRadialGradient(
        sunX,
        sunY,
        5,
        sunX,
        sunY,
        light > 0.14 ? 190 : 110,
      );
      glow.addColorStop(
        0,
        light > 0.14
          ? `rgba(255,229,169,${0.3 * (1 - rain * 0.7)})`
          : "#d9e5ee1c",
      );
      glow.addColorStop(1, "#ffffff00");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, 440);
      ctx.globalAlpha = 1 - rain * 0.6;
      ctx.fillStyle = light > 0.14 ? "#f9e3b6" : "#e1e9e0";
      ctx.beginPath();
      ctx.arc(sunX, sunY, light > 0.14 ? 30 : 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      for (const cloud of scene.clouds) {
        const x =
          ((((cloud.x + time * wind * 12 + 200) % 1600) + 1600) % 1600) - 200;
        ctx.fillStyle = mix(
          [44, 55, 72],
          [217, 227, 218],
          light * (1 - rain * 0.6),
        );
        ctx.globalAlpha = 0.25 + rain * 0.35;
        ctx.beginPath();
        ctx.ellipse(
          x,
          cloud.y,
          125 * cloud.size,
          14 * cloud.size,
          0,
          0,
          Math.PI * 2,
        );
        ctx.moveTo(x + 135 * cloud.size, cloud.y - 12);
        ctx.ellipse(
          x + 60 * cloud.size,
          cloud.y - 12,
          75 * cloud.size,
          24 * cloud.size,
          0,
          0,
          Math.PI * 2,
        );
        ctx.moveTo(x + 20 * cloud.size, cloud.y - 9);
        ctx.ellipse(
          x - 42 * cloud.size,
          cloud.y - 9,
          62 * cloud.size,
          19 * cloud.size,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      path(
        [
          [0, 331],
          [100, 301],
          [205, 326],
          [330, 293],
          [448, 320],
          [590, 305],
          [738, 334],
          [900, 303],
          [1060, 327],
          [1200, 298],
          [1200, 440],
          [0, 440],
        ],
        mix([44, 64, 70], [126, 159, 147], light),
      );
      path(
        [
          [0, 370],
          [90, 348],
          [250, 375],
          [400, 341],
          [545, 365],
          [680, 350],
          [850, 376],
          [1030, 345],
          [1200, 361],
          [1200, 440],
          [0, 440],
        ],
        mix([34, 60, 65], [93, 140, 120], light),
      );
      const water = ctx.createLinearGradient(0, 360, 0, H);
      water.addColorStop(0, mix([57, 82, 93], [151, 184, 172], light));
      water.addColorStop(1, mix([17, 42, 53], [70, 128, 124], light));
      ctx.fillStyle = water;
      ctx.fillRect(0, 376, W, H - 376);
      // Tidal banks and a reflective channel.
      path(
        [
          [0, 369],
          [180, 391],
          [350, 410],
          [525, 454],
          [640, 479],
          [517, 516],
          [352, 543],
          [195, 612],
          [0, 656],
        ],
        mix([30, 54, 52], [87, 124, 90], light),
      );
      path(
        [
          [1200, 375],
          [1030, 391],
          [832, 422],
          [752, 458],
          [820, 485],
          [1040, 518],
          [1200, 566],
        ],
        mix([27, 52, 52], [76, 118, 92], light),
      );
      path(
        [
          [0, 503],
          [160, 506],
          [308, 528],
          [355, 542],
          [215, 574],
          [0, 640],
        ],
        mix([31, 58, 53], [102, 137, 90], light),
      );
      for (let i = 0; i < 60; i++) {
        const y = 392 + i * 5.1,
          x =
            600 + Math.sin(i * 5.3) * 470 + Math.sin(time * 0.5 + i) * wind * 7;
        ctx.strokeStyle = `rgba(225,230,198,${(0.07 + light * 0.08) * (1 - i / 90)})`;
        ctx.lineWidth = i < 20 ? 1 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 16 + (i % 7) * 5, y);
        ctx.stroke();
      }
      // Reeds give the foreground a slower, closer layer of movement.
      for (let i = 0; i < 48; i++) {
        const x = i * 28 - 30,
          y = H + 10,
          lean = Math.sin(time * 0.8 + i * 0.3) * wind * 10;
        ctx.strokeStyle = mix([14, 37, 38], [45, 81, 57], light);
        ctx.lineWidth = 2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
          x + lean,
          y - 30,
          x + 13 + lean,
          y - 45 - (i % 7) * 8,
        );
        ctx.stroke();
      }
      // Rain outside the window.
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(211,231,226,${0.12 + rain * 0.18})`;
      ctx.beginPath();
      for (const drop of scene.drops.slice(0, Math.ceil(rain * 280))) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + wind * 12 * drop.size, drop.y + 18 * drop.size);
      }
      ctx.stroke();
      // A few larger droplets on the glass, drawn without an external texture.
      for (let i = 0; i < Math.ceil(rain * 45); i++) {
        const drop = scene.drops[(i * 5) % 280],
          x = (drop.x * 1.23 + W) % W,
          y = (drop.y * 0.38 + i * 19) % H;
        ctx.fillStyle = "#d3e6df14";
        ctx.strokeStyle = "#e1f2e73a";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          2 + drop.size * 2,
          5 + drop.size * 6,
          wind * -0.15,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
      // Window frame, soft reflection, and sill remain fixed while the world moves.
      const reflection = ctx.createLinearGradient(0, 0, W, H);
      reflection.addColorStop(0, "#e8f5ee0d");
      reflection.addColorStop(0.4, "#ffffff00");
      reflection.addColorStop(1, "#c8e9de12");
      ctx.fillStyle = reflection;
      ctx.fillRect(0, 0, W, H);
      ctx.shadowColor = "#0d272c66";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#263e3e";
      ctx.fillRect(0, 0, 12, H);
      ctx.fillRect(W - 12, 0, 12, H);
      ctx.fillRect(0, 0, W, 12);
      ctx.fillRect(W * 0.333 - 4, 0, 8, H);
      ctx.fillRect(W * 0.666 - 4, 0, 8, H);
      ctx.fillRect(0, H - 15, W, 15);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#6e857866";
      ctx.fillRect(W * 0.333 - 4, 0, 1, H);
      ctx.fillRect(W * 0.666 - 4, 0, 1, H);
      ctx.fillRect(12, H - 16, W - 24, 1);
      ctx.restore();
    },
  };
}
