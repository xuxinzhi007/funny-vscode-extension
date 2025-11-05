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
code --install-extension funny-vscode-extension-1.0.0.vsix

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

修改代码后：

```bash
# 更新版本号并发布
/Users/admin/.npm-global/bin/vsce publish patch   # 1.0.0 → 1.0.1
/Users/admin/.npm-global/bin/vsce publish minor   # 1.0.0 → 1.1.0
/Users/admin/.npm-global/bin/vsce publish major   # 1.0.0 → 2.0.0
```

记得更新 `CHANGELOG.md`！

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
