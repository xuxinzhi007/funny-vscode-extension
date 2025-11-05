# 插件图标设计指南

为你的 VSCode 扩展创建一个吸引人的图标。

## 📐 规格要求

- **尺寸**: 128x128 像素（必须）
- **格式**: PNG 或 JPG
- **文件名**: `icon.png`
- **位置**: 项目根目录
- **背景**: 透明或纯色（推荐透明）

## 🎨 设计建议

### 主题元素

你的扩展是关于挂机游戏和编码特效的，可以考虑这些元素：

1. **金币** 💰 - 代表挂机游戏
2. **星星/闪光** ✨ - 代表特效
3. **代码符号** {} - 代表编程
4. **游戏手柄** 🎮 - 代表游戏
5. **火花/爆炸** 💥 - 代表关键词特效

### 颜色方案

- **主色**: 金色 (#FFD700) - 代表金币
- **辅色**:
  - 橙色 (#FFA500) - 活力
  - 紫色 (#9B59B6) - 特效
  - 蓝色 (#3498DB) - 科技感

### 设计原则

✅ **DO（推荐）**:
- 简单、清晰、易识别
- 在小尺寸下也能看清楚
- 使用高对比度
- 保持图标中心对称
- 使用少于 3 种颜色

❌ **DON'T（避免）**:
- 过于复杂的细节
- 文字（除非非常清晰）
- 过多颜色
- 低对比度
- 模糊或低质量图像

## 🛠️ 设计工具

### 在线工具（免费）

1. **Canva** - https://www.canva.com/
   - 模板丰富
   - 操作简单
   - 免费版本足够使用

2. **Figma** - https://www.figma.com/
   - 专业设计工具
   - 免费个人版
   - 强大的矢量编辑

3. **Photopea** - https://www.photopea.com/
   - 在线版 Photoshop
   - 完全免费
   - 功能强大

4. **Favicon.io** - https://favicon.io/
   - 快速生成简单图标
   - 文字转图标
   - Emoji 转图标

### 桌面工具

1. **GIMP** (免费) - https://www.gimp.org/
2. **Inkscape** (免费矢量) - https://inkscape.org/
3. **Adobe Photoshop** (付费)
4. **Sketch** (付费, macOS)

## 🎯 快速方案

### 方案 1: 使用 Emoji（最快）

使用在线工具将 emoji 转为图标：

1. 访问 https://favicon.io/emoji-favicons/
2. 选择合适的 emoji（如 💰 💎 ✨ 🎮）
3. 下载 PNG 文件
4. 调整大小到 128x128

**推荐 Emoji**:
- 💰 (金币袋)
- 🪙 (硬币)
- ✨ (闪光)
- 💎 (钻石)
- 🎮 (游戏手柄)

### 方案 2: 组合设计

使用 Canva 快速创建：

1. 访问 https://www.canva.com/
2. 创建自定义尺寸：128x128
3. 添加元素：
   - 背景：金色渐变圆形
   - 前景：白色代码符号 `{}`
   - 装饰：小星星 ✨
4. 导出为 PNG（透明背景）

### 方案 3: 简单文字图标

使用首字母创建：

1. 访问 https://favicon.io/favicon-generator/
2. 输入文字：`F` 或 `游`
3. 选择字体和颜色
4. 下载并调整大小

## 📝 配置图标

创建图标后，按以下步骤配置：

1. **保存图标**：
   - 将图标命名为 `icon.png`
   - 放在项目根目录

2. **更新 package.json**：
   ```json
   {
     "icon": "icon.png"
   }
   ```

3. **测试效果**：
   ```bash
   vsce package
   code --install-extension funny-vscode-extension-1.0.0.vsix
   ```
   然后在扩展列表中查看图标效果

## 🎨 设计示例

### 示例 1: 金币主题
```
[金色圆形背景]
    ┌─────┐
    │ 💰  │  金币图案
    └─────┘
   [白色边框]
```

### 示例 2: 代码特效主题
```
[紫色-蓝色渐变]
    ┌─────┐
    │{💥}│  代码符号 + 爆炸
    └─────┘
   [透明背景]
```

### 示例 3: 极简主题
```
[纯金色背景]
    ┌─────┐
    │  G  │  大写字母 G (Game)
    └─────┘
   [白色文字]
```

## ✅ 检查清单

发布前检查图标：

- [ ] 尺寸是 128x128 像素
- [ ] 格式是 PNG 或 JPG
- [ ] 文件名是 `icon.png`
- [ ] 在项目根目录
- [ ] package.json 中已配置 `"icon": "icon.png"`
- [ ] 在小尺寸下依然清晰可见
- [ ] 背景透明或使用合适的颜色
- [ ] 与扩展主题相符

## 🌟 专业建议

如果你想要更专业的图标：

1. **雇佣设计师**:
   - Fiverr: https://www.fiverr.com/ (从 $5 起)
   - Upwork: https://www.upwork.com/
   - 99designs: https://99designs.com/

2. **使用图标库**:
   - Flaticon: https://www.flaticon.com/
   - Icons8: https://icons8.com/
   - Font Awesome: https://fontawesome.com/

3. **AI 生成**:
   - Midjourney (Discord)
   - DALL-E (OpenAI)
   - Stable Diffusion

## 🚫 注意事项

- ❌ 不要使用有版权的图像
- ❌ 不要抄袭其他扩展的图标
- ❌ 不要使用商标（如 VSCode logo）
- ✅ 使用免费图标库（注明来源）
- ✅ 自己创作原创设计
- ✅ 使用 emoji（无版权限制）

## 🔗 有用资源

- [VSCode 图标指南](https://code.visualstudio.com/api/references/extension-manifest#icon)
- [Material Design 图标](https://material.io/resources/icons/)
- [Heroicons](https://heroicons.com/)
- [Lucide Icons](https://lucide.dev/)

---

**提示**: 即使没有图标也可以发布，但有图标的扩展更容易被用户注意和下载！
