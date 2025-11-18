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

// 导入宠物系统模块
const { getPetCore } = require('./src/pet/petCore');
const { getDDLManager } = require('./src/pet/ddlManager');
const { PetWebview } = require('./src/pet/petWebview');
const { CodeImageGenerator } = require('./src/pet/codeImageGenerator');
const { getSkinManager } = require('./src/pet/skinManager');

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

  // ========== 初始化宠物系统 ==========
  const gameState = getGameState();

  // 初始化宠物状态(如果不存在)
  if (!gameState.pet) {
    gameState.pet = {
      name: '小搭子',
      level: 1,
      exp: 0,
      mood: 100,
      energy: 100,
      currentSkin: 'default',
      unlockedSkins: ['default'],
      position: { x: 10, y: 10 },
      visible: true,
      currentBehavior: 'idle',
      behaviorStartTime: Date.now(),
      lastInteraction: Date.now(),
      totalInteractions: 0,
      statistics: {
        totalCodingTime: 0,
        ddlsCompleted: 0,
        imagesGenerated: 0,
        pomodorosCompleted: 0
      }
    };
  }

  // 初始化DDL任务列表
  if (!gameState.ddlTasks) {
    gameState.ddlTasks = [];
  }

  // 创建宠物核心系统
  const petCore = getPetCore();
  petCore.initialize(gameState.pet);

  // 创建DDL管理器
  const ddlManager = getDDLManager(petCore);
  ddlManager.initialize(gameState.ddlTasks);

  // 创建宠物Webview
  const petWebview = new PetWebview(context, petCore, ddlManager);

  // 创建代码图片生成器
  const codeImageGenerator = new CodeImageGenerator(context, petCore);

  // 创建皮肤管理器
  const skinManager = getSkinManager();

  // 注册懒加载模块
  registerLazyModules(activationManager, context);

  // ========== 注册命令 ==========

  // ========== 宠物系统命令 ==========

  // 显示/隐藏宠物
  let togglePetCommand = vscode.commands.registerCommand('funny-vscode-extension.togglePet', function () {
    petWebview.toggle();
  });

  // 添加DDL任务
  let addDDLCommand = vscode.commands.registerCommand('funny-vscode-extension.addDDL', async function () {
    try {
      const taskName = await vscode.window.showInputBox({
        prompt: '输入任务名称',
        placeHolder: '例如: 完成项目报告'
      });

      if (!taskName) return;

      const deadlineStr = await vscode.window.showInputBox({
        prompt: '输入截止时间 (格式: YYYY-MM-DD HH:mm)',
        placeHolder: '例如: 2025-11-20 23:59',
        validateInput: (value) => {
          if (!value) return '请输入截止时间';
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return '日期格式错误，请使用 YYYY-MM-DD HH:mm 格式';
          }
          if (date.getTime() < Date.now()) {
            return '截止时间不能早于当前时间';
          }
          return null;
        }
      });

      if (!deadlineStr) return;

      const deadline = new Date(deadlineStr);
      const task = ddlManager.addTask(taskName, deadline);
      gameState.ddlTasks = ddlManager.getTasks();
      saveGameState(context);

      vscode.window.showInformationMessage(`✅ DDL已添加: ${taskName}`);
    } catch (error) {
      logger.error('Error adding DDL:', error);
      vscode.window.showErrorMessage('添加DDL失败: ' + error.message);
    }
  });

  // 查看DDL列表
  let viewDDLCommand = vscode.commands.registerCommand('funny-vscode-extension.viewDDL', function () {
    try {
      const tasks = ddlManager.getPendingTasks();

      if (tasks.length === 0) {
        vscode.window.showInformationMessage('🎉 目前没有待完成的DDL!');
        return;
      }

      const items = tasks.map(task => {
        const countdown = ddlManager.getTaskCountdown(task.id);
        return {
          label: task.name,
          description: countdown.overdue ? '⚠️ 已过期' : `⏰ 还剩 ${countdown.text}`,
          task
        };
      });

      vscode.window.showQuickPick(items, {
        placeHolder: '选择DDL任务'
      }).then(selection => {
        if (selection) {
          vscode.window.showInformationMessage(
            `完成 "${selection.task.name}" 了吗?`,
            '标记完成',
            '删除任务'
          ).then(action => {
            if (action === '标记完成') {
              ddlManager.completeTask(selection.task.id);
              gameState.ddlTasks = ddlManager.getTasks();
              saveGameState(context);
              vscode.window.showInformationMessage('✅ 任务已完成!');
            } else if (action === '删除任务') {
              ddlManager.deleteTask(selection.task.id);
              gameState.ddlTasks = ddlManager.getTasks();
              saveGameState(context);
              vscode.window.showInformationMessage('🗑️ 任务已删除');
            }
          });
        }
      });
    } catch (error) {
      logger.error('Error viewing DDL:', error);
      vscode.window.showErrorMessage('查看DDL失败: ' + error.message);
    }
  });

  // 生成代码截图
  let generateCodeImageCommand = vscode.commands.registerCommand('funny-vscode-extension.generateCodeImage', function () {
    try {
      codeImageGenerator.generateImage();
    } catch (error) {
      logger.error('Error generating code image:', error);
      vscode.window.showErrorMessage('生成代码截图失败: ' + error.message);
    }
  });

  // 切换宠物皮肤
  let changePetSkinCommand = vscode.commands.registerCommand('funny-vscode-extension.changePetSkin', function () {
    try {
      const allSkins = skinManager.getAllSkins();
      const items = allSkins.map(skin => {
        const isUnlocked = skinManager.isSkinUnlocked(skin.id, gameState);
        const isCurrent = skin.id === petCore.state.currentSkin;

        return {
          label: `${skin.emoji} ${skin.name}`,
          description: isCurrent ? '✓ 当前使用' : (isUnlocked ? '已解锁' : '🔒 未解锁'),
          detail: isUnlocked ? undefined : skinManager.getUnlockHint(skin.id, gameState),
          skin,
          isUnlocked
        };
      });

      vscode.window.showQuickPick(items, {
        placeHolder: '选择宠物皮肤'
      }).then(selection => {
        if (selection && selection.isUnlocked) {
          petCore.changeSkin(selection.skin.id);
          gameState.pet = petCore.getState();
          saveGameState(context);
          vscode.window.showInformationMessage(`已切换到 ${selection.skin.name}`);
        } else if (selection && !selection.isUnlocked) {
          vscode.window.showWarningMessage(`${selection.skin.name} 尚未解锁`);
        }
      });
    } catch (error) {
      logger.error('Error changing pet skin:', error);
      vscode.window.showErrorMessage('切换皮肤失败: ' + error.message);
    }
  });

  // 与宠物交互
  let interactPetCommand = vscode.commands.registerCommand('funny-vscode-extension.interactPet', function () {
    try {
      const actions = [
        { label: '❤️ 抚摸搭子', action: 'pet' },
        { label: '🍎 喂食搭子', action: 'feed' },
        { label: '🎮 陪搭子玩耍', action: 'play' }
      ];

      vscode.window.showQuickPick(actions, {
        placeHolder: '选择交互方式'
      }).then(selection => {
        if (selection) {
          petCore.interact(selection.action);
          gameState.pet = petCore.getState();
          saveGameState(context);
        }
      });
    } catch (error) {
      logger.error('Error interacting with pet:', error);
      vscode.window.showErrorMessage('与搭子互动失败: ' + error.message);
    }
  });

  // ========== 原有命令 ==========

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

  // ========== 番茄钟命令 ==========

  // 初始化番茄钟
  const { getPomodoroTimer } = require('./src/productivity/pomodoroTimer');
  const { createPomodoroStatusBar } = require('./src/ui/statusBar/pomodoroStatusBar');
  
  const pomodoroTimer = getPomodoroTimer(getGameState());
  
  // 从配置加载设置
  const pomodoroConfig = vscode.workspace.getConfiguration('funny-vscode-extension.pomodoro');
  pomodoroTimer.updateConfig({
    workDuration: pomodoroConfig.get('workDuration', 25),
    breakDuration: pomodoroConfig.get('breakDuration', 5),
    longBreakDuration: pomodoroConfig.get('longBreakDuration', 15),
    sessionsUntilLongBreak: pomodoroConfig.get('sessionsUntilLongBreak', 4)
  });

  // 从游戏状态加载番茄钟数据
  if (gameState.pomodoro) {
    pomodoroTimer.loadState(gameState.pomodoro);
  } else {
    // 初始化番茄钟状态
    gameState.pomodoro = {
      completedToday: 0,
      completedTotal: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSessionDate: new Date().toISOString().split('T')[0],
      settings: {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4
      }
    };
  }

  // 创建番茄钟状态栏
  const pomodoroStatusBar = createPomodoroStatusBar(pomodoroTimer);

  // 开始/暂停番茄钟
  let togglePomodoroCommand = vscode.commands.registerCommand('funny-vscode-extension.togglePomodoro', function () {
    const state = pomodoroTimer.getState();
    
    if (state.isActive) {
      // 暂停
      pomodoroTimer.pause();
      vscode.window.showInformationMessage('⏸️ 番茄钟已暂停');
    } else if (state.isPaused) {
      // 继续
      pomodoroTimer.resume();
      vscode.window.showInformationMessage('▶️ 番茄钟继续');
    } else {
      // 开始新的工作会话
      pomodoroTimer.startWork();
      vscode.window.showInformationMessage('🍅 番茄钟开始！专注工作 25 分钟');
    }
  });

  // 停止番茄钟
  let stopPomodoroCommand = vscode.commands.registerCommand('funny-vscode-extension.stopPomodoro', function () {
    pomodoroTimer.stop();
    vscode.window.showInformationMessage('⏹️ 番茄钟已停止');
  });

  // 开始休息
  let startPomodoroBreakCommand = vscode.commands.registerCommand('funny-vscode-extension.startPomodoroBreak', function () {
    const isLongBreak = pomodoroTimer.isLongBreakTime();
    pomodoroTimer.startBreak(isLongBreak);
    const duration = isLongBreak ? 15 : 5;
    vscode.window.showInformationMessage(`☕ 休息时间！放松 ${duration} 分钟`);
  });

  // 监听番茄钟完成事件
  eventBus.on('pomodoro:completed', (data) => {
    if (data.type === 'work') {
      const isLongBreak = pomodoroTimer.isLongBreakTime();
      const message = isLongBreak 
        ? `🎉 完成第 ${data.completedSessions} 个番茄钟！该休息一下了（长休息）`
        : `✅ 完成第 ${data.completedSessions} 个番茄钟！休息一下吧`;
      
      vscode.window.showInformationMessage(message, '开始休息', '继续工作').then(selection => {
        if (selection === '开始休息') {
          pomodoroTimer.startBreak(isLongBreak);
        } else if (selection === '继续工作') {
          pomodoroTimer.startWork();
        }
      });
      
      // 保存状态
      saveGameState(context);
    } else {
      vscode.window.showInformationMessage('☕ 休息结束！准备好继续工作了吗？', '开始工作').then(selection => {
        if (selection === '开始工作') {
          pomodoroTimer.startWork();
        }
      });
    }
  });

  // 监听配置变化
  const pomodoroConfigListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('funny-vscode-extension.pomodoro')) {
      const config = vscode.workspace.getConfiguration('funny-vscode-extension.pomodoro');
      pomodoroTimer.updateConfig({
        workDuration: config.get('workDuration', 25),
        breakDuration: config.get('breakDuration', 5),
        longBreakDuration: config.get('longBreakDuration', 15),
        sessionsUntilLongBreak: config.get('sessionsUntilLongBreak', 4)
      });
      logger.info('Pomodoro configuration updated');
    }
  });

  resourceManager.registerListener(
    'pomodoro-config',
    () => pomodoroConfigListener.dispose(),
    'Pomodoro config listener'
  );

  // ========== 翻译系统 ==========

  const { TranslationProvider } = require('./src/translation/translationProvider');
  const translationProvider = new TranslationProvider(context);
  translationProvider.initialize();

  // ========== 代码统计系统 ==========

  const { getCodeStatistics } = require('./src/productivity/codeStatistics');
  
  // 初始化代码统计
  if (!gameState.statistics) {
    gameState.statistics = {
      today: {
        date: new Date().toISOString().split('T')[0],
        linesAdded: 0,
        linesDeleted: 0,
        filesModified: 0,
        saveCount: 0,
        sessionDuration: 0,
        coinsEarned: 0
      },
      history: [],
      topFiles: []
    };
  }

  const codeStats = getCodeStatistics(gameState, context.globalState);
  codeStats.loadState(gameState.statistics);
  codeStats.initialize();

  // 监听代码变化事件
  eventBus.on('code:changed', (data) => {
    // 更新游戏状态
    if (gameState.statistics && gameState.statistics.today) {
      gameState.statistics.today.linesAdded = data.linesAdded;
      gameState.statistics.today.linesDeleted = data.linesDeleted;
      gameState.statistics.today.filesModified = data.filesModified;
    }
  });

  // 监听金币获得事件（关键词奖励）
  eventBus.on('coins:earned', (data) => {
    if (data.source === 'keyword') {
      // 显示通知（可选）
      // vscode.window.showInformationMessage(`💰 触发关键词 "${data.keyword}" 获得 ${data.amount} 金币！`);
      
      // 更新状态栏
      updateStatusBar();
      
      // 保存游戏状态
      saveGameState(context);
    }
  });

  // 每日重置检查（每小时检查一次）
  const dailyResetTimer = resourceManager.registerTimer(() => {
    const today = new Date().toISOString().split('T')[0];
    if (gameState.statistics && gameState.statistics.today.date !== today) {
      codeStats.resetDaily();
      pomodoroTimer.resetDaily();
      
      // 更新游戏状态
      gameState.statistics.today = {
        date: today,
        linesAdded: 0,
        linesDeleted: 0,
        filesModified: 0,
        saveCount: 0,
        sessionDuration: 0,
        coinsEarned: 0
      };
      
      saveGameState(context);
      logger.info('Daily reset completed');
    }
  }, 3600000, true, 'Daily reset check'); // 每小时检查

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
    gameState.lastSaveTime = Date.now();
    saveGameState(context);
  }, 10000, true, 'Auto save');

  // ========== 宠物系统事件监听 ==========

  // 合并宠物状态保存和皮肤解锁检查（每30秒）
  let petCheckCounter = 0;
  const petMaintenanceTimer = resourceManager.registerTimer(() => {
    try {
      // 每次都保存宠物状态
      gameState.pet = petCore.getState();
      gameState.ddlTasks = ddlManager.getTasks();
      
      // 每2次检查一次皮肤解锁（即每60秒）
      petCheckCounter++;
      if (petCheckCounter >= 2) {
        petCheckCounter = 0;
        const newUnlocks = skinManager.checkNewUnlocks(gameState);
        if (newUnlocks.length > 0) {
          for (const skinId of newUnlocks) {
            petCore.unlockSkin(skinId);
            const skin = skinManager.getSkin(skinId);
            vscode.window.showInformationMessage(
              `🎉 解锁新皮肤: ${skin.emoji} ${skin.name}!`,
              '查看'
            ).then(selection => {
              if (selection === '查看') {
                vscode.commands.executeCommand('funny-vscode-extension.changePetSkin');
              }
            });
          }
          gameState.pet = petCore.getState();
        }
      }
      
      // 注意：不在这里调用saveGameState，由主保存定时器统一处理
    } catch (error) {
      logger.error('Error in pet maintenance timer:', error);
    }
  }, 30000, true, 'Pet maintenance'); // 每30秒

  // 专注模式完成后宠物提示
  eventBus.on('pomodoro:completed', (data) => {
    if (data.type === 'work') {
      // 40分钟专注完成后提示生成截图
      const config = vscode.workspace.getConfiguration('funny-vscode-extension.pomodoro');
      const workDuration = config.get('workDuration', 25);

      if (workDuration >= 40) {
        setTimeout(() => {
          vscode.window.showInformationMessage(
            '🎉 完成专注模式! 要不要生成一张胜利截图纪念一下?',
            '生成截图',
            '下次再说'
          ).then(selection => {
            if (selection === '生成截图') {
              vscode.commands.executeCommand('funny-vscode-extension.generateCodeImage');
            }
          });
        }, 5000);
      }
    }
  });

  // ========== 注册到订阅 ==========

  // 宠物系统命令
  context.subscriptions.push(togglePetCommand);
  context.subscriptions.push(addDDLCommand);
  context.subscriptions.push(viewDDLCommand);
  context.subscriptions.push(generateCodeImageCommand);
  context.subscriptions.push(changePetSkinCommand);
  context.subscriptions.push(interactPetCommand);

  // 原有命令
  context.subscriptions.push(showJokeCommand);
  context.subscriptions.push(showEmojiCommand);
  context.subscriptions.push(openSidebarCommand);
  context.subscriptions.push(clickCoinCommand);
  context.subscriptions.push(showSaveInfoCommand);
  context.subscriptions.push(openSaveFolderCommand);
  context.subscriptions.push(backupSaveCommand);
  context.subscriptions.push(togglePomodoroCommand);
  context.subscriptions.push(stopPomodoroCommand);
  context.subscriptions.push(startPomodoroBreakCommand);
  context.subscriptions.push(jokeStatusBarItem);
  context.subscriptions.push(coinStatusBarItem);
  context.subscriptions.push(pomodoroStatusBar);

  logger.info('Extension activated successfully with Pet System');
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
      
      // 根据配置选择特效系统
      const config = vscode.workspace.getConfiguration('funny-vscode-extension');
      const effectStyle = config.get('effectStyle', 'enhanced');
      
      if (effectStyle === 'enhanced') {
        const { initEnhancedCodeEffect } = require('./src/ui/enhancedCodeEffect');
        initEnhancedCodeEffect(context);
        logger.info('Using enhanced CSS-based effects');
      } else {
        const { initCoinParticleEffect } = require('./src/ui/coinParticleEffect');
        initCoinParticleEffect(context);
        logger.info('Using classic emoji effects');
      }
      
      const webviewProvider = new IdleGameViewProvider(context);
      
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
