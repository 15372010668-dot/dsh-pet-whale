# dsh-pet-whale Companion API（`window.dshPetWhale`）

dsh-pet-whale 会在页面加载后把一个只读的控制接口挂到 `window.dshPetWhale` 上，
方便你用脚本、控制台或另一个插件观察和控制宠物。接口挂载 / 卸载时会在
`window` 上派发 `dsh-pet-whale-ready` / `dsh-pet-whale-disposed` 事件。

> 仅限本机自动化使用。DSH 页面的 web 服务器有认证，接口只能在你自己打开的
> 页面上下文里调用。

## 快速开始

```js
// 等插件就绪
await new Promise((resolve) => {
  if (window.dshPetWhale) return resolve();
  window.addEventListener("dsh-pet-whale-ready", resolve, { once: true });
});

const pet = window.dshPetWhale;
console.log(pet.getSnapshot());          // 当前状态
pet.openSettings();                      // 打开宠物设置
```

## 接口一览

`window.dshPetWhale` 是 `Object.freeze` 的对象，`version` 当前为 `1`。

### `getSnapshot(): Snapshot | null`

返回当前快照的深拷贝；插件尚未拿到宠物库时返回 `null`。

```ts
type Snapshot = {
  pet: { id: string; name: string; description: string; version: 1 | 2; source: "builtin" | "custom"; url: string } | null;
  config: {
    selected: string;        // 宠物 id
    visible: boolean;
    size: number;            // 64–224
    position: { x: number; y: number } | null;  // 0–1 归一化锚点
    roam: boolean;
    roamSpeed: number;       // 8–240 px/s
  };
  language: string;          // "zh" | "en"
  notifications: {
    items: NotificationItem[];   // 当前展示的通知，已按优先级排序
    activity: NotificationItem;  // items[0] 或 idle 占位
    hidden: number;              // 被手动关闭的通知数
  };
};

type NotificationItem = {
  id: string;        // 会话 id
  token: string;     // 该通知的时效令牌，操作时必须原样带回
  pose: "running" | "waiting" | "failed" | "review";
  title: string;     // 任务标题
  text: string;      // 状态描述（中文原文，界面会翻译）
  updatedAt: number;
  request?: {        // 仅 waiting 态：待处理的交互请求
    key: string;     // 请求 key，作为 requestKey 回传
    kind: "approval" | "question" | "plan-review";
    toolName?: string;
    reason?: string;
    questions?: Question[];
  };
};
```

### `subscribe(listener: (snapshot) => void): () => void`

订阅状态变化，listener 收到快照的深拷贝。返回取消订阅函数。
快照内容无变化时不派发。

```js
const off = pet.subscribe((snap) => {
  const waiting = snap?.notifications.items.filter((i) => i.pose === "waiting");
  if (waiting?.length) console.log("有待处理请求：", waiting.map((i) => i.title));
});
```

### `command(value): Promise<void>`

对通知执行操作。所有带 `id` / `token` 的命令都要求 token 与当前通知一致，
通知刷新后旧 token 会报「这条通知已更新」。

| value | 作用 |
| --- | --- |
| `{ type: "open", id, token }` | 打开对应会话（review 态打开后自动消除该通知） |
| `{ type: "dismiss", id, token }` | 关闭该轮提醒（任务继续运行） |
| `{ type: "stop", id, token }` | 停止该任务的当前轮次（仅 running 态） |
| `{ type: "restore" }` | 恢复全部已关闭的通知 |
| `{ type: "sort", latest: boolean }` | 切换排序：true 最新优先，false 待处理优先 |
| `{ type: "approve", id, token, requestKey }` | 批准工具审批（仅一次） |
| `{ type: "reject", id, token, requestKey }` | 拒绝工具审批 |
| `{ type: "answer", id, token, requestKey, answers }` | 回答提问 / 计划确认 |

`answer` 的 `answers` 结构：`{ answers: [{ id: 问题id, selected: string[]（选项 label）, custom?: string（文字回答） }] }`
（注意外层包一层 `answers` 对象），必须覆盖全部问题；单选题只能提交一个选项或一段文字。

```js
const snap = pet.getSnapshot();
const ask = snap.notifications.items.find((i) => i.request?.kind === "approval");
if (ask) await pet.command({ type: "approve", id: ask.id, token: ask.token, requestKey: ask.request.key });
```

### `updateConfig(value): Promise<void>`

修改宠物配置，等价于设置页的写入，服务端会做同样校验（非法值抛错并返回 400）。
可以只传要改的字段：

```js
await pet.updateConfig({ visible: false });        // 收起宠物
await pet.updateConfig({ roam: true, roamSpeed: 80 });
await pet.updateConfig({ size: 160, position: { x: 0.9, y: 0.85 } });
```

### `openSettings(): void`

打开宠物设置对话框（等同右键菜单里的「宠物设置」）。

### `acquireDisplay(): () => void`

接管宠物的屏幕展示权：调用后插件自带的悬浮宠物会隐藏，直到你调用返回的
释放函数。适合想完全自绘宠物外观的外嵌脚本。可重入（计数制）。

```js
const release = pet.acquireDisplay();
// ……自己画宠物……
release();
```

## 行为细节

- `command` / `updateConfig` 抛出的错误消息是中文原文（与界面一致），可自行按 `language` 处理。
- `getSnapshot()` / 订阅回调拿到的都是拷贝，随意改动不会影响插件内部状态。
- 插件热卸载后调用任何方法都会抛「宠物接口已卸载」；用 `dsh-pet-whale-disposed`
  事件清掉你自己的引用即可。
