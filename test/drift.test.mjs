import test from "node:test";
import assert from "node:assert/strict";
import {
  createRace,
  createClock,
  stepRace,
  stepCar,
  STEP,
  wrapAngle,
} from "../play/neon-drift/simulation.mjs";
import {
  nearest,
  track,
  gates,
  crossesGate,
  ROAD_WIDTH,
} from "../play/neon-drift/track.mjs";
import {
  makeRecord,
  validRecord,
  poseAt,
  loadBest,
  saveBest,
} from "../play/neon-drift/replay.mjs";

function driveCircuit() {
  const race = createRace();
  const frames = [[0, race.car.x, race.car.y, race.car.angle]];
  while (!race.finished && !race.timedOut) {
    const close = nearest(race.car),
      target = track[(close.index + 9) % track.length];
    const error = wrapAngle(
      Math.atan2(target.y - race.car.y, target.x - race.car.x) - race.car.angle,
    );
    const speed = Math.hypot(race.car.vx, race.car.vy);
    const desired = 190 - Math.min(90, Math.abs(error) * 90);
    stepRace(race, {
      throttle: speed < desired ? 1 : 0,
      brake: speed > desired + 20 ? 0.3 : 0,
      steer: Math.max(-1, Math.min(1, error * 2.2)),
    });
    if (race.ticks % 2 === 0)
      frames.push([race.time, race.car.x, race.car.y, race.car.angle]);
  }
  if (frames.at(-1)[0] !== race.time)
    frames.push([race.time, race.car.x, race.car.y, race.car.angle]);
  return { race, record: makeRecord(race.time, frames) };
}

test("a complete driven circuit produces two validated laps and a usable ghost", () => {
  const { race, record } = driveCircuit();
  assert.equal(race.finished, true);
  assert.equal(race.laps, 2);
  assert.equal(race.timedOut, false);
  assert.ok(validRecord(record));
  const middle = poseAt(record, record.duration / 2);
  assert.ok(Number.isFinite(middle.x) && Number.isFinite(middle.y));
  const finished = structuredClone(race);
  stepRace(race, { throttle: 1 });
  assert.deepEqual(race, finished);
});
test("checkpoint crossings require forward travel within the track", () => {
  const g = gates[0],
    t = g.tangent;
  const before = { x: g.x - t.x * 10, y: g.y - t.y * 10 };
  const after = { x: g.x + t.x * 10, y: g.y + t.y * 10 };
  assert.ok(crossesGate(before, after, g));
  assert.ok(!crossesGate(after, before, g));
  const offset = (p) => ({
    x: p.x - t.y * ROAD_WIDTH,
    y: p.y + t.x * ROAD_WIDTH,
  });
  assert.ok(!crossesGate(offset(before), offset(after), g));
  const race = createRace();
  Object.assign(race.car, before, { vx: t.x * 300, vy: t.y * 300 });
  for (let i = 0; i < 5; i++) stepRace(race, {});
  assert.equal(
    race.laps,
    0,
    "crossing the finish without the other gates is not a lap",
  );
});
test("fixed simulation clock gives the same driving result at 60 and 144 render frames per second", () => {
  function run(rate) {
    const race = createRace(),
      clock = createClock();
    for (let frame = 0; frame < rate * 10; frame++)
      clock.advance(1 / rate, () =>
        stepRace(race, { throttle: 1, steer: 0.3 }),
      );
    return race;
  }
  assert.deepEqual(run(60), run(144));
  const clock = createClock();
  let ticks = 0;
  clock.advance(30, () => ticks++);
  assert.equal(
    ticks,
    5,
    "a stalled frame cannot create unlimited catch-up work",
  );
  clock.reset();
  clock.advance(0, () => ticks++);
  assert.equal(ticks, 5);
});
test("barriers keep a hard-driven car finite and inside the circuit", () => {
  const car = createRace().car;
  for (let tick = 0; tick < 2400; tick++) {
    stepCar(car, {
      throttle: 1,
      steer: Math.sin(tick / 110),
      drift: tick % 150 < 70,
    });
    assert.ok([car.x, car.y, car.vx, car.vy, car.angle].every(Number.isFinite));
    assert.ok(nearest(car).distance <= ROAD_WIDTH / 2 - 12 + 1e-7);
  }
});
test("an unfinished run times out and stops without an unbounded recording", () => {
  const race = createRace();
  for (let i = 0; i < 10810; i++) stepRace(race, {});
  assert.equal(race.timedOut, true);
  assert.equal(race.finished, false);
  assert.equal(race.time, 180);
  assert.equal(race.ticks, 180 / STEP);
});
test("replay validation rejects outdated, malformed, non-finite, and oversized records", () => {
  const good = makeRecord(12, [
    [0, 310, 145, 0],
    [12, 310, 145, 0],
  ]);
  assert.ok(validRecord(good));
  for (const bad of [
    { ...good, track: "old-track" },
    { ...good, physics: -1 },
    { ...good, laps: 1 },
    { ...good, duration: Infinity },
    { ...good, duration: 181 },
    {
      ...good,
      frames: [
        [0, NaN, 145, 0],
        [12, 310, 145, 0],
      ],
    },
    {
      ...good,
      frames: [
        [0, 310, 145, 0],
        [0, 310, 145, 0],
      ],
    },
    { ...good, frames: Array(5500).fill([0, 310, 145, 0]) },
  ])
    assert.ok(!validRecord(bad));
  assert.equal(loadBest({ getItem: () => "broken json" }), null);
  assert.equal(
    loadBest({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    null,
  );
  assert.equal(
    saveBest(
      {
        setItem: () => {
          throw Error("quota");
        },
      },
      good,
    ),
    false,
  );
});
test("ghost interpolation takes the short rotation path and respects run boundaries", () => {
  const record = makeRecord(12, [
    [0, 100, 100, 3.1],
    [12, 200, 200, -3.1],
  ]);
  const middle = poseAt(record, 6);
  assert.equal(middle.x, 150);
  assert.equal(middle.y, 150);
  assert.ok(Math.abs(middle.angle) > 3);
  assert.equal(poseAt(record, -1), null);
  assert.equal(poseAt(record, 13), null);
});
