// 抽奖系统模块
const vscode = require('vscode');
const { getGameState } = require('./gameState');
const { checkAchievements } = require('./achievements');

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

/**
 * 获取抽奖奖品列表
 */
function getLotteryPrizes() {
  return lotteryPrizes;
}

/**
 * 获取抽奖价格
 */
function getLotteryPrices() {
  return lotteryPrices;
}

/**
 * 根据概率抽取奖品
 */
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

/**
 * 发放奖励
 */
function grantPrize(prize, context) {
  const gameState = getGameState();

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

  // 保存游戏状态（需要在调用处处理）
  return gameState;
}

module.exports = {
  getLotteryPrizes,
  getLotteryPrices,
  drawPrize,
  grantPrize
};
