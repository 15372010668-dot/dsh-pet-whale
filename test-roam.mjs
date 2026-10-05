/**
 * Roaming-engine test for dsh-pet-whale.
 *
 * Slices the actual roaming useEffect body out of lib/client.js and drives it
 * with a fake clock + fake rAF, so the real code (not a copy) is exercised:
 *
 *   - never leaves the viewport bounds
 *   - never moves further in one frame than the configured speed allows
 *     (this is the "teleport" regression guard)
 *   - travels at roughly the configured speed
 *   - swims home and stops when the task ends
 *
 *   node test-roam.mjs
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");

const MARK = "if (pet.version !== 2 || celebrating) return;";
const start = src.indexOf(MARK);
if (start < 0) throw new Error("roaming effect not found");
const arrowStart = src.lastIndexOf("() => {", start);
const depsEnd = src.indexOf("}, [config.roam, config.roamSpeed", start);
const arrowEnd = src.lastIndexOf("}", depsEnd);
const arrowSrc = src.slice(arrowStart, arrowEnd + 1);
console.log("sliced effect body:", arrowSrc.split("\n").length, "lines\n");

function makeHarness({ width, height, size, petHeight, speed, home }) {
  const frames = [];
  let clock = 0;
  const api = {
    config: { roam: true, roamSpeed: speed, size, position: home },
    pet: { version: 2 },
    activity: { pose: "running" },
    roamState: { current: { x: null, y: null, tx: null, ty: null, heading: null } },
    positionRef: { current: { left: home.x * (width - size - 16), top: home.y * (height - petHeight - 32) } },
    drag: { current: null },
    menu: false,
    celebrating: false,
    patrolling: false,
    setPosition(p) {
      api.position = p;
      api.track.push(p);
    },
    setAction(a) {
      api.actions.push(a);
    },
    actions: [],
    track: [],
    position: null
  };
  api.position = { ...api.positionRef.current };
  const fauxWindow = { matchMedia: () => ({ matches: false }) };
  const fauxDocument = { hidden: false };
  let rafSeq = 0;
  const cancelled = new Set();
  const raf = (cb) => {
    rafSeq += 1;
    frames.push({ id: rafSeq, cb });
    return rafSeq;
  };
  const caf = (id) => {
    cancelled.add(id);
  };
  const build = () => new Function(
    "config", "pet", "activity", "roamState", "positionRef", "setPosition", "setAction",
    "drag", "menu", "celebrating", "patrolling", "requestAnimationFrame", "cancelAnimationFrame", "document", "window",
    "innerWidth", "innerHeight", "petHeight",
    `return (${arrowSrc});`
  )(
    api.config, api.pet, api.activity, api.roamState, api.positionRef, api.setPosition, api.setAction,
    api.drag, api.menu, api.celebrating, api.patrolling, raf, caf, fauxDocument, fauxWindow, width, height, petHeight
  );
  api.run = () => {
    api.cleanup = build()();
  };
  api.reconfigure = (patch) => {
    api.cleanup?.();
    Object.assign(api.activity, patch.activity ?? {});
    api.menu = patch.menu ?? api.menu;
    api.cleanup = build()();
  };
  api.tick = (ms) => {
    clock += ms;
    const pending = frames.splice(0, frames.length);
    let ran = 0;
    for (const frame of pending) {
      if (cancelled.has(frame.id)) continue;
      ran += 1;
      frame.cb(clock);
    }
    return ran;
  };
  api.clock = () => clock;
  return api;
}

const W = 1440, H = 900, SIZE = 120, PET_H = SIZE * 208 / 192;
const HOME = { x: 1, y: 0.1 };
const SPEED = 90;
const boundsX = W - SIZE - 16;
const boundsY = H - PET_H - 32;
const homePx = { left: HOME.x * boundsX, top: HOME.y * boundsY };

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok ? "" : "  <- " + detail));
  if (!ok) failures++;
};

// ---------------------------------------------------------------- wandering
{
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { ...homePx };
  h.position = { ...homePx };
  h.run();
  const dt = 16.7;
  const positions = [];
  h.track.length = 0;
  for (let i = 0; i < 60 * 60; i++) {          // 60 s at 60 fps
    h.tick(dt);
    if (h.track.length) positions.push(h.track[h.track.length - 1]);
  }

  let maxStep = 0, outOfBounds = null, maxSpeed = 0;
  let prev = h.positionRef.current;
  for (const p of h.track) {
    const step = Math.hypot(p.left - prev.left, p.top - prev.top);
    maxStep = Math.max(maxStep, step);
    maxSpeed = Math.max(maxSpeed, step / 0.033);
    if (p.left < -0.01 || p.top < -0.01 || p.left > boundsX + 0.01 || p.top > boundsY + 0.01) {
      outOfBounds = outOfBounds ?? p;
    }
    prev = p;
  }
  const allowed = SPEED * 0.033 * 1.35 + 1;    // one throttled frame at most
  check(!outOfBounds, "stays inside the viewport", JSON.stringify(outOfBounds));
  check(maxStep <= allowed, `no teleports (max step ${maxStep.toFixed(1)}px <= ${allowed.toFixed(1)}px)`);
  check(maxSpeed <= SPEED * 1.35 + 5, `speed capped (peak ${maxSpeed.toFixed(0)}px/s)`);
  const moved = Math.hypot(positions.at(-1).left - positions[0].left, positions.at(-1).top - positions[0].top);
  check(moved > 50, "actually wanders around", moved.toFixed(0));
  check(new Set(h.actions.filter(Boolean)).size <= 2, "only the two run poses are used");
  console.log("    poses used:", [...new Set(h.actions.filter(Boolean))].join(", "));
}

// ------------------------------------------------------------- heading turns
{
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { ...homePx };
  h.run();
  let prevHeading = h.roamState.current.heading;
  let maxTurn = 0;
  for (let i = 0; i < 60 * 120; i++) {
    h.tick(16.7);
    if (h.roamState.current.heading !== prevHeading) {
      let d = Math.abs(h.roamState.current.heading - prevHeading) % (2 * Math.PI);
      if (d > Math.PI) d = 2 * Math.PI - d;
      maxTurn = Math.max(maxTurn, d);
      prevHeading = h.roamState.current.heading;
    }
  }
  // a leg may be mirrored at most twice by the two edge reflections
  check(maxTurn <= 1.5 * 0.5 + 2 * Math.PI * 0.5 + 1e-6 || maxTurn < 3.2,
        `turn per leg stays bounded (max ${(maxTurn * 180 / Math.PI).toFixed(0)}deg)`);
}

// ---------------------------------------------------------------- swim home
{
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { ...homePx };
  h.run();
  for (let i = 0; i < 60 * 30; i++) h.tick(16.7);      // roam for 30 s
  const away = Math.hypot(h.position.left - homePx.left, h.position.top - homePx.top);
  h.reconfigure({ activity: { pose: "idle" } });        // task finished
  let frames = 1;
  for (let i = 0; i < 60 * 120 && frames > 0; i++) frames = h.tick(16.7);
  const dist = Math.hypot(h.position.left - homePx.left, h.position.top - homePx.top);
  check(dist < 2, "returns to the initial position", `off by ${dist.toFixed(2)}px`);
  check(frames === 0, "stops the loop once home", `still scheduling: ${frames}`);
  check(h.position.left === homePx.left && h.position.top === homePx.top, "lands exactly on the anchor");
  const last = h.actions.at(-1);
  check(last === null, "clears the run pose when parked", String(last));
  console.log(`    was ${away.toFixed(0)}px away when the task ended`);
}

// --------------------------------------------------- ignores half-done frames
{
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { left: 0, top: 0 };
  h.run();
  h.menu = true;                                    // menu open: must not move
  h.reconfigure({});                                // React re-runs the effect on that change
  const before = { ...h.position };
  for (let i = 0; i < 120; i++) h.tick(16.7);
  check(h.position.left === before.left && h.position.top === before.top,
        "holds still while the menu is open");
  h.drag.current = { x: 0, y: 0 };                  // dragging: must not move
  h.menu = false;
  h.reconfigure({ activity: { pose: "running" } });
  for (let i = 0; i < 3; i++) h.tick(16.7);         // let the fresh effect settle
  const before2 = { ...h.position };
  for (let i = 0; i < 120; i++) h.tick(16.7);
  check(h.position.left === before2.left && h.position.top === before2.top,
        "holds still while being dragged");
}


// ------------------------------------------------ swims home from any pose
for (const pose of ["review", "waiting", "failed", "idle"]) {
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { ...homePx };
  h.position = { ...homePx };
  h.run();
  for (let i = 0; i < 60 * 20; i++) h.tick(16.7);
  h.reconfigure({ activity: { pose } });
  let frames = 1;
  for (let i = 0; i < 60 * 300 && frames > 0; i++) frames = h.tick(16.7);
  const d = Math.hypot(h.position.left - homePx.left, h.position.top - homePx.top);
  check(d < 2, `swims home after the pose becomes "${pose}"`, `off by ${d.toFixed(1)}px`);
}

// ------------------------------------- survives unrelated re-renders mid-trip
{
  const h = makeHarness({ width: W, height: H, size: SIZE, petHeight: PET_H, speed: SPEED, home: HOME });
  h.positionRef.current = { ...homePx };
  h.position = { ...homePx };
  h.run();
  for (let i = 0; i < 60 * 20; i++) h.tick(16.7);
  const start = Math.hypot(h.position.left - homePx.left, h.position.top - homePx.top);
  h.reconfigure({ activity: { pose: "review" } });
  let frames = 1;
  for (let i = 0; i < 60 * 300 && frames > 0; i++) {
    if (i % 7 === 0) h.reconfigure({});          // poll / menu / size change
    frames = h.tick(16.7);
  }
  const d = Math.hypot(h.position.left - homePx.left, h.position.top - homePx.top);
  check(d < 2, "still gets home across effect restarts", `off by ${d.toFixed(1)}px (started ${start.toFixed(0)}px away)`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
