import { track, gates, tangent, WIDTH, HEIGHT, ROAD_WIDTH } from "./track.mjs";
import { wrapAngle } from "./simulation.mjs";

export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const background = document.createElement("canvas");
  background.width = WIDTH * 1.5;
  background.height = HEIGHT * 1.5;
  const bg = background.getContext("2d");
  bg.scale(1.5, 1.5);
  bg.fillStyle = "#10151b";
  bg.fillRect(0, 0, WIDTH, HEIGHT);
  const light = bg.createRadialGradient(650, 350, 20, 650, 350, 720);
  light.addColorStop(0, "#1b2829");
  light.addColorStop(1, "#0b1017");
  bg.fillStyle = light;
  bg.fillRect(0, 0, WIDTH, HEIGHT);
  bg.fillStyle = "#ffffff0c";
  for (let x = 16; x < WIDTH; x += 28)
    for (let y = 16; y < HEIGHT; y += 28) bg.fillRect(x, y, 1, 1);
  bg.save();
  bg.translate(592, 352);
  bg.rotate(-0.1);
  bg.fillStyle = "#d6efb10b";
  bg.font = "italic 78px Georgia";
  bg.textAlign = "center";
  bg.fillText("Take the", 0, -2);
  bg.fillText("long way.", 0, 75);
  bg.restore();
  bg.beginPath();
  track.forEach((p, i) => (i ? bg.lineTo(p.x, p.y) : bg.moveTo(p.x, p.y)));
  bg.closePath();
  bg.lineJoin = "round";
  bg.lineCap = "round";
  bg.shadowColor = "#cbff65";
  bg.shadowBlur = 22;
  bg.strokeStyle = "#b7e85770";
  bg.lineWidth = ROAD_WIDTH + 4;
  bg.stroke();
  bg.shadowBlur = 0;
  bg.strokeStyle = "#d0ed87";
  bg.lineWidth = ROAD_WIDTH + 1;
  bg.stroke();
  bg.strokeStyle = "#20282e";
  bg.lineWidth = ROAD_WIDTH - 4;
  bg.stroke();
  bg.strokeStyle = "#151e24";
  bg.lineWidth = ROAD_WIDTH - 16;
  bg.stroke();
  bg.strokeStyle = "#bdcdb016";
  bg.lineWidth = 1.3;
  bg.setLineDash([10, 15]);
  bg.stroke();
  bg.setLineDash([]);
  for (let i = 0; i < track.length; i += 8) {
    const p = track[i],
      t = tangent(i);
    for (const side of [-1, 1]) {
      bg.beginPath();
      bg.arc(
        p.x - t.y * (ROAD_WIDTH / 2 + 7) * side,
        p.y + t.x * (ROAD_WIDTH / 2 + 7) * side,
        1.7,
        0,
        Math.PI * 2,
      );
      bg.fillStyle = i % 16 ? "#b9d97d" : "#bd9ff3";
      bg.fill();
    }
  }
  const start = gates[0];
  bg.save();
  bg.translate(start.x, start.y);
  bg.rotate(Math.atan2(start.tangent.y, start.tangent.x));
  for (let i = -5; i <= 4; i++)
    for (let j = 0; j < 2; j++) {
      bg.fillStyle = (i + j) % 2 ? "#d7e2d4" : "#34403d";
      bg.fillRect(j * 7 - 7, i * 11, 7, 11);
    }
  bg.restore();
  bg.font = "11px Consolas, monospace";
  bg.fillStyle = "#91a097";
  bg.fillText("START / FINISH", 270, 61);
  bg.fillStyle = "#b9c3ae";
  bg.font = "12px Consolas, monospace";
  bg.fillText("SC—01", 100, 710);
  bg.fillStyle = "#627474";
  bg.fillText("AFTER HOURS CIRCUIT", 163, 710);

  let width = 0,
    height = 0,
    reduced = false;
  let camera = { x: WIDTH / 2, y: HEIGHT / 2, zoom: 1 };
  let trails = [],
    trailTick = -1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawCar(pose, ghost = false) {
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.angle);
    if (ghost) ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#060c11";
    for (const x of [-10, 7])
      for (const y of [-10, 8]) ctx.fillRect(x, y, 7, 3);
    ctx.shadowColor = ghost ? "#c7a2ff" : "#dfff84";
    ctx.shadowBlur = reduced ? 0 : ghost ? 12 : 8;
    ctx.fillStyle = ghost ? "#bb98f0" : "#e6efdb";
    ctx.beginPath();
    ctx.roundRect(-15, -8, 31, 16, 4);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#27363c";
    ctx.fillRect(-2, -6, 9, 12);
    ctx.fillStyle = ghost ? "#8f6bb7" : "#b8d46a";
    ctx.fillRect(-11, -7, 4, 14);
    ctx.fillStyle = "#fcfff0";
    ctx.fillRect(13, -7, 3, 4);
    ctx.fillRect(13, 3, 3, 4);
    ctx.fillStyle = "#f89aa8";
    ctx.fillRect(-15, -6, 2, 3);
    ctx.fillRect(-15, 3, 2, 3);
    ctx.restore();
  }
  return {
    resize,
    reset() {
      trails = [];
      trailTick = -1;
    },
    setReduced(value) {
      reduced = value;
      if (value) trails = [];
    },
    draw(race, ghost, phase, previous, alpha = 1) {
      if (!width || !height) resize();
      const car =
        previous && phase === "running"
          ? {
              ...race.car,
              x: previous.x + (race.car.x - previous.x) * alpha,
              y: previous.y + (race.car.y - previous.y) * alpha,
              angle: wrapAngle(
                previous.angle +
                  wrapAngle(race.car.angle - previous.angle) * alpha,
              ),
            }
          : race.car;
      const overview = Math.min(width / WIDTH, height / HEIGHT);
      const follow =
        width < 650 && ["running", "countdown", "paused"].includes(phase);
      const zoom = follow ? Math.max(overview, width / 590) : overview;
      const halfW = width / zoom / 2,
        halfH = height / zoom / 2;
      const targetX = follow
        ? Math.max(halfW, Math.min(WIDTH - halfW, car.x))
        : WIDTH / 2;
      const targetY = follow
        ? Math.max(halfH, Math.min(HEIGHT - halfH, car.y))
        : HEIGHT / 2;
      camera.x += (targetX - camera.x) * 0.16;
      camera.y += (targetY - camera.y) * 0.16;
      camera.zoom += (zoom - camera.zoom) * 0.12;
      if (!follow) camera = { x: WIDTH / 2, y: HEIGHT / 2, zoom };
      ctx.fillStyle = "#0b1017";
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-camera.x, -camera.y);
      ctx.drawImage(background, 0, 0, WIDTH, HEIGHT);
      if (
        !reduced &&
        phase === "running" &&
        race.ticks !== trailTick &&
        race.ticks % 2 === 0
      ) {
        const last = trails.at(-1);
        if (
          race.car.slip > 17 &&
          last &&
          Math.hypot(last.x - car.x, last.y - car.y) < 30
        ) {
          last.toX = car.x;
          last.toY = car.y;
        }
        trails.push({ x: car.x, y: car.y, angle: car.angle, tick: race.ticks });
        if (trails.length > 600) trails.shift();
        trailTick = race.ticks;
      }
      if (!reduced) {
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let age = 0; age < 4; age++) {
          ctx.strokeStyle = `rgba(184,220,139,${0.18 - age * 0.04})`;
          ctx.beginPath();
          for (const segment of trails) {
            if (
              segment.toX === undefined ||
              Math.floor((race.ticks - segment.tick) / 90) !== age
            )
              continue;
            for (const side of [-6, 6]) {
              const dx = -Math.sin(segment.angle) * side,
                dy = Math.cos(segment.angle) * side;
              ctx.moveTo(segment.x + dx, segment.y + dy);
              ctx.lineTo(segment.toX + dx, segment.toY + dy);
            }
          }
          ctx.stroke();
        }
      }
      if (phase === "running") {
        const gate = gates[race.nextGate];
        const nx = -gate.tangent.y,
          ny = gate.tangent.x;
        ctx.strokeStyle = "#e7ff9455";
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 7]);
        ctx.beginPath();
        ctx.moveTo(gate.x - nx * 47, gate.y - ny * 47);
        ctx.lineTo(gate.x + nx * 47, gate.y + ny * 47);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (ghost) drawCar(ghost, true);
      drawCar(car);
      ctx.restore();
      if (follow) {
        const mapW = 120,
          mapH = (mapW * HEIGHT) / WIDTH;
        ctx.globalAlpha = 0.88;
        ctx.drawImage(background, width - mapW - 14, 14, mapW, mapH);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#efffc3";
        ctx.beginPath();
        ctx.arc(
          width - mapW - 14 + (car.x / WIDTH) * mapW,
          14 + (car.y / HEIGHT) * mapH,
          2.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
  };
}
