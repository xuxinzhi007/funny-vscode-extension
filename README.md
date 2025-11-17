# Coding Idle Game

A VSCode extension that makes coding more fun! Combines an idle game, cool effects, and entertaining features to earn coins while you code.

## ✨ 主要功能

### 🎮 挂机游戏系统

在侧边栏中体验完整的金币挂机游戏：

- **自动挂机**：编辑器打开时自动产生金币
- **手动点击**：点击按钮或使用快捷键 `Cmd+Alt+C` / `Ctrl+Alt+C` 获得金币
- **升级系统**：购买多种升级项提升金币产出速度
  - 咖啡机：+0.1 金币/秒
  - 机械键盘：+0.5 金币/秒
  - 双显示器：+2 金币/秒
  - 人体工学椅：+5 金币/秒
  - 代码助手：+15 金币/秒
  - AI编程伙伴：+50 金币/秒
- **成就系统**：完成各种里程碑解锁成就徽章
- **状态栏显示**：实时显示金币数量和产出速率

### 💥 编码特效

让你的代码输入充满视觉冲击力：

#### 🪙 金币粒子效果
- 每次输入代码时都会爆出金币粒子
- 金币会向上漂浮并逐渐消失
- 伴随闪光效果

#### ✨ 关键词爆炸特效
当输入特定编程关键词时，触发超酷的文字破碎和符号爆炸效果：

**6 大关键词类别**，每个类别都可以独立配置：

1. **💥 函数关键词**
   - 默认关键词：`function`, `func`, `def`, `fn`, `async`, `await`
   - 特效符号：💥, 🔥, ⚡, ✨

2. **💎 类关键词**
   - 默认关键词：`class`, `interface`, `struct`, `enum`, `type`
   - 特效符号：💎, 👑, 🌟, ⭐

3. **🔄 循环关键词**
   - 默认关键词：`for`, `while`, `loop`, `foreach`, `map`, `filter`
   - 特效符号：🔄, ♻️, 🌀, ⚙️

4. **❓ 条件关键词**
   - 默认关键词：`if`, `else`, `switch`, `case`, `when`, `match`
   - 特效符号：❓, ❗, ⚠️, 🎯

5. **📦 变量关键词**
   - 默认关键词：`const`, `let`, `var`, `val`
   - 特效符号：📦, 🎁, 📫, 🗃️

6. **↩️ 返回关键词**
   - 默认关键词：`return`, `yield`, `break`, `continue`
   - 特效符号：↩️, ⬅️, 🔙, ↪️

**🎨 完全可自定义**：
- 每个类别都可以独立启用/禁用
- 自定义关键词列表（支持任何语言，如西班牙语的 `método`）
- 自定义特效符号（选择你喜欢的 emoji）

### 🌊 波纹特效

- 鼠标点击时产生彩色波纹效果
- 可调节波纹大小（50-300px）
- 随机彩色波纹

### 🎰 抽奖系统

使用金币进行抽奖，赢取各种奖励：
- **普通奖励**：小额金币、经验值提升
- **稀有奖励**：大额金币、生产加成
- **史诗奖励**：巨额金币、超级加成
- **传说奖励**：超大金币包、永久增益

### 💾 存档管理

- **自动保存**：每 10 秒自动保存游戏进度
- **查看存档信息**：显示存档详细数据
- **打开存档文件夹**：快速访问存档位置
- **手动备份**：创建存档备份以防数据丢失

### 🌐 翻译功能（新增）

让编码和国际化开发更高效：

- **选中即翻译**：选中文本后快速翻译（支持中英互译）
- **变量名建议**：输入中文自动生成符合规范的英文变量名
- **多种命名风格**：支持 camelCase、PascalCase、snake_case、UPPER_SNAKE_CASE、kebab-case
- **智能变体**：自动生成常见前缀（get/set/is/has）和后缀（List/Map/Count）
- **悬浮显示**：翻译结果直接在编辑器中显示，无需跳转
- **可配置API**：支持百度翻译和自定义翻译API
- **智能缓存**：相同内容不重复请求，提升速度

**配置方式：**
1. 点击左侧 **⭐ 挂机游戏** 图标打开侧边栏
2. 点击顶部 **⚙️ 设置** 标签
3. 找到 **🌐 翻译功能** 区域
4. 点击 **⚙️ 配置翻译API** 按钮
5. 填入百度翻译 AppID 和密钥（[免费申请](https://fanyi-api.baidu.com/doc/21)）

**使用方式：**
1. **双击**选中任意文字
2. **右键**点击
3. 选择 **🌐 翻译选中文本** 或 **💡 变量名建议**
4. 点击"复制"或"替换"

**使用场景：**
- 阅读英文注释和文档
- 编写国际化（i18n）文案
- 快速生成规范的变量名
- 中英文代码注释互译

详细使用说明：[快速上手](TRANSLATION_QUICK_START.md) | [完整指南](TRANSLATION_GUIDE.md) | [配置说明](TRANSLATION_SETUP.md)

### 😄 趣味功能

- **随机笑话**：显示编程相关的幽默笑话
- **随机表情**：在编辑器中插入随机 emoji

## 🚀 快速开始

### 用户安装

#### 方式 1：从 Marketplace 安装（推荐）

1. 打开 VS Code 或 Cursor
2. 点击左侧扩展图标
3. 搜索 **"Coding Idle Game"**
4. 点击安装

或者直接访问：[Marketplace 页面](https://marketplace.visualstudio.com/items?itemName=xinzhixu.funny-vscode-extension)

#### 方式 2：使用扩展 ID 安装

如果搜索不到，可以用扩展 ID 直接安装：
```
xinzhixu.funny-vscode-extension
```

### 开发者安装（调试和开发）

如果您想修改或调试扩展代码：

1. **克隆项目**
   ```bash
   git clone https://github.com/xuxinzhi007/funny-vscode-extension.git
   cd funny-vscode-extension
   ```

2. **安装依赖**（如果有）
   ```bash
   npm install
   ```

3. **在 VS Code 中打开项目**
   ```bash
   code .
   ```

4. **启动调试**
   - 按 **F5** 键
   - 或点击"运行和调试"→"运行扩展"
   - 新的 VS Code 窗口会打开，扩展已自动激活

5. **修改代码后**
   - 在调试窗口按 **Cmd+R** (Mac) 或 **Ctrl+R** (Windows) 重新加载
   - 或重新按 F5

> **注意**：`.vscode/launch.json` 和 `.vscode/tasks.json` 是开发调试配置文件，用户安装扩展时不需要这些文件。

### 使用方法

#### 打开游戏界面

1. 点击左侧活动栏的 **⭐ 挂机游戏** 图标
2. 在侧边栏中查看游戏界面

#### 启用编码特效

1. 在侧边栏找到 **💥 编码特效** 区域
2. 点击 **✅ 已启用** 按钮开启特效
3. 点击右侧的 **⚙️** 图标打开配置面板

#### 自定义关键词特效

1. 打开编码特效配置面板
2. 找到想要自定义的类别（如 "💥 函数关键词"）
3. 点击 **✏️ 编辑** 按钮
4. 第一步：输入关键词，用逗号分隔（例如：`function, func, método`）
5. 第二步：输入符号，用逗号分隔（例如：`💥, 🔥, ⚡`）
6. 点击确认保存

#### 切换类别开关

在配置面板中，每个类别都有独立的开关按钮：
- **✅ 已启用**：点击切换为禁用
- **❌ 已禁用**：点击切换为启用

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd+Alt+J` / `Ctrl+Alt+J` | 显示随机笑话 |
| `Cmd+Alt+E` / `Ctrl+Alt+E` | 插入随机表情 |
| `Cmd+Alt+C` / `Ctrl+Alt+C` | 手动获得金币 |
| `Cmd+Alt+T` / `Ctrl+Alt+T` | 翻译选中文本 |
| `Cmd+Alt+V` / `Ctrl+Alt+V` | 变量名建议 |

## ⚙️ 配置选项

在 VSCode 设置中可以配置：

```json
{
  // 启用鼠标点击波纹特效
  "funny-vscode-extension.enableRippleEffect": false,

  // 波纹特效大小（像素）
  "funny-vscode-extension.rippleSize": 100,

  // 启用编码特效（金币粒子特效）
  "funny-vscode-extension.enableCodeEffect": false,

  // 关键词类别配置
  "funny-vscode-extension.keywordCategories": {
    "functions": {
      "enabled": true,
      "keywords": ["function", "func", "def", "fn", "async", "await"],
      "symbols": ["💥", "🔥", "⚡", "✨"]
    },
    // ... 其他类别
  },

  // 翻译功能配置
  "funny-vscode-extension.translation.provider": "baidu",
  "funny-vscode-extension.translation.baiduAppId": "",
  "funny-vscode-extension.translation.baiduSecretKey": "",
  "funny-vscode-extension.translation.timeout": 5000
}
```

## 📂 项目结构

```
my-first-vscode-extension/
├── extension.js                    # 主入口文件
├── package.json                    # 扩展清单
├── README.md                       # 本文件
├── src/
│   ├── game/                       # 游戏逻辑模块
│   │   ├── gameState.js           # 游戏状态管理
│   │   ├── achievements.js        # 成就系统
│   │   ├── lottery.js             # 抽奖系统
│   │   └── storage.js             # 存档管理
│   └── ui/                         # 界面模块
│       ├── webview.js             # 侧边栏界面
│       ├── statusBar.js           # 状态栏显示
│       └── coinParticleEffect.js  # 金币粒子特效
└── .vscode/
    ├── launch.json                 # 调试配置
    └── tasks.json                  # 构建任务配置
```

### 开发配置说明

#### `.vscode/` 文件夹

这个文件夹包含开发调试的配置文件：

**launch.json** - 调试启动配置
- 按 F5 时使用
- 配置扩展的启动方式
- 自动生成：按 F5 → 选择 "VS Code Extension Development"

**tasks.json** - 构建任务配置
- 用于 TypeScript 编译等任务
- 本项目使用纯 JavaScript，可选

**如何生成这些文件？**

方法 1：使用生成器（推荐新项目）
```bash
npm install -g yo generator-code
yo code
```

方法 2：VS Code 自动生成
1. 打开项目
2. 按 F5
3. 选择 "VS Code Extension Development"
4. 自动生成 `.vscode/launch.json`

方法 3：从现有项目复制
- 从本项目的 `.vscode` 文件夹复制到新项目

> **重要**：这些文件仅用于开发，不会被打包到发布的扩展中（被 `.vscodeignore` 排除）。

## 🎨 特效预览

### 编码特效示例

```javascript
// 输入 "function" 时
function hello() {  // 💥 🔥 ⚡ 触发文字破碎特效！
  console.log("Hello!");
}

// 输入 "class" 时
class Game {        // 💎 👑 🌟 触发类关键词特效！
  // ...
}

// 输入 "for" 时
for (let i = 0; i < 10; i++) {  // 🔄 ♻️ 🌀 触发循环特效！
  // ...
}
```

## 💡 使用技巧

1. **快速赚取金币**：
   - 编码时开启编码特效，输入代码自动获得金币
   - 使用快捷键 `Cmd+Alt+C` 手动点击获得金币
   - 优先升级产出高的项目（如"AI编程伙伴"）

2. **自定义关键词**：
   - 添加你最常用的编程语言关键词
   - 例如 Python 开发者可以添加 `def`, `class`, `import`
   - 例如 Go 开发者可以添加 `func`, `struct`, `interface`

3. **性能优化**：
   - 如果感觉卡顿，可以关闭部分类别的特效
   - 减少特效符号数量

4. **存档备份**：
   - 定期使用"备份存档"功能保护数据
   - 存档位置：扩展的全局存储路径

## 🔧 开发与调试

### 调试扩展

1. 打开项目文件夹
2. 按 **F5** 启动调试
3. 在新窗口中测试功能
4. 查看调试控制台的日志输出

### 修改代码

- **添加新笑话**：编辑 `extension.js` 中的 `jokes` 数组
- **修改游戏数值**：编辑 `src/game/gameState.js`
- **自定义特效**：编辑 `src/ui/coinParticleEffect.js`
- **调整界面样式**：编辑 `src/ui/webview.js` 中的 CSS

## 📦 打包与发布

### 首次发布配置

1. **安装发布工具**
```bash
npm install -g @vscode/vsce
```

2. **创建 Personal Access Token**
   - 访问 https://dev.azure.com/
   - 创建组织（如果没有）
   - 点击用户头像 → Personal Access Tokens
   - 创建新 Token：
     - Name: `vsce-marketplace`
     - Organization: All accessible organizations
     - Scopes: **Marketplace → Manage** ✓
   - 复制生成的 Token（只显示一次！）

3. **登录发布者账号**
```bash
vsce login xinzhixu
# 粘贴您的 Personal Access Token
```

### 快速发布（推荐）

使用自动化脚本：
```bash
./update.sh
```

脚本会自动：
- 提示输入新版本号
- 更新 package.json
- 打包扩展
- 发布到 Marketplace

### 手动发布

```bash
# 1. 修改 package.json 中的 version（如 1.0.1 → 1.0.2）

# 2. 发布（会自动打包并发布）
vsce publish

# 或者使用自动递增版本
vsce publish patch   # 1.0.0 → 1.0.1
vsce publish minor   # 1.0.0 → 1.1.0
vsce publish major   # 1.0.0 → 2.0.0
```

### 仅打包（不发布）

```bash
vsce package
# 生成 .vsix 文件，可手动上传到 Marketplace
```

### 换设备发布

如果在新电脑上发布：

1. **克隆项目**
```bash
git clone https://github.com/xuxinzhi007/funny-vscode-extension.git
cd funny-vscode-extension
```

2. **安装工具**
```bash
npm install -g @vscode/vsce
```

3. **登录发布者**（使用保存的 Token）
```bash
vsce login xinzhixu
# 粘贴您之前保存的 Personal Access Token
```

4. **发布更新**
```bash
vsce publish
```

> 💡 **提示**：建议将 Personal Access Token 保存在密码管理器中，以便在新设备使用。

### 发布验证

发布后访问：
- **扩展页面**: https://marketplace.visualstudio.com/items?itemName=xinzhixu.funny-vscode-extension
- **管理页面**: https://marketplace.visualstudio.com/manage/publishers/xinzhixu

通常 5-30 分钟内生效，Cursor 可能需要更长时间（几小时到一天）。

详细信息请参阅 [VSCode 扩展发布指南](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)。

## 🐛 常见问题

**Q: 特效没有显示？**
A: 确保在侧边栏中启用了"💥 编码特效"开关。

**Q: 点击设置按钮没有反应？**
A: 尝试重新加载窗口（`Cmd+R` / `Ctrl+R`）。

**Q: 金币没有自动增长？**
A: 检查是否购买了至少一个升级项目。

**Q: 存档丢失了？**
A: 查看是否有备份文件，或检查扩展的存储路径。

**Q: 如何完全关闭特效？**
A: 在侧边栏中点击"💥 编码特效"的 **❌ 已禁用** 按钮。

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有为这个项目提供灵感和建议的开发者！

---

**享受编程的乐趣！** 💻✨🎮
