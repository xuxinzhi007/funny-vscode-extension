// 游戏状态管理模块

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
  startTime: Date.now(),
  // 战斗系统状态
  battle: {
    wave: 1,
    gold: 0,
    experience: 0,
    playerLevel: 1,
    playerStats: {
      health: 100,
      attack: 15,
      defense: 5,
      critRate: 0.15,
      critDamage: 2.0,
      healthRegen: 2
    }
  }
};

/**
 * 获取游戏状态
 */
function getGameState() {
  return gameState;
}

/**
 * 设置游戏状态
 */
function setGameState(newState) {
  gameState = { ...gameState, ...newState };
}

/**
 * 重置游戏状态
 */
function resetGameState() {
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
    startTime: Date.now(),
    battle: {
      wave: 1,
      gold: 0,
      experience: 0,
      playerLevel: 1,
      playerStats: {
        health: 100,
        attack: 15,
        defense: 5,
        critRate: 0.15,
        critDamage: 2.0,
        healthRegen: 2
      }
    }
  };
}

/**
 * 计算每秒金币产出
 */
function calculateCoinsPerSecond() {
  let total = 1; // 基础产出
  for (const upgrade of Object.values(gameState.upgrades)) {
    total += upgrade.count * upgrade.production;
  }
  return total;
}

/**
 * 计算实际产出（包含加速效果）
 */
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

/**
 * 格式化数字显示
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return Math.floor(num).toString();
}

module.exports = {
  getGameState,
  setGameState,
  resetGameState,
  calculateCoinsPerSecond,
  getEffectiveProduction,
  formatNumber
};
