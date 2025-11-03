// 状态栏管理模块
const vscode = require('vscode');
const { getGameState, getEffectiveProduction, formatNumber } = require('../game/gameState');

let coinStatusBarItem = null;

/**
 * 创建状态栏项
 */
function createStatusBar() {
  coinStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  coinStatusBarItem.command = 'funny-vscode-extension.openSidebar';
  coinStatusBarItem.tooltip = "💰 挂机游戏\n点击打开侧边栏";
  updateStatusBar();
  coinStatusBarItem.show();
  return coinStatusBarItem;
}

/**
 * 更新状态栏显示
 */
function updateStatusBar() {
  if (!coinStatusBarItem) return;

  const gameState = getGameState();
  const coins = formatNumber(gameState.coins);
  const effectiveRate = getEffectiveProduction();
  const rate = formatNumber(effectiveRate);

  let boostText = '';
  if (gameState.activeBoosts && gameState.activeBoosts.length > 0) {
    const boost = gameState.activeBoosts[0];
    const remainingTime = Math.ceil((boost.endTime - Date.now()) / 1000);
    boostText = ` 🚀${boost.multiplier}x`;
  }

  const achievementsModule = require('../game/achievements');
  const achievements = achievementsModule.getAchievements();

  coinStatusBarItem.text = `$(star-full) ${coins} (+${rate}/s)${boostText}`;
  coinStatusBarItem.tooltip = `💰 金币: ${coins}\n⚡ 产出: +${rate}/秒\n🏆 成就: ${gameState.achievements.length}/${achievements.length}\n\n点击打开游戏面板`;
}

module.exports = {
  createStatusBar,
  updateStatusBar
};
