/**
 * Notification state-machine test for dsh-pet-whale.
 *
 * Slices the REAL engine code out of lib/client.js (model.ts + activity.ts +
 * notifications.ts sections) and drives it with fake session/pending sources,
 * covering rounds, tokens, TTLs, dismiss/restore, approvals, question
 * validation, stop, and subagent filtering:
 *
 *   node test-notifications.mjs
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./lib/client.js", import.meta.url), "utf8");
// Slice 1: IDLE + selectActivity (+lookCell) from the model section.
const aStart = src.indexOf('var IDLE = { pose: "idle", title: "", text: "" };');
const aEnd = src.indexOf("// src/plugin-update-ui.tsx", aStart);
// Slice 2: selectedSessionId + the whole notifications engine.
const bStart = src.indexOf("// src/activity.ts");
const bEnd = src.indexOf("// src/creation.ts", bStart);
if (aStart < 0 || aEnd < 0 || bStart < 0 || bEnd < 0 || bEnd <= bStart) throw new Error("engine slice markers not found");
const slice = src.slice(aStart, aEnd) + "\n" + src.slice(bStart, bEnd);
if (slice.includes("require(") || slice.includes("import ")) throw new Error("slice is not self-contained");

const mod = await import(
  "data:text/javascript;base64," + Buffer.from(slice + "\nexport { createNotifications, lifetime };").toString("base64")
);
const { createNotifications, lifetime } = mod;

let failures = 0;
function check(ok, label, detail = "") {
  if (ok) console.log("  ok  ", label);
  else {
    failures += 1;
    console.log("  FAIL", label, detail);
  }
}

function makeWorld() {
  const clock = { now: 1_000_000 };
  const now = () => clock.now;
  const advance = (ms) => {
    clock.now += ms;
    world.publishAll();
  };
  const listListeners = new Set();
  const statusListeners = new Set();
  const pendingListeners = new Set();
  const listSnapshot = { ids: [], byId: {}, current: null };
  const statusMap = new Map();
  const pendingMap = new Map();
  const bindings = new Map();
  const sessions = {
    list: {
      getSnapshot: () => listSnapshot,
      subscribe: (fn) => (listListeners.add(fn), () => listListeners.delete(fn))
    },
    status: {
      getSnapshot: () => statusMap,
      subscribe: (fn) => (statusListeners.add(fn), () => statusListeners.delete(fn))
    },
    binding: (id) => bindings.get(id)
  };
  const pending = {
    getSnapshot: () => pendingMap,
    subscribe: (fn) => (pendingListeners.add(fn), () => pendingListeners.delete(fn))
  };
  const world = {
    clock,
    now,
    advance,
    sessions,
    pending,
    listSnapshot,
    statusMap,
    pendingMap,
    bindings,
    publishAll() {
      for (const fn of [...listListeners, ...statusListeners, ...pendingListeners]) fn();
    }
  };
  world.addSession = ({ id, title, origin = "user", running = false, completed = false }) => {
    listSnapshot.byId[id] = { title, origin, running, completed, updatedAt: now() };
    listSnapshot.ids.push(id);
    listSnapshot.current ??= id;
    const sessionListeners = new Set();
    const eventListeners = new Set();
    const sessionSnap = { running, lastAgentError: null, promptError: null };
    const evSnap = { revision: 0, change: { kind: "replace", entries: [] } };
    bindings.set(id, {
      session: {
        getSnapshot: () => sessionSnap,
        subscribe: (fn) => (sessionListeners.add(fn), () => sessionListeners.delete(fn)),
        cancel: async () => ({ ok: true })
      },
      eventSource: {
        getSnapshot: () => evSnap,
        subscribe: (fn) => (eventListeners.add(fn), () => eventListeners.delete(fn))
      }
    });
    return {
      setRunning(value) {
        sessionSnap.running = value;
        listSnapshot.byId[id].running = value;
        world.publishAll();
      },
      pushEvent(type, data) {
        evSnap.revision += 1;
        evSnap.change = { kind: "append", entries: [{ type: "event", event: { type, data } }] };
        world.publishAll();
      },
      setError(message) {
        sessionSnap.lastAgentError = message;
        world.publishAll();
      },
      setStatus(value, completionUnread = false) {
        statusMap.set(id, { running: value, completionUnread });
        world.publishAll();
      },
      setPending(request) {
        if (request) pendingMap.set(id, { ...request, sessionId: id });
        else pendingMap.delete(id);
        world.publishAll();
      }
    };
  };
  return world;
}

function engineFor(world) {
  const calls = [];
  const engine = createNotifications(
    world.sessions,
    world.pending,
    () => {},
    world.now
  );
  return { engine, calls };
}

// ---- 1. running task produces a running notification ------------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "a", title: "重构登录模块" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  const state = engine.getSnapshot();
  check(state.items.length === 1 && state.items[0].pose === "running", "running task shows as running pose");
  check(state.activity?.pose === "running", "activity mirrors the top notification");
  check(state.items[0].token === "0:", "token format is round:key", state.items[0].token);

  // ---- 2. stop works with the current token, stale token rejected ----------
  let cancelCalls = 0;
  world.bindings.get("a").session.cancel = async () => {
    cancelCalls += 1;
    return { ok: true };
  };
  await engine.command({ type: "stop", id: "a", token: state.items[0].token });
  check(cancelCalls === 1, "stop calls session.cancel once");
  await engine
    .command({ type: "stop", id: "a", token: "9:" })
    .then(() => check(false, "stale token should throw"))
    .catch((error) => check(String(error.message).includes("通知已更新"), "stale token rejected", error.message));
  engine.dispose();
}

// ---- 3. completion -> review pose -> 20s TTL auto-vanish --------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "b", title: "写测试" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  check(engine.getSnapshot().items[0].pose === "running", "task running before completion");
  task.pushEvent("turn/end", { reason: { kind: "completed" } });
  task.setRunning(false);
  const state = engine.getSnapshot();
  check(state.items[0].pose === "review", "completed turn becomes review pose", state.items[0]?.pose);
  check(lifetime.review === 2e4, "review TTL is 20 seconds");
  world.advance(19_000);
  check(engine.getSnapshot().items.length === 1, "review still visible at 19s");
  world.advance(2_000);
  check(engine.getSnapshot().items.length === 0, "review auto-vanishes after 20s TTL");
  engine.dispose();
}

// ---- 4. failure -> failed pose ------------------------------------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "c", title: "会炸的任务" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  task.setError("boom: file not found");
  task.setRunning(false);
  const state = engine.getSnapshot();
  check(state.items[0].pose === "failed" && state.items[0].text === "任务出错了", "agent error surfaces as failed pose", JSON.stringify(state.items[0]));
  engine.dispose();
}

// ---- 5. dismiss with token, restore, stale dismiss rejected -----------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "d", title: "提醒我" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  const token = engine.getSnapshot().items[0].token;
  await engine.command({ type: "dismiss", id: "d", token });
  check(engine.getSnapshot().hidden === 1 && engine.getSnapshot().items.length === 0, "dismiss hides the notification");
  await engine.command({ type: "restore" });
  check(engine.getSnapshot().items.length === 1 && engine.getSnapshot().hidden === 0, "restore brings it back");
  engine.dispose();
}

// ---- 6. waiting request: approval + answered dedupe --------------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "e", title: "要权限" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  const answers = [];
  task.setPending({
    kind: "approval",
    key: "k1",
    toolName: "bash",
    reason: "needs approval",
    answer: async (value) => {
      answers.push(value);
      return { accepted: true };
    }
  });
  const state = engine.getSnapshot();
  check(state.items[0].pose === "waiting", "pending approval flips pose to waiting");
  check(state.items[0].request?.kind === "approval" && state.items[0].request?.toolName === "bash", "request payload exposed on the item");
  await engine.command({ type: "approve", id: "e", token: state.items[0].token, requestKey: "k1" });
  check(answers.length === 1 && answers[0] === "allowed-once", "approve answers allowed-once", JSON.stringify(answers));
  await engine
    .command({ type: "approve", id: "e", token: state.items[0].token, requestKey: "k1" })
    .then(() => check(false, "double approve should throw"))
    .catch((error) => check(String(error.message).includes("已经提交"), "double approve rejected", error.message));
  engine.dispose();
}

// ---- 7. question validation ----------------------------------------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "f", title: "问个问题" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  const answers = [];
  task.setPending({
    kind: "question",
    key: "k2",
    questions: [{ id: "q1", question: "选一个", options: [{ label: "A" }, { label: "B" }], multiSelect: false }],
    answer: async (value) => {
      answers.push(value);
      return { accepted: true };
    }
  });
  const state = engine.getSnapshot();
  const token = state.items[0].token;
  await engine
    .command({ type: "answer", id: "f", token, requestKey: "k2", answers: { answers: [{ id: "q1", selected: ["不存在的选项"] }] } })
    .then(() => check(false, "invalid option should throw"))
    .catch((error) => check(String(error.message).includes("选项无效"), "invalid option rejected", error.message));
  await engine.command({ type: "answer", id: "f", token, requestKey: "k2", answers: { answers: [{ id: "q1", selected: ["A"] }] } });
  check(answers.length === 1 && answers[0].answers?.[0]?.selected?.[0] === "A", "valid answer passes validation", JSON.stringify(answers));
  engine.dispose();
}

// ---- 8. subagent sessions are filtered out ------------------------------------
{
  const world = makeWorld();
  world.addSession({ id: "g", title: "子代理", origin: "subagent" });
  world.addSession({ id: "h", title: "主任务" }).setRunning(true);
  const { engine } = engineFor(world);
  const state = engine.getSnapshot();
  check(state.items.length === 1 && state.items[0].id === "h", "subagent sessions excluded");
  engine.dispose();
}

// ---- 9. new turn bumps the round and invalidates old tokens -------------------
{
  const world = makeWorld();
  const task = world.addSession({ id: "i", title: "多轮任务" });
  task.setRunning(true);
  const { engine } = engineFor(world);
  const firstToken = engine.getSnapshot().items[0].token;
  task.pushEvent("turn/end", { reason: { kind: "completed" } });
  task.pushEvent("turn/start", {});
  task.setRunning(true);
  const secondToken = engine.getSnapshot().items[0].token;
  check(firstToken !== secondToken, "token changes across turns", `${firstToken} -> ${secondToken}`);
  await engine
    .command({ type: "dismiss", id: "i", token: firstToken })
    .then(() => check(false, "old-round token should throw"))
    .catch((error) => check(String(error.message).includes("通知已更新"), "old-round token rejected", error.message));
  await engine.command({ type: "dismiss", id: "i", token: secondToken });
  check(engine.getSnapshot().hidden === 1, "current-round token dismisses fine");
  engine.dispose();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
