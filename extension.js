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
    const rate = formatNumber(gameState.coinsPerSecond);
    coinStatusBarItem.text = `$(star-full) ${coins} (+${rate}/s)`;
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
    gameState.coins += gameState.coinsPerSecond;
    gameState.totalCoinsEarned += gameState.coinsPerSecond;
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
            this.refresh();
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
                this.refresh();
                saveGameState(this._context);
              }
            }
            break;

          case 'showSaveInfo':
            showSaveInfo(this._context);
            break;

          case 'backupSave':
            backupGameSave(this._context);
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

    // 每秒更新视图
    const updateTimer = setInterval(() => {
      if (this._view) {
        this.refresh();
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

        <div class="section">
          <div class="title">
            <span>🏭 自动化升级</span>
          </div>
          ${upgradesList}
        </div>

        <div class="section">
          <div class="title">
            <span>🏆 成就 (${gameState.achievements.length}/${achievements.length})</span>
          </div>
          ${achievementsList}
        </div>

        <button class="save-btn" onclick="showSaveInfo()">📁 存档信息</button>
        <button class="save-btn" onclick="backupSave()">💾 备份存档</button>
        <button class="reset-btn" onclick="resetGame()">重置游戏</button>

        <script>
          const vscode = acquireVsCodeApi();

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