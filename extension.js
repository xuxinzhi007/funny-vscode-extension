const vscode = require('vscode');

// 导入核心系统
const { getActivationManager } = require('./src/core/activation');
const { getResourceManager } = require('./src/core/resourceManager');
const { getPerformanceMonitor } = require('./src/core/performance');
const { getEventBus } = require('./src/core/eventBus');
const { getLogger } = require('./src/utils/logger');
const { getErrorHandler } = require('./src/utils/errorHandler');

// 导入核心游戏模块（始终加载）
const { getGameState, calculateCoinsPerSecond, getEffectiveProduction, formatNumber } = require('./src/game/gameState');
const { checkAchievements } = require('./src/game/achievements');
const { loadGameState, saveGameState, showSaveInfo, openSaveFolder, backupGameSave } = require('./src/game/storage');

// 导入UI模块
const { createStatusBar, updateStatusBar } = require('./src/ui/statusBar');

// 笑话库
const jokes = [
  "为什么程序员总是混淆万圣节和圣诞节？因为 Oct 31 == Dec 25",
  "程序员的三大谎言：这个bug马上就修好；代码很清晰，不需要注释；我知道自己在做什么",
  "一个程序员走进一家酒吧，对酒保说：'请给我来一杯404'。酒保回答：'找不到这种饮料'",
  "如何判断一个人是否为程序员？问他们斐波那契数列的第13个数是什么",
  "为什么程序员不喜欢大自然？因为那里有太多的bugs",
  "程序员最害怕的事情是什么？注释掉的代码比实际代码更有意义",
  "程序员得知女朋友怀孕后的第一反应：'这不可能！我一直在使用保护模式！'",
  "我写的代码只有两个人能看懂：我和上帝。现在只有上帝了。"
];

// 表情符号库
const emojis = ["😂", "🤣", "😅", "😆", "🥹", "😎", "🤩", "🥳", "🤔", "🤨", "😏", "🙃", "😉", "🫠", "🤯", "🧐", "🤓"];

/**
 * 激活扩展
 */
function activate(context) {
  const logger = getLogger();
  const errorHandler = getErrorHandler();
  const activationManager = getActivationManager();
  const resourceManager = getResourceManager();
  const performanceMonitor = getPerformanceMonitor();
  const eventBus = getEventBus();

  logger.info('Extension activating...');

  // 启动性能监控
  performanceMonitor.start();

  // 加载游戏状态
  loadGameState(context);

  // 注册懒加载模块
  registerLazyModules(activationManager, context);

  // ========== 注册命令 ==========

  // 显示笑话
  let showJokeCommand = vscode.commands.registerCommand('funny-vscode-extension.showJoke', function () {
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    vscode.window.showInformationMessage(randomJoke);
  });

  // 显示表情符号
  let showEmojiCommand = vscode.commands.registerCommand('funny-vscode-extension.showEmoji', function () {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    vscode.window.showInformationMessage(`今天的心情: ${randomEmoji}`);

    // 如果当前有打开的文本编辑器，插入表情符号
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const position = editor.selection.active;
      editor.edit(editBuilder => {
        editBuilder.insert(position, randomEmoji);
      });
    }
  });

  // 打开侧边栏
  let openSidebarCommand = vscode.commands.registerCommand('funny-vscode-extension.openSidebar', function () {
    vscode.commands.executeCommand('workbench.view.extension.idleGameContainer');
  });

  // 手动点击获得金币
  let clickCoinCommand = vscode.commands.registerCommand('funny-vscode-extension.clickCoin', function () {
    const gameState = getGameState();
    gameState.coins += 1;
    gameState.totalCoinsEarned += 1;
    checkAchievements();
    updateStatusBar();
    saveGameState(context);
    vscode.window.showInformationMessage(`💰 +1 金币！当前: ${formatNumber(gameState.coins)}`);
  });

  // 存档管理命令
  let showSaveInfoCommand = vscode.commands.registerCommand('funny-vscode-extension.showSaveInfo', function () {
    showSaveInfo(context);
  });

  let openSaveFolderCommand = vscode.commands.registerCommand('funny-vscode-extension.openSaveFolder', function () {
    openSaveFolder(context);
  });

  let backupSaveCommand = vscode.commands.registerCommand('funny-vscode-extension.backupSave', function () {
    backupGameSave(context);
  });

  // ========== 创建UI组件 ==========

  // 创建笑话状态栏
  const jokeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  jokeStatusBarItem.command = 'funny-vscode-extension.showJoke';
  jokeStatusBarItem.text = "$(smile) 笑一笑";
  jokeStatusBarItem.tooltip = "点击显示笑话";
  jokeStatusBarItem.show();

  // 创建金币状态栏
  const coinStatusBarItem = createStatusBar();

  // 注册侧边栏视图（懒加载）
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('idleGameView', {
      resolveWebviewView: async (webviewView) => {
        // 激活 UI 模块
        const uiModule = await activationManager.activateModule('ui');
        if (uiModule && uiModule.webviewProvider) {
          uiModule.webviewProvider.resolveWebviewView(webviewView);
        }
      }
    })
  );

  // ========== 游戏循环定时器 ==========

  // 每秒增加金币（使用资源管理器）
  const coinTimer = resourceManager.registerTimer(() => {
    const gameState = getGameState();
    gameState.coinsPerSecond = calculateCoinsPerSecond();
    const effectiveProduction = getEffectiveProduction();
    gameState.coins += effectiveProduction;
    gameState.totalCoinsEarned += effectiveProduction;
    updateStatusBar();
    checkAchievements();
    eventBus.emit('coins:earned', { amount: effectiveProduction, source: 'passive' });
  }, 1000, true, 'Coin generation');

  // 每10秒自动保存（使用资源管理器）
  const saveTimer = resourceManager.registerTimer(() => {
    const gameState = getGameState();
    gameState.lastSaveTime = Date.now();
    saveGameState(context);
  }, 10000, true, 'Auto save');

  // ========== 注册到订阅 ==========

  context.subscriptions.push(showJokeCommand);
  context.subscriptions.push(showEmojiCommand);
  context.subscriptions.push(openSidebarCommand);
  context.subscriptions.push(clickCoinCommand);
  context.subscriptions.push(showSaveInfoCommand);
  context.subscriptions.push(openSaveFolderCommand);
  context.subscriptions.push(backupSaveCommand);
  context.subscriptions.push(jokeStatusBarItem);
  context.subscriptions.push(coinStatusBarItem);

  logger.info('Extension activated successfully');
}

/**
 * 注册懒加载模块
 */
function registerLazyModules(activationManager, context) {
  const logger = getLogger();

  // UI 模块（当侧边栏打开时加载）
  activationManager.registerModule(
    'ui',
    async () => {
      logger.info('Loading UI module...');
      // 暂时使用原始的 webview.js，保持完整功能
      const IdleGameViewProvider = require('./src/ui/webview');
      const { initCoinParticleEffect } = require('./src/ui/coinParticleEffect');
      
      const webviewProvider = new IdleGameViewProvider(context);
      initCoinParticleEffect(context);
      
      return { webviewProvider };
    },
    ['onView:idleGameView']
  );

  // 战斗系统（当首次访问战斗标签时加载）
  activationManager.registerModule(
    'battle',
    async () => {
      logger.info('Loading battle system...');
      const { getBattleSystem } = require('./src/game/battleSystem');
      return { battleSystem: getBattleSystem() };
    },
    []
  );

  // 抽奖系统（当首次访问抽奖标签时加载）
  activationManager.registerModule(
    'lottery',
    async () => {
      logger.info('Loading lottery system...');
      const lottery = require('./src/game/lottery');
      return { lottery };
    },
    []
  );

  logger.info('Lazy modules registered');
}

/**
 * 停用扩展
 */
async function deactivate() {
  const logger = getLogger();
  const activationManager = getActivationManager();
  const resourceManager = getResourceManager();
  const performanceMonitor = getPerformanceMonitor();

  logger.info('Extension deactivating...');

  // 停止性能监控
  performanceMonitor.stop();

  // 停用所有模块
  await activationManager.deactivateAll();

  // 清理所有资源
  resourceManager.cleanup();

  logger.info('Extension deactivated');
}

module.exports = {
  activate,
  deactivate
};
