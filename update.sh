#!/bin/bash
# 快速更新扩展版本

echo "🔄 更新扩展版本"
echo ""

# 显示当前版本
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📌 当前版本: $CURRENT_VERSION"
echo ""

# 提示用户输入新版本号
echo "请输入新版本号（例如：1.0.1）："
read NEW_VERSION

# 确认
echo ""
echo "即将更新："
echo "  $CURRENT_VERSION → $NEW_VERSION"
echo ""
echo "确认吗？(y/n)"
read CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消"
    exit 1
fi

# 更新 package.json 中的版本号
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json

echo ""
echo "✅ 已更新 package.json"
echo ""

# 提示编辑 CHANGELOG
echo "💡 别忘了更新 CHANGELOG.md！"
echo ""
echo "按回车键开始打包..."
read

# 打包
echo "📦 开始打包..."
/Users/admin/.npm-global/bin/vsce package

echo ""
echo "✅ 打包完成！"
echo ""
echo "📦 生成的文件："
ls -lh funny-vscode-extension-$NEW_VERSION.vsix
echo ""
echo "🚀 下一步："
echo "  1. 更新 CHANGELOG.md"
echo "  2. 提交到 Git: git add . && git commit -m 'chore: 发布 v$NEW_VERSION'"
echo "  3. 推送: git push"
echo "  4. 手动上传到 Marketplace: https://marketplace.visualstudio.com/manage"
