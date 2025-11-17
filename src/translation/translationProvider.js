const vscode = require('vscode');
const { getTranslationService } = require('./translationService');
const { getVariableNameSuggester } = require('./variableNameSuggester');
const { getLogger } = require('../utils/logger');

/**
 * 翻译功能提供者
 */
class TranslationProvider {
  constructor(context) {
    this.context = context;
    this.logger = getLogger();
    this.translationService = getTranslationService();
    this.suggester = getVariableNameSuggester();
    this.decorationType = null;
    this.currentDecoration = null;
  }

  /**
   * 初始化
   */
  initialize() {
    // 注册命令
    this.registerCommands();
    
    // 注册右键菜单
    this.registerContextMenu();
    
    // 创建装饰类型
    this.createDecorationType();
    
    this.logger.info('Translation provider initialized');
  }

  /**
   * 注册命令
   */
  registerCommands() {
    // 翻译选中文本
    const translateCommand = vscode.commands.registerCommand(
      'funny-vscode-extension.translateSelection',
      () => this.translateSelection()
    );

    // 变量名建议
    const suggestCommand = vscode.commands.registerCommand(
      'funny-vscode-extension.suggestVariableName',
      () => this.suggestVariableName()
    );

    // 打开翻译设置
    const settingsCommand = vscode.commands.registerCommand(
      'funny-vscode-extension.openTranslationSettings',
      () => this.openSettings()
    );

    // 清除翻译缓存
    const clearCacheCommand = vscode.commands.registerCommand(
      'funny-vscode-extension.clearTranslationCache',
      () => {
        this.translationService.clearCache();
        vscode.window.showInformationMessage('翻译缓存已清除');
      }
    );

    this.context.subscriptions.push(
      translateCommand,
      suggestCommand,
      settingsCommand,
      clearCacheCommand
    );
  }

  /**
   * 注册右键菜单
   */
  registerContextMenu() {
    // 右键菜单已在 package.json 中配置
  }

  /**
   * 创建装饰类型
   */
  createDecorationType() {
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        textDecoration: 'none; opacity: 0.7;'
      }
    });
  }

  /**
   * 翻译选中的文本
   */
  async translateSelection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个文件');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text || text.trim().length === 0) {
      vscode.window.showWarningMessage('请先选中要翻译的文本');
      return;
    }

    // 显示加载提示
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '正在翻译...',
      cancellable: false
    }, async () => {
      // 检测语言并翻译
      const isChinese = /[\u4e00-\u9fa5]/.test(text);
      const from = isChinese ? 'zh' : 'en';
      const to = isChinese ? 'en' : 'zh';

      const result = await this.translationService.translate(text, from, to);

      if (result.error) {
        vscode.window.showErrorMessage(`翻译失败: ${result.error}`);
        return;
      }

      // 显示翻译结果
      this.showTranslationResult(editor, selection, text, result.text, from, to);
    });
  }

  /**
   * 显示翻译结果
   */
  showTranslationResult(editor, selection, originalText, translatedText, from, to) {
    // 创建悬浮窗内容
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.appendMarkdown(`### 🌐 翻译结果\n\n`);
    markdown.appendMarkdown(`**原文** (${from}):\n\n`);
    markdown.appendCodeblock(originalText, 'text');
    markdown.appendMarkdown(`\n**译文** (${to}):\n\n`);
    markdown.appendCodeblock(translatedText, 'text');
    markdown.appendMarkdown(`\n---\n`);
    markdown.appendMarkdown(`[替换原文](command:funny-vscode-extension.replaceWithTranslation?${encodeURIComponent(JSON.stringify({ text: translatedText }))})`);
    markdown.appendMarkdown(` | `);
    markdown.appendMarkdown(`[复制译文](command:funny-vscode-extension.copyTranslation?${encodeURIComponent(JSON.stringify({ text: translatedText }))})`);

    // 显示悬浮提示
    vscode.window.showInformationMessage(
      `翻译: ${translatedText}`,
      '复制',
      '替换'
    ).then(selection => {
      if (selection === '复制') {
        vscode.env.clipboard.writeText(translatedText);
        vscode.window.showInformationMessage('已复制到剪贴板');
      } else if (selection === '替换') {
        editor.edit(editBuilder => {
          editBuilder.replace(editor.selection, translatedText);
        });
      }
    });

    // 在编辑器中显示内联提示
    this.showInlineHint(editor, selection.end, translatedText);
  }

  /**
   * 显示内联提示
   */
  showInlineHint(editor, position, text) {
    // 清除之前的装饰
    if (this.currentDecoration) {
      editor.setDecorations(this.decorationType, []);
    }

    // 创建新装饰
    const decoration = {
      range: new vscode.Range(position, position),
      renderOptions: {
        after: {
          contentText: ` 💬 ${text}`,
          color: new vscode.ThemeColor('editorCodeLens.foreground')
        }
      }
    };

    editor.setDecorations(this.decorationType, [decoration]);
    this.currentDecoration = decoration;

    // 3秒后自动清除
    setTimeout(() => {
      if (this.currentDecoration === decoration) {
        editor.setDecorations(this.decorationType, []);
        this.currentDecoration = null;
      }
    }, 3000);
  }

  /**
   * 变量名建议
   */
  async suggestVariableName() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个文件');
      return;
    }

    const selection = editor.selection;
    const text = editor.document.getText(selection);

    if (!text || text.trim().length === 0) {
      // 如果没有选中文本，弹出输入框
      const input = await vscode.window.showInputBox({
        prompt: '请输入中文描述（例如：用户名称）',
        placeHolder: '用户名称'
      });

      if (!input) return;

      await this.showVariableNameSuggestions(input, editor);
    } else {
      // 使用选中的文本
      await this.showVariableNameSuggestions(text, editor);
    }
  }

  /**
   * 显示变量名建议
   */
  async showVariableNameSuggestions(chineseText, editor) {
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '正在生成变量名建议...',
      cancellable: false
    }, async () => {
      const result = await this.suggester.suggestVariableNames(chineseText);

      if (result.error) {
        vscode.window.showErrorMessage(`生成失败: ${result.error}`);
        return;
      }

      // 创建快速选择列表
      const items = [
        {
          label: '$(symbol-variable) camelCase',
          description: result.suggestions.camelCase,
          detail: '小驼峰命名（推荐用于变量、函数）',
          value: result.suggestions.camelCase
        },
        {
          label: '$(symbol-class) PascalCase',
          description: result.suggestions.PascalCase,
          detail: '大驼峰命名（推荐用于类、组件）',
          value: result.suggestions.PascalCase
        },
        {
          label: '$(symbol-constant) UPPER_SNAKE_CASE',
          description: result.suggestions.UPPER_SNAKE_CASE,
          detail: '大写下划线（推荐用于常量）',
          value: result.suggestions.UPPER_SNAKE_CASE
        },
        {
          label: '$(symbol-method) snake_case',
          description: result.suggestions.snake_case,
          detail: '小写下划线（Python 风格）',
          value: result.suggestions.snake_case
        },
        {
          label: '$(symbol-string) kebab-case',
          description: result.suggestions['kebab-case'],
          detail: '短横线命名（CSS、URL）',
          value: result.suggestions['kebab-case']
        }
      ];

      // 添加变体
      if (result.variants && result.variants.length > 0) {
        items.push({ label: '', kind: vscode.QuickPickItemKind.Separator });
        items.push({
          label: '常见变体',
          kind: vscode.QuickPickItemKind.Separator
        });
        
        result.variants.forEach(variant => {
          items.push({
            label: `$(symbol-misc) ${variant.name}`,
            description: variant.description,
            value: variant.name
          });
        });
      }

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `"${chineseText}" 的变量名建议 (翻译: ${result.translation})`,
        matchOnDescription: true
      });

      if (selected && selected.value) {
        // 插入选中的变量名
        editor.edit(editBuilder => {
          if (editor.selection.isEmpty) {
            editBuilder.insert(editor.selection.active, selected.value);
          } else {
            editBuilder.replace(editor.selection, selected.value);
          }
        });

        vscode.window.showInformationMessage(`已插入: ${selected.value}`);
      }
    });
  }

  /**
   * 打开设置
   */
  openSettings() {
    const { TranslationSettingsPanel } = require('./settingsPanel');
    TranslationSettingsPanel.createOrShow(this.context);
  }

  /**
   * 清理资源
   */
  dispose() {
    if (this.decorationType) {
      this.decorationType.dispose();
    }
  }
}

module.exports = { TranslationProvider };
