const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * 宠物核心系统 - 管理宠物状态、行为和交互
 * 宠物是"搭子"的角色,陪伴程序员编程
 */
class PetCore {
  constructor() {
    this.logger = getLogger();
    this.eventBus = getEventBus();

    // 宠物状态
    this.state = {
      // 基础信息
      name: '小搭子',
      level: 1,
      exp: 0,
      mood: 100,
      energy: 100,

      // 外观
      currentSkin: 'default',
      unlockedSkins: ['default'],
      position: { x: 10, y: 10 }, // 相对于编辑器右下角
      visible: true,

      // 交互记录
      lastInteraction: Date.now(),
      totalInteractions: 0,

      // 宠物行为
      currentBehavior: 'idle', // idle, working, celebrating, reminding, sleeping
      behaviorStartTime: Date.now(),

      // DDL 提醒
      ddlTasks: [],

      // 统计
      statistics: {
        totalCodingTime: 0,
        ddlsCompleted: 0,
        imagesGenerated: 0,
        pomodorosCompleted: 0
      }
    };
  }

  /**
   * 初始化宠物系统
   */
  initialize(savedState) {
    if (savedState) {
      this.state = { ...this.state, ...savedState };
    }

    this.logger.info('Pet system initialized');

    // 启动宠物行为循环
    this.startBehaviorLoop();

    // 监听游戏事件
    this.setupEventListeners();
  }

  /**
   * 获取宠物状态
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 更新宠物状态
   */
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.eventBus.emit('pet:stateChanged', this.state);
  }

  /**
   * 与宠物交互
   */
  interact(action) {
    try {
      this.state.lastInteraction = Date.now();
      this.state.totalInteractions++;

      switch (action) {
        case 'pet':
          this.state.mood = Math.min(100, this.state.mood + 5);
          this.changeBehavior('happy', 3000);
          break;
        case 'feed':
          this.state.energy = Math.min(100, this.state.energy + 20);
          this.changeBehavior('eating', 5000);
          break;
        case 'play':
          this.state.mood = Math.min(100, this.state.mood + 10);
          this.state.energy = Math.max(0, this.state.energy - 10);
          this.changeBehavior('playing', 8000);
          break;
      }

      this.eventBus.emit('pet:interacted', { action, state: this.state });
      this.logger.info(`Pet interaction: ${action}`);
    } catch (error) {
      this.logger.error('Error during pet interaction:', error);
    }
  }

  /**
   * 改变宠物行为
   */
  changeBehavior(behavior, duration = 0) {
    this.state.currentBehavior = behavior;
    this.state.behaviorStartTime = Date.now();

    this.eventBus.emit('pet:behaviorChanged', { behavior, duration });

    if (duration > 0) {
      setTimeout(() => {
        if (this.state.currentBehavior === behavior) {
          this.state.currentBehavior = 'idle';
          this.eventBus.emit('pet:behaviorChanged', { behavior: 'idle', duration: 0 });
        }
      }, duration);
    }
  }

  /**
   * 启动宠物行为循环
   */
  startBehaviorLoop() {
    // 每分钟检查一次宠物状态
    setInterval(() => {
      // 缓慢降低心情和能量
      this.state.mood = Math.max(0, this.state.mood - 0.5);
      this.state.energy = Math.max(0, this.state.energy - 0.3);

      // 如果长时间没有交互,宠物会变得无聊
      const timeSinceInteraction = Date.now() - this.state.lastInteraction;
      if (timeSinceInteraction > 3600000) { // 1小时
        if (this.state.mood > 30) {
          this.changeBehavior('bored', 0);
        } else {
          this.changeBehavior('sleeping', 0);
        }
      }

      this.eventBus.emit('pet:stateChanged', this.state);
    }, 60000);
  }

  /**
   * 监听游戏事件
   */
  setupEventListeners() {
    // 编码时宠物陪伴
    this.eventBus.on('code:changed', () => {
      if (this.state.currentBehavior === 'idle' || this.state.currentBehavior === 'bored') {
        this.changeBehavior('working', 0);
      }
    });

    // 完成番茄钟
    this.eventBus.on('pomodoro:completed', (data) => {
      if (data.type === 'work') {
        this.state.statistics.pomodorosCompleted++;
        this.state.exp += 10;
        this.checkLevelUp();
        this.changeBehavior('celebrating', 5000);
      }
    });

    // 获得金币
    this.eventBus.on('coins:earned', (data) => {
      if (data.amount >= 100) {
        this.changeBehavior('celebrating', 2000);
      }
    });
  }

  /**
   * 检查升级
   */
  checkLevelUp() {
    const requiredExp = this.state.level * 100;
    if (this.state.exp >= requiredExp) {
      this.state.level++;
      this.state.exp -= requiredExp;
      this.eventBus.emit('pet:levelUp', { level: this.state.level });
      this.changeBehavior('celebrating', 8000);
    }
  }

  /**
   * 更新宠物位置
   */
  updatePosition(x, y) {
    this.state.position = { x, y };
    this.eventBus.emit('pet:positionChanged', { x, y });
  }

  /**
   * 切换宠物皮肤
   */
  changeSkin(skinId) {
    if (this.state.unlockedSkins.includes(skinId)) {
      this.state.currentSkin = skinId;
      this.eventBus.emit('pet:skinChanged', { skinId });
      return true;
    }
    return false;
  }

  /**
   * 解锁新皮肤
   */
  unlockSkin(skinId) {
    if (!this.state.unlockedSkins.includes(skinId)) {
      this.state.unlockedSkins.push(skinId);
      this.eventBus.emit('pet:skinUnlocked', { skinId });
      return true;
    }
    return false;
  }

  /**
   * 显示/隐藏宠物
   */
  toggleVisibility() {
    this.state.visible = !this.state.visible;
    this.eventBus.emit('pet:visibilityChanged', { visible: this.state.visible });
  }
}

// 单例模式
let petCoreInstance = null;

function getPetCore() {
  if (!petCoreInstance) {
    petCoreInstance = new PetCore();
  }
  return petCoreInstance;
}

module.exports = {
  PetCore,
  getPetCore
};
