# 快速发布命令参考

这是一个快速命令列表，帮助你快速完成发布流程。

## 🚀 快速开始（5 分钟发布）

### 1. 修改个人信息

编辑 `package.json` 中的以下字段：
```json
"publisher": "你的发布者ID",
"author": { "name": "你的名字" },
"repository": { "url": "你的GitHub仓库地址" }
```

编辑 `LICENSE` 文件中的版权信息：
```
Copyright (c) 2025 你的名字
```

### 2. 创建 Azure DevOps 账号并获取 Token

1. 访问 https://dev.azure.com/ 注册
2. 访问 https://dev.azure.com/你的账号/_usersSettings/tokens
3. 创建新 Token，权限选择 **Marketplace (Manage)**
4. **保存 Token！**

### 3. 创建发布者

访问 https://marketplace.visualstudio.com/manage 创建发布者账号

### 4. 安装 vsce

```bash
npm install -g @vscode/vsce
```

### 5. 打包测试

```bash
cd /Users/admin/Documents/my-first-vscode-extension
vsce package
```

### 6. 发布

```bash
# 登录
vsce login 你的发布者ID

# 发布
vsce publish
```

## 📝 常用命令

### 打包

```bash
# 打包成 .vsix 文件
vsce package

# 本地安装测试
code --install-extension funny-vscode-extension-1.0.0.vsix
```

### 发布

```bash
# 首次发布
vsce publish

# 使用 Token 直接发布
vsce publish -p 你的PAT

# 发布并升级版本
vsce publish patch   # 1.0.0 → 1.0.1
vsce publish minor   # 1.0.0 → 1.1.0
vsce publish major   # 1.0.0 → 2.0.0
```

### Git 操作

```bash
# 初始化 Git
git init
git add .
git commit -m "feat: 首次发布"

# 连接 GitHub（替换你的用户名）
git remote add origin https://github.com/你的用户名/funny-vscode-extension.git
git branch -M main
git push -u origin main
```

### 更新版本

```bash
# 1. 修改代码
# 2. 更新 CHANGELOG.md
# 3. 提交并发布
git add .
git commit -m "feat: 添加新功能"
git push
vsce publish minor
```

### 管理

```bash
# 显示扩展信息
vsce show 你的发布者ID.funny-vscode-extension

# 取消发布（隐藏但不删除）
vsce unpublish 你的发布者ID.funny-vscode-extension

# 列出所有文件（检查打包内容）
vsce ls
```

## 🔗 重要链接

- **Marketplace 管理**: https://marketplace.visualstudio.com/manage
- **Azure DevOps**: https://dev.azure.com/
- **创建 PAT**: https://dev.azure.com/_usersSettings/tokens
- **扩展页面**: https://marketplace.visualstudio.com/items?itemName=你的发布者ID.funny-vscode-extension

## ⚠️ 发布前检查

- [ ] 已修改 package.json 中的 publisher
- [ ] 已修改 package.json 中的 author
- [ ] 已修改 LICENSE 中的版权信息
- [ ] 已创建 Azure DevOps 账号
- [ ] 已获取 Personal Access Token
- [ ] 已创建发布者 ID
- [ ] 已安装 vsce 工具
- [ ] 已测试打包的 .vsix 文件
- [ ] README.md 清晰易懂
- [ ] 所有功能都正常工作

## 🎯 推荐流程

### 首次发布

1. ✅ 完善 package.json
2. ✅ 注册 Azure DevOps + 获取 PAT
3. ✅ 创建发布者
4. ✅ 安装 vsce
5. ✅ 打包测试：`vsce package`
6. ✅ 本地安装测试
7. ✅ 登录：`vsce login`
8. ✅ 发布：`vsce publish`
9. ✅ 等待 5-10 分钟后在 Marketplace 查看

### 更新版本

1. 修改代码
2. 更新 CHANGELOG.md
3. 测试功能
4. 提交 Git: `git add . && git commit -m "feat: xxx"`
5. 推送: `git push`
6. 发布: `vsce publish minor`

---

**详细说明请参考 PUBLISHING_GUIDE.md**
