#!/bin/bash
# 快速打包脚本

echo "🎨 开始打包 VSCode 扩展..."
echo ""

# 使用完整路径调用 vsce
/Users/admin/.npm-global/bin/vsce package

echo ""
echo "✅ 打包完成！"
echo ""
echo "📦 生成的文件："
ls -lh *.vsix
echo ""
echo "💡 安装方法："
echo "   1. 打开 VSCode"
echo "   2. 按 Cmd+Shift+P" ｜｜  Ctrl+Shift+P （windows）
echo "   3. 输入: Extensions: Install from VSIX"
echo "   4. 选择上面生成的 .vsix 文件"
