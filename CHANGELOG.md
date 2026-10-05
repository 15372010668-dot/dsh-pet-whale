# Changelog

## [1.2.0] - 2026-10-04

- **New: auto patrol.** The whale now lives in the **top-right corner** by
  default, and every so often (jittered ±25% so it feels unplanned) it goes on
  a ~20–40 s patrol: it roams the screen along smooth arcs, spouting water
  now and then, then swims back home. **New setting** 巡航频率
  (`patrolEvery`, 0–120 min, default 15; 0 = off) controls the patrol
  frequency; patrol speed follows the 漫游速度 slider. Works in both the
  in-page and desktop-overlay modes; patrols pause while dragging, while the
  menu is open, while a task runs (roam owns the movement then), and honor
  reduced-motion.
- **Changed:** default home position is now the top-right corner (page and
  overlay independently; existing saved positions are kept).
- Exemption note: keyed by `name@version` — grant once per version:
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.2.0 --dsh-version 0.2.0-rc.2 --accept-risk`

## [1.1.0] - 2026-10-04

- **New: desktop overlay mode.** The whale can now float over the *entire*
  desktop — any app, any fullscreen Space — not just inside the DSH page.
  The plugin host spawns DSH's bundled Electron runtime
  (`~/.dsh/electron/Electron.app`) as a transparent, frameless,
  always-on-top overlay window (screen-saver level, dock hidden,
  click-through except over the pet). Toggled in Settings → Pets → Appearance
  (「桌面悬浮模式」); the in-page pet hides itself while the overlay is alive.
  Architecture: a token-gated localhost mini-server bridges config, sprite
  bytes and task activity between host, page client and overlay; the overlay
  suicides when the host disappears (6 s) and the host watchdog reaps/stales
  processes (15 s) and respawns (10 s). Overlay stdout lands in
  `~/.dsh/pet-whale/overlay.log`. The spawn strips `ELECTRON_RUN_AS_NODE`
  from the child env — without that the bundled Electron boots as pure Node
  and dies instantly (the bug that ate an afternoon).
- **New: emotion reactions.** Task failure → rapid shake + flickering 🔥 for
  ~4 s; a pending approval/question → vertical bounce + a
  「需要你处理：{title}」 callout bubble for ~5 s. Both in-page and overlay.
- **New: shake-spout.** Grabbing the whale and shaking it (2 direction flips
  or 700 px of travel) fires a pixel water fountain from the blowhole that
  falls, piles up at the bottom of the screen, spreads and fades away.
  Configurable: 喷水量 (1–8 waves) and 喷水高度 (50–200 %). The emission
  origin tracks the whale live, so dragging while spraying never misplaces
  the fountain.
- **New: head-pat.** Single-click the whale: happy squash + floating hearts.
- **Changed:** the notification tray follows the whale while roaming instead
  of staying pinned to its home anchor.
- **Changed:** completed-task notifications auto-vanish after 20 s (was 7
  days). Failed (1 h) and waiting (24 h) TTLs unchanged.
- **Changed:** spout/pile physics pause when the pet is hidden; sprite
  engineering cleanup: version displayed from a single `PLUGIN_VERSION`
  constant.
- **Fixed:** settings layout (the overlay toggle no longer nests inside the
  roam-speed card); duplicated builtin/custom whale entries in the pet list.
- **Engineering:** `npm run check|test|sync` now reference files that exist;
  new `test-notifications.mjs` (23 checks) drives the real notification
  state machine — rounds, tokens, TTLs, dismiss/restore, approvals, question
  validation, stop, subagent filtering — sliced from the actual bundle;
  `test-roam.mjs` unchanged (16 checks); `test-host.mjs` grew to 28 checks.
- **Note:** the DSH version exemption is keyed by `name@version`; after
  upgrading grant it once:
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.1.0 --dsh-version 0.2.0-rc.2 --accept-risk`

## [1.0.0] - 2026-10-04 — dsh-pet-whale

First release as an **independent plugin**, descended from
`@michengai/dsh-codex-pet@0.1.7` via the `dsh-bluewhale-pet` fork (whose history
is preserved below). Everything from the fork era — the built-in blue whale,
full-screen roaming, the removed auto-updater — carries over.

- **New:** head-pat interaction. Single-click the whale (or press Enter, or use
  the new「摸摸头」menu item): it does a happy squash-and-recover (`dcp-pat-squash`)
  while three hearts float up and fade (`dcp-heart-pop`). Pure CSS/animation —
  no new spritesheet rows. Honors `prefers-reduced-motion`.
- **New:** the `window.dshPetWhale` companion API is documented in
  `docs/companion-api.md` (snapshot shape, subscribe, all command types,
  `updateConfig`, `openSettings`, `acquireDisplay`).
- **Changed:** full identity split from the old fork line:
  - package/module id `dsh-bluewhale-pet` → **`dsh-pet-whale`**, own version line starting at 1.0.0;
  - HTTP base `/dsh-codex-pet` → `/dsh-pet-whale`; trusted-write header `x-dsh-pet` → `x-dsh-pet-whale`;
  - data dir `~/.dsh/codex-pet/` → **`~/.dsh/pet-whale/`** (existing data was copied over);
  - slot ids and the global API renamed (`window.dshPet` → `window.dshPetWhale`,
    `dsh-pet-ready`/`dsh-pet-disposed` → `dsh-pet-whale-ready`/`dsh-pet-whale-disposed`).
- **Changed:** the version shown in the UI now comes from a single
  `PLUGIN_VERSION` constant; `test-host.mjs` fails if it drifts from
  `package.json` or if a hardcoded `x.y.z` string reappears in `client.js`.
- **Docs:** README (en/zh), FORK.md and this changelog rewritten for
  dsh-pet-whale; upstream attribution kept per Apache-2.0.
- **Note:** DSH exempts plugins by *manifest* `name@version`, so a fresh
  exact-version exemption is required:
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.0.0 --dsh-version <your dsh version> --accept-risk`.

---

# History as dsh-bluewhale-pet (fork era)

## [1.2.1] - fork

- **New:** the pet's right-click menu now starts with a one-line readout:
  `v1.2.1 · roaming|returning|parked · <n>px from home`. The build marker is the
  fastest way to tell whether the browser is running a freshly restarted bundle,
  and the distance makes the swim home observable (at the default 48 px/s, or
  80 px/s, a trip across the screen legitimately takes 10-20 s).
- **Test:** `test-roam.mjs` now also covers returning after every non-running
  pose (`review` / `waiting` / `failed` / `idle`) and returning across repeated
  effect restarts (state poll, menu, size change). 16 assertions.

## [1.2.0] - fork
