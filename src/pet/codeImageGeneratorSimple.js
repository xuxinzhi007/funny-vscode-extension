const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * 简化版代码图片生成器
 * 使用简单的Canvas渲染和html2canvas备选方案
 */
class CodeImageGeneratorSimple {
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

        case 'error':
          this.logger.error('Webview error:', message.error);
          vscode.window.showErrorMessage('生成截图失败: ' + message.error);
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const fileName = `code-screenshot-${timestamp}.png`;

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(fileName),
      filters: {
        'Images': ['png']
      }
    });

    if (saveUri) {
      try {
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
      } catch (error) {
        this.logger.error('Error saving image:', error);
        vscode.window.showErrorMessage('保存图片失败: ' + error.message);
      }
    }
  }

  /**
   * 获取配置面板HTML
   */
  getConfigPanelHTML(code, language) {
    // 转义代码中的特殊字符
    const escapedCode = code
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');

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
      gap: 10px;
    }

    .config-row label {
      min-width: 120px;
      font-size: 14px;
    }

    .config-row select,
    .config-row input[type="text"] {
      flex: 1;
      padding: 8px 12px;
      background: #3c3c3c;
      border: 1px solid #555;
      border-radius: 4px;
      color: #fff;
      font-size: 14px;
    }

    .config-row input[type="checkbox"] {
      width: 18px;
      height: 18px;
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
      padding: 20px;
    }

    #html-preview {
      display: none;
      background: #1e1e1e;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }

    #html-preview.active {
      display: block;
    }

    .code-window {
      background: #1e1e1e;
      border-radius: 10px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .window-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #333;
    }

    .window-buttons {
      display: flex;
      gap: 8px;
    }

    .window-button {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .window-button.close { background: #ff5f56; }
    .window-button.minimize { background: #ffbd2e; }
    .window-button.maximize { background: #27c93f; }

    .code-content {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      color: #d4d4d4;
      white-space: pre;
      overflow-x: auto;
    }

    .code-line {
      display: flex;
    }

    .line-number {
      color: #858585;
      margin-right: 20px;
      user-select: none;
      text-align: right;
      min-width: 30px;
    }

    .signature {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
    }

    #preview-canvas {
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      max-width: 100%;
    }

    .button-group {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
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

    button:disabled {
      background: #333;
      cursor: not-allowed;
      opacity: 0.5;
    }

    .loading {
      text-align: center;
      padding: 40px;
      font-size: 16px;
    }

    .error {
      color: #ff5555;
      padding: 20px;
      background: rgba(255, 85, 85, 0.1);
      border-radius: 4px;
      margin: 10px 0;
    }

    .method-selector {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .method-btn {
      flex: 1;
      padding: 10px;
      background: #3c3c3c;
      border: 2px solid #555;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .method-btn.active {
      background: #007acc;
      border-color: #007acc;
    }

    .method-btn:hover {
      border-color: #007acc;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 生成代码截图</h1>

    <div class="config-section">
      <h2 style="margin-bottom: 15px; font-size: 18px;">渲染方式</h2>
      <div class="method-selector">
        <div class="method-btn active" data-method="html" onclick="selectMethod('html')">
          <div style="font-weight: bold; margin-bottom: 5px;">📄 HTML渲染</div>
          <div style="font-size: 12px; opacity: 0.8;">推荐 - 效果最好</div>
        </div>
        <div class="method-btn" data-method="canvas" onclick="selectMethod('canvas')">
          <div style="font-weight: bold; margin-bottom: 5px;">🎨 Canvas渲染</div>
          <div style="font-size: 12px; opacity: 0.8;">备选方案</div>
        </div>
      </div>

      <h2 style="margin-bottom: 15px; font-size: 18px; margin-top: 20px;">配置选项</h2>

      <div class="config-row">
        <label>背景样式:</label>
        <select id="bg-style">
          <option value="gradient">渐变色</option>
          <option value="solid">纯色</option>
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
        <input type="text" id="signature-text" placeholder="你的名字或标语" value="Made with ❤️">
      </div>

      <div class="button-group">
        <button id="generate-btn" onclick="generatePreview()">生成预览</button>
        <button id="quick-generate-btn" onclick="quickGenerate()">快速生成（默认设置）</button>
      </div>
    </div>

    <div id="preview-section">
      <h2 style="margin-bottom: 15px; font-size: 18px;">预览</h2>
      <div id="canvas-container">
        <div class="loading">点击"生成预览"或"快速生成"查看效果</div>
      </div>
      <div class="button-group" style="margin-top: 20px;">
        <button id="copy-btn" onclick="copyImage()" disabled>📋 复制图片</button>
        <button id="download-btn" class="secondary" onclick="downloadImage()" disabled>💾 下载 PNG</button>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  <script>
    const vscode = acquireVsCodeApi();
    const code = \`${escapedCode}\`;
    const language = ${JSON.stringify(language)};

    let currentMethod = 'html';
    let currentDataUrl = null;

    function selectMethod(method) {
      currentMethod = method;
      document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.method === method);
      });
    }

    function quickGenerate() {
      // 使用默认配置快速生成
      document.getElementById('bg-style').value = 'gradient';
      document.getElementById('bg-color1').value = '#667eea';
      document.getElementById('bg-color2').value = '#764ba2';
      document.getElementById('show-signature').checked = true;
      document.getElementById('signature-text').value = 'Made with ❤️';
      
      generatePreview();
    }

    async function generatePreview() {
      try {
        const container = document.getElementById('canvas-container');
        container.innerHTML = '<div class="loading">生成中...</div>';

        const config = {
          bgStyle: document.getElementById('bg-style').value,
          bgColor1: document.getElementById('bg-color1').value,
          bgColor2: document.getElementById('bg-color2').value,
          showSignature: document.getElementById('show-signature').checked,
          signatureText: document.getElementById('signature-text').value,
          code,
          language,
          method: currentMethod
        };

        console.log('Generating preview with config:', config);

        if (currentMethod === 'html') {
          await renderWithHTML(config);
        } else {
          await renderWithCanvas(config);
        }

        document.getElementById('download-btn').disabled = false;
        document.getElementById('copy-btn').disabled = false;

        vscode.postMessage({
          command: 'generate',
          config
        });
      } catch (error) {
        console.error('Error generating preview:', error);
        const container = document.getElementById('canvas-container');
        container.innerHTML = \`<div class="error">生成失败: \${error.message}<br><br>请尝试切换渲染方式或查看控制台获取详细信息</div>\`;
        
        vscode.postMessage({
          command: 'error',
          error: error.message
        });
      }
    }

    async function renderWithHTML(config) {
      const container = document.getElementById('canvas-container');
      
      // 创建HTML预览
      const preview = document.createElement('div');
      preview.id = 'html-preview';
      preview.className = 'active';
      
      // 设置背景
      if (config.bgStyle === 'gradient') {
        preview.style.background = \`linear-gradient(135deg, \${config.bgColor1}, \${config.bgColor2})\`;
      } else {
        preview.style.background = config.bgColor1;
      }

      // 创建代码窗口
      const codeWindow = document.createElement('div');
      codeWindow.className = 'code-window';
      
      // 窗口头部
      const header = document.createElement('div');
      header.className = 'window-header';
      header.innerHTML = \`
        <div class="window-buttons">
          <div class="window-button close"></div>
          <div class="window-button minimize"></div>
          <div class="window-button maximize"></div>
        </div>
      \`;
      codeWindow.appendChild(header);

      // 代码内容
      const codeContent = document.createElement('div');
      codeContent.className = 'code-content';
      
      const lines = config.code.split('\\n');
      lines.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'code-line';
        lineDiv.innerHTML = \`
          <span class="line-number">\${index + 1}</span>
          <span class="line-content">\${escapeHtml(line) || ' '}</span>
        \`;
        codeContent.appendChild(lineDiv);
      });
      
      codeWindow.appendChild(codeContent);
      preview.appendChild(codeWindow);

      // 签名
      if (config.showSignature) {
        const signature = document.createElement('div');
        signature.className = 'signature';
        signature.textContent = config.signatureText;
        preview.appendChild(signature);
      }

      container.innerHTML = '';
      container.appendChild(preview);

      // 使用html2canvas截图
      console.log('Rendering with html2canvas...');
      const canvas = await html2canvas(preview, {
        backgroundColor: null,
        scale: 2,
        logging: false
      });

      currentDataUrl = canvas.toDataURL('image/png');
      
      // 显示canvas预览
      container.innerHTML = '';
      canvas.style.maxWidth = '100%';
      canvas.style.borderRadius = '8px';
      canvas.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
      container.appendChild(canvas);

      console.log('HTML rendering completed');
    }

    async function renderWithCanvas(config) {
      const container = document.getElementById('canvas-container');
      
      // 计算所需高度
      const lines = config.code.split('\\n');
      const lineHeight = 20;
      const padding = 60;
      const headerHeight = 50;
      const signatureHeight = config.showSignature ? 50 : 0;
      const minCodeHeight = 200;
      
      // 根据代码行数计算内容高度
      const codeContentHeight = Math.max(minCodeHeight, lines.length * lineHeight + 40);
      const totalHeight = padding * 2 + headerHeight + codeContentHeight + signatureHeight;
      
      // 创建canvas
      const canvas = document.createElement('canvas');
      const width = 1200;
      const height = Math.min(totalHeight, 4000); // 最大高度4000px
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建Canvas上下文');
      }

      console.log('Drawing with Canvas...');

      // 绘制背景
      if (config.bgStyle === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, config.bgColor1);
        gradient.addColorStop(1, config.bgColor2);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = config.bgColor1;
      }
      ctx.fillRect(0, 0, width, height);

      // 绘制代码容器
      const codeX = padding;
      const codeY = padding;
      const codeWidth = width - padding * 2;
      // 代码容器高度 = 总高度 - 上下padding - 签名高度
      const codeHeight = height - padding * 2 - signatureHeight;

      // 代码背景
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(codeX, codeY, codeWidth, codeHeight);

      // 窗口按钮
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

      // 绘制代码
      ctx.font = '14px Consolas, Monaco, "Courier New", monospace';
      ctx.textBaseline = 'top';

      const textX = codeX + 20;
      let textY = codeY + 50;

      lines.forEach((line, index) => {
        // 行号
        ctx.fillStyle = '#858585';
        const lineNum = String(index + 1).padStart(3, ' ');
        ctx.fillText(lineNum, textX, textY);

        // 代码内容 - 处理过长的行
        ctx.fillStyle = '#d4d4d4';
        const maxLineWidth = codeWidth - 100;
        const lineText = line || ' '; // 空行显示为空格
        
        // 如果行太长，进行换行处理
        if (ctx.measureText(lineText).width > maxLineWidth) {
          let currentLine = '';
          let currentY = textY;
          
          for (let char of lineText) {
            const testLine = currentLine + char;
            if (ctx.measureText(testLine).width > maxLineWidth) {
              ctx.fillText(currentLine, textX + 50, currentY);
              currentLine = char;
              currentY += lineHeight;
            } else {
              currentLine = testLine;
            }
          }
          
          if (currentLine) {
            ctx.fillText(currentLine, textX + 50, currentY);
          }
        } else {
          ctx.fillText(lineText, textX + 50, textY);
        }

        textY += lineHeight;
      });

      // 签名
      if (config.showSignature) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.signatureText, width / 2, height - 35);
      }

      currentDataUrl = canvas.toDataURL('image/png');

      container.innerHTML = '';
      canvas.style.maxWidth = '100%';
      canvas.style.borderRadius = '8px';
      canvas.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
      container.appendChild(canvas);

      console.log('Canvas rendering completed');
    }

    async function copyImage() {
      if (!currentDataUrl) {
        alert('请先生成预览');
        return;
      }

      try {
        // 将base64转换为Blob
        const response = await fetch(currentDataUrl);
        const blob = await response.blob();

        // 使用Clipboard API复制图片
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob
          })
        ]);

        // 显示成功提示
        const copyBtn = document.getElementById('copy-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ 已复制!';
        copyBtn.disabled = true;

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.disabled = false;
        }, 2000);

        console.log('Image copied to clipboard');
      } catch (error) {
        console.error('Error copying image:', error);
        
        // 如果Clipboard API失败，尝试备选方案
        try {
          // 创建临时的img元素
          const img = new Image();
          img.src = currentDataUrl;
          
          // 等待图片加载
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // 创建临时canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // 转换为blob并复制
          canvas.toBlob(async (blob) => {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({
                  'image/png': blob
                })
              ]);

              const copyBtn = document.getElementById('copy-btn');
              const originalText = copyBtn.textContent;
              copyBtn.textContent = '✅ 已复制!';
              copyBtn.disabled = true;

              setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.disabled = false;
              }, 2000);

              console.log('Image copied to clipboard (fallback method)');
            } catch (err) {
              alert('复制失败: ' + err.message + '\\n\\n提示：请使用"下载 PNG"功能保存图片');
            }
          });
        } catch (fallbackError) {
          alert('复制失败: ' + fallbackError.message + '\\n\\n提示：请使用"下载 PNG"功能保存图片');
        }
      }
    }

    function downloadImage() {
      if (!currentDataUrl) {
        alert('请先生成预览');
        return;
      }

      vscode.postMessage({
        command: 'download',
        dataUrl: currentDataUrl
      });
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
  }
}

module.exports = {
  CodeImageGeneratorSimple
};

