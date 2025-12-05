/**
 * 编程搭子 - Webview 面板
 * 主界面，包含聊天、DDL、专注、统计
 */

const vscode = require('vscode');
const { getState, saveState } = require('../buddy/state');
const { getCurrentEmoji, interact, changeSkin, getAllSkins } = require('../buddy/buddy');
const { processMessage, getProactiveMessage } = require('../buddy/chat');
const { addTask, completeTask, deleteTask, getPendingTasks, getTaskCountdown } = require('../buddy/ddl');
const { startWork, startBreak, pause, resume, stop, getFocusState } = require('../buddy/focus');
const { getEventBus } = require('../core/eventBus');

class BuddyWebviewProvider {
  constructor(context) {
    this.context = context;
    this.view = null;
    this.chatHistory = [];
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true
    };
    
    webviewView.webview.html = this.getHtml();
    
    // 处理来自 webview 的消息
    webviewView.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });
    
    // 监听事件更新 UI
    this.setupEventListeners();
    
    // 检查是否有主动对话
    this.checkProactiveMessage();
  }

  setupEventListeners() {
    const eventBus = getEventBus();
    
    eventBus.on('buddy:stateUpdated', () => this.updateUI());
    eventBus.on('focus:tick', () => this.updateUI());
    eventBus.on('ddl:added', () => this.updateUI());
    eventBus.on('ddl:completed', () => this.updateUI());
    eventBus.on('buddy:levelUp', (data) => {
      this.addBuddyMessage(`🎉 升级了！现在是 Lv.${data.level}！`);
    });
    eventBus.on('buddy:skinUnlocked', (data) => {
      this.addBuddyMessage(`🎨 解锁了新皮肤：${data.skin.emoji} ${data.skin.name}！`);
    });
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'chat':
        await this.handleChat(message.text);
        break;
      case 'startFocus':
        const result = startWork(message.minutes);
        this.addBuddyMessage(result.success ? '🍅 专注模式启动！我会安静陪着你～' : result.message);
        this.updateUI();
        break;
      case 'pauseFocus':
        pause();
        this.addBuddyMessage('⏸️ 已暂停，休息一下吧');
        this.updateUI();
        break;
      case 'resumeFocus':
        const resumeResult = resume();
        this.addBuddyMessage(resumeResult.success ? '▶️ 继续加油！' : resumeResult.message);
        this.updateUI();
        break;
      case 'stopFocus':
        stop();
        this.addBuddyMessage('⏹️ 已停止专注');
        this.updateUI();
        break;
      case 'startBreak':
        startBreak(message.isLong);
        this.addBuddyMessage('☕ 休息时间～放松一下吧');
        break;
      case 'addDDL':
        await this.handleAddDDL();
        break;
      case 'completeDDL':
        completeTask(message.taskId);
        this.addBuddyMessage('✅ 太棒了，又完成一个任务！');
        break;
      case 'deleteDDL':
        deleteTask(message.taskId);
        break;
      case 'interact':
        interact(message.action);
        const responses = {
          pet: '😸 喵～好舒服',
          feed: '😋 谢谢投喂！',
          play: '🎮 好开心！'
        };
        this.addBuddyMessage(responses[message.action] || '❤️');
        break;
      case 'changeSkin':
        if (changeSkin(message.skinId)) {
          this.addBuddyMessage('🎨 换上新皮肤啦！');
        }
        break;
      case 'getState':
        this.updateUI();
        break;
    }
  }

  async handleChat(text) {
    // 添加用户消息
    this.chatHistory.push({ role: 'user', content: text });
    
    // 获取回复
    const response = await processMessage(text);
    
    // 添加搭子回复
    this.chatHistory.push({ role: 'buddy', content: response });
    
    // 更新 UI
    this.sendToWebview('chatUpdate', { history: this.chatHistory.slice(-20) });
  }

  async handleAddDDL() {
    const name = await vscode.window.showInputBox({
      prompt: '输入任务名称',
      placeHolder: '例如: 完成项目报告'
    });
    
    if (!name) return;
    
    const deadlineStr = await vscode.window.showInputBox({
      prompt: '输入截止时间',
      placeHolder: 'YYYY-MM-DD HH:mm，例如: 2025-12-10 18:00',
      validateInput: (value) => {
        if (!value) return '请输入截止时间';
        const date = new Date(value.replace(' ', 'T'));
        if (isNaN(date.getTime())) return '日期格式错误';
        if (date < new Date()) return '截止时间不能早于现在';
        return null;
      }
    });
    
    if (!deadlineStr) return;
    
    const deadline = new Date(deadlineStr.replace(' ', 'T'));
    addTask(name, deadline);
    this.addBuddyMessage(`📝 已添加 DDL: ${name}`);
    this.updateUI();
  }

  addBuddyMessage(text) {
    this.chatHistory.push({ role: 'buddy', content: text });
    this.sendToWebview('chatUpdate', { history: this.chatHistory.slice(-20) });
  }

  checkProactiveMessage() {
    const message = getProactiveMessage();
    if (message) {
      setTimeout(() => {
        this.addBuddyMessage(message);
      }, 2000);
    }
  }

  updateUI() {
    const state = getState();
    const focus = getFocusState();
    const ddls = getPendingTasks().map(t => ({
      ...t,
      countdown: getTaskCountdown(t.id)
    }));
    const skins = getAllSkins().map(s => ({
      ...s,
      unlocked: state.buddy.unlockedSkins.includes(s.id),
      current: state.buddy.currentSkin === s.id
    }));
    
    this.sendToWebview('stateUpdate', {
      buddy: state.buddy,
      emoji: getCurrentEmoji(),
      focus,
      ddls,
      stats: state.stats,
      skins
    });
  }

  sendToWebview(type, data) {
    if (this.view) {
      this.view.webview.postMessage({ type, ...data });
    }
  }

  getHtml() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
    }
    
    /* 标签页 */
    .tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 8px;
    }
    .tab {
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: var(--vscode-foreground);
      cursor: pointer;
      border-radius: 4px;
      opacity: 0.7;
    }
    .tab:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }
    .tab.active {
      opacity: 1;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    
    .panel { display: none; }
    .panel.active { display: block; }
    
    /* 搭子头部 */
    .buddy-header {
      text-align: center;
      padding: 16px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .buddy-emoji { font-size: 48px; }
    .buddy-name { font-size: 16px; font-weight: bold; margin: 8px 0 4px; }
    .buddy-level { font-size: 12px; opacity: 0.8; }
    .buddy-bars { margin-top: 12px; }
    .bar-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
      font-size: 12px;
    }
    .bar {
      flex: 1;
      height: 6px;
      background: var(--vscode-progressBar-background);
      border-radius: 3px;
      overflow: hidden;
    }
    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .bar-mood .bar-fill { background: #ff6b6b; }
    .bar-energy .bar-fill { background: #4ecdc4; }
    
    /* 聊天 */
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 300px;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .message {
      margin: 8px 0;
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 85%;
      word-wrap: break-word;
    }
    .message.user {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      margin-left: auto;
    }
    .message.buddy {
      background: var(--vscode-input-background);
    }
    .chat-input-container {
      display: flex;
      gap: 8px;
    }
    .chat-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      outline: none;
    }
    .chat-input:focus { border-color: var(--vscode-focusBorder); }
    
    /* 按钮 */
    .btn {
      padding: 8px 16px;
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      cursor: pointer;
    }
    .btn:hover { background: var(--vscode-button-hoverBackground); }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .btn-small { padding: 4px 8px; font-size: 12px; }
    
    /* 专注模式 */
    .focus-display {
      text-align: center;
      padding: 24px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .focus-time {
      font-size: 48px;
      font-weight: bold;
      font-family: monospace;
    }
    .focus-type { margin: 8px 0; opacity: 0.8; }
    .focus-buttons { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
    .focus-stats {
      display: flex;
      justify-content: space-around;
      padding: 12px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
    }
    .focus-stat { text-align: center; }
    .focus-stat-value { font-size: 24px; font-weight: bold; }
    .focus-stat-label { font-size: 12px; opacity: 0.7; }
    
    /* DDL 列表 */
    .ddl-list { margin-top: 12px; }
    .ddl-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .ddl-info { flex: 1; }
    .ddl-name { font-weight: bold; }
    .ddl-countdown { font-size: 12px; opacity: 0.8; margin-top: 4px; }
    .ddl-countdown.urgent { color: #ff6b6b; }
    .ddl-actions { display: flex; gap: 4px; }
    
    /* 统计 */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat-card {
      padding: 16px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.7; margin-top: 4px; }
    
    /* 皮肤 */
    .skins-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }
    .skin-item {
      padding: 12px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      border: 2px solid transparent;
    }
    .skin-item:hover { background: var(--vscode-list-hoverBackground); }
    .skin-item.current { border-color: var(--vscode-button-background); }
    .skin-item.locked { opacity: 0.5; cursor: not-allowed; }
    .skin-emoji { font-size: 24px; }
    .skin-name { font-size: 11px; margin-top: 4px; }
    
    /* 互动按钮 */
    .interact-buttons {
      display: flex;
      gap: 8px;
      justify-content: center;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="buddy-header">
    <div class="buddy-emoji" id="buddyEmoji">😺</div>
    <div class="buddy-name" id="buddyName">小搭子</div>
    <div class="buddy-level" id="buddyLevel">Lv.1</div>
    <div class="buddy-bars">
      <div class="bar-container">
        <span>❤️</span>
        <div class="bar bar-mood"><div class="bar-fill" id="moodBar" style="width: 100%"></div></div>
        <span id="moodValue">100%</span>
      </div>
      <div class="bar-container">
        <span>⚡</span>
        <div class="bar bar-energy"><div class="bar-fill" id="energyBar" style="width: 100%"></div></div>
        <span id="energyValue">100%</span>
      </div>
    </div>
    <div class="interact-buttons">
      <button class="btn btn-small btn-secondary" onclick="interact('pet')">🤚 抚摸</button>
      <button class="btn btn-small btn-secondary" onclick="interact('feed')">🍎 喂食</button>
      <button class="btn btn-small btn-secondary" onclick="interact('play')">🎮 玩耍</button>
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" data-tab="chat">💬 聊天</button>
    <button class="tab" data-tab="focus">🍅 专注</button>
    <button class="tab" data-tab="ddl">📋 DDL</button>
    <button class="tab" data-tab="stats">📊 统计</button>
  </div>

  <!-- 聊天面板 -->
  <div class="panel active" id="panel-chat">
    <div class="chat-container">
      <div class="chat-messages" id="chatMessages">
        <div class="message buddy">你好！我是你的编程搭子，有什么我能帮你的吗？😺</div>
      </div>
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="chatInput" placeholder="说点什么..." />
        <button class="btn" onclick="sendChat()">发送</button>
      </div>
    </div>
  </div>

  <!-- 专注面板 -->
  <div class="panel" id="panel-focus">
    <div class="focus-display">
      <div class="focus-time" id="focusTime">25:00</div>
      <div class="focus-type" id="focusType">准备开始</div>
      <div class="focus-buttons" id="focusButtons">
        <button class="btn" onclick="startFocus()">🍅 开始专注</button>
      </div>
    </div>
    <div class="focus-stats">
      <div class="focus-stat">
        <div class="focus-stat-value" id="focusToday">0</div>
        <div class="focus-stat-label">今日完成</div>
      </div>
      <div class="focus-stat">
        <div class="focus-stat-value" id="focusTotal">0</div>
        <div class="focus-stat-label">总计完成</div>
      </div>
    </div>
  </div>

  <!-- DDL 面板 -->
  <div class="panel" id="panel-ddl">
    <button class="btn" onclick="addDDL()" style="width: 100%">➕ 添加 DDL</button>
    <div class="ddl-list" id="ddlList">
      <div style="text-align: center; padding: 24px; opacity: 0.7;">
        暂无 DDL，点击上方添加
      </div>
    </div>
  </div>

  <!-- 统计面板 -->
  <div class="panel" id="panel-stats">
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" id="statLines">0</div>
        <div class="stat-label">今日代码行数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statFocus">0</div>
        <div class="stat-label">今日专注(分钟)</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statStreak">0</div>
        <div class="stat-label">连续编程天数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="statDDL">0</div>
        <div class="stat-label">今日完成DDL</div>
      </div>
    </div>
    <h4 style="margin: 16px 0 8px;">🎨 皮肤收集</h4>
    <div class="skins-grid" id="skinsGrid"></div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // 标签页切换
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      });
    });
    
    // 聊天
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendChat();
    });
    
    function sendChat() {
      const text = chatInput.value.trim();
      if (!text) return;
      vscode.postMessage({ type: 'chat', text });
      chatInput.value = '';
    }
    
    // 专注
    function startFocus() { vscode.postMessage({ type: 'startFocus' }); }
    function pauseFocus() { vscode.postMessage({ type: 'pauseFocus' }); }
    function resumeFocus() { vscode.postMessage({ type: 'resumeFocus' }); }
    function stopFocus() { vscode.postMessage({ type: 'stopFocus' }); }
    function startBreak(isLong) { vscode.postMessage({ type: 'startBreak', isLong }); }
    
    // DDL
    function addDDL() { vscode.postMessage({ type: 'addDDL' }); }
    function completeDDL(id) { vscode.postMessage({ type: 'completeDDL', taskId: id }); }
    function deleteDDL(id) { vscode.postMessage({ type: 'deleteDDL', taskId: id }); }
    
    // 互动
    function interact(action) { vscode.postMessage({ type: 'interact', action }); }
    
    // 皮肤
    function changeSkin(id) { vscode.postMessage({ type: 'changeSkin', skinId: id }); }
    
    // 接收消息
    window.addEventListener('message', (event) => {
      const msg = event.data;
      
      if (msg.type === 'stateUpdate') {
        updateBuddyUI(msg);
        updateFocusUI(msg.focus);
        updateDDLUI(msg.ddls);
        updateStatsUI(msg.stats);
        updateSkinsUI(msg.skins);
      }
      
      if (msg.type === 'chatUpdate') {
        updateChatUI(msg.history);
      }
    });
    
    function updateBuddyUI(data) {
      document.getElementById('buddyEmoji').textContent = data.emoji;
      document.getElementById('buddyName').textContent = data.buddy.name;
      document.getElementById('buddyLevel').textContent = 'Lv.' + data.buddy.level;
      document.getElementById('moodBar').style.width = data.buddy.mood + '%';
      document.getElementById('moodValue').textContent = Math.round(data.buddy.mood) + '%';
      document.getElementById('energyBar').style.width = data.buddy.energy + '%';
      document.getElementById('energyValue').textContent = Math.round(data.buddy.energy) + '%';
    }
    
    function updateFocusUI(focus) {
      document.getElementById('focusTime').textContent = focus.formattedTime;
      document.getElementById('focusToday').textContent = focus.completedToday;
      document.getElementById('focusTotal').textContent = focus.completedTotal;
      
      const typeEl = document.getElementById('focusType');
      const btnsEl = document.getElementById('focusButtons');
      
      if (focus.isActive) {
        typeEl.textContent = focus.type === 'work' ? '🍅 专注中...' : '☕ 休息中...';
        if (focus.isPaused) {
          btnsEl.innerHTML = '<button class="btn" onclick="resumeFocus()">▶️ 继续</button>' +
                            '<button class="btn btn-secondary" onclick="stopFocus()">⏹️ 停止</button>';
        } else {
          btnsEl.innerHTML = '<button class="btn btn-secondary" onclick="pauseFocus()">⏸️ 暂停</button>' +
                            '<button class="btn btn-secondary" onclick="stopFocus()">⏹️ 停止</button>';
        }
      } else {
        typeEl.textContent = '准备开始';
        btnsEl.innerHTML = '<button class="btn" onclick="startFocus()">🍅 开始专注</button>' +
                          '<button class="btn btn-secondary" onclick="startBreak(false)">☕ 短休息</button>';
      }
    }
    
    function updateDDLUI(ddls) {
      const container = document.getElementById('ddlList');
      if (!ddls || ddls.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 24px; opacity: 0.7;">🎉 暂无 DDL</div>';
        return;
      }
      
      container.innerHTML = ddls.map(ddl => {
        const urgent = ddl.countdown && (ddl.countdown.overdue || ddl.countdown.totalMinutes < 120);
        return '<div class="ddl-item">' +
          '<div class="ddl-info">' +
            '<div class="ddl-name">' + ddl.name + '</div>' +
            '<div class="ddl-countdown ' + (urgent ? 'urgent' : '') + '">' +
              (ddl.countdown?.overdue ? '⚠️ 已过期' : '⏰ ' + ddl.countdown?.text) +
            '</div>' +
          '</div>' +
          '<div class="ddl-actions">' +
            '<button class="btn btn-small" onclick="completeDDL(\\''+ddl.id+'\\')">✓</button>' +
            '<button class="btn btn-small btn-secondary" onclick="deleteDDL(\\''+ddl.id+'\\')">✕</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function updateStatsUI(stats) {
      document.getElementById('statLines').textContent = stats.today.linesAdded;
      document.getElementById('statFocus').textContent = stats.today.focusMinutes;
      document.getElementById('statStreak').textContent = stats.total.currentStreak;
      document.getElementById('statDDL').textContent = stats.today.ddlsCompleted;
    }
    
    function updateSkinsUI(skins) {
      const container = document.getElementById('skinsGrid');
      container.innerHTML = skins.map(skin => {
        const classes = ['skin-item'];
        if (skin.current) classes.push('current');
        if (!skin.unlocked) classes.push('locked');
        return '<div class="' + classes.join(' ') + '" onclick="' + (skin.unlocked ? "changeSkin('"+skin.id+"')" : '') + '">' +
          '<div class="skin-emoji">' + (skin.unlocked ? skin.emoji : '🔒') + '</div>' +
          '<div class="skin-name">' + skin.name + '</div>' +
        '</div>';
      }).join('');
    }
    
    function updateChatUI(history) {
      const container = document.getElementById('chatMessages');
      container.innerHTML = history.map(msg => 
        '<div class="message ' + msg.role + '">' + msg.content + '</div>'
      ).join('');
      container.scrollTop = container.scrollHeight;
    }
    
    // 初始化请求状态
    vscode.postMessage({ type: 'getState' });
  </script>
</body>
</html>`;
  }
}

module.exports = { BuddyWebviewProvider };
