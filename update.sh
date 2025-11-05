#!/bin/bash
# 快速更新和发布扩展

echo "🚀 VSCode 扩展发布工具"
echo ""

# 显示当前版本
CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📌 当前版本: $CURRENT_VERSION"
echo ""

# 提示用户选择版本更新方式
echo "选择版本更新方式："
echo "  1. 自动递增补丁版本 (patch: $CURRENT_VERSION → $(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g'))"
echo "  2. 自动递增次版本 (minor)"
echo "  3. 自动递增主版本 (major)"
echo "  4. 手动输入版本号"
echo "  5. 不更新版本，直接发布"
echo ""
echo "请输入选择 (1-5):"
read VERSION_CHOICE

case $VERSION_CHOICE in
    1)
        VERSION_TYPE="patch"
        ;;
    2)
        VERSION_TYPE="minor"
        ;;
    3)
        VERSION_TYPE="major"
        ;;
    4)
        echo "请输入新版本号（例如：1.0.2）："
        read NEW_VERSION
        # 更新 package.json 中的版本号
        sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        echo "✅ 已更新到版本 $NEW_VERSION"
        VERSION_TYPE=""
        ;;
    5)
        VERSION_TYPE=""
        echo "⏭️  跳过版本更新"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""

# 确认发布
if [ -n "$VERSION_TYPE" ]; then
    echo "即将发布新版本（$VERSION_TYPE）"
elif [ -n "$NEW_VERSION" ]; then
    echo "即将发布版本 $NEW_VERSION"
else
    echo "即将重新发布当前版本 $CURRENT_VERSION"
fi

echo ""
echo "是否继续发布到 Marketplace？(y/n)"
read CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消"
    exit 1
fi

echo ""
echo "📦 开始发布..."
echo ""

# 发布
if [ -n "$VERSION_TYPE" ]; then
    # 使用自动版本递增
    vsce publish $VERSION_TYPE
elif [ -n "$NEW_VERSION" ]; then
    # 已手动更新版本号，直接发布
    vsce publish
else
    # 不更新版本，直接发布
    vsce publish
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 发布成功！"
    echo ""
    FINAL_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
    echo "📦 已发布版本: $FINAL_VERSION"
    echo ""
    echo "🔗 扩展链接:"
    echo "  - Marketplace: https://marketplace.visualstudio.com/items?itemName=xinzhixu.funny-vscode-extension"
    echo "  - 管理页面: https://marketplace.visualstudio.com/manage/publishers/xinzhixu"
    echo ""
    echo "💡 提示:"
    echo "  - 通常 5-30 分钟内生效"
    echo "  - 别忘了提交代码到 Git！"
    echo ""
else
    echo ""
    echo "❌ 发布失败！"
    echo ""
    echo "💡 可能的原因："
    echo "  - 未登录：运行 'vsce login xinzhixu'"
    echo "  - Token 过期：重新创建 Personal Access Token"
    echo "  - 网络问题：检查网络连接"
    echo ""
    exit 1
fi
