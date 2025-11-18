const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * 宠物皮肤管理器
 * 管理宠物皮肤、动画、外观
 */
class SkinManager {
  constructor() {
    this.logger = getLogger();
    this.eventBus = getEventBus();

    // 皮肤定义
    this.skins = {
      default: {
        id: 'default',
        name: '默认小猫',
        emoji: '🐱',
        unlockCondition: 'default',
        animations: {
          idle: '🐱',
          working: '💻',
          happy: '😊',
          celebrating: '🎉',
          sleeping: '😴',
          reminding: '⏰',
          worried: '😰'
        }
      },
      dog: {
        id: 'dog',
        name: '忠诚小狗',
        emoji: '🐶',
        unlockCondition: { level: 3 },
        animations: {
          idle: '🐶',
          working: '🦮',
          happy: '😊',
          celebrating: '🎉',
          sleeping: '😴',
          reminding: '🔔',
          worried: '😰'
        }
      },
      panda: {
        id: 'panda',
        name: '可爱熊猫',
        emoji: '🐼',
        unlockCondition: { level: 5 },
        animations: {
          idle: '🐼',
          working: '🎋',
          happy: '😊',
          celebrating: '🎊',
          sleeping: '😴',
          reminding: '⏰',
          worried: '😢'
        }
      },
      robot: {
        id: 'robot',
        name: '机器人',
        emoji: '🤖',
        unlockCondition: { coinsSpent: 1000 },
        animations: {
          idle: '🤖',
          working: '⚙️',
          happy: '😊',
          celebrating: '✨',
          sleeping: '💤',
          reminding: '📢',
          worried: '⚠️'
        }
      },
      dragon: {
        id: 'dragon',
        name: '神龙',
        emoji: '🐉',
        unlockCondition: { level: 10, ddlsCompleted: 50 },
        animations: {
          idle: '🐉',
          working: '🔥',
          happy: '😊',
          celebrating: '🎆',
          sleeping: '😴',
          reminding: '💥',
          worried: '😰'
        }
      },
      unicorn: {
        id: 'unicorn',
        name: '独角兽',
        emoji: '🦄',
        unlockCondition: { level: 15, imagesGenerated: 100 },
        animations: {
          idle: '🦄',
          working: '✨',
          happy: '😊',
          celebrating: '🌈',
          sleeping: '😴',
          reminding: '⭐',
          worried: '😢'
        }
      }
    };

    // Lottie动画URL (可选,未来扩展)
    this.lottieAnimations = {
      // 可以添加Lottie JSON动画URL
      // 例如: 'cat-idle': 'https://assets.lottiefiles.com/...'
    };
  }

  /**
   * 获取所有皮肤
   */
  getAllSkins() {
    return Object.values(this.skins);
  }

  /**
   * 获取特定皮肤
   */
  getSkin(skinId) {
    return this.skins[skinId] || this.skins.default;
  }

  /**
   * 检查皮肤是否已解锁
   */
  isSkinUnlocked(skinId, gameState) {
    const skin = this.skins[skinId];
    if (!skin) return false;

    const condition = skin.unlockCondition;

    // 默认皮肤始终解锁
    if (condition === 'default') return true;

    // 检查等级
    if (condition.level && gameState.pet.level < condition.level) {
      return false;
    }

    // 检查金币消费
    if (condition.coinsSpent && gameState.totalCoinsSpent < condition.coinsSpent) {
      return false;
    }

    // 检查DDL完成数
    if (condition.ddlsCompleted && gameState.pet.statistics.ddlsCompleted < condition.ddlsCompleted) {
      return false;
    }

    // 检查图片生成数
    if (condition.imagesGenerated && gameState.pet.statistics.imagesGenerated < condition.imagesGenerated) {
      return false;
    }

    return true;
  }

  /**
   * 获取已解锁的皮肤列表
   */
  getUnlockedSkins(gameState) {
    return Object.keys(this.skins).filter(skinId =>
      this.isSkinUnlocked(skinId, gameState)
    );
  }

  /**
   * 获取皮肤动画
   */
  getSkinAnimation(skinId, behavior) {
    const skin = this.getSkin(skinId);
    return skin.animations[behavior] || skin.animations.idle;
  }

  /**
   * 检查新解锁的皮肤
   */
  checkNewUnlocks(gameState) {
    const newUnlocks = [];

    for (const skinId of Object.keys(this.skins)) {
      // 跳过已解锁的
      if (gameState.pet.unlockedSkins.includes(skinId)) {
        continue;
      }

      // 检查是否满足解锁条件
      if (this.isSkinUnlocked(skinId, gameState)) {
        newUnlocks.push(skinId);
      }
    }

    return newUnlocks;
  }

  /**
   * 获取皮肤解锁提示
   */
  getUnlockHint(skinId, gameState) {
    const skin = this.skins[skinId];
    if (!skin || skin.unlockCondition === 'default') {
      return null;
    }

    const condition = skin.unlockCondition;
    const hints = [];

    if (condition.level) {
      const current = gameState.pet.level;
      if (current < condition.level) {
        hints.push(`等级 ${current}/${condition.level}`);
      }
    }

    if (condition.coinsSpent) {
      const current = gameState.totalCoinsSpent || 0;
      if (current < condition.coinsSpent) {
        hints.push(`消费金币 ${current}/${condition.coinsSpent}`);
      }
    }

    if (condition.ddlsCompleted) {
      const current = gameState.pet.statistics.ddlsCompleted;
      if (current < condition.ddlsCompleted) {
        hints.push(`完成DDL ${current}/${condition.ddlsCompleted}`);
      }
    }

    if (condition.imagesGenerated) {
      const current = gameState.pet.statistics.imagesGenerated;
      if (current < condition.imagesGenerated) {
        hints.push(`生成截图 ${current}/${condition.imagesGenerated}`);
      }
    }

    return hints.length > 0 ? hints.join(', ') : '已解锁';
  }

  /**
   * 加载Lottie动画(未来扩展)
   */
  async loadLottieAnimation(animationId) {
    const url = this.lottieAnimations[animationId];
    if (!url) return null;

    try {
      // 这里可以添加实际的Lottie加载逻辑
      // 例如使用lottie-web库
      this.logger.info(`Loading Lottie animation: ${animationId}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to load Lottie animation: ${animationId}`, error);
      return null;
    }
  }
}

// 单例模式
let skinManagerInstance = null;

function getSkinManager() {
  if (!skinManagerInstance) {
    skinManagerInstance = new SkinManager();
  }
  return skinManagerInstance;
}

module.exports = {
  SkinManager,
  getSkinManager
};
