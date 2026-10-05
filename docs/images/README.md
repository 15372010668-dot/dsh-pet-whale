# 图片素材清单（提供给项目维护者）

README 和 GitHub 已经预留好以下文件名——**把做好的图按下面的名字放进本文件夹，README 即自动显示，无需改代码**。

## 必须提供（README 首屏）

| 文件名 | 规格 | 内容要求 |
| --- | --- | --- |
| `hero.gif` | 宽 ≤1280px，时长 10~20 秒，<10MB | **首屏动图（最重要）**：桌面悬浮模式，鲸鱼横渡屏幕、水帘垂到显示器底部堆积。录屏内容：跑一个任务 → 完成庆祝 → 露出桌面其他窗口证明"悬浮在一切之上" |
| `social-preview.png` | **1280×640**（2:1），<1MB | **GitHub 分享卡片**：不上 README，上传到仓库 **Settings → General → Social preview**。内容：鲸鱼特写 + 项目名 `dsh-pet-whale` 一行字，深色底更醒目。这是别人在搜索/分享链接时的"第一眼" |

## 建议提供（README 展示区，两格一行的画廊）

| 文件名 | 规格 | 内容要求 |
| --- | --- | --- |
| `showcase-overlay.png` | 宽 ≥1600px PNG | 悬浮鲸待在某个漂亮应用窗口上方（体现"悬浮在一切之上"） |
| `showcase-notifications.png` | 同上 | 任务等待审批时：鲸鱼蹦跳 + 气泡/托盘里展开的审批表单 |
| `showcase-pat.gif` | 5~8 秒 GIF | 连戳几下：爱心与喷水随机出现 |
| `showcase-celebration.gif` | 10~15 秒 GIF | 任务完成：鲸鱼游到顶端横渡，水帘垂到底部堆积化光 |

## 录制方法（macOS）

1. `Shift + Cmd + 5` → 选"录制屏幕"（或录制部分区域，框住鲸鱼活动范围）；
2. 得到 `.mov` 后转 GIF：可用 [ezgif.com](https://ezgif.com/video-to-gif)（在线，选 resize 宽 960~1280、帧率 15）或 `ffmpeg -i in.mov -r 15 -vf scale=1200:-1 out.gif`；
3. 静态截图用 `Shift + Cmd + 4`（区域截图）即可，注意截全分辨率。

## GitHub 设置提醒

- Social preview 上传路径：仓库页 → **Settings → General** → 滚动到 **Social preview** → Upload an image；
- 仓库 About 栏（右上角齿轮）填简介和 topics：`deepseek-harness` `dsh` `desktop-pet` `electron` `pixel-art`；
- 建议仓库主题色/深色截图，像素风在深色背景上更出彩。
