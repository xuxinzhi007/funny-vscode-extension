# VSCode 扩展发布指南

完整的步骤指南，帮助你将扩展发布到 VSCode Marketplace。

## 📋 发布前检查清单

在开始之前，确认以下内容已完成：

- [x] ✅ package.json 已完善（名称、描述、版本、关键词）
- [x] ✅ README.md 已更新（功能介绍、使用方法）
- [x] ✅ LICENSE 文件已创建
- [x] ✅ CHANGELOG.md 已创建
- [x] ✅ .vscodeignore 已创建
- [ ] ⚠️ 修改 package.json 中的个人信息
- [ ] ⚠️ 创建 GitHub 仓库（可选但推荐）
- [ ] ⚠️ 创建插件图标（可选但推荐）

## 🔧 步骤 1：修改个人信息

编辑 `package.json`，替换以下占位符：

```json
{
  "publisher": "your-publisher-id",  // 替换为你的发布者 ID
  "author": {
    "name": "Your Name"  // 替换为你的名字
  },
  "repository": {
    "url": "https://github.com/yourusername/funny-vscode-extension"  // 替换为你的仓库地址
  },
  "bugs": {
    "url": "https://github.com/yourusername/funny-vscode-extension/issues"
  },
  "homepage": "https://github.com/yourusername/funny-vscode-extension#readme"
}
```

同时修改 `LICENSE` 文件中的版权信息：
```
Copyright (c) 2025 [Your Name]  // 替换为你的名字
```

## 🎨 步骤 2：创建插件图标（推荐）

创建一个 128x128 像素的 PNG 图标，命名为 `icon.png`，放在项目根目录。

然后在 `package.json` 中添加：

```json
{
  "icon": "icon.png"
}
```

**图标设计建议**：
- 使用简单、易识别的设计
- 建议包含游戏或金币元素
- 背景透明或纯色
- 适合在小尺寸下显示

**在线图标工具**：
- https://www.canva.com/ （可视化设计）
- https://www.figma.com/ （专业设计工具）
- https://favicon.io/ （简单图标生成）

## 🗂️ 步骤 3：创建 GitHub 仓库（推荐）

1. **在 GitHub 上创建新仓库**：
   - 访问 https://github.com/new
   - 仓库名称：`funny-vscode-extension`
   - 描述：`让编程更有趣的 VSCode 扩展`
   - 公开（Public）
   - 不要初始化 README（本地已有）

2. **本地初始化 Git 并推送**：

```bash
cd /Users/admin/Documents/my-first-vscode-extension

# 初始化 Git（如果还没有）
git init

# 创建 .gitignore 文件
cat > .gitignore << 'EOF'
node_modules/
*.vsix
.DS_Store
.vscode-test/
*.log
EOF

# 添加所有文件
git add .

# 创建首次提交
git commit -m "feat: 首次发布 - 挂机游戏 + 编码特效扩展"

# 连接到远程仓库（替换 yourusername）
git remote add origin https://github.com/yourusername/funny-vscode-extension.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 🔑 步骤 4：注册发布者账号

### 4.1 创建 Azure DevOps 账号

1. 访问 https://dev.azure.com/
2. 点击 "Start free" 注册账号
3. 可以使用 Microsoft 账号、GitHub 账号或新建账号

### 4.2 创建 Personal Access Token (PAT)

1. 登录 Azure DevOps
2. 点击右上角的用户图标 → "Personal access tokens"
3. 点击 "+ New Token"
4. 配置 Token：
   - **Name**: `VSCode Extension Publishing`
   - **Organization**: 选择 "All accessible organizations"
   - **Expiration**: 选择有效期（建议 1 年或自定义）
   - **Scopes**: 选择 "Custom defined"
     - 展开 "Marketplace"
     - 勾选 **"Acquire"** 和 **"Manage"**
5. 点击 "Create"
6. **⚠️ 重要**：复制生成的 Token 并保存到安全的地方（只显示一次！）

### 4.3 创建发布者 ID

1. 访问 https://marketplace.visualstudio.com/manage
2. 使用 Azure DevOps 账号登录
3. 点击 "Create publisher"
4. 填写信息：
   - **ID**: 发布者 ID（小写字母、数字、连字符，例如：`your-name`）
   - **Display Name**: 显示名称（例如：`Your Name`）
   - **Description**: 简短描述
5. 创建成功后，记住你的 **Publisher ID**

## 📦 步骤 5：安装 vsce 工具

```bash
# 全局安装 vsce
npm install -g @vscode/vsce

# 验证安装
vsce --version
```

## 🚀 步骤 6：打包扩展

在发布前，先打包测试：

```bash
cd /Users/admin/Documents/my-first-vscode-extension

# 打包扩展
vsce package

# 这会生成一个 .vsix 文件，例如：
# funny-vscode-extension-1.0.0.vsix
```

**测试打包的扩展**：
1. 在 VSCode 中按 `Cmd+Shift+P` / `Ctrl+Shift+P`
2. 输入 "Extensions: Install from VSIX..."
3. 选择生成的 .vsix 文件
4. 测试所有功能是否正常

## 🌐 步骤 7：发布到 Marketplace

### 7.1 登录发布者账号

```bash
# 使用你的 Personal Access Token 登录
vsce login your-publisher-id

# 输入刚才创建的 PAT
```

### 7.2 发布扩展

**首次发布**：

```bash
vsce publish

# 或者指定版本号
vsce publish 1.0.0
```

**如果遇到问题，可以尝试**：

```bash
# 使用 PAT 直接发布
vsce publish -p <your-personal-access-token>
```

### 7.3 验证发布

1. 访问 https://marketplace.visualstudio.com/
2. 搜索你的扩展名称
3. 或访问 https://marketplace.visualstudio.com/items?itemName=your-publisher-id.funny-vscode-extension

**注意**：新发布的扩展可能需要 5-10 分钟才能在 Marketplace 上显示。

## 🔄 步骤 8：更新扩展

当你需要发布新版本时：

1. **更新版本号**：

```bash
# 补丁版本（1.0.0 → 1.0.1）
vsce publish patch

# 次版本（1.0.0 → 1.1.0）
vsce publish minor

# 主版本（1.0.0 → 2.0.0）
vsce publish major
```

2. **更新 CHANGELOG.md**：记录新版本的变更

3. **提交到 Git**：

```bash
git add .
git commit -m "chore: 发布 v1.0.1"
git push
```

## 📊 步骤 9：监控扩展

### 查看统计信息

1. 访问 https://marketplace.visualstudio.com/manage
2. 查看下载量、评分、用户反馈

### 管理扩展

- **更新描述**：在 Marketplace 管理页面编辑
- **回复评论**：与用户互动
- **查看安装趋势**：了解扩展受欢迎程度

## 🎯 最佳实践

### 发布前

- ✅ 在本地充分测试所有功能
- ✅ 确保 README 清晰易懂
- ✅ 添加截图或 GIF 演示
- ✅ 检查所有依赖是否正确

### 发布后

- 📢 在社交媒体分享
- 📧 收集用户反馈
- 🐛 及时修复 bug
- ✨ 定期添加新功能

### 版本管理

- 遵循语义化版本（SemVer）：
  - **主版本**：不兼容的 API 修改
  - **次版本**：向下兼容的功能性新增
  - **修订版本**：向下兼容的问题修正

## ⚠️ 常见问题

### Q1: 发布时提示 "Publisher not found"

**解决**：
- 确认已创建发布者账号
- 检查 `package.json` 中的 `publisher` 字段是否正确
- 使用 `vsce login` 重新登录

### Q2: 发布时提示 "Authentication failed"

**解决**：
- 检查 Personal Access Token 是否正确
- 确认 Token 有 "Marketplace (Manage)" 权限
- Token 是否过期

### Q3: 扩展在 Marketplace 上不显示

**解决**：
- 等待 5-10 分钟
- 清除浏览器缓存
- 检查是否发布成功（查看 vsce 输出）

### Q4: 如何删除已发布的扩展？

**解决**：
```bash
# 取消发布（不删除，只是隐藏）
vsce unpublish your-publisher-id.funny-vscode-extension

# 完全删除需要在 Marketplace 管理页面操作
```

## 📚 相关资源

- [VSCode 扩展发布文档](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [vsce 工具文档](https://github.com/microsoft/vscode-vsce)
- [Marketplace 管理页面](https://marketplace.visualstudio.com/manage)
- [扩展开发指南](https://code.visualstudio.com/api)

## 🎉 完成！

恭喜！你的扩展现在已经发布到 VSCode Marketplace 了！

用户可以通过以下方式安装：
1. 在 VSCode 中搜索扩展名称
2. 访问 Marketplace 页面
3. 使用命令：`code --install-extension your-publisher-id.funny-vscode-extension`

---

**祝你的扩展大受欢迎！** 🚀✨
