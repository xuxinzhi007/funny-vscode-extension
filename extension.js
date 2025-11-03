const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

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

// 游戏状态
let gameState = {
  coins: 0,
  coinsPerSecond: 1,
  totalCoinsEarned: 0,
  level: 1,
  upgrades: {
    basicMiner: { name: '基础矿工', count: 0, cost: 10, production: 1 },
    autoTyper: { name: '自动打字机', count: 0, cost: 50, production: 5 },
    codeGenerator: { name: '代码生成器', count: 0, cost: 200, production: 20 },
    aiAssistant: { name: 'AI助手', count: 0, cost: 1000, production: 100 },
    quantumCompiler: { name: '量子编译器', count: 0, cost: 5000, production: 500 }
  },
  achievements: [],
  startTime: Date.now()
};

// 成就列表
const achievements = [
  { id: 'first_coin', name: '第一桶金', description: '获得第一枚金币', requirement: () => gameState.totalCoinsEarned >= 1, unlocked: false },
  { id: 'hundred_coins', name: '小有所成', description: '获得100枚金币', requirement: () => gameState.totalCoinsEarned >= 100, unlocked: false },
  { id: 'thousand_coins', name: '腰缠万贯', description: '获得1000枚金币', requirement: () => gameState.totalCoinsEarned >= 1000, unlocked: false },
  { id: 'first_upgrade', name: '首次升级', description: '购买第一个升级', requirement: () => Object.values(gameState.upgrades).some(u => u.count > 0), unlocked: false },
  { id: 'idle_master', name: '挂机大师', description: '运行时间超过1小时', requirement: () => (Date.now() - gameState.startTime) > 3600000, unlocked: false },
  { id: 'coin_factory', name: '金币工厂', description: '每秒产出超过100金币', requirement: () => gameState.coinsPerSecond >= 100, unlocked: false }
];

// 抽奖奖品配置
const lotteryPrizes = [
  { id: 'coins_50', name: '50金币', type: 'coins', value: 50, color: '#95a5a6', probability: 30 },
  { id: 'coins_100', name: '100金币', type: 'coins', value: 100, color: '#3498db', probability: 25 },
  { id: 'coins_200', name: '200金币', type: 'coins', value: 200, color: '#9b59b6', probability: 15 },
  { id: 'boost_2x', name: '2倍加速', type: 'boost', value: 2, duration: 300, color: '#2ecc71', probability: 12 },
  { id: 'discount_50', name: '5折券', type: 'discount', value: 0.5, color: '#f39c12', probability: 10 },
  { id: 'coins_500', name: '500金币', type: 'coins', value: 500, color: '#e74c3c', probability: 5 },
  { id: 'boost_5x', name: '5倍加速', type: 'boost', value: 5, duration: 180, color: '#e67e22', probability: 2 },
  { id: 'jackpot', name: '超级大奖', type: 'coins', value: 2000, color: '#f1c40f', probability: 1 }
];

// 抽奖价格
const lotteryPrices = {
  normal: 100,    // 普通抽奖
  advanced: 500,  // 高级抽奖
  super: 2000     // 超级抽奖
};

// 游戏辅助函数
function calculateCoinsPerSecond() {
  let total = 1; // 基础产出
  for (const upgrade of Object.values(gameState.upgrades)) {
    total += upgrade.count * upgrade.production;
  }
  return total;
}

function checkAchievements() {
  achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.requirement()) {
      achievement.unlocked = true;
      gameState.achievements.push(achievement.id);
      vscode.window.showInformationMessage(`🏆 解锁成就: ${achievement.name} - ${achievement.description}`);
    }
  });
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return Math.floor(num).toString();
}

// ========== 抽奖系统 ==========

// 根据概率抽取奖品
function drawPrize() {
  const totalProbability = lotteryPrizes.reduce((sum, prize) => sum + prize.probability, 0);
  let random = Math.random() * totalProbability;

  for (const prize of lotteryPrizes) {
    random -= prize.probability;
    if (random <= 0) {
      return prize;
    }
  }

  return lotteryPrizes[0]; // 保底
}

// 发放奖励
function grantPrize(prize, context) {
  switch (prize.type) {
    case 'coins':
      gameState.coins += prize.value;
      gameState.totalCoinsEarned += prize.value;
      vscode.window.showInformationMessage(`🎉 恭喜获得 ${prize.value} 金币！`);
      break;

    case 'boost':
      // 应用加速效果
      if (!gameState.activeBoosts) {
        gameState.activeBoosts = [];
      }
      const boostEndTime = Date.now() + prize.duration * 1000;
      gameState.activeBoosts.push({
        type: 'production',
        multiplier: prize.value,
        endTime: boostEndTime
      });
      vscode.window.showInformationMessage(`🚀 获得 ${prize.value}x 加速效果，持续 ${Math.floor(prize.duration / 60)} 分钟！`);
      break;

    case 'discount':
      // 应用折扣券
      if (!gameState.activeDiscounts) {
        gameState.activeDiscounts = [];
      }
      gameState.activeDiscounts.push({
        multiplier: prize.value,
        usesLeft: 3 // 可使用3次
      });
      vscode.window.showInformationMessage(`🎫 获得 ${Math.floor((1 - prize.value) * 10)} 折优惠券，可使用3次！`);
      break;
  }

  checkAchievements();
  saveGameState(context);
}

// 计算实际产出（包含加速效果）
function getEffectiveProduction() {
  let baseProduction = calculateCoinsPerSecond();
  let multiplier = 1;

  if (gameState.activeBoosts) {
    const now = Date.now();
    gameState.activeBoosts = gameState.activeBoosts.filter(boost => boost.endTime > now);

    gameState.activeBoosts.forEach(boost => {
      multiplier *= boost.multiplier;
    });
  }

  return baseProduction * multiplier;
}

// ========== 文件存储功能 ==========

function getSaveFilePath(context) {
  // 使用VSCode的globalStorageUri，这是官方推荐的跨平台存储位置
  const storageUri = context.globalStorageUri;
  return path.join(storageUri.fsPath, 'game-save.json');
}

function ensureStorageDirectory(context) {
  const storageUri = context.globalStorageUri;
  if (!fs.existsSync(storageUri.fsPath)) {
    fs.mkdirSync(storageUri.fsPath, { recursive: true });
  }
}

function saveGameState(context) {
  try {
    ensureStorageDirectory(context);
    const saveFilePath = getSaveFilePath(context);
    const saveData = {
      ...gameState,
      version: '1.0.0', // 版本号，方便将来数据迁移
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(saveFilePath, JSON.stringify(saveData, null, 2), 'utf8');
    console.log(`游戏数据已保存到: ${saveFilePath}`);
  } catch (error) {
    console.error('保存游戏数据失败:', error);
    vscode.window.showErrorMessage(`保存游戏数据失败: ${error.message}`);
  }
}

function loadGameState(context) {
  try {
    const saveFilePath = getSaveFilePath(context);

    // 如果文件不存在，尝试从旧的globalState迁移
    if (!fs.existsSync(saveFilePath)) {
      console.log('存档文件不存在，尝试从globalState迁移数据...');
      const oldSavedState = context.globalState.get('idleGameState');
      if (oldSavedState) {
        console.log('发现旧存档，正在迁移...');
        gameState = { ...gameState, ...oldSavedState };
        syncAchievements(); // 同步成就状态
        saveGameState(context); // 保存到新位置
        // 清除旧数据
        context.globalState.update('idleGameState', undefined);
        vscode.window.showInformationMessage('✅ 游戏数据已迁移到文件存储！');
      } else {
        console.log('未找到存档，使用默认数据');
      }
      return;
    }

    // 读取文件
    const fileContent = fs.readFileSync(saveFilePath, 'utf8');
    const savedState = JSON.parse(fileContent);

    // 数据验证
    if (!savedState || typeof savedState.coins !== 'number') {
      throw new Error('存档数据格式错误');
    }

    // 恢复游戏状态
    gameState = { ...gameState, ...savedState };

    // 同步成就解锁状态（防止重复弹窗）
    syncAchievements();

    // 计算离线收益
    if (savedState.lastSaveTime) {
      const offlineTime = Math.min(Date.now() - savedState.lastSaveTime, 3600000); // 最多1小时
      const offlineCoins = Math.floor((offlineTime / 1000) * gameState.coinsPerSecond);
      if (offlineCoins > 0) {
        gameState.coins += offlineCoins;
        gameState.totalCoinsEarned += offlineCoins;
        vscode.window.showInformationMessage(`💰 离线收益: +${formatNumber(offlineCoins)} 金币！`);
      }
    }

    console.log(`游戏数据已从文件加载: ${saveFilePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('存档文件不存在，使用默认数据');
    } else {
      console.error('读取游戏数据失败:', error);
      vscode.window.showErrorMessage(`读取游戏数据失败: ${error.message}`);
    }
  }
}

// 同步成就状态（从gameState.achievements恢复到achievements数组）
function syncAchievements() {
  if (gameState.achievements && gameState.achievements.length > 0) {
    achievements.forEach(achievement => {
      if (gameState.achievements.includes(achievement.id)) {
        achievement.unlocked = true;
      }
    });
    console.log(`已同步 ${gameState.achievements.length} 个成就状态`);
  }
}

// 打开存档文件夹
function openSaveFolder(context) {
  try {
    const saveFilePath = getSaveFilePath(context);
    const folderPath = path.dirname(saveFilePath);

    // 确保文件夹存在
    ensureStorageDirectory(context);

    vscode.env.openExternal(vscode.Uri.file(folderPath));
    vscode.window.showInformationMessage(`📁 存档文件夹已打开\n路径: ${folderPath}`);
  } catch (error) {
    vscode.window.showErrorMessage(`打开文件夹失败: ${error.message}`);
  }
}

// 导出存档信息
function showSaveInfo(context) {
  try {
    const saveFilePath = getSaveFilePath(context);

    if (!fs.existsSync(saveFilePath)) {
      vscode.window.showWarningMessage('暂无存档文件');
      return;
    }

    const stats = fs.statSync(saveFilePath);
    const fileSize = (stats.size / 1024).toFixed(2);
    const modifiedTime = new Date(stats.mtime).toLocaleString('zh-CN');

    vscode.window.showInformationMessage(
      `📁 存档信息\n` +
      `位置: ${saveFilePath}\n` +
      `大小: ${fileSize} KB\n` +
      `修改时间: ${modifiedTime}`,
      '打开文件夹',
      '复制路径',
      '备份存档'
    ).then(selection => {
      if (selection === '打开文件夹') {
        openSaveFolder(context);
      } else if (selection === '复制路径') {
        vscode.env.clipboard.writeText(saveFilePath);
        vscode.window.showInformationMessage('✅ 路径已复制到剪贴板');
      } else if (selection === '备份存档') {
        backupGameSave(context);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`获取存档信息失败: ${error.message}`);
  }
}

// 备份存档
function backupGameSave(context) {
  try {
    const saveFilePath = getSaveFilePath(context);
    if (!fs.existsSync(saveFilePath)) {
      vscode.window.showWarningMessage('没有找到存档文件');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `game-save-backup-${timestamp}.json`;
    const backupFilePath = path.join(path.dirname(saveFilePath), backupFileName);

    fs.copyFileSync(saveFilePath, backupFilePath);

    vscode.window.showInformationMessage(
      `✅ 备份成功！\n${backupFileName}`,
      '打开文件夹'
    ).then(selection => {
      if (selection === '打开文件夹') {
        openSaveFolder(context);
      }
    });
  } catch (error) {
    vscode.window.showErrorMessage(`备份失败: ${error.message}`);
  }
}

/**
 * 当您的扩展被激活时调用
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('恭喜，您的扩展"funny-vscode-extension"现在已经激活！');

  // 加载游戏状态
  loadGameState(context);

  // 注册显示笑话命令
  let showJokeCommand = vscode.commands.registerCommand('funny-vscode-extension.showJoke', function () {
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    vscode.window.showInformationMessage(randomJoke);
  });

  // 注册显示表情符号命令
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

  // 创建笑话状态栏项目
  const jokeStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  jokeStatusBarItem.command = 'funny-vscode-extension.showJoke';
  jokeStatusBarItem.text = "$(smile) 笑一笑";
  jokeStatusBarItem.tooltip = "点击显示笑话";
  jokeStatusBarItem.show();

  // 创建金币状态栏项目
  const coinStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  coinStatusBarItem.command = 'funny-vscode-extension.openSidebar';
  coinStatusBarItem.tooltip = "💰 挂机游戏\n点击打开侧边栏";

  function updateCoinStatusBar() {
    const coins = formatNumber(gameState.coins);
    const effectiveRate = getEffectiveProduction();
    const rate = formatNumber(effectiveRate);

    let boostText = '';
    if (gameState.activeBoosts && gameState.activeBoosts.length > 0) {
      const boost = gameState.activeBoosts[0];
      const remainingTime = Math.ceil((boost.endTime - Date.now()) / 1000);
      boostText = ` 🚀${boost.multiplier}x`;
    }

    coinStatusBarItem.text = `$(star-full) ${coins} (+${rate}/s)${boostText}`;
    coinStatusBarItem.tooltip = `💰 金币: ${coins}\n⚡ 产出: +${rate}/秒\n🏆 成就: ${gameState.achievements.length}/${achievements.length}\n\n点击打开游戏面板`;
  }
  updateCoinStatusBar();
  coinStatusBarItem.show();

  // 注册打开侧边栏命令
  let openSidebarCommand = vscode.commands.registerCommand('funny-vscode-extension.openSidebar', function () {
    vscode.commands.executeCommand('workbench.view.extension.idleGameContainer');
  });

  // 注册手动点击获得金币命令
  let clickCoinCommand = vscode.commands.registerCommand('funny-vscode-extension.clickCoin', function () {
    gameState.coins += 1;
    gameState.totalCoinsEarned += 1;
    checkAchievements();
    updateCoinStatusBar();
    saveGameState(context);
    vscode.window.showInformationMessage(`💰 +1 金币！当前: ${formatNumber(gameState.coins)}`);
  });

  // 注册存档管理命令
  let showSaveInfoCommand = vscode.commands.registerCommand('funny-vscode-extension.showSaveInfo', function () {
    showSaveInfo(context);
  });

  let openSaveFolderCommand = vscode.commands.registerCommand('funny-vscode-extension.openSaveFolder', function () {
    openSaveFolder(context);
  });

  let backupSaveCommand = vscode.commands.registerCommand('funny-vscode-extension.backupSave', function () {
    backupGameSave(context);
  });

  // 每秒增加金币定时器
  const coinTimer = setInterval(() => {
    gameState.coinsPerSecond = calculateCoinsPerSecond();
    const effectiveProduction = getEffectiveProduction();
    gameState.coins += effectiveProduction;
    gameState.totalCoinsEarned += effectiveProduction;
    updateCoinStatusBar();
    checkAchievements();
  }, 1000);

  // 每10秒自动保存
  const saveTimer = setInterval(() => {
    gameState.lastSaveTime = Date.now();
    saveGameState(context);
  }, 10000);

  // 注册侧边栏视图
  const idleGameViewProvider = new IdleGameViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('idleGameView', idleGameViewProvider)
  );

  // 将命令添加到订阅中以便在插件停用时释放
  context.subscriptions.push(showJokeCommand);
  context.subscriptions.push(showEmojiCommand);
  context.subscriptions.push(openSidebarCommand);
  context.subscriptions.push(clickCoinCommand);
  context.subscriptions.push(showSaveInfoCommand);
  context.subscriptions.push(openSaveFolderCommand);
  context.subscriptions.push(backupSaveCommand);
  context.subscriptions.push(jokeStatusBarItem);
  context.subscriptions.push(coinStatusBarItem);
  context.subscriptions.push({ dispose: () => clearInterval(coinTimer) });
  context.subscriptions.push({ dispose: () => clearInterval(saveTimer) });
}

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

    // 监听消息
    webviewView.webview.onDidReceiveMessage(
      message => {
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
            gameState = {
              coins: 0,
              coinsPerSecond: 1,
              totalCoinsEarned: 0,
              level: 1,
              upgrades: {
                basicMiner: { name: '基础矿工', count: 0, cost: 10, production: 1 },
                autoTyper: { name: '自动打字机', count: 0, cost: 50, production: 5 },
                codeGenerator: { name: '代码生成器', count: 0, cost: 200, production: 20 },
                aiAssistant: { name: 'AI助手', count: 0, cost: 1000, production: 100 },
                quantumCompiler: { name: '量子编译器', count: 0, cost: 5000, production: 500 }
              },
              achievements: [],
              startTime: Date.now()
            };
            achievements.forEach(a => a.unlocked = false);
            this.refresh();
            saveGameState(this._context);
            break;
        }
      }
    );

    // 每秒发送数据更新（不刷新HTML）
    const updateTimer = setInterval(() => {
      if (this._view) {
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
    });
  }

  refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent();
    }
  }

  _getHtmlContent() {
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
        </style>
      </head>
      <body>
        <!-- 标签导航 -->
        <div class="tabs-container">
          <button class="tab active" onclick="switchTab('home')">🏠 首页</button>
          <button class="tab" onclick="switchTab('upgrade')">🏭 升级</button>
          <button class="tab" onclick="switchTab('lottery')">🎰 抽奖</button>
          <button class="tab" onclick="switchTab('achievement')">🏆 成就</button>
          <button class="tab" onclick="switchTab('settings')">⚙️ 设置</button>
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
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          // 接收来自扩展的消息
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateGameState') {
              updateUI(message.data);
            } else if (message.command === 'upgradeSuccess') {
              handleUpgradeSuccess(message);
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
          function switchTab(tabName) {
            // 移除所有active类
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            // 添加active类到选中的标签
            event.target.classList.add('active');
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
        </script>
      </body>
      </html>
    `;
  }
}

// 当您的扩展被停用时调用
function deactivate() {}

module.exports = {
  activate,
  deactivate
};