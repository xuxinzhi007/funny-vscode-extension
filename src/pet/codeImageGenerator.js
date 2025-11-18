const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * 代码图片生成器 - 宠物工具人
 * 选中代码后,让宠物帮你生成"潮酷截图"
 */
class CodeImageGenerator {
  constructor(context, petCore) {
    this.context = context;
    this.petCore = petCore;
    this.logger = getLogger();
    this.eventBus = getEventBus();

    this.panel = null;
  }

  /**
   * 生成代码截图
   */
  async generateImage(code = null) {
    const editor = vscode.window.activeTextEditor;

    // 获取选中的代码或当前文件
    let selectedCode = code;
    let language = 'javascript';

    if (!selectedCode && editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        selectedCode = editor.document.getText(selection);
        language = editor.document.languageId;
      } else {
        selectedCode = editor.document.getText();
        language = editor.document.languageId;
      }
    }

    if (!selectedCode) {
      vscode.window.showWarningMessage('请先选择要生成截图的代码!');
      return;
    }

    // 宠物行为变化
    this.petCore.changeBehavior('working', 5000);

    // 打开配置面板
    this.showConfigPanel(selectedCode, language);
  }

  /**
   * 显示配置面板
   */
  showConfigPanel(code, language) {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'codeImageGenerator',
      '生成代码截图',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    this.panel.webview.html = this.getConfigPanelHTML(code, language);

    // 监听消息
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );

    this.panel.onDidDispose(() => {
      this.panel = null;
    });
  }

  /**
   * 处理消息
   */
  async handleMessage(message) {
    try {
      switch (message.command) {
        case 'generate':
          await this.generateImageWithConfig(message.config);
          break;

        case 'download':
          await this.downloadImage(message.dataUrl);
          break;

        case 'copy':
          await this.copyToClipboard(message.dataUrl);
          break;
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      vscode.window.showErrorMessage('处理请求时出错: ' + error.message);
    }
  }

  /**
   * 使用配置生成图片
   */
  async generateImageWithConfig(config) {
    // 通知webview开始渲染
    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'startRender',
        config
      });
    }

    // 更新统计
    this.petCore.state.statistics.imagesGenerated++;

    // 宠物庆祝
    this.petCore.changeBehavior('celebrating', 3000);

    this.logger.info('Code image generated successfully');
  }

  /**
   * 下载图片
   */
  async downloadImage(dataUrl) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `code-screenshot-${timestamp}.png`;

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(fileName),
      filters: {
        'Images': ['png']
      }
    });

    if (saveUri) {
      // 将dataUrl转换为Buffer并保存
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      await vscode.workspace.fs.writeFile(saveUri, buffer);

      vscode.window.showInformationMessage(
        `截图已保存! 快分享你的成果 😎`,
        '打开文件'
      ).then(selection => {
        if (selection === '打开文件') {
          vscode.env.openExternal(saveUri);
        }
      });

      // 宠物气泡提示
      this.eventBus.emit('pet:showBubble', {
        message: '截图搞定! 快分享你的成果 😎',
        type: 'success'
      });
    }
  }

  /**
   * 复制到剪贴板
   */
  async copyToClipboard(dataUrl) {
    // VSCode 暂不直接支持复制图片,提示用户
    vscode.window.showInformationMessage('图片已准备好,请使用下载功能保存');
  }

  /**
   * 获取配置面板HTML
   */
  getConfigPanelHTML(code, language) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>生成代码截图</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      padding: 20px;
      background: #1e1e1e;
      color: #fff;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 20px;
      font-size: 24px;
    }

    .config-section {
      background: #252526;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .config-row {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }

    .config-row label {
      width: 120px;
      font-size: 14px;
    }

    .config-row select,
    .config-row input {
      flex: 1;
      padding: 8px 12px;
      background: #3c3c3c;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
    }

    .color-picker {
      width: 60px;
      height: 36px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    #preview-section {
      background: #252526;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    #canvas-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      background: #1e1e1e;
      border-radius: 8px;
      overflow: auto;
    }

    #preview-canvas {
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    .button-group {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    button {
      padding: 10px 20px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.3s;
    }

    button:hover {
      background: #005a9e;
    }

    button.secondary {
      background: #555;
    }

    button.secondary:hover {
      background: #666;
    }

    .loading {
      text-align: center;
      padding: 40px;
      font-size: 16px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 生成代码截图</h1>

    <div class="config-section">
      <h2 style="margin-bottom: 15px; font-size: 18px;">配置选项</h2>

      <div class="config-row">
        <label>背景样式:</label>
        <select id="bg-style">
          <option value="gradient">渐变色</option>
          <option value="solid">纯色</option>
          <option value="animated">动画背景</option>
        </select>
      </div>

      <div class="config-row">
        <label>背景颜色1:</label>
        <input type="color" id="bg-color1" value="#667eea" class="color-picker">
      </div>

      <div class="config-row">
        <label>背景颜色2:</label>
        <input type="color" id="bg-color2" value="#764ba2" class="color-picker">
      </div>

      <div class="config-row">
        <label>显示签名:</label>
        <input type="checkbox" id="show-signature" checked>
        <input type="text" id="signature-text" placeholder="你的名字或标语" value="Made with ❤️" style="margin-left: 10px;">
      </div>

      <div class="config-row">
        <label>图片尺寸:</label>
        <select id="image-size">
          <option value="small">小 (800x600)</option>
          <option value="medium" selected>中 (1200x800)</option>
          <option value="large">大 (1600x1200)</option>
        </select>
      </div>

      <div class="button-group">
        <button id="generate-btn">生成预览</button>
      </div>
    </div>

    <div id="preview-section">
      <h2 style="margin-bottom: 15px; font-size: 18px;">预览</h2>
      <div id="canvas-container">
        <div class="loading">点击"生成预览"查看效果</div>
      </div>
      <div class="button-group" style="margin-top: 20px;">
        <button id="download-btn" class="secondary">下载 PNG</button>
        <button id="copy-btn" class="secondary">复制到剪贴板</button>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const code = ${JSON.stringify(code)};
    const language = ${JSON.stringify(language)};

    let currentCanvas = null;

    // 生成按钮
    document.getElementById('generate-btn').addEventListener('click', generatePreview);

    // 下载按钮
    document.getElementById('download-btn').addEventListener('click', () => {
      if (currentCanvas) {
        const dataUrl = currentCanvas.toDataURL('image/png');
        vscode.postMessage({
          command: 'download',
          dataUrl
        });
      }
    });

    // 复制按钮
    document.getElementById('copy-btn').addEventListener('click', () => {
      if (currentCanvas) {
        const dataUrl = currentCanvas.toDataURL('image/png');
        vscode.postMessage({
          command: 'copy',
          dataUrl
        });
      }
    });

    function generatePreview() {
      const config = {
        bgStyle: document.getElementById('bg-style').value,
        bgColor1: document.getElementById('bg-color1').value,
        bgColor2: document.getElementById('bg-color2').value,
        showSignature: document.getElementById('show-signature').checked,
        signatureText: document.getElementById('signature-text').value,
        imageSize: document.getElementById('image-size').value,
        code,
        language
      };

      renderCodeImage(config);

      vscode.postMessage({
        command: 'generate',
        config
      });
    }

    function renderCodeImage(config) {
      const container = document.getElementById('canvas-container');
      container.innerHTML = '<div class="loading">生成中...</div>';

      // 获取尺寸
      const sizes = {
        small: { width: 800, height: 600 },
        medium: { width: 1200, height: 800 },
        large: { width: 1600, height: 1200 }
      };
      const size = sizes[config.imageSize];

      // 创建canvas
      const canvas = document.createElement('canvas');
      canvas.id = 'preview-canvas';
      canvas.width = size.width;
      canvas.height = size.height;

      const ctx = canvas.getContext('2d');

      // 绘制背景
      drawBackground(ctx, config, size);

      // 绘制代码
      drawCode(ctx, config, size);

      // 绘制签名
      if (config.showSignature) {
        drawSignature(ctx, config, size);
      }

      container.innerHTML = '';
      container.appendChild(canvas);

      currentCanvas = canvas;
    }

    function drawBackground(ctx, config, size) {
      if (config.bgStyle === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, size.width, size.height);
        gradient.addColorStop(0, config.bgColor1);
        gradient.addColorStop(1, config.bgColor2);
        ctx.fillStyle = gradient;
      } else if (config.bgStyle === 'solid') {
        ctx.fillStyle = config.bgColor1;
      } else if (config.bgStyle === 'animated') {
        // 简单的动画效果(静态渐变 + 装饰)
        const gradient = ctx.createRadialGradient(
          size.width / 2, size.height / 2, 0,
          size.width / 2, size.height / 2, size.width / 2
        );
        gradient.addColorStop(0, config.bgColor1);
        gradient.addColorStop(1, config.bgColor2);
        ctx.fillStyle = gradient;
      }

      ctx.fillRect(0, 0, size.width, size.height);
    }

    function drawCode(ctx, config, size) {
      // 创建代码容器背景
      const padding = 60;
      const codeX = padding;
      const codeY = padding;
      const codeWidth = size.width - padding * 2;
      const codeHeight = size.height - padding * 2 - (config.showSignature ? 50 : 0);

      // 绘制代码背景(带阴影)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;

      ctx.fillStyle = '#1e1e1e';
      ctx.roundRect(codeX, codeY, codeWidth, codeHeight, 10);
      ctx.fill();

      // 重置阴影
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 绘制窗口控制按钮
      const buttonY = codeY + 15;
      const buttonSize = 12;
      const buttonSpacing = 8;

      ctx.fillStyle = '#ff5f56';
      ctx.beginPath();
      ctx.arc(codeX + 20, buttonY, buttonSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffbd2e';
      ctx.beginPath();
      ctx.arc(codeX + 20 + buttonSize + buttonSpacing, buttonY, buttonSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#27c93f';
      ctx.beginPath();
      ctx.arc(codeX + 20 + (buttonSize + buttonSpacing) * 2, buttonY, buttonSize / 2, 0, Math.PI * 2);
      ctx.fill();

      // 绘制代码文本 - 带语法高亮
      ctx.font = '16px Consolas, Monaco, "Courier New", monospace';
      ctx.textBaseline = 'top';

      const lines = config.code.split('\\n');
      const lineHeight = 24;
      const textX = codeX + 20;
      let textY = codeY + 50;
      const maxWidth = codeWidth - 80; // 留出边距

      // 语法高亮关键词
      const keywords = {
        control: ['if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return'],
        declaration: ['const', 'let', 'var', 'function', 'class', 'import', 'export', 'from'],
        type: ['string', 'number', 'boolean', 'void', 'null', 'undefined'],
        special: ['this', 'new', 'async', 'await', 'try', 'catch', 'finally']
      };

      // 添加行号和代码
      lines.forEach((line, index) => {
        if (textY > codeY + codeHeight - 20) return; // 防止溢出

        // 行号
        ctx.fillStyle = '#858585';
        const lineNum = \`\${index + 1}\`.padStart(3, ' ');
        ctx.fillText(lineNum, textX, textY);

        // 代码内容 - 简单语法高亮
        drawHighlightedLine(ctx, line, textX + 50, textY, maxWidth, keywords);

        textY += lineHeight;
      });
    }

    // 简单语法高亮函数
    function drawHighlightedLine(ctx, line, x, y, maxWidth, keywords) {
      const tokens = line.split(/(\s+|[(){}[\];,.])/);
      let currentX = x;

      tokens.forEach(token => {
        if (!token) return;

        // 确定颜色
        let color = '#d4d4d4'; // 默认白色
        
        if (keywords.control.includes(token)) {
          color = '#c586c0'; // 紫色 - 控制流
        } else if (keywords.declaration.includes(token)) {
          color = '#569cd6'; // 蓝色 - 声明
        } else if (keywords.type.includes(token)) {
          color = '#4ec9b0'; // 青色 - 类型
        } else if (keywords.special.includes(token)) {
          color = '#c586c0'; // 紫色 - 特殊
        } else if (/^["']/.test(token)) {
          color = '#ce9178'; // 橙色 - 字符串
        } else if (/^\/\//.test(token)) {
          color = '#6a9955'; // 绿色 - 注释
        } else if (/^\d+$/.test(token)) {
          color = '#b5cea8'; // 浅绿 - 数字
        }

        ctx.fillStyle = color;
        
        // 检查是否会超出宽度
        const tokenWidth = ctx.measureText(token).width;
        if (currentX + tokenWidth > x + maxWidth) {
          return; // 截断过长的行
        }
        
        ctx.fillText(token, currentX, y);
        currentX += tokenWidth;
      });
    }

    function drawSignature(ctx, config, size) {
      const signatureY = size.height - 35;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.signatureText, size.width / 2, signatureY);
    }

    // Polyfill for roundRect if not available
    if (!CanvasRenderingContext2D.prototype.roundRect) {
      CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
      };
    }
  </script>
</body>
</html>`;
  }
}

module.exports = {
  CodeImageGenerator
};
