// 成就系统模块
const vscode = require('vscode');
const { getGameState } = require('./gameState');

// 成就列表
const achievements = [
  { id: 'first_coin', name: '第一桶金', description: '获得第一枚金币', requirement: () => getGameState().totalCoinsEarned >= 1, unlocked: false },
  { id: 'hundred_coins', name: '小有所成', description: '获得100枚金币', requirement: () => getGameState().totalCoinsEarned >= 100, unlocked: false },
  { id: 'thousand_coins', name: '腰缠万贯', description: '获得1000枚金币', requirement: () => getGameState().totalCoinsEarned >= 1000, unlocked: false },
  { id: 'first_upgrade', name: '首次升级', description: '购买第一个升级', requirement: () => Object.values(getGameState().upgrades).some(u => u.count > 0), unlocked: false },
  { id: 'idle_master', name: '挂机大师', description: '运行时间超过1小时', requirement: () => (Date.now() - getGameState().startTime) > 3600000, unlocked: false },
  { id: 'coin_factory', name: '金币工厂', description: '每秒产出超过100金币', requirement: () => getGameState().coinsPerSecond >= 100, unlocked: false }
];

/**
 * 获取成就列表
 */
function getAchievements() {
  return achievements;
}

/**
 * 检查并解锁成就
 */
function checkAchievements() {
  const gameState = getGameState();

  achievements.forEach(achievement => {
    if (!achievement.unlocked && achievement.requirement()) {
      achievement.unlocked = true;
      gameState.achievements.push(achievement.id);
      vscode.window.showInformationMessage(`🏆 解锁成就: ${achievement.name} - ${achievement.description}`);
    }
  });
}

/**
 * 同步成就状态（从gameState.achievements恢复到achievements数组）
 */
function syncAchievements() {
  const gameState = getGameState();

  if (gameState.achievements && gameState.achievements.length > 0) {
    achievements.forEach(achievement => {
      if (gameState.achievements.includes(achievement.id)) {
        achievement.unlocked = true;
      }
    });
    console.log(`已同步 ${gameState.achievements.length} 个成就状态`);
  }
}

/**
 * 重置所有成就
 */
function resetAchievements() {
  achievements.forEach(a => a.unlocked = false);
}

module.exports = {
  getAchievements,
  checkAchievements,
  syncAchievements,
  resetAchievements
};
