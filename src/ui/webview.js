// Webview 视图提供者模块
const vscode = require('vscode');
const { getGameState, calculateCoinsPerSecond, formatNumber } = require('../game/gameState');
const { getAchievements, checkAchievements, resetAchievements } = require('../game/achievements');
const { getLotteryPrizes, getLotteryPrices, drawPrize, grantPrize } = require('../game/lottery');
const { saveGameState, showSaveInfo, backupGameSave } = require('../game/storage');

// 侧边栏视图提供者
class IdleGameViewProvider {
  constructor(context) {
    this._context = context;
    this._view = undefined;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this._getHtmlContent();

    // 监听配置变化 - 通过消息更新，不刷新整个页面
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('funny-vscode-extension.enableRippleEffect')) {
        const rippleEnabled = vscode.workspace.getConfiguration('funny-vscode-extension').get('enableRippleEffect', false);
        if (this._view) {
          this._view.webview.postMessage({
            command: 'configChanged',
            rippleEnabled: rippleEnabled
          });
        }
      }
      if (e.affectsConfiguration('funny-vscode-extension.rippleSize')) {
        const rippleSize = vscode.workspace.getConfiguration('funny-vscode-extension').get('rippleSize', 100);
        if (this._view) {
          this._view.webview.postMessage({
            command: 'configChanged',
            rippleSize: rippleSize
          });
        }
      }
    });

    // 监听消息
    webviewView.webview.onDidReceiveMessage(
      message => {
        const gameState = getGameState();

        switch (message.command) {
          case 'clickCoin':
            gameState.coins += 1;
            gameState.totalCoinsEarned += 1;
            checkAchievements();
            saveGameState(this._context);
            break;

          case 'buyUpgrade':
            const upgrade = gameState.upgrades[message.upgradeKey];
            if (upgrade) {
              const cost = Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
              if (gameState.coins >= cost) {
                gameState.coins -= cost;
                upgrade.count++;
                gameState.coinsPerSecond = calculateCoinsPerSecond();
                checkAchievements();
                saveGameState(this._context);
                // 发送即时更新
                this._view.webview.postMessage({
                  command: 'upgradeSuccess',
                  upgradeKey: message.upgradeKey,
                  newCount: upgrade.count,
                  newProduction: upgrade.count * upgrade.production
                });
              }
            }
            break;

          case 'showSaveInfo':
            showSaveInfo(this._context);
            break;

          case 'backupSave':
            backupGameSave(this._context);
            break;

          case 'lottery':
            const lotteryPrices = getLotteryPrices();
            // 抽奖逻辑
            if (gameState.coins >= lotteryPrices.normal) {
              gameState.coins -= lotteryPrices.normal;
              const prize = drawPrize();

              // 延迟发放奖励，配合动画
              setTimeout(() => {
                grantPrize(prize, this._context);
              }, 4000);
            } else {
              vscode.window.showWarningMessage('金币不足，无法抽奖！');
            }
            saveGameState(this._context);
            break;

          case 'resetGame':
            const { resetGameState } = require('../game/gameState');
            resetGameState();
            resetAchievements();
            this.refresh();
            saveGameState(this._context);
            break;

          case 'toggleRipple':
            const config = vscode.workspace.getConfiguration('funny-vscode-extension');
            const currentValue = config.get('enableRippleEffect', false);
            config.update('enableRippleEffect', !currentValue, true).then(() => {
              vscode.window.showInformationMessage(`波纹特效已${!currentValue ? '启用' : '禁用'}`);
            });
            break;

          case 'updateRippleSize':
            const sizeConfig = vscode.workspace.getConfiguration('funny-vscode-extension');
            sizeConfig.update('rippleSize', message.size, true);
            break;
        }
      }
    );

    // 每秒发送数据更新（不刷新HTML）
    const updateTimer = setInterval(() => {
      if (this._view) {
        const gameState = getGameState();
        this._view.webview.postMessage({
          command: 'updateGameState',
          data: {
            coins: gameState.coins,
            coinsPerSecond: gameState.coinsPerSecond,
            totalCoinsEarned: gameState.totalCoinsEarned,
            achievements: gameState.achievements,
            startTime: gameState.startTime,
            activeBoosts: gameState.activeBoosts,
            upgrades: gameState.upgrades
          }
        });
      }
    }, 1000);

    webviewView.onDidDispose(() => {
      clearInterval(updateTimer);
      configChangeListener.dispose();
    });
  }

  refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent();
    }
  }

  _getHtmlContent() {
    const gameState = getGameState();
    const achievements = getAchievements();
    const lotteryPrizes = getLotteryPrizes();
    const lotteryPrices = getLotteryPrices();

    // 读取波纹特效配置
    const rippleEnabled = vscode.workspace.getConfiguration('funny-vscode-extension').get('enableRippleEffect', false);
    const rippleSize = vscode.workspace.getConfiguration('funny-vscode-extension').get('rippleSize', 100);

    const upgradesList = Object.entries(gameState.upgrades).map(([key, upgrade]) => {
      const nextCost = Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
      const canAfford = gameState.coins >= nextCost;
      return `
        <div class="item ${canAfford ? 'ok' : ''}" data-upgrade="${key}">
          <div class="item-name">${upgrade.name} <span class="count">[${upgrade.count}]</span></div>
          <div class="item-detail">+${upgrade.production * upgrade.count}/s</div>
          <button class="btn" ${!canAfford ? 'disabled' : ''}>${formatNumber(nextCost)}</button>
        </div>
      `;
    }).join('');

    const unlockedAchievements = achievements.filter(a => a.unlocked);
    const achievementsList = unlockedAchievements.length > 0
      ? unlockedAchievements.map(a => `<span class="badge">🏆${a.name}</span>`).join('')
      : '<div class="empty">暂无成就</div>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            padding: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.4;
            overflow-x: hidden;
          }

          /* 顶部统计 */
          .stats {
            background: var(--vscode-input-background);
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 4px;
            border-left: 3px solid #FFD700;
          }
          .coins {
            font-size: 20px;
            font-weight: bold;
            color: #FFD700;
            margin-bottom: 4px;
          }
          .rate {
            font-size: 13px;
            color: #7CFC00;
            margin-bottom: 6px;
          }
          .click-btn {
            width: 100%;
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            color: #000;
            border: none;
            padding: 8px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 4px;
            transition: transform 0.1s;
          }
          .click-btn:hover {
            transform: scale(1.02);
          }
          .click-btn:active {
            transform: scale(0.98);
          }
          .mini-stats {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 10px;
            opacity: 0.7;
          }

          /* 区块标题 */
          .section {
            margin-bottom: 10px;
          }
          .title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--vscode-panel-border);
            opacity: 0.8;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          /* 升级项 */
          .item {
            background: var(--vscode-input-background);
            padding: 8px;
            margin-bottom: 6px;
            border-radius: 4px;
            border-left: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
          }
          .item:hover {
            background: var(--vscode-list-hoverBackground);
          }
          .item.ok {
            border-left-color: #7CFC00;
          }
          .item-name {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          .count {
            color: #00BFFF;
            font-weight: normal;
          }
          .item-detail {
            font-size: 9px;
            opacity: 0.7;
            margin-bottom: 4px;
          }
          .btn {
            width: 100%;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px;
            font-size: 10px;
            cursor: pointer;
            border-radius: 3px;
          }
          .btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
          }
          .btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          /* 成就徽章 */
          .badge {
            display: inline-block;
            background: var(--vscode-button-background);
            padding: 4px 6px;
            margin: 3px;
            font-size: 9px;
            border-radius: 3px;
          }
          .empty {
            font-size: 10px;
            opacity: 0.5;
            text-align: center;
            padding: 10px;
          }

          /* 重置按钮 */
          .reset-btn {
            width: 100%;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border: none;
            padding: 6px;
            font-size: 10px;
            cursor: pointer;
            border-radius: 3px;
            margin-top: 10px;
          }

          /* 存档管理按钮 */
          .save-btn {
            width: 100%;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px;
            font-size: 10px;
            cursor: pointer;
            border-radius: 3px;
            margin-top: 6px;
          }
          .save-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          /* 标签页系统 */
          .tabs-container {
            display: flex;
            gap: 4px;
            padding: 0 8px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            margin: -8px -8px 8px -8px;
            overflow-x: auto;
            scrollbar-width: thin;
          }
          .tab {
            padding: 8px 12px;
            font-size: 11px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--vscode-foreground);
            opacity: 0.6;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .tab:hover {
            opacity: 0.8;
            background: var(--vscode-list-hoverBackground);
          }
          .tab.active {
            opacity: 1;
            border-bottom-color: var(--vscode-focusBorder);
            font-weight: bold;
          }
          .tab-content {
            display: none;
            animation: fadeIn 0.3s;
          }
          .tab-content.active {
            display: block;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* 抽奖转盘 */
          .lottery-container {
            position: relative;
            width: 100%;
            max-width: 250px;
            margin: 15px auto;
          }
          .wheel-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: 100%;
          }
          .wheel {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            transition: transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
          }
          .wheel.spinning {
            animation: wheelSpin 4s cubic-bezier(0.17, 0.67, 0.12, 0.99);
          }
          @keyframes wheelSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(1800deg); }
          }
          .prize-sector {
            position: absolute;
            width: 50%;
            height: 50%;
            transform-origin: 100% 100%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 15%;
            font-size: 9px;
            font-weight: bold;
            color: white;
            text-shadow: 0 0 3px rgba(0,0,0,0.5);
          }
          .wheel-pointer {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 12px solid transparent;
            border-right: 12px solid transparent;
            border-top: 20px solid #ff0000;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            z-index: 10;
          }
          .wheel-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ffd700, #ffed4e);
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
          }
          .lottery-btn {
            width: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 6px;
            margin-top: 10px;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          }
          .lottery-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          .lottery-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
          .lottery-info {
            font-size: 9px;
            text-align: center;
            opacity: 0.7;
            margin-top: 5px;
          }

          /* 中奖特效 */
          .confetti {
            position: fixed;
            width: 10px;
            height: 10px;
            background: #f1c40f;
            position: absolute;
            animation: confetti-fall 3s ease-out forwards;
          }
          @keyframes confetti-fall {
            to {
              transform: translateY(300px) rotate(360deg);
              opacity: 0;
            }
          }

          /* 响应式：窄屏模式 */
          @media (max-width: 250px) {
            body { padding: 4px; }
            .stats { padding: 6px; }
            .coins { font-size: 16px; }
            .rate { font-size: 11px; }
            .click-btn { padding: 6px; font-size: 11px; }
            .item { padding: 6px; }
            .item-name { font-size: 10px; }
            .item-detail { display: none; }
            .title { font-size: 10px; }
          }

          /* 超窄屏：只显示核心信息 */
          @media (max-width: 150px) {
            .mini-stats { flex-direction: column; gap: 2px; }
            .section:not(:first-child) { display: none; }
            .stats {
              padding: 4px;
              font-size: 10px;
            }
            .coins { font-size: 14px; }
            .rate { font-size: 10px; }
            .click-btn { padding: 4px; font-size: 10px; }
          }

          /* 波纹特效 */
          .ripple {
            position: fixed;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            pointer-events: none;
            animation: ripple-animation 0.6s ease-out;
            z-index: 9999;
          }
          @keyframes ripple-animation {
            from {
              transform: scale(0);
              opacity: 1;
            }
            to {
              transform: scale(1);
              opacity: 0;
            }
          }

          /* 滑动条样式 */
          .slider-container {
            margin-top: 8px;
            padding: 0;
            background: var(--vscode-input-background);
            border-radius: 4px;
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease;
            position: relative;
          }
          .slider-container.visible {
            max-height: 100px;
            opacity: 1;
            padding: 8px;
            margin-top: 8px;
          }
          .slider-label {
            font-size: 10px;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            opacity: 0.8;
          }
          .slider {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--vscode-scrollbarSlider-background);
            outline: none;
            -webkit-appearance: none;
          }
          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--vscode-button-background);
            cursor: pointer;
          }
          .slider::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--vscode-button-background);
            cursor: pointer;
            border: none;
          }
          .slider:hover::-webkit-slider-thumb {
            background: var(--vscode-button-hoverBackground);
          }
          .slider:hover::-moz-range-thumb {
            background: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <!-- 标签导航 -->
        <div class="tabs-container">
          <button class="tab active" onclick="switchTab(event, 'home')">🏠 首页</button>
          <button class="tab" onclick="switchTab(event, 'upgrade')">🏭 升级</button>
          <button class="tab" onclick="switchTab(event, 'lottery')">🎰 抽奖</button>
          <button class="tab" onclick="switchTab(event, 'achievement')">🏆 成就</button>
          <button class="tab" onclick="switchTab(event, 'settings')">⚙️ 设置</button>
        </div>

        <!-- 首页标签 -->
        <div class="tab-content active" id="tab-home">
          <div class="stats">
            <div class="coins">💰 ${formatNumber(gameState.coins)}</div>
            <div class="rate">⚡ +${formatNumber(gameState.coinsPerSecond)}/s</div>
            <button class="click-btn" onclick="clickCoin()">点击 +1</button>
            <div class="mini-stats">
              <span>总: ${formatNumber(gameState.totalCoinsEarned)}</span>
              <span>成就: ${gameState.achievements.length}/${achievements.length}</span>
              <span>${Math.floor((Date.now() - gameState.startTime) / 60000)}分钟</span>
            </div>
          </div>
        </div>

        <!-- 升级标签 -->
        <div class="tab-content" id="tab-upgrade">
          <div class="section">
            <div class="title">
              <span>🏭 自动化升级</span>
            </div>
            ${upgradesList}
          </div>
        </div>

        <!-- 抽奖标签 -->
        <div class="tab-content" id="tab-lottery">
          <div class="section">
            <div class="title">
              <span>🎰 幸运转盘</span>
            </div>
            <div class="lottery-container">
              <div class="wheel-pointer"></div>
              <div class="wheel-wrapper">
                <div class="wheel" id="wheel">
                  ${lotteryPrizes.map((prize, index) => {
                    const angle = (360 / lotteryPrizes.length) * index;
                    return `<div class="prize-sector" style="transform: rotate(${angle}deg); background: ${prize.color};">${prize.name}</div>`;
                  }).join('')}
                </div>
                <div class="wheel-center">GO</div>
              </div>
            </div>
            <button class="lottery-btn" id="lotteryBtn" onclick="startLottery()"
                    ${gameState.coins < lotteryPrices.normal ? 'disabled' : ''}>
              🎰 抽奖一次 (${lotteryPrices.normal}金币)
            </button>
            <div class="lottery-info">奖励包括金币、加速道具、折扣券等</div>
          </div>
        </div>

        <!-- 成就标签 -->
        <div class="tab-content" id="tab-achievement">
          <div class="section">
            <div class="title">
              <span>🏆 成就系统 (${gameState.achievements.length}/${achievements.length})</span>
            </div>
            ${achievementsList}
          </div>
        </div>

        <!-- 设置标签 -->
        <div class="tab-content" id="tab-settings">
          <div class="section">
            <div class="title">
              <span>⚙️ 游戏设置</span>
            </div>
            <button class="save-btn" onclick="showSaveInfo()">📁 存档信息</button>
            <button class="save-btn" onclick="backupSave()">💾 备份存档</button>
            <button class="reset-btn" onclick="resetGame()">重置游戏</button>
          </div>
          <div class="section">
            <div class="title">
              <span>🎨 视觉特效</span>
            </div>
            <div class="item">
              <div class="item-name">波纹特效</div>
              <div class="item-detail">点击时显示彩色波纹动画</div>
              <button class="btn" id="rippleToggleBtn" onclick="toggleRipple()">
                ${rippleEnabled ? '✅ 已启用' : '❌ 已禁用'}
              </button>
            </div>
            <div class="slider-container ${rippleEnabled ? 'visible' : ''}" id="rippleSizeSlider">
              <div class="slider-label">
                <span>波纹大小</span>
                <span id="rippleSizeValue">${rippleSize}px</span>
              </div>
              <input type="range" min="50" max="300" value="${rippleSize}" class="slider" id="sizeSlider" oninput="updateRippleSize(event, this.value)">
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let RIPPLE_ENABLED = ${rippleEnabled};
          let RIPPLE_SIZE = ${rippleSize};

          // 接收来自扩展的消息
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateGameState') {
              updateUI(message.data);
            } else if (message.command === 'upgradeSuccess') {
              handleUpgradeSuccess(message);
            } else if (message.command === 'configChanged') {
              handleConfigChanged(message);
            }
          });

          // 局部更新UI（不刷新整个页面）
          function updateUI(data) {
            // 更新金币显示
            const coinsElement = document.querySelector('.coins');
            if (coinsElement) {
              coinsElement.textContent = '💰 ' + formatNumber(data.coins);
            }

            // 更新产出速率
            const rateElement = document.querySelector('.rate');
            if (rateElement) {
              let boostText = '';
              if (data.activeBoosts && data.activeBoosts.length > 0) {
                const effectiveProduction = data.coinsPerSecond * data.activeBoosts[0].multiplier;
                rateElement.textContent = '⚡ +' + formatNumber(effectiveProduction) + '/s 🚀' + data.activeBoosts[0].multiplier + 'x';
              } else {
                rateElement.textContent = '⚡ +' + formatNumber(data.coinsPerSecond) + '/s';
              }
            }

            // 更新统计信息
            const miniStats = document.querySelector('.mini-stats');
            if (miniStats) {
              const runTime = Math.floor((Date.now() - data.startTime) / 60000);
              miniStats.innerHTML =
                '<span>总: ' + formatNumber(data.totalCoinsEarned) + '</span>' +
                '<span>成就: ' + data.achievements.length + '/${achievements.length}</span>' +
                '<span>' + runTime + '分钟</span>';
            }

            // 更新升级按钮状态
            if (data.upgrades) {
              Object.entries(data.upgrades).forEach(([key, upgrade]) => {
                const cost = Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
                const item = document.querySelector('[data-upgrade="' + key + '"]');
                if (item) {
                  // 更新是否可购买状态
                  if (data.coins >= cost) {
                    item.classList.add('ok');
                    item.querySelector('.btn').disabled = false;
                  } else {
                    item.classList.remove('ok');
                    item.querySelector('.btn').disabled = true;
                  }
                }
              });
            }

            // 更新抽奖按钮
            const lotteryBtn = document.getElementById('lotteryBtn');
            if (lotteryBtn && !lotteryBtn.textContent.includes('抽奖中')) {
              lotteryBtn.disabled = data.coins < ${lotteryPrices.normal};
            }
          }

          // 处理升级成功的消息
          function handleUpgradeSuccess(message) {
            const item = document.querySelector('[data-upgrade="' + message.upgradeKey + '"]');
            if (item) {
              // 更新数量显示
              const countElement = item.querySelector('.count');
              if (countElement) {
                countElement.textContent = '[' + message.newCount + ']';
              }

              // 更新产出显示
              const detailElement = item.querySelector('.item-detail');
              if (detailElement) {
                detailElement.textContent = '+' + message.newProduction + '/s';
              }
            }
          }

          function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
            return Math.floor(num).toString();
          }

          // 标签切换
          function switchTab(event, tabName) {
            // 阻止事件冒泡，避免触发其他点击事件
            event.stopPropagation();

            // 移除所有active类
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // 添加active类到选中的标签
            event.currentTarget.classList.add('active');
            document.getElementById('tab-' + tabName).classList.add('active');
          }

          function clickCoin() {
            vscode.postMessage({ command: 'clickCoin' });
          }

          function showSaveInfo() {
            vscode.postMessage({ command: 'showSaveInfo' });
          }

          function backupSave() {
            vscode.postMessage({ command: 'backupSave' });
          }

          function resetGame() {
            if (confirm('确定要重置游戏吗？所有进度将丢失！')) {
              vscode.postMessage({ command: 'resetGame' });
            }
          }

          function toggleRipple() {
            vscode.postMessage({ command: 'toggleRipple' });
          }

          function updateRippleSize(event, value) {
            // 阻止事件冒泡
            event.stopPropagation();

            RIPPLE_SIZE = parseInt(value);
            document.getElementById('rippleSizeValue').textContent = value + 'px';
            vscode.postMessage({ command: 'updateRippleSize', size: RIPPLE_SIZE });
          }

          // 处理配置变化消息
          function handleConfigChanged(message) {
            // 更新波纹开关状态
            if (message.rippleEnabled !== undefined) {
              RIPPLE_ENABLED = message.rippleEnabled;
              const toggleBtn = document.getElementById('rippleToggleBtn');
              if (toggleBtn) {
                toggleBtn.textContent = RIPPLE_ENABLED ? '✅ 已启用' : '❌ 已禁用';
              }

              // 显示或隐藏滑动条
              const sliderContainer = document.getElementById('rippleSizeSlider');
              if (sliderContainer) {
                if (RIPPLE_ENABLED) {
                  sliderContainer.classList.add('visible');
                } else {
                  sliderContainer.classList.remove('visible');
                }
              }
            }

            // 更新波纹大小
            if (message.rippleSize !== undefined) {
              RIPPLE_SIZE = message.rippleSize;
              const sizeValue = document.getElementById('rippleSizeValue');
              if (sizeValue) {
                sizeValue.textContent = RIPPLE_SIZE + 'px';
              }
              const slider = document.getElementById('sizeSlider');
              if (slider) {
                slider.value = RIPPLE_SIZE;
              }
            }
          }

          // 抽奖功能
          let isSpinning = false;
          function startLottery() {
            if (isSpinning) return;
            isSpinning = true;

            const btn = document.getElementById('lotteryBtn');
            const wheel = document.getElementById('wheel');

            btn.disabled = true;
            btn.textContent = '抽奖中...';

            // 发送抽奖请求
            vscode.postMessage({ command: 'lottery' });

            // 转盘旋转动画
            wheel.classList.add('spinning');

            // 4秒后重置
            setTimeout(() => {
              wheel.classList.remove('spinning');
              isSpinning = false;
              btn.textContent = '🎰 抽奖一次 (' + ${lotteryPrices.normal} + '金币)';
            }, 4000);
          }

          // 创建彩纸特效
          function createConfetti() {
            const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
            for (let i = 0; i < 50; i++) {
              setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3000);
              }, i * 30);
            }
          }

          document.addEventListener('click', (e) => {
            const item = e.target.closest('.item');
            if (item && !e.target.disabled) {
              const upgradeKey = item.getAttribute('data-upgrade');
              if (upgradeKey) {
                vscode.postMessage({ command: 'buyUpgrade', upgradeKey: upgradeKey });
              }
            }
          });

          // 波纹特效功能
          function createRipple(event) {
            if (!RIPPLE_ENABLED) return;

            // 如果点击的是滑动条或其容器，不创建波纹
            if (event.target.type === 'range' || event.target.closest('.slider-container')) {
              return;
            }

            const ripple = document.createElement('div');
            ripple.className = 'ripple';

            // 设置波纹的位置和大小（使用配置的大小）
            const size = RIPPLE_SIZE;
            ripple.style.width = size + 'px';
            ripple.style.height = size + 'px';
            ripple.style.left = (event.clientX - size / 2) + 'px';
            ripple.style.top = (event.clientY - size / 2) + 'px';

            // 随机颜色
            const colors = [
              'rgba(255, 215, 0, 0.6)',
              'rgba(124, 252, 0, 0.6)',
              'rgba(0, 191, 255, 0.6)',
              'rgba(255, 105, 180, 0.6)',
              'rgba(138, 43, 226, 0.6)'
            ];
            ripple.style.background = colors[Math.floor(Math.random() * colors.length)];

            document.body.appendChild(ripple);

            // 动画结束后移除元素
            setTimeout(() => {
              ripple.remove();
            }, 600);
          }

          // 添加全局点击监听器（总是添加，由createRipple内部判断）
          document.addEventListener('click', createRipple);
        </script>
      </body>
      </html>
    `;
  }
}

module.exports = IdleGameViewProvider;
