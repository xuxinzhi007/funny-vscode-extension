# Coding Buddy - AI Assistant Guidelines

**Coding Buddy** 是一个 VS Code 伴侣扩展（陪伴式编程插件），通过交互式宠物、番茄工作法追踪和 DDL 管理来激发生产力。本代码库使用原生 Node.js 和 VS Code API（无构建步骤）。

## 架构概览

扩展遵循**模块化架构**，关注点分离清晰：

```
src/
├── core/
│   ├── eventBus.js       # 中央事件系统（pub/sub）
│   └── constants.js      # 全局常量和命令 ID
│
├── modules/              # ⭐ 核心功能模块（重构后）
│   ├── buddy/
│   │   ├── state.js      # 单一数据源（通过 globalState 持久化）
│   │   ├── buddy.js      # 搭子协调器（行为、升级、事件处理）
│   │   ├── behavior.js   # 行为系统（表情、状态衰减）
│   │   └── skins.js      # 皮肤解锁系统
│   ├── focus/
│   │   └── timer.js      # 番茄钟（工作/休息周期）
│   ├── tasks/
│   │   └── manager.js    # DDL 任务管理和提醒
│   └── chat/
│       └── processor.js  # 聊天处理（预设 + AI 对话）
│
├── ui/
│   ├── components/
│   │   ├── statusBar.js      # 活动栏指示器
│   │   └── webviewProvider.js # Webview 面板（聊天、DDL、控制）
│   └── views/            # UI 视图模板（可扩展）
│
└── utils/                # 通用工具函数
    └── date.js           # 日期格式化、倒计时
```

## 关键模式与约定

### 1. 状态管理
- 所有状态集中在 `state.js` 的单个 `state` 对象中：`buddy`, `focus`, `ddlTasks`, `stats`, `settings`
- 始终使用 `getState()` 读取，修改后调用 `saveState()`（非自动保存，避免过度持久化）
- 每日统计通过 `checkDailyReset()` 在启动时重置
- 示例：`const state = getState(); state.buddy.mood -= 5; saveState();`

### 2. 事件驱动通信 ⚡
**核心原则：模块间不直接导入调用，全部使用事件**
```javascript
// 发送事件
getEventBus().emit('buddy:stateUpdated', { delta: -5 });

// 监听事件
getEventBus().on('focus:completed', handleFocusCompleted);

// 常见事件：见 src/core/constants.js EVENTS 对象
```

- 避免直接耦合：`don't: buddy.changeBehavior()` → `do: emit('buddy:behaviorChanged')`
- Webview UI 在 `setupEventListeners()` 中订阅事件自动刷新

### 3. Webview-扩展通信
```javascript
// Webview 发送消息
webviewView.webview.postMessage({ type: 'chat', text: '...' });

// 扩展接收（handleMessage 中的 switch 语句）
case 'chat': 
  const response = await processMessage(message.text);
  this.view.webview.postMessage({ type: 'ui', ...update });
```

### 4. 预设聊天系统
- `PRESET_RESPONSES` 对象包含分类（`greetings`, `stats`, `focus`, 等）
- 每个分类有 `patterns`（正则数组）+ 要么 `responses`（随机选）要么 `handler`（动态）
- 示例：用户输入"开始专注" → 匹配 `focus.patterns` → 发送 `chat:command` 事件
- AI 回退：若 `settings.aiProvider` 已设置，未匹配预设时调用 AI API

### 5. 皮肤和升级系统
- `SKINS` 对象定义解锁条件（如 `{ type: 'focusMinutes', value: 500 }`）
- `checkSkinUnlocks()` 在统计更新后运行，发送 `buddy:skinUnlocked` 事件
- `BEHAVIOR_EMOJIS` 将行为字符串（`working`, `sleepy`, `anxious`）映射到表情数组
- 状态衰减：每 5 秒降低 mood/energy，长时间无交互变 `sleepy`

### 6. 代码变化追踪
```javascript
vscode.workspace.onDidChangeTextDocument() → emit('code:changed')
// 事件包含行数增删；更新 stats.today.linesAdded 和检查解锁条件
// 搭子自动变为 `working` 行为，减少 anxious（若有临近 DDL）
```

## 关键工作流

### 添加新功能
1. **定义状态** - 在 `DEFAULT_STATE` 中添加数据结构
2. **实现逻辑** - 在适当模块中（如 `modules/buddy/`, `modules/focus/`）
3. **发送事件** - 状态变化时发送事件；在 webviewProvider.js 监听自动更新 UI
4. **注册命令** - 用户触发时在 `extension.js` 注册；Webview 触发时在 `handleMessage` 中处理
5. **更新 UI** - webviewProvider.js 的 `getHtml()` 添加 UI 元素 + 消息处理器

### 测试专注计时器
- 专注状态持久化在 `state.focus`；计时器每秒发送 `focus:tick` 事件
- 测试：调用 `startWork(5)` 启动 5 分钟计时器，检查 `getFocusState().remainingSeconds`
- 长休息在 4 个工作周期后自动触发（`sessionsUntilLongBreak`）

### 调试状态问题
- 验证 `state` 已初始化：`console.log(getState())`
- 若重启后状态丢失，检查 `context.globalState.get('buddyState')`
- 所有 `console.log` 输出到 "输出 > Coding Buddy Logs"

## 语言与本地化
- **默认：** UI 字符串用中文（简体），代码注释用英文
- 所有搭子回复均为中文；`translation/` 文件夹预留（暂未使用）
- 示例：`"今天写了多少代码"` → `stats.handler()` → 格式化返回

## 性能考虑
- Focus 计时器：`setInterval(tick, 1000)`（粗粒度，1秒精度可接受）
- 行为表情：防抖 500ms 避免过度 Webview 重绘
- 状态衰减：每 60 秒运行；DDL 紧急检查每 60 秒
- Webview 更新：广播整个状态（非细粒度）以保持实现简洁

## 重构清单（最新）✅

- [x] 创建 `src/modules/` 目录结构
- [x] 拆分 `buddy.js` → `buddy.js` (协调) + `behavior.js` (行为) + `skins.js` (皮肤)
- [x] 移动 `focus.js` → `modules/focus/timer.js`
- [x] 移动 `ddl.js` → `modules/tasks/manager.js`
- [x] 移动 `chat.js` → `modules/chat/processor.js`
- [x] 创建 `src/core/constants.js` 集中管理常量
- [x] 创建 `src/utils/date.js` 工具函数
- [x] 移动 UI 文件 → `src/ui/components/`
- [x] 更新所有导入路径
- [ ] 提取 Webview HTML/CSS/JS 为独立文件（可选下一步）
- [ ] 添加 Git 集成分析（见 FEATURE_RECOMMENDATIONS.md）

## 不在未理解前修改的文件
- **`extension.js`** - 扩展生命周期；改变命令 ID 会破坏激活
- **`src/modules/buddy/state.js`** - 新增属性需要 DEFAULT_STATE 默认值 + `mergeState()` 迁移逻辑
- **`src/core/eventBus.js`** - 核心 pub/sub；修改影响所有依赖事件的模块

