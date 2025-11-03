// 存档管理模块
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { getGameState, setGameState, calculateCoinsPerSecond } = require('./gameState');
const { syncAchievements } = require('./achievements');

/**
 * 获取存档文件路径
 */
function getSaveFilePath(context) {
  const storageUri = context.globalStorageUri;
  return path.join(storageUri.fsPath, 'game-save.json');
}

/**
 * 确保存储目录存在
 */
function ensureStorageDirectory(context) {
  const storageUri = context.globalStorageUri;
  if (!fs.existsSync(storageUri.fsPath)) {
    fs.mkdirSync(storageUri.fsPath, { recursive: true });
  }
}

/**
 * 保存游戏状态
 */
function saveGameState(context) {
  try {
    ensureStorageDirectory(context);
    const saveFilePath = getSaveFilePath(context);
    const gameState = getGameState();
    const saveData = {
      ...gameState,
      version: '1.0.0',
      savedAt: new Date().toISOString()
    };
    fs.writeFileSync(saveFilePath, JSON.stringify(saveData, null, 2), 'utf8');
    console.log(`游戏数据已保存到: ${saveFilePath}`);
  } catch (error) {
    console.error('保存游戏数据失败:', error);
    vscode.window.showErrorMessage(`保存游戏数据失败: ${error.message}`);
  }
}

/**
 * 加载游戏状态
 */
function loadGameState(context) {
  try {
    const saveFilePath = getSaveFilePath(context);

    // 如果文件不存在，尝试从旧的globalState迁移
    if (!fs.existsSync(saveFilePath)) {
      console.log('存档文件不存在，尝试从globalState迁移数据...');
      const oldSavedState = context.globalState.get('idleGameState');
      if (oldSavedState) {
        console.log('发现旧存档，正在迁移...');
        setGameState(oldSavedState);
        syncAchievements();
        saveGameState(context);
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
    setGameState(savedState);

    // 同步成就解锁状态（防止重复弹窗）
    syncAchievements();

    // 计算离线收益
    const gameState = getGameState();
    if (savedState.lastSaveTime) {
      const offlineTime = Math.min(Date.now() - savedState.lastSaveTime, 3600000); // 最多1小时
      const offlineCoins = Math.floor((offlineTime / 1000) * gameState.coinsPerSecond);
      if (offlineCoins > 0) {
        gameState.coins += offlineCoins;
        gameState.totalCoinsEarned += offlineCoins;
        const formatNumber = require('./gameState').formatNumber;
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

/**
 * 打开存档文件夹
 */
function openSaveFolder(context) {
  try {
    const saveFilePath = getSaveFilePath(context);
    const folderPath = path.dirname(saveFilePath);

    ensureStorageDirectory(context);

    vscode.env.openExternal(vscode.Uri.file(folderPath));
    vscode.window.showInformationMessage(`📁 存档文件夹已打开\n路径: ${folderPath}`);
  } catch (error) {
    vscode.window.showErrorMessage(`打开文件夹失败: ${error.message}`);
  }
}

/**
 * 显示存档信息
 */
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

/**
 * 备份存档
 */
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

module.exports = {
  getSaveFilePath,
  ensureStorageDirectory,
  saveGameState,
  loadGameState,
  openSaveFolder,
  showSaveInfo,
  backupGameSave
};
