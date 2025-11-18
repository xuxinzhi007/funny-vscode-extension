const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * 宠物悬浮Webview - 可拖动的宠物界面
 * 显示在编辑器右下角,可以拖动、隐藏、交互
 */
class PetWebview {
  constructor(context, petCore, ddlManager) {
    this.context = context;
    this.petCore = petCore;
    this.ddlManager = ddlManager;
    this.logger = getLogger();
    this.eventBus = getEventBus();

    this.panel = null;
    this.isVisible = false;
  }

  /**
   * 显示宠物
   */
  show() {
    if (this.panel) {
      this.panel.reveal();
      this.isVisible = true;
      return;
    }

    // 创建webview panel
    this.panel = vscode.window.createWebviewPanel(
      'codingPet',
      '编程搭子',
      {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: true
      },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri]
      }
    );

    // 设置HTML内容
    this.panel.webview.html = this.getWebviewContent();

    // 监听消息
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.context.subscriptions
    );

    // 监听关闭事件
    this.panel.onDidDispose(() => {
      this.panel = null;
      this.isVisible = false;
    });

    this.isVisible = true;

    // 监听宠物状态变化
    this.setupEventListeners();
  }

  /**
   * 隐藏宠物
   */
  hide() {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
      this.isVisible = false;
    }
  }

  /**
   * 切换显示/隐藏
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 处理来自webview的消息
   */
  handleMessage(message) {
    try {
      switch (message.command) {
        case 'interact':
          this.petCore.interact(message.action);
          break;

        case 'updatePosition':
          this.petCore.updatePosition(message.x, message.y);
          break;

        case 'changeSkin':
          this.petCore.changeSkin(message.skinId);
          break;

        case 'showMenu':
          this.showPetMenu();
          break;

        case 'minimize':
          this.minimize();
          break;

        case 'openDDL':
          vscode.commands.executeCommand('funny-vscode-extension.viewDDL');
          break;

        case 'openCodeImage':
          vscode.commands.executeCommand('funny-vscode-extension.generateCodeImage');
          break;
      }
    } catch (error) {
      this.logger.error('Error handling webview message:', error);
    }
  }

  /**
   * 发送消息到webview
   */
  postMessage(message) {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  /**
   * 最小化宠物(只显示小按钮)
   */
  minimize() {
    this.postMessage({ command: 'minimize' });
  }

  /**
   * 显示宠物菜单
   */
  showPetMenu() {
    const menuItems = [
      { label: '$(heart) 设置DDL', command: 'openDDL' },
      { label: '$(device-camera) 生成代码截图', command: 'openCodeImage' },
      { label: '$(calendar) 开启专注模式', command: 'startPomodoro' },
      { label: '$(paintcan) 切换搭子皮肤', command: 'changeSkin' },
      { label: '$(eye-closed) 隐藏搭子', command: 'hide' }
    ];

    vscode.window.showQuickPick(menuItems, {
      placeHolder: '选择搭子功能'
    }).then(selection => {
      if (selection) {
        this.handleMenuSelection(selection.command);
      }
    });
  }

  /**
   * 处理菜单选择
   */
  handleMenuSelection(command) {
    switch (command) {
      case 'openDDL':
        this.eventBus.emit('ddl:showPanel', {});
        break;
      case 'openCodeImage':
        this.eventBus.emit('codeImage:showPanel', {});
        break;
      case 'startPomodoro':
        vscode.commands.executeCommand('funny-vscode-extension.togglePomodoro');
        break;
      case 'changeSkin':
        this.showSkinSelector();
        break;
      case 'hide':
        this.hide();
        break;
    }
  }

  /**
   * 显示皮肤选择器
   */
  showSkinSelector() {
    const skins = this.petCore.state.unlockedSkins.map(skinId => ({
      label: this.getSkinName(skinId),
      description: skinId === this.petCore.state.currentSkin ? '当前' : '',
      skinId
    }));

    vscode.window.showQuickPick(skins, {
      placeHolder: '选择搭子皮肤'
    }).then(selection => {
      if (selection) {
        this.petCore.changeSkin(selection.skinId);
      }
    });
  }

  /**
   * 获取皮肤名称
   */
  getSkinName(skinId) {
    const names = {
      'default': '🐱 默认小猫',
      'dog': '🐶 忠诚小狗',
      'panda': '🐼 可爱熊猫',
      'robot': '🤖 机器人',
      'dragon': '🐉 神龙',
      'unicorn': '🦄 独角兽'
    };
    return names[skinId] || skinId;
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 宠物状态变化
    this.eventBus.on('pet:stateChanged', (state) => {
      this.postMessage({
        command: 'updateState',
        state
      });
    });

    // 宠物行为变化
    this.eventBus.on('pet:behaviorChanged', (data) => {
      this.postMessage({
        command: 'changeBehavior',
        behavior: data.behavior,
        duration: data.duration
      });
    });

    // DDL警告
    this.eventBus.on('ddl:warning', (data) => {
      this.postMessage({
        command: 'showBubble',
        message: `⏰ DDL 警告!`,
        type: 'warning'
      });
    });

    // 升级
    this.eventBus.on('pet:levelUp', (data) => {
      this.postMessage({
        command: 'showBubble',
        message: `🎉 升到 ${data.level} 级了!`,
        type: 'success'
      });
    });

    // 皮肤解锁
    this.eventBus.on('pet:skinUnlocked', (data) => {
      this.postMessage({
        command: 'showBubble',
        message: `🎨 解锁新皮肤!`,
        type: 'success'
      });
    });

    // 截图生成完成
    this.eventBus.on('pet:showBubble', (data) => {
      this.postMessage({
        command: 'showBubble',
        message: data.message,
        type: data.type || 'info'
      });
    });
  }

  /**
   * 获取Webview HTML内容
   */
  getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>编程搭子</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      overflow: hidden;
      user-select: none;
    }

    #pet-container {
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 150px;
      height: 150px;
      cursor: move;
      z-index: 10000;
      transition: transform 0.3s ease;
    }

    #pet-container.dragging {
      cursor: grabbing;
      transform: scale(1.05);
    }

    #pet-container.minimized {
      width: 50px;
      height: 50px;
    }

    #pet-display {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }

    #pet-display:hover {
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 6px 30px rgba(0, 0, 0, 0.3);
    }

    #pet-avatar {
      font-size: 80px;
      animation: float 3s ease-in-out infinite;
    }

    .minimized #pet-avatar {
      font-size: 30px;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    #pet-avatar.happy {
      animation: bounce 0.5s ease-in-out 3;
    }

    #pet-avatar.celebrating {
      animation: spin 0.5s ease-in-out 2;
    }

    #speech-bubble {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      color: #333;
      padding: 10px 15px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      font-size: 12px;
    }

    #speech-bubble.show {
      opacity: 1;
    }

    #speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 8px solid white;
    }

    #pet-info {
      position: absolute;
      bottom: 160px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 10px;
      font-size: 12px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
      min-width: 150px;
    }

    #pet-container:hover #pet-info {
      opacity: 1;
    }

    .minimized #pet-info {
      display: none;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
    }

    .bar {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 3px;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      transition: width 0.3s ease;
    }

    .bar-fill.mood {
      background: linear-gradient(90deg, #FF9800, #FFC107);
    }

    .bar-fill.energy {
      background: linear-gradient(90deg, #2196F3, #03A9F4);
    }

    #menu-button {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 25px;
      height: 25px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0;
      transition: all 0.3s ease;
      font-size: 16px;
    }

    #pet-container:hover #menu-button {
      opacity: 1;
    }

    #menu-button:hover {
      background: rgba(255, 255, 255, 0.5);
      transform: scale(1.1);
    }

    .minimized #menu-button {
      display: none;
    }
  </style>
</head>
<body>
  <div id="pet-container">
    <div id="pet-display">
      <div id="pet-avatar">🐱</div>
      <div id="speech-bubble"></div>
      <div id="menu-button">⚙️</div>
    </div>
    <div id="pet-info">
      <div class="info-row">
        <span>等级:</span>
        <span id="level">1</span>
      </div>
      <div class="info-row">
        <span>心情:</span>
      </div>
      <div class="bar">
        <div class="bar-fill mood" id="mood-bar" style="width: 100%;"></div>
      </div>
      <div class="info-row">
        <span>能量:</span>
      </div>
      <div class="bar">
        <div class="bar-fill energy" id="energy-bar" style="width: 100%;"></div>
      </div>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('pet-container');
    const avatar = document.getElementById('pet-avatar');
    const bubble = document.getElementById('speech-bubble');
    const menuButton = document.getElementById('menu-button');

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    // 拖动功能
    container.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      if (e.target === menuButton) return;

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      container.classList.add('dragging');
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(currentX, currentY, container);
      }
    }

    function dragEnd(e) {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        container.classList.remove('dragging');

        // 发送位置更新
        vscode.postMessage({
          command: 'updatePosition',
          x: currentX,
          y: currentY
        });
      }
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = \`translate3d(\${xPos}px, \${yPos}px, 0)\`;
    }

    // 点击交互
    avatar.addEventListener('click', () => {
      vscode.postMessage({
        command: 'interact',
        action: 'pet'
      });
    });

    // 菜单按钮
    menuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      vscode.postMessage({
        command: 'showMenu'
      });
    });

    // 接收消息
    window.addEventListener('message', event => {
      const message = event.data;

      switch (message.command) {
        case 'updateState':
          updatePetState(message.state);
          break;

        case 'changeBehavior':
          changeBehavior(message.behavior, message.duration);
          break;

        case 'showBubble':
          showSpeechBubble(message.message, message.type);
          break;

        case 'minimize':
          container.classList.add('minimized');
          break;
      }
    });

    function updatePetState(state) {
      document.getElementById('level').textContent = state.level;
      document.getElementById('mood-bar').style.width = state.mood + '%';
      document.getElementById('energy-bar').style.width = state.energy + '%';

      // 根据心情改变表情
      if (state.mood > 80) {
        avatar.textContent = '😊';
      } else if (state.mood > 50) {
        avatar.textContent = '😐';
      } else if (state.mood > 20) {
        avatar.textContent = '😔';
      } else {
        avatar.textContent = '😢';
      }
    }

    function changeBehavior(behavior, duration) {
      avatar.classList.remove('happy', 'celebrating', 'working', 'sleeping');

      switch (behavior) {
        case 'happy':
        case 'celebrating':
          avatar.classList.add(behavior);
          avatar.textContent = '🎉';
          break;
        case 'working':
          avatar.textContent = '💻';
          break;
        case 'sleeping':
          avatar.textContent = '😴';
          break;
        case 'reminding':
          avatar.textContent = '⏰';
          break;
        case 'worried':
          avatar.textContent = '😰';
          break;
        default:
          avatar.textContent = '🐱';
      }

      if (duration > 0) {
        setTimeout(() => {
          avatar.textContent = '🐱';
          avatar.classList.remove('happy', 'celebrating');
        }, duration);
      }
    }

    function showSpeechBubble(message, type = 'info') {
      bubble.textContent = message;
      bubble.classList.add('show');

      setTimeout(() => {
        bubble.classList.remove('show');
      }, 3000);
    }
  </script>
</body>
</html>`;
  }
}

module.exports = {
  PetWebview
};
