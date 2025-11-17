// Webview 视图提供者模块
const vscode = require('vscode');
const { getGameState, calculateCoinsPerSecond, formatNumber } = require('../game/gameState');
const { getAchievements, checkAchievements, resetAchievements } = require('../game/achievements');
const { getLotteryPrizes, getLotteryPrices, drawPrize, grantPrize } = require('../game/lottery');
const { saveGameState, showSaveInfo, backupGameSave } = require('../game/storage');
const { getBattleSystem } = require('../game/battleSystem');

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
      if (e.affectsConfiguration('funny-vscode-extension.enableCodeEffect')) {
        const codeEffectEnabled = vscode.workspace.getConfiguration('funny-vscode-extension').get('enableCodeEffect', false);
        if (this._view) {
          this._view.webview.postMessage({
            command: 'configChanged',
            codeEffectEnabled: codeEffectEnabled
          });
        }
      }
      if (e.affectsConfiguration('funny-vscode-extension.enableKeywordEffect')) {
        const keywordEffectEnabled = vscode.workspace.getConfiguration('funny-vscode-extension').get('enableKeywordEffect', true);
        if (this._view) {
          this._view.webview.postMessage({
            command: 'configChanged',
            keywordEffectEnabled: keywordEffectEnabled
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

          case 'toggleCodeEffect':
            const codeConfig = vscode.workspace.getConfiguration('funny-vscode-extension');
            const currentCodeValue = codeConfig.get('enableCodeEffect', false);
            codeConfig.update('enableCodeEffect', !currentCodeValue, true).then(() => {
              vscode.window.showInformationMessage(`💥 编码特效已${!currentCodeValue ? '启用' : '禁用'}`);
            });
            break;

          case 'toggleCategory':
            // 切换特定类别的启用状态
            const categoryConfig = vscode.workspace.getConfiguration('funny-vscode-extension');
            const categories = categoryConfig.get('keywordCategories', {});
            const category = message.category;

            if (categories[category]) {
              categories[category].enabled = !categories[category].enabled;
              const newStatus = categories[category].enabled;
              categoryConfig.update('keywordCategories', categories, true).then(() => {
                const statusText = newStatus ? '启用' : '禁用';
                vscode.window.showInformationMessage(`✨ ${category} 特效已${statusText}`);
                // 发送消息给前端，动态更新按钮状态（不刷新整个页面）
                if (this._view) {
                  this._view.webview.postMessage({
                    command: 'categoryToggled',
                    category: category,
                    enabled: newStatus
                  });
                }
              });
            }
            break;

          case 'editCategory':
            // 打开编辑对话框
            this._editCategoryDialog(message.category);
            break;

          case 'battle_start':
            // 开始战斗
            const battleSystem = getBattleSystem();
            const savedStats = gameState.battle.playerStats;
            battleSystem.initPlayer(savedStats);
            battleSystem.gold = gameState.battle.gold;
            battleSystem.experience = gameState.battle.experience;
            battleSystem.playerLevel = gameState.battle.playerLevel;
            battleSystem.wave = message.wave || gameState.battle.wave;
            battleSystem.startWave(battleSystem.wave);
            break;

          case 'battle_stop':
            // 停止战斗
            const bs = getBattleSystem();
            bs.isInBattle = false;
            bs.stopBattleLoop();
            break;

          case 'battle_reset':
            // 重置战斗
            const bsReset = getBattleSystem();
            bsReset.resetPlayer();
            break;

          case 'battle_upgrade':
            // 升级属性
            const bsUpgrade = getBattleSystem();
            const success = bsUpgrade.upgradeAttribute(message.attribute, message.cost);
            if (success) {
              // 保存升级后的状态
              gameState.battle.gold = bsUpgrade.gold;
              gameState.battle.playerStats = {
                health: bsUpgrade.player.maxHealth,
                attack: bsUpgrade.player.attack,
                defense: bsUpgrade.player.defense,
                critRate: bsUpgrade.player.critRate,
                critDamage: bsUpgrade.player.critDamage,
                healthRegen: bsUpgrade.player.healthRegen
              };
              saveGameState(this._context);
            }
            break;

          case 'battle_nextWave':
            // 下一波
            const bsNext = getBattleSystem();
            bsNext.wave++;
            gameState.battle.wave = bsNext.wave;
            bsNext.resetPlayer();
            bsNext.startWave(bsNext.wave);
            saveGameState(this._context);
            break;

          case 'pomodoro_start':
            vscode.commands.executeCommand('funny-vscode-extension.togglePomodoro');
            break;

          case 'pomodoro_pause':
            vscode.commands.executeCommand('funny-vscode-extension.togglePomodoro');
            break;

          case 'pomodoro_stop':
            vscode.commands.executeCommand('funny-vscode-extension.stopPomodoro');
            break;

          case 'pomodoro_break':
            vscode.commands.executeCommand('funny-vscode-extension.startPomodoroBreak');
            break;

          case 'openTranslationSettings':
            // 打开翻译设置面板
            vscode.commands.executeCommand('funny-vscode-extension.openTranslationSettings');
            break;

          case 'testTranslation':
            // 测试翻译功能
            const { getTranslationService } = require('../translation/translationService');
            const translationService = getTranslationService();
            translationService.translate('测试', 'zh', 'en').then(result => {
              if (result.error) {
                vscode.window.showErrorMessage(`翻译测试失败: ${result.error}`);
              } else {
                vscode.window.showInformationMessage(`✅ 翻译测试成功！"测试" → "${result.text}"`);
              }
            });
            break;

          case 'openBaiduDoc':
            // 打开百度翻译文档
            vscode.env.openExternal(vscode.Uri.parse('https://fanyi-api.baidu.com/doc/21'));
            break;
        }
      }
    );

    // 每秒发送数据更新（不刷新HTML）
    const updateTimer = setInterval(() => {
      if (this._view) {
        const gameState = getGameState();
        const battleSystem = getBattleSystem();
        const { getPomodoroTimer } = require('../productivity/pomodoroTimer');
        const pomodoroTimer = getPomodoroTimer();

        this._view.webview.postMessage({
          command: 'updateGameState',
          data: {
            coins: gameState.coins,
            coinsPerSecond: gameState.coinsPerSecond,
            totalCoinsEarned: gameState.totalCoinsEarned,
            achievements: gameState.achievements,
            startTime: gameState.startTime,
            activeBoosts: gameState.activeBoosts,
            upgrades: gameState.upgrades,
            pomodoroState: pomodoroTimer ? pomodoroTimer.getState() : null,
            battleState: battleSystem.getBattleState()
          }
        });

        // 更新保存的战斗状态
        if (battleSystem.player) {
          gameState.battle.gold = battleSystem.gold;
          gameState.battle.experience = battleSystem.experience;
          gameState.battle.playerLevel = battleSystem.playerLevel;
          gameState.battle.wave = battleSystem.wave;
        }
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

  /**
   * 编辑类别配置的对话框
   */
  async _editCategoryDialog(category) {
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

    // 步骤1: 编辑关键词
    const keywordsStr = categoryData.keywords.join(', ');
    const newKeywords = await vscode.window.showInputBox({
      prompt: `编辑【${categoryNames[category] || category}】的关键词（用逗号分隔）`,
      value: keywordsStr,
      placeHolder: '例如: function, func, def'
    });

    if (newKeywords === undefined) {
      return; // 用户取消
    }

    // 步骤2: 编辑符号
    const symbolsStr = categoryData.symbols.join(', ');
    const newSymbols = await vscode.window.showInputBox({
      prompt: `编辑【${categoryNames[category] || category}】的特效符号（用逗号分隔）`,
      value: symbolsStr,
      placeHolder: '例如: 💥, 🔥, ⚡, ✨'
    });

    if (newSymbols === undefined) {
      return; // 用户取消
    }

    // 更新配置
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

    // 更新配置
    categories[category].keywords = updatedKeywords;
    categories[category].symbols = updatedSymbols;

    await config.update('keywordCategories', categories, true);
    vscode.window.showInformationMessage(`✅ 已更新【${categoryNames[category] || category}】配置`);

    // 发送消息给前端，动态更新显示（不刷新整个页面）
    if (this._view) {
      this._view.webview.postMessage({
        command: 'categoryUpdated',
        category: category,
        keywords: updatedKeywords,
        symbols: updatedSymbols
      });
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

    // 读取编码特效配置
    const codeEffectEnabled = vscode.workspace.getConfiguration('funny-vscode-extension').get('enableCodeEffect', false);
    const keywordCategories = vscode.workspace.getConfiguration('funny-vscode-extension').get('keywordCategories', {});

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

          /* 设置按钮样式 */
          .settings-icon {
            font-size: 16px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s, transform 0.2s;
            user-select: none;
          }
          .settings-icon:hover {
            opacity: 1;
            transform: rotate(30deg);
          }

          /* 配置面板样式 - 覆盖式 */
          .config-panel {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--vscode-editor-background);
            z-index: 1000;
            display: none;
            overflow-y: auto;
            padding: 16px;
          }
          .config-panel.visible {
            display: block;
            animation: slideIn 0.2s ease-out;
          }
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .config-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .config-title {
            font-size: 14px;
            font-weight: bold;
          }
          .close-btn {
            font-size: 20px;
            cursor: pointer;
            opacity: 0.7;
            transition: opacity 0.2s;
            user-select: none;
            line-height: 1;
          }
          .close-btn:hover {
            opacity: 1;
          }
          .config-category {
            margin-bottom: 14px;
            padding: 10px;
            background: var(--vscode-input-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-focusBorder);
          }
          .config-category-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .config-keywords {
            font-size: 10px;
            opacity: 0.8;
            line-height: 1.8;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .keyword-tag {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            padding: 3px 8px;
            border-radius: 3px;
            font-family: monospace;
            transition: transform 0.1s;
          }
          .keyword-tag:hover {
            transform: scale(1.05);
          }
          .config-toggle {
            font-size: 10px;
            padding: 3px 8px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            margin-left: auto;
          }
          .config-toggle:hover {
            background: var(--vscode-button-hoverBackground);
          }
          .category-controls {
            display: flex;
            gap: 6px;
            align-items: center;
            margin-top: 8px;
          }
          .toggle-switch {
            font-size: 9px;
            padding: 4px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .toggle-switch.enabled {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          .toggle-switch:hover {
            opacity: 0.8;
          }
          .edit-btn {
            font-size: 9px;
            padding: 4px 10px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }
          .edit-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
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

          /* 首页紧凑布局样式 */
          .stats-compact {
            background: var(--vscode-input-background);
            padding: 8px 10px;
            margin-bottom: 8px;
            border-radius: 4px;
            border-left: 3px solid #FFD700;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
          .stat-group {
            display: flex;
            flex-direction: column;
            gap: 3px;
          }
          .coins-compact {
            font-size: 16px;
            font-weight: bold;
            color: #FFD700;
          }
          .rate-compact {
            font-size: 11px;
            color: #7CFC00;
          }
          .battle-gold-compact {
            font-size: 11px;
            color: #ff6b6b;
            font-weight: bold;
          }
          .battle-level-compact {
            font-size: 11px;
            color: #4dabf7;
            font-weight: bold;
          }

          /* 首页战斗区域 */
          .home-battle-section {
            background: var(--vscode-input-background);
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
          }
          .battle-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          .battle-wave-info {
            flex: 1;
            font-size: 12px;
            font-weight: bold;
          }
          .quick-btn {
            padding: 4px 8px;
            font-size: 11px;
            font-weight: bold;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 32px;
          }
          .quick-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .quick-btn.start {
            background: #4CAF50;
            color: white;
          }
          .quick-btn.stop {
            background: #ff9800;
            color: white;
          }
          .quick-btn.next {
            background: #2196F3;
            color: white;
          }
          .quick-btn:hover:not(:disabled) {
            transform: scale(1.05);
          }

          .battlefield-home {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 8px 0;
            background: #1a1a2e;
            border-radius: 4px;
            padding: 6px;
          }

          .player-stats-compact {
            background: rgba(0, 0, 0, 0.2);
            padding: 8px;
            border-radius: 4px;
            margin: 8px 0;
          }
          .stat-bar-compact {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
            font-size: 10px;
          }
          .stat-label-compact {
            font-size: 12px;
            min-width: 20px;
          }
          .progress-bar-compact {
            flex: 1;
            height: 12px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid var(--vscode-panel-border);
          }
          .stat-value-compact {
            min-width: 50px;
            text-align: right;
            font-weight: bold;
            font-size: 9px;
          }
          .stat-row-compact {
            display: flex;
            justify-content: space-around;
            font-size: 9px;
            opacity: 0.9;
          }

          .quick-actions {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            margin-top: 8px;
          }
          .action-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px;
            font-size: 10px;
            font-weight: bold;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .action-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
          }

          /* 战斗系统样式 */
          .battlefield {
            background: var(--vscode-input-background);
            border-radius: 4px;
            padding: 8px;
            margin: 10px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 250px;
          }
          #battleCanvas {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            background: #1a1a2e;
            max-width: 100%;
            height: auto;
          }
          .battle-controls {
            display: flex;
            gap: 6px;
            margin: 10px 0;
          }
          .battle-btn {
            flex: 1;
            padding: 8px;
            font-size: 11px;
            font-weight: bold;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .battle-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .battle-btn.start {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
          }
          .battle-btn.start:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
          }
          .battle-btn.stop {
            background: linear-gradient(135deg, #ff9800 0%, #e68900 100%);
            color: white;
          }
          .battle-btn.next {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
          }
          .player-stats {
            background: var(--vscode-input-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          }
          .stat-title {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid var(--vscode-panel-border);
            opacity: 0.9;
          }
          .stat-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
            font-size: 10px;
          }
          .stat-label {
            min-width: 60px;
            font-weight: bold;
          }
          .progress-bar {
            flex: 1;
            height: 16px;
            background: var(--vscode-editor-background);
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--vscode-panel-border);
          }
          .progress {
            height: 100%;
            transition: width 0.3s;
            border-radius: 8px;
          }
          .stat-value {
            min-width: 60px;
            text-align: right;
            font-weight: bold;
          }
          .stat-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin: 4px 0;
            opacity: 0.9;
          }
          .upgrade-section {
            background: var(--vscode-input-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
          }
          .upgrade-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-top: 8px;
          }
          .upgrade-item {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 10px;
          }
          .upgrade-item:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-2px);
          }
          .upgrade-item:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .upgrade-name {
            font-weight: bold;
            margin-bottom: 3px;
          }
          .upgrade-cost {
            opacity: 0.8;
          }
          .battle-log {
            background: var(--vscode-input-background);
            padding: 10px;
            border-radius: 4px;
            margin: 10px 0;
            max-height: 150px;
          }
          .log-content {
            max-height: 120px;
            overflow-y: auto;
            font-size: 9px;
            font-family: monospace;
          }
          .log-entry {
            padding: 2px 0;
            opacity: 0.9;
            border-bottom: 1px solid rgba(128, 128, 128, 0.1);
          }
          .log-entry.damage {
            color: #ff6b6b;
          }
          .log-entry.crit {
            color: #ffd700;
            font-weight: bold;
          }
          .log-entry.victory {
            color: #51cf66;
            font-weight: bold;
          }
          .log-entry.defeat {
            color: #ff6b6b;
            font-weight: bold;
          }
          .log-empty {
            text-align: center;
            opacity: 0.5;
            padding: 20px 0;
          }

          /* 番茄钟样式 */
          .pomodoro-main {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 0;
          }
          .pomodoro-timer-display {
            margin-bottom: 20px;
          }
          .timer-circle {
            position: relative;
            width: 200px;
            height: 200px;
          }
          .timer-svg {
            transform: rotate(-90deg);
          }
          .timer-bg {
            fill: none;
            stroke: var(--vscode-input-background);
            stroke-width: 8;
          }
          .timer-progress {
            fill: none;
            stroke: #FFD700;
            stroke-width: 8;
            stroke-linecap: round;
            stroke-dasharray: 565.48;
            stroke-dashoffset: 0;
            transition: stroke-dashoffset 1s linear;
          }
          .timer-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }
          .timer-time {
            font-size: 36px;
            font-weight: bold;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
          }
          .timer-label {
            font-size: 14px;
            opacity: 0.7;
          }
          .pomodoro-controls {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 20px;
          }
          .pomodoro-btn {
            padding: 10px 20px;
            font-size: 13px;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .pomodoro-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .pomodoro-btn.start {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
          }
          .pomodoro-btn.pause {
            background: linear-gradient(135deg, #ff9800 0%, #e68900 100%);
            color: white;
          }
          .pomodoro-btn.stop {
            background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
            color: white;
          }
          .pomodoro-btn.break {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
          }
          .pomodoro-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }
          .pomodoro-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .stat-card {
            background: var(--vscode-input-background);
            padding: 15px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .stat-icon {
            font-size: 28px;
          }
          .stat-info {
            flex: 1;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #FFD700;
          }
          .stat-name {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 4px;
          }
          .pomodoro-info {
            background: var(--vscode-input-background);
            padding: 15px;
            border-radius: 8px;
            border-left: 3px solid #FFD700;
          }
          .info-title {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .info-content p {
            font-size: 11px;
            margin: 6px 0;
            opacity: 0.9;
          }
          @media (max-width: 400px) {
            .pomodoro-stats {
              grid-template-columns: 1fr;
            }
            .timer-circle {
              width: 160px;
              height: 160px;
            }
            .timer-time {
              font-size: 28px;
            }
          }

          /* 紧凑模式 */
          body.compact-mode {
            padding: 4px;
            font-size: 10px;
          }
          body.compact-mode .tabs-container {
            padding: 0 4px;
            margin: -4px -4px 4px -4px;
          }
          body.compact-mode .tab {
            padding: 4px 8px;
            font-size: 9px;
          }
          body.compact-mode .stats-compact {
            padding: 4px 6px;
            margin-bottom: 4px;
          }
          body.compact-mode .coins-compact {
            font-size: 12px;
          }
          body.compact-mode .rate-compact,
          body.compact-mode .battle-gold-compact,
          body.compact-mode .battle-level-compact {
            font-size: 9px;
          }
          body.compact-mode .section {
            margin-bottom: 6px;
          }
          body.compact-mode .title {
            font-size: 9px;
            margin-bottom: 4px;
          }
          body.compact-mode .item {
            padding: 4px;
            margin-bottom: 4px;
          }
          body.compact-mode .item-name {
            font-size: 9px;
          }
          body.compact-mode .btn {
            padding: 2px;
            font-size: 8px;
          }
          body.compact-mode .pomodoro-timer-display {
            margin-bottom: 10px;
          }
          body.compact-mode .timer-circle {
            width: 120px;
            height: 120px;
          }
          body.compact-mode .timer-time {
            font-size: 20px;
          }
          body.compact-mode .timer-label {
            font-size: 10px;
          }
          body.compact-mode .pomodoro-btn {
            padding: 6px 12px;
            font-size: 10px;
          }
          body.compact-mode .stat-card {
            padding: 8px;
          }
          body.compact-mode .stat-icon {
            font-size: 20px;
          }
          body.compact-mode .stat-value {
            font-size: 16px;
          }
          body.compact-mode .stat-name {
            font-size: 9px;
          }

          /* 隐蔽模式 - 低调配色 */
          body.stealth-mode {
            background: #1e1e1e;
          }
          body.stealth-mode .stats-compact,
          body.stealth-mode .item,
          body.stealth-mode .stat-card,
          body.stealth-mode .pomodoro-info {
            background: #252526;
            border-left-color: #3e3e42;
          }
          body.stealth-mode .coins-compact,
          body.stealth-mode .stat-value {
            color: #cccccc;
          }
          body.stealth-mode .rate-compact {
            color: #b5cea8;
          }
          body.stealth-mode .timer-progress {
            stroke: #6a9955;
          }
          body.stealth-mode .pomodoro-btn.start {
            background: linear-gradient(135deg, #4e7a4e 0%, #3d5f3d 100%);
          }
          body.stealth-mode .pomodoro-btn.pause {
            background: linear-gradient(135deg, #8b6914 0%, #6b5010 100%);
          }
          body.stealth-mode .pomodoro-btn.stop {
            background: linear-gradient(135deg, #7a4e4e 0%, #5f3d3d 100%);
          }
          body.stealth-mode .pomodoro-btn.break {
            background: linear-gradient(135deg, #4e6a7a 0%, #3d5260 100%);
          }
        </style>
      </head>
      <body>
        <!-- 标签导航 -->
        <div class="tabs-container">
          <button class="tab active" onclick="switchTab(event, 'home')">🏠 首页</button>
          <button class="tab" onclick="switchTab(event, 'pomodoro')">🍅 番茄钟</button>
          <button class="tab" onclick="switchTab(event, 'battle')">⚔️ 战斗</button>
          <button class="tab" onclick="switchTab(event, 'upgrade')">🏭 升级</button>
          <button class="tab" onclick="switchTab(event, 'lottery')">🎰 抽奖</button>
          <button class="tab" onclick="switchTab(event, 'achievement')">🏆 成就</button>
          <button class="tab" onclick="switchTab(event, 'settings')">⚙️ 设置</button>
        </div>

        <!-- 首页标签 -->
        <div class="tab-content active" id="tab-home">
          <!-- 顶部金币信息栏 -->
          <div class="stats-compact">
            <div class="stat-group">
              <div class="coins-compact">💰 ${formatNumber(gameState.coins)}</div>
              <div class="rate-compact">⚡ +${formatNumber(gameState.coinsPerSecond)}/s</div>
            </div>
            <div class="stat-group">
              <div class="battle-gold-compact">⚔️ ${gameState.battle.gold} 金币</div>
              <div class="battle-level-compact">👤 Lv.${gameState.battle.playerLevel}</div>
            </div>
          </div>

          <!-- 战斗区域 -->
          <div class="home-battle-section">
            <div class="battle-header">
              <span class="battle-wave-info">⚔️ 第 <span id="homeWave">${gameState.battle.wave}</span> 波</span>
              <button class="quick-btn start" id="homeStartBtn" onclick="startBattle()">▶️</button>
              <button class="quick-btn stop" id="homeStopBtn" onclick="stopBattle()" disabled>⏸️</button>
              <button class="quick-btn next" id="homeNextBtn" onclick="nextWave()" disabled>⏭️</button>
            </div>

            <!-- 战场画布 -->
            <div class="battlefield-home">
              <canvas id="battleCanvas" width="300" height="200"></canvas>
            </div>

            <!-- 玩家状态条 -->
            <div class="player-stats-compact">
              <div class="stat-bar-compact">
                <div class="stat-label-compact">❤️</div>
                <div class="progress-bar-compact">
                  <div class="progress" id="homePlayerHealthBar" style="width: 100%; background: #ff4444;"></div>
                </div>
                <div class="stat-value-compact" id="homePlayerHealthText">100/100</div>
              </div>
              <div class="stat-row-compact">
                <span>⚔️ <span id="homePlayerAttack">${gameState.battle.playerStats.attack}</span></span>
                <span>🛡️ <span id="homePlayerDefense">${gameState.battle.playerStats.defense}</span></span>
                <span>💥 <span id="homePlayerCritRate">${(gameState.battle.playerStats.critRate * 100).toFixed(0)}%</span></span>
              </div>
            </div>

            <!-- 快速操作 -->
            <div class="quick-actions">
              <button class="action-btn" onclick="clickCoin()">💰 点击+1</button>
              <button class="action-btn" onclick="switchTab(event, 'battle')">⚔️ 战斗详情</button>
              <button class="action-btn" onclick="switchTab(event, 'upgrade')">🏭 升级</button>
            </div>
          </div>
        </div>

        <!-- 番茄钟标签 -->
        <div class="tab-content" id="tab-pomodoro">
          <div class="section">
            <div class="title">
              <span>🍅 番茄钟工作法</span>
            </div>
            
            <!-- 番茄钟主显示 -->
            <div class="pomodoro-main">
              <div class="pomodoro-timer-display">
                <div class="timer-circle">
                  <svg class="timer-svg" viewBox="0 0 200 200">
                    <circle class="timer-bg" cx="100" cy="100" r="90"></circle>
                    <circle class="timer-progress" id="pomodoroProgress" cx="100" cy="100" r="90"></circle>
                  </svg>
                  <div class="timer-text">
                    <div class="timer-time" id="pomodoroTime">25:00</div>
                    <div class="timer-label" id="pomodoroLabel">准备开始</div>
                  </div>
                </div>
              </div>

              <!-- 控制按钮 -->
              <div class="pomodoro-controls">
                <button class="pomodoro-btn start" id="pomodoroStartBtn" onclick="startPomodoro()">
                  ▶️ 开始工作
                </button>
                <button class="pomodoro-btn pause" id="pomodoroPauseBtn" onclick="pausePomodoro()" style="display:none;">
                  ⏸️ 暂停
                </button>
                <button class="pomodoro-btn stop" id="pomodoroStopBtn" onclick="stopPomodoro()" disabled>
                  ⏹️ 停止
                </button>
                <button class="pomodoro-btn break" id="pomodoroBreakBtn" onclick="startPomodoroBreak()">
                  ☕ 开始休息
                </button>
              </div>
            </div>

            <!-- 统计信息 -->
            <div class="pomodoro-stats">
              <div class="stat-card">
                <div class="stat-icon">📅</div>
                <div class="stat-info">
                  <div class="stat-value" id="pomodoroToday">0</div>
                  <div class="stat-name">今日完成</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-info">
                  <div class="stat-value" id="pomodoroTotal">0</div>
                  <div class="stat-name">总计完成</div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-info">
                  <div class="stat-value" id="pomodoroStreak">0</div>
                  <div class="stat-name">连续完成</div>
                </div>
              </div>
            </div>

            <!-- 说明 -->
            <div class="pomodoro-info">
              <div class="info-title">💡 番茄钟工作法</div>
              <div class="info-content">
                <p>• 工作 25 分钟，专注完成任务</p>
                <p>• 休息 5 分钟，放松大脑</p>
                <p>• 每 4 个番茄钟后，休息 15 分钟</p>
                <p>• 完成工作会话获得 50 金币奖励</p>
                <p>• 完成 4 个会话额外获得 200 金币</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 战斗标签 -->
        <div class="tab-content" id="tab-battle">
          <div class="section">
            <div class="title">
              <span>⚔️ 战斗场地 - 第 <span id="currentWave">${gameState.battle.wave}</span> 波</span>
            </div>

            <!-- 战场画布 -->
            <div class="battlefield">
              <canvas id="battleCanvas" width="300" height="250"></canvas>
            </div>

            <!-- 战斗控制 -->
            <div class="battle-controls">
              <button class="battle-btn start" id="startBattleBtn" onclick="startBattle()">
                ▶️ 开始战斗
              </button>
              <button class="battle-btn stop" id="stopBattleBtn" onclick="stopBattle()" disabled>
                ⏸️ 停止
              </button>
              <button class="battle-btn next" id="nextWaveBtn" onclick="nextWave()" disabled>
                ⏭️ 下一波
              </button>
            </div>

            <!-- 玩家状态 -->
            <div class="player-stats">
              <div class="stat-title">👤 角色状态 (Lv.<span id="playerLevel">${gameState.battle.playerLevel}</span>)</div>
              <div class="stat-bar">
                <div class="stat-label">❤️ 生命值</div>
                <div class="progress-bar">
                  <div class="progress" id="playerHealthBar" style="width: 100%; background: #ff4444;"></div>
                </div>
                <div class="stat-value" id="playerHealthText">100/100</div>
              </div>
              <div class="stat-row">
                <span>⚔️ 攻击: <span id="playerAttack">${gameState.battle.playerStats.attack}</span></span>
                <span>🛡️ 防御: <span id="playerDefense">${gameState.battle.playerStats.defense}</span></span>
              </div>
              <div class="stat-row">
                <span>💥 暴击率: <span id="playerCritRate">${(gameState.battle.playerStats.critRate * 100).toFixed(0)}%</span></span>
                <span>💢 暴击伤害: <span id="playerCritDmg">${gameState.battle.playerStats.critDamage.toFixed(1)}x</span></span>
              </div>
              <div class="stat-row">
                <span>💚 生命恢复: <span id="playerRegen">${gameState.battle.playerStats.healthRegen}/s</span></span>
                <span>💰 金币: <span id="battleGold">${gameState.battle.gold}</span></span>
              </div>
            </div>

            <!-- 属性升级 -->
            <div class="upgrade-section">
              <div class="stat-title">📈 属性升级</div>
              <div class="upgrade-grid">
                <button class="upgrade-item" onclick="upgradeAttribute('health', 50)">
                  <div class="upgrade-name">❤️ 生命值 +20</div>
                  <div class="upgrade-cost">💰 50</div>
                </button>
                <button class="upgrade-item" onclick="upgradeAttribute('attack', 80)">
                  <div class="upgrade-name">⚔️ 攻击力 +5</div>
                  <div class="upgrade-cost">💰 80</div>
                </button>
                <button class="upgrade-item" onclick="upgradeAttribute('defense', 60)">
                  <div class="upgrade-name">🛡️ 防御力 +2</div>
                  <div class="upgrade-cost">💰 60</div>
                </button>
                <button class="upgrade-item" onclick="upgradeAttribute('critRate', 100)">
                  <div class="upgrade-name">💥 暴击率 +5%</div>
                  <div class="upgrade-cost">💰 100</div>
                </button>
                <button class="upgrade-item" onclick="upgradeAttribute('critDamage', 120)">
                  <div class="upgrade-name">💢 暴击伤害 +0.2x</div>
                  <div class="upgrade-cost">💰 120</div>
                </button>
                <button class="upgrade-item" onclick="upgradeAttribute('healthRegen', 70)">
                  <div class="upgrade-name">💚 生命恢复 +1/s</div>
                  <div class="upgrade-cost">💰 70</div>
                </button>
              </div>
            </div>

            <!-- 战斗日志 -->
            <div class="battle-log">
              <div class="stat-title">📜 战斗日志</div>
              <div class="log-content" id="battleLog">
                <div class="log-empty">等待战斗开始...</div>
              </div>
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
              <span>🕶️ 摸鱼模式</span>
            </div>
            <div class="item">
              <div class="item-name">紧凑显示</div>
              <div class="item-detail">缩小界面，更隐蔽更低调</div>
              <button class="btn" id="compactModeBtn" onclick="toggleCompactMode()">
                ❌ 已禁用
              </button>
            </div>
            <div class="item">
              <div class="item-name">低调配色</div>
              <div class="item-detail">使用更低调的颜色，不易被发现</div>
              <button class="btn" id="stealthModeBtn" onclick="toggleStealthMode()">
                ❌ 已禁用
              </button>
            </div>
          </div>
          <div class="section">
            <div class="title">
              <span>🎨 视觉特效</span>
            </div>
            <div class="item">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div class="item-name">🌊 波纹特效</div>
                <span class="settings-icon" onclick="toggleRippleConfigPanel(event)" title="配置">⚙️</span>
              </div>
              <div class="item-detail">点击时显示彩色波纹动画</div>
              <button class="btn" id="rippleToggleBtn" onclick="toggleRipple()">
                ${rippleEnabled ? '✅ 已启用' : '❌ 已禁用'}
              </button>
            </div>
            <div class="config-panel" id="rippleConfig">
              <div class="config-header">
                <span>波纹特效设置</span>
                <button class="close-btn" onclick="toggleRippleConfigPanel(event)">✕</button>
              </div>
              <div class="config-content">
                <div class="config-item">
                  <div class="config-item-header">
                    <span class="config-item-title">波纹大小</span>
                    <span id="rippleSizeValue">${rippleSize}px</span>
                  </div>
                  <input type="range" min="50" max="300" value="${rippleSize}" class="slider" id="sizeSlider" oninput="updateRippleSize(event, this.value)">
                </div>
              </div>
            </div>
            <div class="item" style="margin-top: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div class="item-name">💥 编码特效</div>
                <span class="settings-icon" onclick="toggleConfigPanel(event)" title="配置">⚙️</span>
              </div>
              <div class="item-detail">金币粒子 + 关键词爆炸特效（func、class等）</div>
              <button class="btn" id="codeEffectToggleBtn" onclick="toggleCodeEffect()">
                ${codeEffectEnabled ? '✅ 已启用' : '❌ 已禁用'}
              </button>
            </div>
            <div class="config-panel" id="codeEffectConfig">
              <div class="config-header">
                <div class="config-title">💥 编码特效配置</div>
                <span class="close-btn" onclick="toggleConfigPanel(event)" title="关闭">✕</span>
              </div>

              <div style="font-size: 11px; margin-bottom: 16px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px;">
                <strong>✨ 关键词特效</strong>
                <div style="margin-top: 6px; opacity: 0.8;">每个类别都可以独立开启/关闭和自定义</div>
              </div>

              ${Object.entries(keywordCategories).map(([category, config]) => {
                const categoryNames = {
                  functions: '💥 函数关键词',
                  classes: '💎 类关键词',
                  loops: '🔄 循环关键词',
                  conditions: '❓ 条件关键词',
                  variables: '📦 变量关键词',
                  returns: '↩️ 返回关键词'
                };
                const categoryName = categoryNames[category] || category;

                return `
                  <div class="config-category">
                    <div class="config-category-title">
                      <span>${categoryName}</span>
                    </div>
                    <div class="config-keywords">
                      ${(config.keywords || []).map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
                    </div>
                    <div class="config-keywords" style="margin-top: 6px;">
                      <span style="opacity: 0.6; font-size: 10px;">符号:</span>
                      ${(config.symbols || []).map(sym => `<span style="font-size: 14px; margin: 0 2px;">${sym}</span>`).join('')}
                    </div>
                    <div class="category-controls">
                      <button class="toggle-switch ${config.enabled ? 'enabled' : ''}"
                              onclick="toggleCategory(event, '${category}')"
                              data-category="${category}">
                        ${config.enabled ? '✅ 已启用' : '❌ 已禁用'}
                      </button>
                      <button class="edit-btn" onclick="editCategory(event, '${category}')">
                        ✏️ 编辑
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}

              <div style="margin-top: 16px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px; font-size: 10px; opacity: 0.7;">
                <strong>💡 提示</strong>
                <div style="margin-top: 4px;">• 点击"✏️ 编辑"可自定义关键词和符号</div>
                <div>• 输入关键词时会触发文字破碎和符号爆炸特效</div>
                <div>• 普通文字输入显示金币粒子特效</div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="title">
              <span>🌐 翻译功能</span>
            </div>
            <div class="item">
              <div class="item-name">快速翻译</div>
              <div class="item-detail">选中文字 → 右键 → 翻译（支持中英互译）</div>
              <button class="btn" onclick="openTranslationSettings()">⚙️ 配置翻译API</button>
            </div>
            <div class="item" style="margin-top: 10px;">
              <div class="item-name">变量名建议</div>
              <div class="item-detail">输入中文自动生成规范的英文变量名</div>
              <button class="btn" onclick="testTranslation()">🧪 测试翻译</button>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px; font-size: 10px; opacity: 0.8;">
              <strong>💡 使用方法</strong>
              <div style="margin-top: 6px;">
                <div>• <strong>翻译文本</strong>：选中文字 → 右键 → 🌐 翻译选中文本</div>
                <div>• <strong>变量名</strong>：选中中文 → 右键 → 💡 变量名建议</div>
                <div>• <strong>快捷键</strong>：Ctrl+Alt+T 翻译，Ctrl+Alt+V 变量名</div>
              </div>
            </div>
            <div style="margin-top: 10px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px; font-size: 10px; opacity: 0.8;">
              <strong>📖 配置说明</strong>
              <div style="margin-top: 6px;">
                <div>• 点击"配置翻译API"设置百度翻译密钥</div>
                <div>• 免费申请：<span style="color: var(--vscode-textLink-foreground); cursor: pointer;" onclick="openBaiduDoc()">百度翻译开放平台</span></div>
                <div>• 免费额度：每月 100 万字符</div>
              </div>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          let RIPPLE_ENABLED = ${rippleEnabled};
          let RIPPLE_SIZE = ${rippleSize};
          let CODE_EFFECT_ENABLED = ${codeEffectEnabled};

          // 接收来自扩展的消息
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateGameState') {
              updateUI(message.data);
              // 更新战斗UI
              if (message.data.battleState) {
                updateBattleUI(message.data.battleState);
              }
              // 更新番茄钟UI
              if (message.data.pomodoroState) {
                updatePomodoroUI(message.data.pomodoroState);
              }
            } else if (message.command === 'upgradeSuccess') {
              handleUpgradeSuccess(message);
            } else if (message.command === 'configChanged') {
              handleConfigChanged(message);
            } else if (message.command === 'categoryToggled') {
              handleCategoryToggled(message);
            } else if (message.command === 'categoryUpdated') {
              handleCategoryUpdated(message);
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

          function toggleCodeEffect() {
            vscode.postMessage({ command: 'toggleCodeEffect' });
          }

          function toggleConfigPanel(event) {
            event.stopPropagation();
            const panel = document.getElementById('codeEffectConfig');
            if (panel) {
              panel.classList.toggle('visible');
            }
          }

          function toggleRippleConfigPanel(event) {
            event.stopPropagation();
            const panel = document.getElementById('rippleConfig');
            if (panel) {
              panel.classList.toggle('visible');
            }
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

            // 更新编码特效开关状态
            if (message.codeEffectEnabled !== undefined) {
              CODE_EFFECT_ENABLED = message.codeEffectEnabled;
              const codeToggleBtn = document.getElementById('codeEffectToggleBtn');
              if (codeToggleBtn) {
                codeToggleBtn.textContent = CODE_EFFECT_ENABLED ? '✅ 已启用' : '❌ 已禁用';
              }
            }

          }

          // 处理类别开关切换
          function handleCategoryToggled(message) {
            const category = message.category;
            const enabled = message.enabled;

            // 查找对应的切换按钮
            const toggleBtn = document.querySelector('button[data-category="' + category + '"].toggle-switch');
            if (toggleBtn) {
              // 更新按钮文本和样式
              toggleBtn.textContent = enabled ? '✅ 已启用' : '❌ 已禁用';
              if (enabled) {
                toggleBtn.classList.add('enabled');
              } else {
                toggleBtn.classList.remove('enabled');
              }
            }
          }

          // 处理类别配置更新
          function handleCategoryUpdated(message) {
            const category = message.category;
            const keywords = message.keywords;
            const symbols = message.symbols;

            // 查找对应的配置类别容器
            const categoryContainer = document.querySelector('button[data-category="' + category + '"]');
            if (categoryContainer) {
              const configCategory = categoryContainer.closest('.config-category');
              if (configCategory) {
                // 更新关键词显示
                const keywordsDiv = configCategory.querySelector('.config-keywords');
                if (keywordsDiv && !keywordsDiv.textContent.includes('符号:')) {
                  keywordsDiv.innerHTML = keywords.map(function(kw) {
                    return '<span class="keyword-tag">' + kw + '</span>';
                  }).join('');
                }

                // 更新符号显示
                const allKeywordsDiv = configCategory.querySelectorAll('.config-keywords');
                if (allKeywordsDiv.length > 1) {
                  const symbolsDiv = allKeywordsDiv[1];
                  const symbolsHTML = symbols.map(function(sym) {
                    return '<span style="font-size: 14px; margin: 0 2px;">' + sym + '</span>';
                  }).join('');
                  symbolsDiv.innerHTML = '<span style="opacity: 0.6; font-size: 10px;">符号:</span>' + symbolsHTML;
                }
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

            // 如果点击的是滑动条，不创建波纹（但在配置面板其他地方允许显示）
            if (event.target.type === 'range') {
              return;
            }

            // 如果点击的是按钮或可交互元素，不创建波纹
            if (event.target.tagName === 'BUTTON' || event.target.closest('.close-btn')) {
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

          // ========== 分类特效配置管理 ==========

          // 切换分类开关
          function toggleCategory(event, category) {
            event.stopPropagation();
            vscode.postMessage({
              command: 'toggleCategory',
              category: category
            });
          }

          // 编辑分类配置
          function editCategory(event, category) {
            event.stopPropagation();
            vscode.postMessage({
              command: 'editCategory',
              category: category
            });
          }

          // ========== 番茄钟函数 ==========

          let pomodoroState = {
            isActive: false,
            isPaused: false,
            remainingSeconds: 1500,
            totalSeconds: 1500
          };

          function startPomodoro() {
            vscode.postMessage({ command: 'pomodoro_start' });
          }

          function pausePomodoro() {
            vscode.postMessage({ command: 'pomodoro_pause' });
          }

          function stopPomodoro() {
            vscode.postMessage({ command: 'pomodoro_stop' });
          }

          function startPomodoroBreak() {
            vscode.postMessage({ command: 'pomodoro_break' });
          }

          // ========== 摸鱼模式函数 ==========

          let compactMode = localStorage.getItem('compactMode') === 'true';
          let stealthMode = localStorage.getItem('stealthMode') === 'true';

          // 应用保存的模式
          if (compactMode) {
            document.body.classList.add('compact-mode');
            const btn = document.getElementById('compactModeBtn');
            if (btn) btn.textContent = '✅ 已启用';
          }
          if (stealthMode) {
            document.body.classList.add('stealth-mode');
            const btn = document.getElementById('stealthModeBtn');
            if (btn) btn.textContent = '✅ 已启用';
          }

          function toggleCompactMode() {
            compactMode = !compactMode;
            localStorage.setItem('compactMode', compactMode);
            
            if (compactMode) {
              document.body.classList.add('compact-mode');
            } else {
              document.body.classList.remove('compact-mode');
            }

            const btn = document.getElementById('compactModeBtn');
            if (btn) {
              btn.textContent = compactMode ? '✅ 已启用' : '❌ 已禁用';
            }
          }

          function toggleStealthMode() {
            stealthMode = !stealthMode;
            localStorage.setItem('stealthMode', stealthMode);
            
            if (stealthMode) {
              document.body.classList.add('stealth-mode');
            } else {
              document.body.classList.remove('stealth-mode');
            }

            const btn = document.getElementById('stealthModeBtn');
            if (btn) {
              btn.textContent = stealthMode ? '✅ 已启用' : '❌ 已禁用';
            }
          }

          // 快捷键：Ctrl+Shift+H 快速切换隐蔽模式
          document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'H') {
              toggleStealthMode();
              toggleCompactMode();
            }
          });

          function updatePomodoroUI(state) {
            if (!state) return;

            pomodoroState = state;

            // 更新时间显示
            const minutes = Math.floor(state.remainingSeconds / 60);
            const seconds = state.remainingSeconds % 60;
            const timeStr = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
            
            const timeEl = document.getElementById('pomodoroTime');
            if (timeEl) timeEl.textContent = timeStr;

            // 更新标签
            const labelEl = document.getElementById('pomodoroLabel');
            if (labelEl) {
              if (state.isActive) {
                labelEl.textContent = state.sessionType === 'work' ? '工作中' : '休息中';
              } else if (state.isPaused) {
                labelEl.textContent = '已暂停';
              } else {
                labelEl.textContent = '准备开始';
              }
            }

            // 更新进度圆环
            const progressEl = document.getElementById('pomodoroProgress');
            if (progressEl && state.totalSeconds > 0) {
              const progress = state.progress || 0;
              const circumference = 565.48;
              const offset = circumference - (progress / 100) * circumference;
              progressEl.style.strokeDashoffset = offset;
              
              // 根据类型改变颜色
              if (state.sessionType === 'work') {
                progressEl.style.stroke = '#FFD700';
              } else {
                progressEl.style.stroke = '#2196F3';
              }
            }

            // 更新按钮状态
            const startBtn = document.getElementById('pomodoroStartBtn');
            const pauseBtn = document.getElementById('pomodoroPauseBtn');
            const stopBtn = document.getElementById('pomodoroStopBtn');

            if (state.isActive) {
              if (startBtn) startBtn.style.display = 'none';
              if (pauseBtn) pauseBtn.style.display = 'inline-block';
              if (stopBtn) stopBtn.disabled = false;
            } else if (state.isPaused) {
              if (startBtn) {
                startBtn.style.display = 'inline-block';
                startBtn.textContent = '▶️ 继续';
              }
              if (pauseBtn) pauseBtn.style.display = 'none';
              if (stopBtn) stopBtn.disabled = false;
            } else {
              if (startBtn) {
                startBtn.style.display = 'inline-block';
                startBtn.textContent = '▶️ 开始工作';
              }
              if (pauseBtn) pauseBtn.style.display = 'none';
              if (stopBtn) stopBtn.disabled = true;
            }

            // 更新统计
            const todayEl = document.getElementById('pomodoroToday');
            const totalEl = document.getElementById('pomodoroTotal');
            const streakEl = document.getElementById('pomodoroStreak');

            if (todayEl) todayEl.textContent = state.completedToday || 0;
            if (totalEl) totalEl.textContent = state.completedSessions || 0;
            if (streakEl) streakEl.textContent = state.currentStreak || 0;
          }

          // ========== 战斗系统函数 ==========

          let battleCanvas = null;
          let battleCtx = null;
          let lastBattleState = null;

          // 初始化画布
          function initBattleCanvas() {
            battleCanvas = document.getElementById('battleCanvas');
            if (battleCanvas) {
              battleCtx = battleCanvas.getContext('2d');
            }
          }

          // 开始战斗
          function startBattle() {
            vscode.postMessage({ command: 'battle_start' });

            // 更新所有开始按钮
            const startBtns = ['startBattleBtn', 'homeStartBtn'];
            const stopBtns = ['stopBattleBtn', 'homeStopBtn'];
            const nextBtns = ['nextWaveBtn', 'homeNextBtn'];

            startBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = true;
            });
            stopBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = false;
            });
            nextBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = true;
            });
          }

          // 停止战斗
          function stopBattle() {
            vscode.postMessage({ command: 'battle_stop' });

            const startBtns = ['startBattleBtn', 'homeStartBtn'];
            const stopBtns = ['stopBattleBtn', 'homeStopBtn'];

            startBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = false;
            });
            stopBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = true;
            });
          }

          // 下一波
          function nextWave() {
            vscode.postMessage({ command: 'battle_nextWave' });

            const startBtns = ['startBattleBtn', 'homeStartBtn'];
            const stopBtns = ['stopBattleBtn', 'homeStopBtn'];
            const nextBtns = ['nextWaveBtn', 'homeNextBtn'];

            startBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = true;
            });
            stopBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = false;
            });
            nextBtns.forEach(id => {
              const btn = document.getElementById(id);
              if (btn) btn.disabled = true;
            });
          }

          // 升级属性
          function upgradeAttribute(attribute, cost) {
            vscode.postMessage({
              command: 'battle_upgrade',
              attribute: attribute,
              cost: cost
            });
          }

          // 更新战斗UI
          function updateBattleUI(battleState) {
            if (!battleState) return;

            lastBattleState = battleState;

            // 更新波次（首页和战斗页）
            const waveElements = ['currentWave', 'homeWave'];
            waveElements.forEach(id => {
              const el = document.getElementById(id);
              if (el) el.textContent = battleState.wave;
            });

            // 更新首页金币
            const battleGoldCompact = document.querySelector('.battle-gold-compact');
            if (battleGoldCompact) {
              battleGoldCompact.textContent = '⚔️ ' + battleState.gold + ' 金币';
            }

            // 更新首页等级
            const battleLevelCompact = document.querySelector('.battle-level-compact');
            if (battleLevelCompact) {
              battleLevelCompact.textContent = '👤 Lv.' + battleState.playerLevel;
            }

            // 更新玩家状态
            if (battleState.player) {
              const player = battleState.player;
              const healthPercent = (player.health / player.maxHealth) * 100;

              // 更新生命值（首页和战斗页）
              const healthBars = ['playerHealthBar', 'homePlayerHealthBar'];
              const healthTexts = ['playerHealthText', 'homePlayerHealthText'];

              healthBars.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.width = healthPercent + '%';
              });

              healthTexts.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = player.health + '/' + player.maxHealth;
              });

              // 等级
              const levelElement = document.getElementById('playerLevel');
              if (levelElement) {
                levelElement.textContent = battleState.playerLevel;
              }

              // 属性（战斗页）
              const attackElement = document.getElementById('playerAttack');
              if (attackElement) attackElement.textContent = player.attack;

              const defenseElement = document.getElementById('playerDefense');
              if (defenseElement) defenseElement.textContent = player.defense;

              const critRateElement = document.getElementById('playerCritRate');
              if (critRateElement) critRateElement.textContent = (player.critRate * 100).toFixed(0) + '%';

              const critDmgElement = document.getElementById('playerCritDmg');
              if (critDmgElement) critDmgElement.textContent = player.critDamage.toFixed(1) + 'x';

              const regenElement = document.getElementById('playerRegen');
              if (regenElement) regenElement.textContent = player.healthRegen + '/s';

              // 属性（首页）
              const homeAttack = document.getElementById('homePlayerAttack');
              if (homeAttack) homeAttack.textContent = player.attack;

              const homeDefense = document.getElementById('homePlayerDefense');
              if (homeDefense) homeDefense.textContent = player.defense;

              const homeCritRate = document.getElementById('homePlayerCritRate');
              if (homeCritRate) homeCritRate.textContent = (player.critRate * 100).toFixed(0) + '%';
            }

            // 更新金币
            const goldElement = document.getElementById('battleGold');
            if (goldElement) {
              goldElement.textContent = battleState.gold;
            }

            // 更新按钮状态（首页和战斗页）
            const startBtns = ['startBattleBtn', 'homeStartBtn'];
            const stopBtns = ['stopBattleBtn', 'homeStopBtn'];
            const nextBtns = ['nextWaveBtn', 'homeNextBtn'];

            if (battleState.isInBattle) {
              startBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = true;
              });
              stopBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
              });
              nextBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = true;
              });
            } else {
              startBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = false;
              });
              stopBtns.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.disabled = true;
              });

              // 如果所有敌人都死了，可以进入下一波
              const allEnemiesDead = battleState.enemies.every(e => e.isDead);
              if (allEnemiesDead && battleState.player && !battleState.player.isDead) {
                nextBtns.forEach(id => {
                  const btn = document.getElementById(id);
                  if (btn) btn.disabled = false;
                });
              }
            }

            // 更新战斗日志
            if (battleState.battleLog && battleState.battleLog.length > 0) {
              const logContent = document.getElementById('battleLog');
              if (logContent) {
                logContent.innerHTML = battleState.battleLog.map(log => {
                  let className = 'log-entry';
                  if (log.message.includes('暴击')) className += ' crit';
                  else if (log.message.includes('胜利')) className += ' victory';
                  else if (log.message.includes('失败') || log.message.includes('阵亡')) className += ' defeat';
                  else if (log.message.includes('伤害')) className += ' damage';
                  return '<div class="' + className + '">[' + log.time + '] ' + log.message + '</div>';
                }).join('');
                // 自动滚动到底部
                logContent.scrollTop = logContent.scrollHeight;
              }
            }

            // 渲染战场
            renderBattlefield(battleState);
          }

          // 渲染战场
          function renderBattlefield(battleState) {
            if (!battleCtx || !battleCanvas) {
              initBattleCanvas();
              if (!battleCtx) return;
            }

            const width = battleCanvas.width;
            const height = battleCanvas.height;

            // 清空画布
            battleCtx.fillStyle = '#1a1a2e';
            battleCtx.fillRect(0, 0, width, height);

            // 绘制网格背景
            battleCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            battleCtx.lineWidth = 1;
            for (let i = 0; i < width; i += 30) {
              battleCtx.beginPath();
              battleCtx.moveTo(i, 0);
              battleCtx.lineTo(i, height);
              battleCtx.stroke();
            }
            for (let i = 0; i < height; i += 30) {
              battleCtx.beginPath();
              battleCtx.moveTo(0, i);
              battleCtx.lineTo(width, i);
              battleCtx.stroke();
            }

            // 绘制玩家
            if (battleState.player && !battleState.player.isDead) {
              const player = battleState.player;
              const px = (player.x / 100) * width;
              const py = (player.y / 100) * height;

              // 玩家圆圈
              battleCtx.fillStyle = player.isDead ? '#666' : '#4CAF50';
              battleCtx.beginPath();
              battleCtx.arc(px, py, 12, 0, Math.PI * 2);
              battleCtx.fill();

              // 玩家名字
              battleCtx.fillStyle = '#fff';
              battleCtx.font = '10px sans-serif';
              battleCtx.textAlign = 'center';
              battleCtx.fillText('👤', px, py + 4);

              // 血条
              drawHealthBar(battleCtx, px, py - 18, 30, 4, player.health, player.maxHealth, '#4CAF50');
            }

            // 绘制敌人
            battleState.enemies.forEach((enemy, index) => {
              if (enemy.isDead) return;

              const ex = (enemy.x / 100) * width;
              const ey = (enemy.y / 100) * height;

              // 敌人圆圈
              battleCtx.fillStyle = enemy.isDead ? '#666' : '#f44336';
              battleCtx.beginPath();
              battleCtx.arc(ex, ey, 10, 0, Math.PI * 2);
              battleCtx.fill();

              // 敌人图标
              battleCtx.fillStyle = '#fff';
              battleCtx.font = '10px sans-serif';
              battleCtx.textAlign = 'center';
              battleCtx.fillText('👹', ex, ey + 4);

              // 血条
              drawHealthBar(battleCtx, ex, ey - 16, 25, 3, enemy.health, enemy.maxHealth, '#f44336');
            });
          }

          // 绘制血条
          function drawHealthBar(ctx, x, y, width, height, current, max, color) {
            const percent = current / max;

            // 背景
            ctx.fillStyle = '#333';
            ctx.fillRect(x - width/2, y, width, height);

            // 血量
            ctx.fillStyle = color;
            ctx.fillRect(x - width/2, y, width * percent, height);

            // 边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - width/2, y, width, height);
          }

          // 在页面加载时初始化画布
          setTimeout(() => {
            initBattleCanvas();
          }, 100);

          // ========== 翻译功能函数 ==========

          function openTranslationSettings() {
            vscode.postMessage({ command: 'openTranslationSettings' });
          }

          function testTranslation() {
            vscode.postMessage({ command: 'testTranslation' });
          }

          function openBaiduDoc() {
            vscode.postMessage({ command: 'openBaiduDoc' });
          }
        </script>
      </body>
      </html>
    `;
  }
}

module.exports = IdleGameViewProvider;
