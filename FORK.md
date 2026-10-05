# dsh-pet-whale — 来历与说明

`dsh-pet-whale` 是一款**独立**的 DSH 桌宠插件。它的血缘是一条完整的改造链：

```
@michengai/dsh-codex-pet@0.1.7        （上游，MichengAI）
        ↓ 改名 fork
dsh-bluewhale-pet                     （改名 + 只留蓝鲸 + 加漫游，v1.0.0–1.2.1）
        ↓ 独立成新插件（2026-10-04）
dsh-pet-whale v1.0.0                  （本仓库，自己的名字 / 路由 / 数据目录）
```

上游的 GitHub / Issues 链接、LICENSE、原始版权声明**保留**（Apache-2.0 要求署名）。

## 与 dsh-bluewhale-pet（上一代）的差异

| 项 | dsh-bluewhale-pet | dsh-pet-whale |
| --- | --- | --- |
| 包名 / 模块 id | `dsh-bluewhale-pet` | **`dsh-pet-whale`** |
| 版本线 | 跟随 fork（1.x） | **自有版本线，从 1.0.0 起** |
| HTTP 路由前缀 | `/dsh-codex-pet` | **`/dsh-pet-whale`**（服务端 + 客户端同步） |
| 请求校验头 | `x-dsh-pet: 1` | **`x-dsh-pet-whale: 1`** |
| 数据目录 | `~/.dsh/codex-pet/`（与上游共用） | **`~/.dsh/pet-whale/`**（完全独立，装两代插件也不冲突） |
| 页面全局 API | `window.dshPet` / `dsh-pet-ready` | **`window.dshPetWhale`** / `dsh-pet-whale-ready`（已文档化：`docs/companion-api.md`） |
| 死代码 | 保留上游更新器约 600 行 | **全部移除**（lib/index.js 751→375 行，lib/client.js 2633→2211 行） |
| 摸摸头 | 无 | **新增**：单击宠物 → 挥手 + 压扁弹回 + 冒爱心（右键菜单也有「摸摸头」；尊重 `prefers-reduced-motion`） |
| 版本号 | 硬编码 3 处 | **单一常量 `PLUGIN_VERSION`**，`test-host.mjs` 守卫与 package.json 的一致性 |

与上游原版的历史差异（内置蓝鲸、全屏漫游、移除自动更新等）见 CHANGELOG 里的
历史条目；本仓库继续继承这些差异。

## 本插件新增：摸摸头（v1.0.0）

- 单击宠物（非拖动）触发：挥手动画 + CSS 压扁弹回（`dcp-pat-squash`）+ 三颗爱心
  上浮消散（`dcp-heart-pop`），持续约 0.9 秒。
- 右键菜单新增「摸摸头」项；键盘 Enter 等价于摸头。
- 纯 CSS/动画组合，不需要新图集行；开启 `prefers-reduced-motion` 时爱心不显示、
  挤压动画被系统级规则关掉。

## 版本豁免（重要）

DSH 的版本兼容校验用**插件 manifest 的 `name@version`** 做豁免键（不是 profile
里的依赖别名！）。曾因豁免文件里记的是旧别名 `zkb-codex-pet@1.2.1`，而校验算出的
键是 `dsh-bluewhale-pet@1.2.1`，对不上号导致插件被启动校验**静默跳过**——现象是
市场里显示「已安装」但路由 404、无报错、重启多少次都没用。

修复 / 新装时按本插件真实名字授豁免：

```bash
dsh plugin --profile desktop allow-version dsh-pet-whale@1.0.0 --dsh-version 0.2.0-rc.2 --accept-risk
```

## 安装（link: 本地依赖）

```json
// ~/.dsh/profiles/desktop/package.json
"dependencies": { "dsh-pet-whale": "link:~/dsh-plugins/dsh-pet-whale" },
"dsh": { "profile": { "bundles": [ ..., "dsh-pet-whale" ] } }
```

改完在 profile 目录跑 `pnpm install --offline`（link 依赖变更不需要网络），
然后重启 DSH。`node_modules/dsh-pet-whale` 是指向本目录的软链接，
**改本目录的文件 = 改正在用的插件**。

## 改代码

- 改 `lib/index.js`（主机侧）→ 需重启 DSH。
- 改 `lib/client.js`（浏览器侧）→ 至少刷新页面。
- 改完自查：`node --check lib/index.js && node --check lib/client.js`，
  再跑 `node test-host.mjs` 和 `node test-roam.mjs`。

`lib/*.js` 是 esbuild 产物（保留 `// src/xxx.ts` 分段注释），没有源码工程；
要改 TS 就得回上游仓库自己 build。

## 三处名字必须一致（改名前务必同步）

DSH 靠这三个名字对齐，任何一个不一致都会加载失败：

| 位置 | 值 |
| --- | --- |
| `package.json` → `name` | `dsh-pet-whale` |
| `cordis.patch.yml` → `insert[0].name` | `dsh-pet-whale` |
| `lib/client.js` → `__ModuleLoader__.load({id:...})` | `dsh-pet-whale` |

- 第 2 项错了 → Loader 找不到模块（patch 里的 `name` 才是真正被 import 的 spec）。
- 第 3 项错了 → 浏览器端 boot 抛
  `client-modules: bundle ... loaded without registering "<name>" via __ModuleLoader__.load`。

自查：`dsh --profile desktop --dump-config | grep dsh-pet-whale`

## 卸载

```bash
dsh plugin --profile desktop remove dsh-pet-whale
```

宠物数据在 `~/.dsh/pet-whale/`，卸载不影响；上游系数据在 `~/.dsh/codex-pet/`，与本品互不相关。
