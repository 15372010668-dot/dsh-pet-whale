# 更新日志

## [1.2.1] - 2026-10-06

- **修复**：任务状态气泡现在**永远显示在鲸鱼下方**——之前鲸鱼靠近屏幕顶部时气泡会翻到上方遮挡内容。页面内与桌面悬浮双端一致。
- **修复（桌面悬浮）**：摸一下头/双击后鲸鱼不再永远卡在挥手/跳跃姿态；悬浮鲸的"家"不再跟随页面内鲸鱼保存的位置（两者彻底独立）；巡游喷水在菜单打开或拖拽时暂停；巡游到时能正常结束并游回家（之前可能无限重复触发，永远回不了家）。
- **变更**：水珠改为从图集里喷水孔的位置涌出（精灵宽度 28% 处），不再从身体中点正上方。
- **升级提醒**：DSH 版本豁免按 `插件名@版本` 记键：
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.2.1 --dsh-version <你的DSH版本> --accept-risk`

## [1.2.0] - 2026-10-04

- **新增：自动巡航。** 鲸鱼默认安家**右上角**，并且会不定期（间隔带 ±25% 随机抖动，
  显得随性）来一次约 20–40 秒的巡游：沿平滑弧线在屏幕上游走、途中偶尔喷一股水，
  巡游结束自动游回家。**新设置**「巡航频率」（`patrolEvery`，0–30 分钟，默认 15；
  0 为关闭）控制频率；巡游速度跟随「漫游速度」滑杆。页面内与桌面悬浮双端一致；
  拖拽、打开菜单、任务运行中（漫游接管移动）时暂停，尊重 reduced-motion。
- **变更**：默认安家位置从右下角改为右上角（页面与悬浮窗各自独立；已保存的位置不受影响）。
- 豁免按 `插件名@版本` 记键，升级后需重新授权一次：
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.2.0 --dsh-version 0.2.0-rc.2 --accept-risk`

## [1.1.0] - 2026-10-04

- **新增：桌面悬浮模式。** 蓝鲸不再被困在 DSH 页面里——它可以悬浮在**整个电脑**
  之上：任意应用、任意全屏 Space。插件宿主 spawn DSH 自带的 Electron 运行时
  （`~/.dsh/electron/Electron.app`）作为透明无边框置顶窗口（screen-saver 层级、
  隐藏 Dock 图标、鲸鱼区域外鼠标穿透）。入口在 设置 → 宠物 → 外观（「桌面悬浮
  模式」）；悬浮窗存活时页面内的鲸鱼自动隐藏。架构：宿主起一个 token 保护的
  localhost mini-server，在宿主 / 页面客户端 / 悬浮窗之间桥接配置、图集字节和
  任务状态；宿主消失后悬浮窗 6 秒内自杀，宿主侧看门狗 15 秒回收僵尸、10 秒自动
  重拉。悬浮窗输出写在 `~/.dsh/pet-whale/overlay.log`。spawn 时必须从子进程环境
  里剥掉 `ELECTRON_RUN_AS_NODE`——否则自带的 Electron 会以纯 Node 模式启动并秒退
  （吃掉一个下午的那个 bug）。
- **新增：情绪反应。** 任务失败 → 快速发抖 + 火焰摇曳约 4 秒；有审批/提问等待
  处理 → 上下蹦跳 + 「需要你处理：{title}」气泡约 5 秒。页面内与悬浮窗一致。
- **新增：摇晃喷水。** 抓住鲸鱼甩（2 次方向翻转或累计拖动 700px）→ 像素水柱从
  头顶喷出，落到底部堆积、摊平、渐隐。可调：喷水量（1–8 波）、喷水高度
  （50–200%）。发射点实时跟随鲸鱼，边拖边喷不错位。
- **新增：摸摸头。** 单击鲸鱼：压扁弹回 + 冒爱心。
- **变更**：漫游时通知托盘跟随鲸鱼移动，不再钉在原位。
- **变更**：任务完成提醒 20 秒自动消失（原来 7 天）；失败 1 小时、等待 24 小时
  不变。
- **变更**：宠物隐藏时喷水/水堆物理空转跳过；界面版本号收敛到单一
  `PLUGIN_VERSION` 常量。
- **修复**：设置页布局（悬浮开关不再嵌进漫游速度卡片）；宠物列表内置/自定义
  小蓝鲸重复显示。
- **工程**：`npm run check|test|sync` 指向真实存在的文件；新增
  `test-notifications.mjs`（23 项）从真实 bundle 切片驱动通知状态机——轮次、
  token、TTL、关闭/恢复、审批、问题校验、停止、subagent 过滤；`test-roam.mjs`
  不变（16 项）；`test-host.mjs` 增至 28 项。
- **注意**：DSH 的版本豁免按 `name@version` 记键，升级后需重新授权一次：
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.1.0 --dsh-version 0.2.0-rc.2 --accept-risk`

## [1.0.0] - 2026-10-04 — dsh-pet-whale

以**独立插件**身份发布的第一个版本，血缘上承接
`@michengai/dsh-codex-pet@0.1.7` → `dsh-bluewhale-pet` fork（其历史保存在下方）。
fork 时代的一切——内置蓝鲸、全屏漫游、移除自动更新——全部继承。

- **新增**：摸摸头互动。单击宠物（或按 Enter，或用右键菜单新增的「摸摸头」）：
  鲸鱼开心地压扁再弹回（`dcp-pat-squash`），同时三颗爱心上浮消散
  （`dcp-heart-pop`）。纯 CSS/动画实现，不需要新图集行；尊重
  `prefers-reduced-motion`。
- **新增**：`window.dshPetWhale` companion API 文档化，见
  `docs/companion-api.md`（快照结构、订阅、全部命令类型、`updateConfig`、
  `openSettings`、`acquireDisplay`）。
- **变更**：与旧 fork 线彻底切割身份：
  - 包名 / 模块 id `dsh-bluewhale-pet` → **`dsh-pet-whale`**，自有版本线从 1.0.0 起；
  - HTTP 前缀 `/dsh-codex-pet` → `/dsh-pet-whale`；请求校验头 `x-dsh-pet` → `x-dsh-pet-whale`；
  - 数据目录 `~/.dsh/codex-pet/` → **`~/.dsh/pet-whale/`**（已有数据已复制过去）；
  - slot id 与页面全局 API 改名（`window.dshPet` → `window.dshPetWhale`，
    `dsh-pet-ready`/`dsh-pet-disposed` → `dsh-pet-whale-ready`/`dsh-pet-whale-disposed`）。
- **变更**：界面显示的版本号改为来自单一常量 `PLUGIN_VERSION`；
  `test-host.mjs` 会校验它与 `package.json` 一致、且 `client.js` 里不再出现
  硬编码的 `x.y.z` 字符串。
- **文档**：README（中英）、FORK.md 与本日志全部按 dsh-pet-whale 重写；
  依 Apache-2.0 保留上游署名。
- **注意**：DSH 按 **manifest 的 `name@version`** 做豁免，新插件需要重新授豁免：
  `dsh plugin --profile desktop allow-version dsh-pet-whale@1.0.0 --dsh-version <你的DSH版本> --accept-risk`。

---

# dsh-bluewhale-pet 时代（fork 历史）

## [1.2.1] - fork

- **新增**：宠物右键菜单顶部多了一行状态读出：
  `v1.2.1 · 漫游中/返回中/已就位 · 距原位 Npx`。构建号是判断浏览器是否加载了
  重启后版本的最快办法；距离则让「游回家」这件事变得可见
  （默认速度下一趟跨屏返程本来就要 10–20 秒）。
- **测试**：`test-roam.mjs` 补充了「从每一种非运行姿态回家」（`review`/`waiting`/
  `failed`/`idle`）以及「中途反复重跑 effect 仍能到家」两组用例，共 16 项断言。

## [1.2.0] - fork
