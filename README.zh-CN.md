<div align="center">

# dsh-pet-whale

**一只陪你处理 DeepSeek Harness 任务的像素蓝鲸桌宠**

[English](README.md) · [Apache-2.0](LICENSE) · [功能全览](docs/FEATURES.md) · [Companion API](docs/companion-api.md)

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Node.js 22.19+](https://img.shields.io/badge/Node.js-22.19%2B-339933.svg?logo=node.js&logoColor=white)](https://nodejs.org/)

</div>

<p align="center">
  <img src="assets/screenshots/bluewhale-running.png" alt="蓝鲸桌宠在 DSH 页面中运行的效果" width="360">
</p>

**dsh-pet-whale** 是一款运行在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）中的**独立**页内桌宠插件。工作时让一头像素蓝鲸陪在页面角落，随时查看任务进展、处理需要你关注的请求。

它源自 [`@michengai/dsh-codex-pet`](https://github.com/MichengAI/dsh-codex-pet)（中间经过 `dsh-bluewhale-pet` fork），现在作为独立插件开发——完整来历与改动清单见 [FORK.md](FORK.md)。

## 功能

- **页内陪伴**：蓝鲸待在 DSH 页面角落陪你干活。
- **任务一目了然**：运行中、等待你处理、出错、完成的任务会变成通知气泡；没有事的时候鲸鱼也安安静静。
- **气泡上直接操作**：打开对应会话、停止当前轮次、直接在气泡里处理审批 / 提问 / 计划确认，不用切走当前视图。
- **摸摸头互动**：单击鲸鱼，它会开心地压扁一下，头顶冒出爱心（双击跳跃、拖动移动、右键菜单）。
- **全屏漫游**：任务运行时鲸鱼沿平滑弧线在整个页面游走，任务结束自动游回原位（开关与速度可在设置中调整）。
- **键盘与无障碍**：完整的控件标注、焦点环，并尊重 `prefers-reduced-motion`。
- **自定义宠物**：把符合 Codex 协议的图集放进 `~/.dsh/pet-whale/pets`，或用随包 Skill 在 DSH 会话里生成新宠物。
- **可脚本控制**：`window.dshPetWhale` companion API 让脚本读取任务状态、执行所有操作——见 [docs/companion-api.md](docs/companion-api.md)。

## 安装

dsh-pet-whale 是个人插件，**不发布到 npm**，以 **`link:` 本地依赖**装进 DSH profile：

1. 把本仓库放到固定位置，例如 `~/dsh-plugins/dsh-pet-whale`。
2. 在 profile 的 `package.json` 里引用：

   ```json
   {
     "dependencies": {
       "dsh-pet-whale": "link:/绝对路径/dsh-pet-whale"
     },
     "dsh": {
       "profile": {
         "bundles": ["...", "dsh-pet-whale"]
       }
     }
   }
   ```

3. 在 profile 目录执行 `pnpm install --offline`（或让 DSH 启动时自动安装）。
4. 如果被 DSH 的版本兼容校验拦下，给确切版本授豁免（按你的实际版本调整）：

   ```bash
   dsh plugin --profile desktop allow-version dsh-pet-whale@1.0.0 --dsh-version 0.2.0-rc.2 --accept-risk
   ```

5. 重启 DSH，打开 **设置 → 宠物**。

## 使用

| 目标 | 操作 |
| --- | --- |
| 移动 / 玩 | 拖动移动；单击摸摸头；双击跳跃。 |
| 看任务动态 | 看通知气泡；多个任务时展开列表。 |
| 继续会话 | 点气泡打开对应 DSH 任务。 |
| 处理请求 | 在气泡内展开请求并直接作答。 |
| 停止轮次 | 点运行中任务气泡上的停止按钮。 |
| 配置 | 右键宠物 → 宠物设置，或 设置 → 宠物。 |

### 数据与宠物

所有数据都在包外的 `~/.dsh/pet-whale/`（`config.json` + `pets/`），更新或重装插件都不会碰你的宠物和设置。

## 开发

```bash
node --check lib/index.js && node --check lib/client.js   # 语法自查
node test-host.mjs    # 宿主侧 HTTP + 配置读写（用临时目录，不碰真实数据）
node test-roam.mjs    # 漫游引擎（从真实 bundle 切片驱动）
```

`lib/*.js` 是直接编辑的 esbuild 产物；目录结构和「插件名必须同步的三处位置」见 [FORK.md](FORK.md)。

## 许可

基于 [Apache License 2.0](LICENSE) 授权。上游署名与相对原插件的改动清单见 [NOTICE](NOTICE)。
