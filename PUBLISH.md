# 发布到 VSCode Marketplace

简洁的发布流程指南。

## 📦 快速发布（5 分钟）

### 1. 打包测试

```bash
# 使用脚本打包
./package.sh

# 或者使用完整路径
/Users/admin/.npm-global/bin/vsce package
```

会生成：`funny-vscode-extension-1.0.0.vsix`

### 2. 本地测试（可选）

```bash
# 安装
1. code --install-extension funny-vscode-extension-1.0.0.vsix
2. 按 Cmd+Shift+P" ｜｜  Ctrl+Shift+P （windows）
   输入: Extensions: Install from VSIX"
   选择上面生成的 .vsix 文件"

# 卸载
code --uninstall-extension xinzhixu.funny-vscode-extension
```

或在 VSCode 中：
- `Cmd+Shift+X` 打开扩展
- 搜索 "有趣的VSCode扩展"
- 点击齿轮 → 卸载

### 3. 创建 Personal Access Token

访问：https://dev.azure.com/_usersSettings/tokens

配置：
- **Name**: `VSCode Extension Publishing`
- **Organization**: `All accessible organizations`
- **Expiration**: `90 days`
- **Scopes**: 展开 **Marketplace** → 勾选 **Manage** ✅

**⚠️ 保存 Token！只显示一次**

### 4. 发布

```bash
# 登录
/Users/admin/.npm-global/bin/vsce login xinzhixu

# 输入刚才的 Token

# 发布
/Users/admin/.npm-global/bin/vsce publish
```

### 5. 验证

5-10 分钟后访问：
https://marketplace.visualstudio.com/items?itemName=xinzhixu.funny-vscode-extension

---

## 🔄 更新版本

### 方法 1：使用更新脚本（推荐）

```bash
./update.sh
```

自动完成：
1. 询问新版本号
2. 更新 package.json
3. 自动打包

然后手动：
1. 更新 CHANGELOG.md
2. Git 提交和推送
3. 手动上传到 Marketplace

### 方法 2：手动更新

1. 编辑 `package.json`：
   ```json
   "version": "1.0.1"
   ```

2. 更新 `CHANGELOG.md`

3. 打包：
   ```bash
   ./package.sh
   ```

4. 上传新的 `.vsix` 文件到 Marketplace

---

## 🔗 重要链接

- **发布者管理**: https://marketplace.visualstudio.com/manage
- **Azure DevOps**: https://dev.azure.com/
- **GitHub 仓库**: https://github.com/xuxinzhi007/funny-vscode-extension
- **扩展页面**: https://marketplace.visualstudio.com/items?itemName=xinzhixu.funny-vscode-extension

---

## 💡 提示

- Token 过期后需要重新创建
- 发布后无法立即删除，只能取消发布
- 修改扩展信息需要重新发布版本

 🎯 生成 .vscode 文件夹的方法：

  方法 1：使用 Yeoman 生成器（推荐）

  创建新扩展项目时，Yeoman 会自动生成：

  # 安装生成器
  npm install -g yo generator-code

  # 创建新扩展项目
  yo code

 # 选择扩展类型后，会自动生成：
  # ✅ .vscode/launch.json
  # ✅ .vscode/tasks.json

  ---
  方法 2：VS Code 自动生成 launch.json

  如果已有项目但没有 .vscode 文件夹：

  1. 打开您的扩展项目
  2. 按 F5 或点击左侧"运行和调试"图标
  3. VS Code 会提示："未检测到配置"
  4. 点击 "创建 launch.json 文件"
  5. 选择环境："VS Code Extension Development"
  6. 自动生成 .vscode/launch.json

  ---