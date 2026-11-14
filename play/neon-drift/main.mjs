import {
  createRace,
  createClock,
  stepRace,
  formatTime,
} from "./simulation.mjs";
import { createRenderer } from "./render.mjs";
import { loadBest, saveBest, makeRecord, poseAt, SAVE_KEY } from "./replay.mjs";

const $ = (id) => document.getElementById(id);
const canvas = $("race-canvas"),
  stage = $("stage"),
  overlay = $("overlay");
const start = $("start"),
  pause = $("pause"),
  restart = $("restart");
const ghostToggle = $("ghost"),
  reducedToggle = $("reduced");
const announcement = $("announcement"),
  countdown = $("countdown");
let renderer;
try {
  renderer = createRenderer(canvas);
} catch {
  $("overlay-title").textContent = "A quiet night.";
  $("overlay-description").textContent =
    "This browser couldn’t start the drawing surface. Explore the portfolio using the navigation above.";
  start.textContent = "Canvas unavailable";
}
if (renderer) initialize();

function initialize() {
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* Private/blocked storage: session play still works. */
  }
  let best = loadBest(storage),
    raceGhost = best;
  let race = createRace(),
    previous = { ...race.car },
    frames = [];
  let phase = "ready",
    resumePhase = "running",
    remaining = 3,
    announcedCount = 0;
  let raf = null,
    last = null,
    alpha = 1,
    lastHud = -1;
  const clock = createClock(),
    keys = new Set(),
    pointers = new Map();
  const buttons = [...document.querySelectorAll("[data-control]")];
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  reducedToggle.checked = motionPreference.matches;
  renderer.setReduced(reducedToggle.checked);

  function syncBest() {
    $("best").textContent = best ? formatTime(best.duration) : "—";
    ghostToggle.disabled = !best;
    ghostToggle.title = best
      ? "Race the fastest completed run saved on this browser"
      : "Complete a run to create your ghost";
  }
  function clearInput() {
    keys.clear();
    pointers.clear();
    buttons.forEach((button) => button.classList.remove("held"));
  }
  function controls() {
    const held = new Set([...pointers.values()]);
    return {
      throttle: Number(
        keys.has("w") || keys.has("arrowup") || held.has("throttle"),
      ),
      brake: Number(
        keys.has("s") || keys.has("arrowdown") || held.has("brake"),
      ),
      steer:
        Number(keys.has("d") || keys.has("arrowright") || held.has("right")) -
        Number(keys.has("a") || keys.has("arrowleft") || held.has("left")),
      drift: keys.has(" ") || held.has("drift"),
    };
  }
  function hud(force = false) {
    const tenth = Math.floor(race.time * 10);
    if (!force && tenth === lastHud) return;
    lastHud = tenth;
    $("time").textContent = formatTime(race.time);
    $("lap").firstChild.nodeValue =
      `${String(Math.min(race.laps + 1, 2)).padStart(2, "0")} `;
    $("pace").textContent = String(
      Math.min(100, Math.round(Math.hypot(race.car.vx, race.car.vy) / 3.5)),
    ).padStart(3, "0");
  }
  function draw() {
    const ghost =
      ghostToggle.checked && raceGhost && ["running", "paused"].includes(phase)
        ? poseAt(raceGhost, race.time)
        : null;
    renderer.draw(race, ghost, phase, previous, alpha);
  }
  function schedule() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }
  function stopLoop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    last = null;
    clock.reset();
    alpha = 1;
  }
  function showOverlay(kicker, title, description, buttonText, foot) {
    $("overlay-kicker").textContent = kicker;
    $("overlay-title").textContent = title;
    $("overlay-description").textContent = description;
    start.replaceChildren(document.createTextNode(buttonText + " "));
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    start.append(arrow);
    $("overlay-foot").textContent = foot;
    overlay.hidden = false;
    countdown.hidden = true;
    $("touch-controls").hidden = true;
  }
  function begin() {
    document
      .querySelector(".race-shell")
      .scrollIntoView({ block: "start", behavior: "instant" });
    stopLoop();
    clearInput();
    race = createRace();
    previous = { ...race.car };
    frames = [[0, race.car.x, race.car.y, race.car.angle]];
    raceGhost = best;
    renderer.reset();
    remaining = 3;
    announcedCount = 0;
    phase = "countdown";
    overlay.hidden = true;
    countdown.hidden = false;
    countdown.textContent = "3";
    pause.disabled = false;
    restart.disabled = false;
    pause.innerHTML = "Ⅱ <span>Pause</span>";
    pause.setAttribute("aria-label", "Pause game");
    $("race-state").textContent = "FIND YOUR LINE";
    announcement.textContent =
      "Get ready. Two laps, following the track clockwise.";
    hud(true);
    canvas.focus({ preventScroll: true });
    schedule();
  }
  function pauseGame() {
    if (!["running", "countdown"].includes(phase)) return;
    resumePhase = phase;
    phase = "paused";
    stopLoop();
    clearInput();
    $("race-state").textContent = "TAKE A BREATHER";
    showOverlay(
      "NO RUSH",
      "A moment in neutral.",
      "Your run is paused. The clock is stopped.",
      "Back to the circuit",
      "Press P / Escape to resume · R to start again",
    );
    announcement.textContent = "Game paused. The clock is stopped.";
    pause.innerHTML = "▶ <span>Resume</span>";
    pause.setAttribute("aria-label", "Resume game");
    draw();
  }
  function resume() {
    if (phase !== "paused") return;
    phase = resumePhase;
    overlay.hidden = true;
    countdown.hidden = phase !== "countdown";
    $("touch-controls").hidden = phase !== "running";
    $("race-state").textContent =
      phase === "running" ? "MAKE IT FLOW" : "FIND YOUR LINE";
    pause.innerHTML = "Ⅱ <span>Pause</span>";
    pause.setAttribute("aria-label", "Pause game");
    previous = { ...race.car };
    canvas.focus({ preventScroll: true });
    announcement.textContent = "Game resumed.";
    schedule();
  }
  function finish() {
    stopLoop();
    clearInput();
    hud(true);
    pause.disabled = true;
    if (race.timedOut) {
      phase = "timeout";
      showOverlay(
        "A FRESH START",
        "One more lap?",
        "This run reached the three-minute limit. Your saved best is safe. Take another shot at the circuit.",
        "Try again",
        "Brake early. Steer smoothly. Find your flow.",
      );
      $("race-state").textContent = "NEXT RUN, NEW LINE";
      announcement.textContent =
        "Run ended at the three-minute limit. Try again.";
    } else {
      phase = "finished";
      if (frames.at(-1)[0] !== race.time)
        frames.push([race.time, race.car.x, race.car.y, race.car.angle]);
      const improved = !best || race.time < best.duration;
      let saved = true;
      if (improved) {
        best = makeRecord(race.time, frames);
        saved = saveBest(storage, best);
        syncBest();
        $("save-note").textContent = saved
          ? "Your best run and ghost are saved on this browser."
          : "Browser storage is unavailable. Your best and ghost are available for this session.";
      }
      const result = `Two laps in ${formatTime(race.time)}. ${improved ? "A new personal best." : `Your best is ${formatTime(best.duration)}.`}`;
      showOverlay(
        improved ? "THAT’S YOUR NEW GHOST" : "ANOTHER LINE THROUGH THE NIGHT",
        improved ? "Nicely driven." : "Chase a better line.",
        result,
        "Race again",
        improved
          ? saved
            ? "Ghost saved locally. There’s always another second to find."
            : "Ghost available this session. No storage needed to play."
          : "Brake before the corner. Accelerate out of it.",
      );
      $("race-state").textContent = "TWO LAPS. WELL PLAYED.";
      announcement.textContent = result;
    }
    draw();
    start.focus({ preventScroll: true });
  }
  function frame(timestamp) {
    raf = null;
    const elapsed = last === null ? 0 : Math.max(0, (timestamp - last) / 1000);
    last = timestamp;
    if (phase === "countdown") {
      remaining -= Math.min(elapsed, 0.1);
      const count = Math.max(1, Math.ceil(remaining));
      countdown.textContent = count;
      if (announcedCount !== count) {
        announcement.textContent = `${count}.`;
        announcedCount = count;
      }
      if (remaining <= 0) {
        phase = "running";
        countdown.hidden = true;
        $("touch-controls").hidden = false;
        $("race-state").textContent = "MAKE IT FLOW";
        announcement.textContent = "Go. Complete two laps.";
        clock.reset();
      }
    } else if (phase === "running") {
      alpha = clock.advance(elapsed, () => {
        if (race.finished || race.timedOut) return;
        previous = { ...race.car };
        const priorLap = race.laps;
        stepRace(race, controls());
        if (race.ticks % 2 === 0 && frames.length < 5401)
          frames.push([race.time, race.car.x, race.car.y, race.car.angle]);
        if (race.laps !== priorLap && !race.finished)
          announcement.textContent = "Lap one complete. Final lap.";
      });
      hud();
      if (race.finished || race.timedOut) {
        finish();
        return;
      }
    }
    draw();
    if (["running", "countdown"].includes(phase)) schedule();
  }
  start.addEventListener("click", () =>
    phase === "paused" ? resume() : begin(),
  );
  pause.addEventListener("click", () =>
    phase === "paused" ? resume() : pauseGame(),
  );
  restart.addEventListener("click", begin);
  const drivingKeys = new Set([
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowleft",
    "arrowdown",
    "arrowright",
    " ",
  ]);
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const engaged =
      stage.contains(document.activeElement) ||
      document.activeElement === pause ||
      document.activeElement === restart;
    if (!engaged) return;
    const key = event.key.toLowerCase();
    if (drivingKeys.has(key) && ["running", "countdown"].includes(phase)) {
      event.preventDefault();
      keys.add(key);
    }
    if (!event.repeat && ["p", "escape"].includes(key)) {
      event.preventDefault();
      phase === "paused" ? resume() : pauseGame();
    }
    if (!event.repeat && key === "r" && phase !== "ready") {
      event.preventDefault();
      begin();
    }
  });
  window.addEventListener("keyup", (event) =>
    keys.delete(event.key.toLowerCase()),
  );
  window.addEventListener("blur", pauseGame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseGame();
  });
  canvas.addEventListener("blur", (event) => {
    // Moving to an in-game control is intentional; leaving the game pauses safely.
    if (event.relatedTarget && !event.relatedTarget.closest(".race-shell"))
      pauseGame();
    clearInput();
  });
  for (const button of buttons) {
    button.addEventListener("pointerdown", (event) => {
      if (phase !== "running") return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.control);
      button.classList.add("held");
    });
    const release = (event) => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(button.dataset.control))
        button.classList.remove("held");
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  }
  ghostToggle.addEventListener("change", draw);
  reducedToggle.addEventListener("change", () => {
    renderer.setReduced(reducedToggle.checked);
    draw();
  });
  motionPreference.addEventListener("change", (event) => {
    reducedToggle.checked = event.matches;
    renderer.setReduced(event.matches);
    draw();
  });
  $("clear-best").addEventListener("click", () => {
    best = null;
    raceGhost = null;
    try {
      storage?.removeItem(SAVE_KEY);
      $("save-note").textContent =
        "Saved best cleared. Complete a run to record a new ghost.";
    } catch {
      $("save-note").textContent =
        "Session best cleared. Browser storage could not be changed.";
    }
    syncBest();
    draw();
  });
  new ResizeObserver(() => {
    renderer.resize();
    draw();
  }).observe(stage);
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) pauseGame();
  }).observe(stage);
  syncBest();
  renderer.resize();
  draw();
  start.disabled = false;
  start.innerHTML = 'Drive the circuit <span aria-hidden="true">↗</span>';
}
