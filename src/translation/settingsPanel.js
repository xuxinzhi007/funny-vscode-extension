const vscode = require('vscode');

/**
 * 翻译设置面板
 */
class TranslationSettingsPanel {
  static currentPanel = undefined;

  constructor(panel, context) {
    this.panel = panel;
    this.context = context;
    this.disposables = [];

    // 设置webview内容
    this.panel.webview.html = this.getHtmlContent();

    // 监听消息
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      null,
      this.disposables
    );

    // 监听面板关闭
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * 创建或显示设置面板
   */
  static createOrShow(context) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果已经有面板，显示它
    if (TranslationSettingsPanel.currentPanel) {
      TranslationSettingsPanel.currentPanel.panel.reveal(column);
      return;
    }

    // 创建新面板
    const panel = vscode.window.createWebviewPanel(
      'translationSettings',
      '🌐 翻译设置',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    TranslationSettingsPanel.currentPanel = new TranslationSettingsPanel(panel, context);
  }

  /**
   * 处理来自webview的消息
   */
  async handleMessage(message) {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension.translation');

    switch (message.command) {
      case 'getConfig':
        // 返回当前配置
        this.panel.webview.postMessage({
          command: 'configLoaded',
          config: {
            provider: config.get('provider', 'baidu'),
            baiduAppId: config.get('baiduAppId', ''),
            baiduSecretKey: config.get('baiduSecretKey', ''),
            customApiUrl: config.get('customApiUrl', ''),
            customApiKey: config.get('customApiKey', ''),
            timeout: config.get('timeout', 5000)
          }
        });
        break;

      case 'saveConfig':
        // 保存配置
        try {
          await config.update('provider', message.config.provider, true);
          await config.update('baiduAppId', message.config.baiduAppId, true);
          await config.update('baiduSecretKey', message.config.baiduSecretKey, true);
          await config.update('customApiUrl', message.config.customApiUrl, true);
          await config.update('customApiKey', message.config.customApiKey, true);
          await config.update('timeout', message.config.timeout, true);

          vscode.window.showInformationMessage('翻译设置已保存');
          this.panel.webview.postMessage({ command: 'saveSuccess' });
        } catch (error) {
          vscode.window.showErrorMessage(`保存失败: ${error.message}`);
          this.panel.webview.postMessage({ command: 'saveError', error: error.message });
        }
        break;

      case 'testTranslation':
        // 测试翻译
        const { getTranslationService } = require('./translationService');
        const service = getTranslationService();
        const result = await service.translate('测试', 'zh', 'en');
        
        if (result.error) {
          this.panel.webview.postMessage({
            command: 'testResult',
            success: false,
            message: result.error
          });
        } else {
          this.panel.webview.postMessage({
            command: 'testResult',
            success: true,
            message: `翻译成功: ${result.text}`
          });
        }
        break;

      case 'openBaiduDoc':
        vscode.env.openExternal(vscode.Uri.parse('https://fanyi-api.baidu.com/doc/21'));
        break;
    }
  }

  /**
   * 获取HTML内容
   */
  getHtmlContent() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>翻译设置</title>
  <style>
    body {
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: var(--vscode-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .section {
      margin: 20px 0;
      padding: 20px;
      background-color: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 5px;
    }
    .form-group {
      margin: 15px 0;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    input, select {
      width: 100%;
      padding: 8px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 3px;
      box-sizing: border-box;
    }
    input:focus, select:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .hint {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 5px;
    }
    .button-group {
      margin-top: 20px;
      display: flex;
      gap: 10px;
    }
    button {
      padding: 8px 16px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
    }
    .alert {
      padding: 10px;
      margin: 10px 0;
      border-radius: 3px;
      display: none;
    }
    .alert.success {
      background-color: var(--vscode-testing-iconPassed);
      color: white;
    }
    .alert.error {
      background-color: var(--vscode-testing-iconFailed);
      color: white;
    }
    .link {
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      text-decoration: underline;
    }
    .link:hover {
      color: var(--vscode-textLink-activeForeground);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌐 翻译设置</h1>
    
    <div class="alert" id="alert"></div>

    <div class="section">
      <h2>翻译服务提供商</h2>
      <div class="form-group">
        <label for="provider">选择翻译服务</label>
        <select id="provider">
          <option value="baidu">百度翻译（推荐）</option>
          <option value="custom">自定义API</option>
        </select>
      </div>
    </div>

    <div class="section" id="baiduSection">
      <h2>百度翻译配置</h2>
      <div class="form-group">
        <label for="baiduAppId">AppID</label>
        <input type="text" id="baiduAppId" placeholder="请输入百度翻译 AppID">
        <div class="hint">
          在 <span class="link" onclick="openBaiduDoc()">百度翻译开放平台</span> 申请（免费版每月100万字符）
        </div>
      </div>
      <div class="form-group">
        <label for="baiduSecretKey">密钥</label>
        <input type="password" id="baiduSecretKey" placeholder="请输入百度翻译密钥">
      </div>
    </div>

    <div class="section" id="customSection" style="display: none;">
      <h2>自定义API配置</h2>
      <div class="form-group">
        <label for="customApiUrl">API地址</label>
        <input type="text" id="customApiUrl" placeholder="https://your-api.com/translate">
        <div class="hint">POST请求，发送 JSON: {text, from, to, apiKey}</div>
      </div>
      <div class="form-group">
        <label for="customApiKey">API密钥（可选）</label>
        <input type="password" id="customApiKey" placeholder="如果需要认证，请输入API密钥">
      </div>
    </div>

    <div class="section">
      <h2>高级设置</h2>
      <div class="form-group">
        <label for="timeout">请求超时（毫秒）</label>
        <input type="number" id="timeout" min="1000" max="30000" step="1000" value="5000">
      </div>
    </div>

    <div class="button-group">
      <button onclick="saveConfig()">💾 保存设置</button>
      <button class="secondary" onclick="testTranslation()">🧪 测试翻译</button>
    </div>

    <div class="section">
      <h2>快捷键</h2>
      <ul>
        <li><strong>Ctrl+Alt+T</strong> (Mac: Cmd+Alt+T) - 翻译选中文本</li>
        <li><strong>Ctrl+Alt+V</strong> (Mac: Cmd+Alt+V) - 变量名建议</li>
      </ul>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    // 加载配置
    window.addEventListener('load', () => {
      vscode.postMessage({ command: 'getConfig' });
    });

    // 监听来自扩展的消息
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.command) {
        case 'configLoaded':
          loadConfig(message.config);
          break;
        case 'saveSuccess':
          showAlert('设置已保存', 'success');
          break;
        case 'saveError':
          showAlert('保存失败: ' + message.error, 'error');
          break;
        case 'testResult':
          if (message.success) {
            showAlert(message.message, 'success');
          } else {
            showAlert('测试失败: ' + message.message, 'error');
          }
          break;
      }
    });

    // 加载配置到表单
    function loadConfig(config) {
      document.getElementById('provider').value = config.provider;
      document.getElementById('baiduAppId').value = config.baiduAppId;
      document.getElementById('baiduSecretKey').value = config.baiduSecretKey;
      document.getElementById('customApiUrl').value = config.customApiUrl;
      document.getElementById('customApiKey').value = config.customApiKey;
      document.getElementById('timeout').value = config.timeout;
      
      toggleSections(config.provider);
    }

    // 切换显示的配置区域
    document.getElementById('provider').addEventListener('change', (e) => {
      toggleSections(e.target.value);
    });

    function toggleSections(provider) {
      const baiduSection = document.getElementById('baiduSection');
      const customSection = document.getElementById('customSection');
      
      if (provider === 'baidu') {
        baiduSection.style.display = 'block';
        customSection.style.display = 'none';
      } else {
        baiduSection.style.display = 'none';
        customSection.style.display = 'block';
      }
    }

    // 保存配置
    function saveConfig() {
      const config = {
        provider: document.getElementById('provider').value,
        baiduAppId: document.getElementById('baiduAppId').value,
        baiduSecretKey: document.getElementById('baiduSecretKey').value,
        customApiUrl: document.getElementById('customApiUrl').value,
        customApiKey: document.getElementById('customApiKey').value,
        timeout: parseInt(document.getElementById('timeout').value)
      };
      
      vscode.postMessage({ command: 'saveConfig', config });
    }

    // 测试翻译
    function testTranslation() {
      vscode.postMessage({ command: 'testTranslation' });
    }

    // 打开百度文档
    function openBaiduDoc() {
      vscode.postMessage({ command: 'openBaiduDoc' });
    }

    // 显示提示
    function showAlert(message, type) {
      const alert = document.getElementById('alert');
      alert.textContent = message;
      alert.className = 'alert ' + type;
      alert.style.display = 'block';
      
      setTimeout(() => {
        alert.style.display = 'none';
      }, 3000);
    }
  </script>
</body>
</html>`;
  }

  /**
   * 清理资源
   */
  dispose() {
    TranslationSettingsPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

module.exports = { TranslationSettingsPanel };
