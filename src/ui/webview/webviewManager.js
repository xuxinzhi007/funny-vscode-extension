/**
 * Webview Manager - Manages webview lifecycle and content
 * Refactored from the monolithic webview.js
 */

const vscode = require('vscode');
const { getGameState, calculateCoinsPerSecond, formatNumber } = require('../../game/gameState');
const { getAchievements, checkAchievements, resetAchievements } = require('../../game/achievements');
const { getLotteryPrizes, getLotteryPrices, drawPrize, grantPrize } = require('../../game/lottery');
const { saveGameState, showSaveInfo, backupGameSave } = require('../../game/storage');
const { getBattleSystem } = require('../../game/battleSystem');
const { getEventBus } = require('../../core/eventBus');
const { getResourceManager } = require('../../core/resourceManager');
const { getLogger } = require('../../utils/logger');

// Import HTML/CSS/JS generators
const { generateStyles } = require('./styles/styleGenerator');
const { generateScripts } = require('./scripts/scriptGenerator');
const { generateGameTab } = require('./templates/gameTab');
const { generateBattleTab } = require('./templates/battleTab');
const { generateUpgradeTab } = require('./templates/upgradeTab');
const { generateLotteryTab } = require('./templates/lotteryTab');
const { generateAchievementTab } = require('./templates/achievementTab');
const { generateSettingsTab } = require('./templates/settingsTab');

class WebviewManager {
  constructor(context) {
    this.context = context;
    this.view = undefined;
    this.eventBus = getEventBus();
    this.resourceManager = getResourceManager();
    this.logger = getLogger().child('WebviewManager');
    this.updateTimer = null;
    this.configChangeListener = null;
  }

  /**
   * Resolve and initialize the webview
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true
    };

    // Generate and set HTML content
    webviewView.webview.html = this.generateHtmlContent();

    // Setup message handlers
    this.setupMessageHandlers(webviewView);

    // Setup configuration listener
    this.setupConfigListener();

    // Setup update timer
    this.setupUpdateTimer();

    // Setup disposal
    webviewView.onDidDispose(() => {
      this.dispose();
    });

    this.logger.info('Webview initialized');
  }

  /**
   * Setup message handlers for webview communication
   * @param {vscode.WebviewView} webviewView
   */
  setupMessageHandlers(webviewView) {
    const messageHandler = webviewView.webview.onDidReceiveMessage(message => {
      this.handleMessage(message);
    });

    this.resourceManager.registerListener(
      'webview-messages',
      () => messageHandler.dispose(),
      'Webview message handler'
    );
  }

  /**
   * Handle messages from webview
   * @param {Object} message
   */
  handleMessage(message) {
    const gameState = getGameState();

    try {
      switch (message.command) {
        case 'clickCoin':
          this.handleClickCoin(gameState);
          break;

        case 'buyUpgrade':
          this.handleBuyUpgrade(gameState, message.upgradeKey);
          break;

        case 'showSaveInfo':
          showSaveInfo(this.context);
          break;

        case 'backupSave':
          backupGameSave(this.context);
          break;

        case 'lottery':
          this.handleLottery(gameState);
          break;

        case 'resetGame':
          this.handleResetGame();
          break;

        case 'toggleRipple':
          this.handleToggleRipple();
          break;

        case 'updateRippleSize':
          this.handleUpdateRippleSize(message.size);
          break;

        case 'toggleCodeEffect':
          this.handleToggleCodeEffect();
          break;

        case 'toggleCategory':
          this.handleToggleCategory(message.category);
          break;

        case 'editCategory':
          this.handleEditCategory(message.category);
          break;

        case 'battle_start':
          this.handleBattleStart(gameState, message.wave);
          break;

        case 'battle_stop':
          this.handleBattleStop();
          break;

        case 'battle_reset':
          this.handleBattleReset();
          break;

        case 'battle_upgrade':
          this.handleBattleUpgrade(gameState, message.attribute, message.cost);
          break;

        case 'battle_nextWave':
          this.handleBattleNextWave(gameState);
          break;

        default:
          this.logger.warn('Unknown command:', message.command);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
    }
  }

  /**
   * Handle click coin command
   */
  handleClickCoin(gameState) {
    gameState.coins += 1;
    gameState.totalCoinsEarned += 1;
    checkAchievements();
    saveGameState(this.context);
    this.eventBus.emit('coins:earned', { amount: 1, source: 'click' });
  }

  /**
   * Handle buy upgrade command
   */
  handleBuyUpgrade(gameState, upgradeKey) {
    const upgrade = gameState.upgrades[upgradeKey];
    if (!upgrade) return;

    const cost = Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
    if (gameState.coins >= cost) {
      gameState.coins -= cost;
      upgrade.count++;
      gameState.coinsPerSecond = calculateCoinsPerSecond();
      checkAchievements();
      saveGameState(this.context);

      // Send immediate update
      this.postMessage('upgradeSuccess', {
        upgradeKey,
        newCount: upgrade.count,
        newProduction: upgrade.count * upgrade.production
      });

      this.eventBus.emit('upgrade:purchased', { upgradeKey, cost });
    }
  }

  /**
   * Handle lottery command
   */
  handleLottery(gameState) {
    const lotteryPrices = getLotteryPrices();
    
    if (gameState.coins >= lotteryPrices.normal) {
      gameState.coins -= lotteryPrices.normal;
      const prize = drawPrize();

      // Delay prize grant to match animation
      setTimeout(() => {
        grantPrize(prize, this.context);
      }, 4000);
    } else {
      vscode.window.showWarningMessage('金币不足，无法抽奖！');
    }
    
    saveGameState(this.context);
  }

  /**
   * Handle reset game command
   */
  handleResetGame() {
    const { resetGameState } = require('../../game/gameState');
    resetGameState();
    resetAchievements();
    this.refresh();
    saveGameState(this.context);
    this.eventBus.emit('game:reset');
  }

  /**
   * Handle toggle ripple effect
   */
  handleToggleRipple() {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const currentValue = config.get('enableRippleEffect', false);
    config.update('enableRippleEffect', !currentValue, true).then(() => {
      vscode.window.showInformationMessage(`波纹特效已${!currentValue ? '启用' : '禁用'}`);
    });
  }

  /**
   * Handle update ripple size
   */
  handleUpdateRippleSize(size) {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    config.update('rippleSize', size, true);
  }

  /**
   * Handle toggle code effect
   */
  handleToggleCodeEffect() {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const currentValue = config.get('enableCodeEffect', false);
    config.update('enableCodeEffect', !currentValue, true).then(() => {
      vscode.window.showInformationMessage(`💥 编码特效已${!currentValue ? '启用' : '禁用'}`);
    });
  }

  /**
   * Handle toggle category
   */
  handleToggleCategory(category) {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const categories = config.get('keywordCategories', {});

    if (categories[category]) {
      categories[category].enabled = !categories[category].enabled;
      const newStatus = categories[category].enabled;
      
      config.update('keywordCategories', categories, true).then(() => {
        const statusText = newStatus ? '启用' : '禁用';
        vscode.window.showInformationMessage(`✨ ${category} 特效已${statusText}`);
        
        // Send update to webview
        this.postMessage('categoryToggled', {
          category,
          enabled: newStatus
        });
      });
    }
  }

  /**
   * Handle edit category
   */
  async handleEditCategory(category) {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const categories = config.get('keywordCategories', {});

    if (!categories[category]) {
      vscode.window.showErrorMessage(`类别 ${category} 不存在`);
      return;
    }

    const categoryData = categories[category];
    const categoryNames = {
      'functions': '函数',
      'classes': '类',
      'loops': '循环',
      'conditions': '条件',
      'variables': '变量',
      'returns': '返回'
    };

    // Step 1: Edit keywords
    const keywordsStr = categoryData.keywords.join(', ');
    const newKeywords = await vscode.window.showInputBox({
      prompt: `编辑【${categoryNames[category] || category}】的关键词（用逗号分隔）`,
      value: keywordsStr,
      placeHolder: '例如: function, func, def'
    });

    if (newKeywords === undefined) return;

    // Step 2: Edit symbols
    const symbolsStr = categoryData.symbols.join(', ');
    const newSymbols = await vscode.window.showInputBox({
      prompt: `编辑【${categoryNames[category] || category}】的特效符号（用逗号分隔）`,
      value: symbolsStr,
      placeHolder: '例如: 💥, 🔥, ⚡, ✨'
    });

    if (newSymbols === undefined) return;

    // Update configuration
    const updatedKeywords = newKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const updatedSymbols = newSymbols.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (updatedKeywords.length === 0) {
      vscode.window.showWarningMessage('关键词不能为空！');
      return;
    }

    if (updatedSymbols.length === 0) {
      vscode.window.showWarningMessage('符号不能为空！');
      return;
    }

    categories[category].keywords = updatedKeywords;
    categories[category].symbols = updatedSymbols;

    await config.update('keywordCategories', categories, true);
    vscode.window.showInformationMessage(`✅ 已更新【${categoryNames[category] || category}】配置`);

    // Send update to webview
    this.postMessage('categoryUpdated', {
      category,
      keywords: updatedKeywords,
      symbols: updatedSymbols
    });
  }

  /**
   * Handle battle start
   */
  handleBattleStart(gameState, wave) {
    const battleSystem = getBattleSystem();
    const savedStats = gameState.battle.playerStats;
    
    battleSystem.initPlayer(savedStats);
    battleSystem.gold = gameState.battle.gold;
    battleSystem.experience = gameState.battle.experience;
    battleSystem.playerLevel = gameState.battle.playerLevel;
    battleSystem.wave = wave || gameState.battle.wave;
    battleSystem.startWave(battleSystem.wave);

    this.eventBus.emit('battle:started', { wave: battleSystem.wave });
  }

  /**
   * Handle battle stop
   */
  handleBattleStop() {
    const battleSystem = getBattleSystem();
    battleSystem.isInBattle = false;
    battleSystem.stopBattleLoop();
    this.eventBus.emit('battle:stopped');
  }

  /**
   * Handle battle reset
   */
  handleBattleReset() {
    const battleSystem = getBattleSystem();
    battleSystem.resetPlayer();
    this.eventBus.emit('battle:reset');
  }

  /**
   * Handle battle upgrade
   */
  handleBattleUpgrade(gameState, attribute, cost) {
    const battleSystem = getBattleSystem();
    const success = battleSystem.upgradeAttribute(attribute, cost);
    
    if (success) {
      gameState.battle.gold = battleSystem.gold;
      gameState.battle.playerStats = {
        health: battleSystem.player.maxHealth,
        attack: battleSystem.player.attack,
        defense: battleSystem.player.defense,
        critRate: battleSystem.player.critRate,
        critDamage: battleSystem.player.critDamage,
        healthRegen: battleSystem.player.healthRegen
      };
      saveGameState(this.context);
      this.eventBus.emit('battle:upgraded', { attribute, cost });
    }
  }

  /**
   * Handle battle next wave
   */
  handleBattleNextWave(gameState) {
    const battleSystem = getBattleSystem();
    battleSystem.wave++;
    gameState.battle.wave = battleSystem.wave;
    battleSystem.resetPlayer();
    battleSystem.startWave(battleSystem.wave);
    saveGameState(this.context);
    this.eventBus.emit('battle:nextWave', { wave: battleSystem.wave });
  }

  /**
   * Setup configuration change listener
   */
  setupConfigListener() {
    this.configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
      const updates = {};

      if (e.affectsConfiguration('funny-vscode-extension.enableRippleEffect')) {
        updates.rippleEnabled = vscode.workspace.getConfiguration('funny-vscode-extension')
          .get('enableRippleEffect', false);
      }

      if (e.affectsConfiguration('funny-vscode-extension.rippleSize')) {
        updates.rippleSize = vscode.workspace.getConfiguration('funny-vscode-extension')
          .get('rippleSize', 100);
      }

      if (e.affectsConfiguration('funny-vscode-extension.enableCodeEffect')) {
        updates.codeEffectEnabled = vscode.workspace.getConfiguration('funny-vscode-extension')
          .get('enableCodeEffect', false);
      }

      if (Object.keys(updates).length > 0) {
        this.postMessage('configChanged', updates);
      }
    });

    this.resourceManager.registerListener(
      'webview-config',
      () => this.configChangeListener.dispose(),
      'Webview config listener'
    );
  }

  /**
   * Setup update timer for periodic state updates
   */
  setupUpdateTimer() {
    this.updateTimer = this.resourceManager.registerTimer(
      () => this.sendStateUpdate(),
      1000,
      true,
      'Webview state update'
    );
  }

  /**
   * Send state update to webview
   */
  sendStateUpdate() {
    if (!this.view) return;

    const gameState = getGameState();
    const battleSystem = getBattleSystem();

    this.postMessage('updateGameState', {
      coins: gameState.coins,
      coinsPerSecond: gameState.coinsPerSecond,
      totalCoinsEarned: gameState.totalCoinsEarned,
      achievements: gameState.achievements,
      startTime: gameState.startTime,
      activeBoosts: gameState.activeBoosts,
      upgrades: gameState.upgrades,
      battleState: battleSystem.getBattleState()
    });

    // Update saved battle state
    if (battleSystem.player) {
      gameState.battle.gold = battleSystem.gold;
      gameState.battle.experience = battleSystem.experience;
      gameState.battle.playerLevel = battleSystem.playerLevel;
      gameState.battle.wave = battleSystem.wave;
    }
  }

  /**
   * Post message to webview
   * @param {string} command
   * @param {any} data
   */
  postMessage(command, data) {
    if (this.view) {
      this.view.webview.postMessage({ command, ...data });
    }
  }

  /**
   * Refresh webview content
   */
  refresh() {
    if (this.view) {
      this.view.webview.html = this.generateHtmlContent();
      this.logger.info('Webview refreshed');
    }
  }

  /**
   * Generate complete HTML content
   * @returns {string} HTML content
   */
  generateHtmlContent() {
    const gameState = getGameState();
    const achievements = getAchievements();
    const lotteryPrizes = getLotteryPrizes();
    const lotteryPrices = getLotteryPrices();

    // Get configuration
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const rippleEnabled = config.get('enableRippleEffect', false);
    const rippleSize = config.get('rippleSize', 100);
    const codeEffectEnabled = config.get('enableCodeEffect', false);
    const keywordCategories = config.get('keywordCategories', {});

    // Generate content sections
    const styles = generateStyles();
    const homeTab = generateGameTab(gameState);
    const battleTab = generateBattleTab(gameState);
    const upgradeTab = generateUpgradeTab(gameState);
    const lotteryTab = generateLotteryTab(gameState, lotteryPrizes, lotteryPrices);
    const achievementTab = generateAchievementTab(achievements);
    const settingsTab = generateSettingsTab(rippleEnabled, rippleSize, codeEffectEnabled, keywordCategories);
    const scripts = generateScripts(rippleEnabled, rippleSize, codeEffectEnabled, lotteryPrices);

    // Combine into full HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${styles}
      </head>
      <body>
        <!-- 标签导航 -->
        <div class="tabs-container">
          <button class="tab active" onclick="switchTab(event, 'home')">🏠 首页</button>
          <button class="tab" onclick="switchTab(event, 'battle')">⚔️ 战斗</button>
          <button class="tab" onclick="switchTab(event, 'upgrade')">🏭 升级</button>
          <button class="tab" onclick="switchTab(event, 'lottery')">🎰 抽奖</button>
          <button class="tab" onclick="switchTab(event, 'achievement')">🏆 成就</button>
          <button class="tab" onclick="switchTab(event, 'settings')">⚙️ 设置</button>
        </div>

        ${homeTab}
        ${battleTab}
        ${upgradeTab}
        ${lotteryTab}
        ${achievementTab}
        ${settingsTab}

        ${scripts}
      </body>
      </html>
    `;
  }

  /**
   * Dispose and cleanup
   */
  dispose() {
    if (this.updateTimer !== null) {
      this.resourceManager.clearTimer(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.configChangeListener) {
      this.resourceManager.unregisterListener('webview-config');
      this.configChangeListener = null;
    }

    this.resourceManager.unregisterListener('webview-messages');

    this.logger.info('Webview disposed');
  }
}

module.exports = WebviewManager;
