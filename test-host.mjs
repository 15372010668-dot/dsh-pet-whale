/**
 * Host-half smoke test for dsh-pet-whale.
 *
 * Boots the plugin's HTTP handler in-process against a THROWAWAY data dir
 * (your real ~/.dsh/pet-whale is never touched) and exercises the config
 * round-trip, including the roaming fields.
 *
 *   node test-host.mjs
 */
import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHost } from "./lib/index.js";

const HERE = new URL(".", import.meta.url).pathname;
const REAL_PETS = join(process.env.HOME, ".dsh", "pet-whale", "pets");

const dataRoot = mkdtempSync(join(tmpdir(), "dsh-pet-whale-test-"));
try {
  cpSync(REAL_PETS, join(dataRoot, "pets"), { recursive: true });
} catch {
  console.log("(no custom pets to copy - continuing)");
}

const host = await createHost({ root: HERE, dataRoot, skillRoot: join(HERE, "skills") });

function call(method, url, payload) {
  const chunks = payload === undefined ? [] : [Buffer.from(JSON.stringify(payload))];
  const req = {
    method,
    url,
    headers: {
      host: "127.0.0.1:3080",
      ...(payload === undefined
        ? {}
        : { "x-dsh-pet-whale": "1", "content-type": "application/json", origin: "http://127.0.0.1:3080" })
    },
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
  const out = { status: 0, body: "", type: "" };
  const res = {
    headersSent: false,
    writeHead(code, headers) {
      out.status = code;
      out.type = headers?.["content-type"] ?? "";
      this.headersSent = true;
    },
    end(payload) {
      out.body = payload ?? "";
      if (Buffer.isBuffer(payload)) out.type = out.type || "buffer";
    }
  };
  return host.handler(req, res).then(() => {
    try {
      out.json = JSON.parse(out.body);
    } catch {
    }
    return out;
  });
}

let failures = 0;
function check(ok, label, detail = "") {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok ? "" : "  <- " + detail));
  if (!ok) failures++;
}

const state = await call("GET", "/dsh-pet-whale/api/state");
check(state.status === 200, "GET /api/state -> 200", String(state.status));
const ids = (state.json?.pets ?? []).map((p) => p.id);
check(ids.includes("bluewhale"), "builtin bluewhale pet is listed", JSON.stringify(ids));
check(
  (state.json?.pets ?? []).find((p) => p.id === "bluewhale")?.source === "builtin",
  "bluewhale is a built-in pet",
  JSON.stringify(ids)
);
check(state.json?.config?.roam === false, "config.roam defaults to false", JSON.stringify(state.json?.config));
check(state.json?.config?.roamSpeed === 48, "config.roamSpeed defaults to 48", JSON.stringify(state.json?.config));

const on = await call("POST", "/dsh-pet-whale/api/config", { roam: true, roamSpeed: 96 });
check(on.status === 200, "POST roam:true speed:96 -> 200", JSON.stringify(on.json));

const after = await call("GET", "/dsh-pet-whale/api/state");
check(after.json?.config?.roam === true, "roam persisted", JSON.stringify(after.json?.config));
check(after.json?.config?.roamSpeed === 96, "roamSpeed persisted", JSON.stringify(after.json?.config));

const onDisk = JSON.parse(readFileSync(join(dataRoot, "config.json"), "utf8"));
check(onDisk.roam === true && onDisk.roamSpeed === 96, "config.json on disk carries both fields", JSON.stringify(onDisk));

const tooFast = await call("POST", "/dsh-pet-whale/api/config", { roamSpeed: 999 });
check(tooFast.status === 400 && /8/.test(tooFast.json?.error ?? ""), "roamSpeed 999 rejected", JSON.stringify(tooFast.json));

const badType = await call("POST", "/dsh-pet-whale/api/config", { roam: "yes" });
check(badType.status === 400, "roam:\"yes\" rejected", JSON.stringify(badType.json));

const sizeBad = await call("POST", "/dsh-pet-whale/api/config", { size: 999 });
check(sizeBad.status === 400, "existing size validation still works", JSON.stringify(sizeBad.json));

const untouched = await call("GET", "/dsh-pet-whale/api/state");
check(untouched.json?.config?.size === 120, "rejected writes changed nothing", JSON.stringify(untouched.json?.config));

const updateGet = await call("GET", "/dsh-pet-whale/api/update");
check([404, 405].includes(updateGet.status), "update route gone (GET)", String(updateGet.status));
const updatePost = await call("POST", "/dsh-pet-whale/api/update", {});
check(updatePost.status === 404 && updatePost.json?.error, "update route gone (POST -> unknown op)", JSON.stringify(updatePost.json));

const asset = await call("GET", "/dsh-pet-whale/asset/bluewhale");
check(asset.status === 200 && asset.type === "image/webp", "builtin bluewhale spritesheet served", JSON.stringify(asset.type));

check(state.json?.config?.selected === "bluewhale", "default selected pet is builtin bluewhale", JSON.stringify(state.json?.config?.selected));

const overlayOn = await call("POST", "/dsh-pet-whale/api/config", { overlay: true });
check(overlayOn.status === 200, "overlay:true accepted", JSON.stringify(overlayOn.json?.error));
check(JSON.parse(readFileSync(join(dataRoot, "config.json"), "utf8")).overlay === true, "overlay persisted on disk");
const overlayBad = await call("POST", "/dsh-pet-whale/api/config", { overlay: "yes" });
check(overlayBad.status === 400, "overlay non-boolean rejected");
const overlayActivity = await call("POST", "/dsh-pet-whale/api/overlay-activity", { activity: { pose: "review", title: "t", text: "done" } });
check(overlayActivity.status === 200, "overlay-activity route works");
const overlayOff = await call("POST", "/dsh-pet-whale/api/config", { overlay: false });
check(overlayOff.status === 200, "overlay:false accepted");
const spoutBad = await call("POST", "/dsh-pet-whale/api/config", { spoutAmount: 99 });
check(spoutBad.status === 400, "spoutAmount out of range rejected");
const spoutBad2 = await call("POST", "/dsh-pet-whale/api/config", { spoutPower: "high" });
check(spoutBad2.status === 400, "spoutPower non-number rejected");
const spoutOk = await call("POST", "/dsh-pet-whale/api/config", { spoutAmount: 6, spoutPower: 150 });
check(spoutOk.status === 200 && spoutOk.json?.config?.spoutAmount === 6 && spoutOk.json?.config?.spoutPower === 150, "spout settings round-trip");
const patrolBad = await call("POST", "/dsh-pet-whale/api/config", { patrolEvery: 999 });
check(patrolBad.status === 400, "patrolEvery out of range rejected");
const patrolOk = await call("POST", "/dsh-pet-whale/api/config", { patrolEvery: 20 });
check(patrolOk.status === 200 && patrolOk.json?.config?.patrolEvery === 20, "patrolEvery round-trip");

const pkg = JSON.parse(readFileSync(join(HERE, "package.json"), "utf8"));
const clientSrc = readFileSync(join(HERE, "lib", "client.js"), "utf8");
check(
  clientSrc.includes(`var PLUGIN_VERSION = "${pkg.version}"`),
  "client.js PLUGIN_VERSION matches package.json",
  pkg.version
);
check(
  !/"\d+\.\d+\.\d+"/.test(clientSrc.replace(`var PLUGIN_VERSION = "${pkg.version}"`, "")),
  "no hardcoded x.y.z version strings left in client.js"
);

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
