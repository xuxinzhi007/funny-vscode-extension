/**
 * 编程搭子 - 核心模块
 * 管理搭子的行为、状态变化和事件响应
 */

const { getState, updateState, saveState } = require('./state');
const { getEventBus } = require('../core/eventBus');

// 皮肤定义
const SKINS = {
  default: { id: 'default', name: '默认小猫', emoji: '😺', unlockCondition: null },
  sleepy: { id: 'sleepy', name: '瞌睡猫', emoji: '😴', unlockCondition: { type: 'focusMinutes', value: 500 } },
  cool: { id: 'cool', name: '酷猫', emoji: '😎', unlockCondition: { type: 'codingDays', value: 7 } },
  star: { id: 'star', name: '明星猫', emoji: '🌟', unlockCondition: { type: 'totalLines', value: 5000 } },
  ninja: { id: 'ninja', name: '忍者猫', emoji: '🥷', unlockCondition: { type: 'ddlsCompleted', value: 20 } },
  robot: { id: 'robot', name: '机器猫', emoji: '🤖', unlockCondition: { type: 'streak', value: 14 } },
  party: { id: 'party', name: '派对猫', emoji: '🥳', unlockCondition: { type: 'focusMinutes', value: 1500 } }
};

// 行为对应的表情
const BEHAVIOR_EMOJIS = {
  idle: ['😺', '🐱', '😸'],
  working: ['💻', '⌨️', '🧑‍💻'],
  resting: ['☕', '🧘', '😌'],
  celebrating: ['🎉', '🥳', '✨'],
  sleepy: ['😴', '💤', '🥱'],
  anxious: ['😰', '😟', '⚠️'],
  happy: ['😸', '😻', '💕']
};

let behaviorTimer = null;
let stateDecayTimer = null;

/**
 * 初始化搭子系统
 */
function initBuddy() {
  const eventBus = getEventBus();
  
  // 启动状态衰减
  startStateDecay();
  
  // 监听代码变化
  eventBus.on('code:changed', handleCodeChange);
  
  // 监听专注模式事件
  eventBus.on('focus:completed', handleFocusCompleted);
  eventBus.on('focus:started', () => changeBehavior('working'));
  eventBus.on('focus:stopped', () => changeBehavior('idle'));
  
  // 监听 DDL 事件
  eventBus.on('ddl:completed', handleDDLCompleted);
  eventBus.on('ddl:urgent', () => changeBehavior('anxious', 30000));
  
  console.log('Buddy system initialized');
}

/**
 * 处理代码变化
 */
function handleCodeChange(data) {
  const state = getState();
  
  // 更新统计
  if (data.linesAdded) {
    state.stats.today.linesAdded += data.linesAdded;
    state.stats.total.totalLines += data.linesAdded;
  }
  if (data.linesDeleted) {
    state.stats.today.linesDeleted += data.linesDeleted;
  }
  if (data.fileName) {
    state.stats.today.filesModified.add(data.fileName);
  }
  
  // 更新搭子状态
  state.buddy.lastInteraction = Date.now();
  
  // 如果在空闲状态，切换到工作状态
  if (state.buddy.behavior === 'idle' || state.buddy.behavior === 'sleepy') {
    changeBehavior('working');
  }
  
  // 增加一点心情和经验
  state.buddy.mood = Math.min(100, state.buddy.mood + 0.5);
  state.buddy.exp += 1;
  checkLevelUp();
  
  // 检查皮肤解锁
  checkSkinUnlocks();
  
  saveState();
}

/**
 * 处理专注完成
 */
function handleFocusCompleted(data) {
  const state = getState();
  
  if (data.type === 'work') {
    // 增加统计
    state.stats.today.focusMinutes += data.minutes || 25;
    state.stats.total.totalFocusMinutes += data.minutes || 25;
    
    // 增加经验和心情
    state.buddy.exp += 20;
    state.buddy.mood = Math.min(100, state.buddy.mood + 10);
    
    checkLevelUp();
    checkSkinUnlocks();
    
    // 庆祝
    changeBehavior('celebrating', 5000);
  }
  
  saveState();
}

/**
 * 处理 DDL 完成
 */
function handleDDLCompleted() {
  const state = getState();
  
  state.stats.today.ddlsCompleted++;
  state.buddy.exp += 15;
  state.buddy.mood = Math.min(100, state.buddy.mood + 15);
  
  checkLevelUp();
  checkSkinUnlocks();
  changeBehavior('celebrating', 5000);
  
  saveState();
}

/**
 * 改变搭子行为
 */
function changeBehavior(behavior, duration = 0) {
  const state = getState();
  state.buddy.behavior = behavior;
  
  getEventBus().emit('buddy:behaviorChanged', { behavior });
  
  // 如果有持续时间，之后恢复到 idle
  if (duration > 0) {
    if (behaviorTimer) clearTimeout(behaviorTimer);
    behaviorTimer = setTimeout(() => {
      state.buddy.behavior = 'idle';
      getEventBus().emit('buddy:behaviorChanged', { behavior: 'idle' });
    }, duration);
  }
}

/**
 * 启动状态衰减
 */
function startStateDecay() {
  // 每分钟衰减一次
  stateDecayTimer = setInterval(() => {
    const state = getState();
    
    // 心情和能量缓慢下降
    state.buddy.mood = Math.max(0, state.buddy.mood - 0.3);
    state.buddy.energy = Math.max(0, state.buddy.energy - 0.2);
    
    // 长时间没有交互
    const idleTime = Date.now() - state.buddy.lastInteraction;
    if (idleTime > 3600000) { // 1小时
      if (state.buddy.behavior !== 'sleepy') {
        changeBehavior('sleepy');
      }
    }
    
    // 检查 DDL 紧急程度
    checkUrgentDDL();
    
    getEventBus().emit('buddy:stateUpdated', state.buddy);
  }, 60000);
}

/**
 * 检查紧急 DDL
 */
function checkUrgentDDL() {
  const state = getState();
  const tasks = state.ddlTasks.filter(t => !t.completed);
  
  for (const task of tasks) {
    const hours = (new Date(task.deadline) - new Date()) / 3600000;
    if (hours > 0 && hours < 2) {
      getEventBus().emit('ddl:urgent', { task });
      break;
    }
  }
}

/**
 * 检查升级
 */
function checkLevelUp() {
  const state = getState();
  const requiredExp = state.buddy.level * 100;
  
  if (state.buddy.exp >= requiredExp) {
    state.buddy.level++;
    state.buddy.exp -= requiredExp;
    getEventBus().emit('buddy:levelUp', { level: state.buddy.level });
    changeBehavior('celebrating', 5000);
  }
}

/**
 * 检查皮肤解锁
 */
function checkSkinUnlocks() {
  const state = getState();
  const stats = state.stats;
  
  for (const [id, skin] of Object.entries(SKINS)) {
    if (state.buddy.unlockedSkins.includes(id)) continue;
    if (!skin.unlockCondition) continue;
    
    const { type, value } = skin.unlockCondition;
    let currentValue = 0;
    
    switch (type) {
      case 'focusMinutes':
        currentValue = stats.total.totalFocusMinutes;
        break;
      case 'codingDays':
        currentValue = stats.total.codingDays;
        break;
      case 'totalLines':
        currentValue = stats.total.totalLines;
        break;
      case 'ddlsCompleted':
        currentValue = stats.today.ddlsCompleted; // 简化，实际应该是总数
        break;
      case 'streak':
        currentValue = stats.total.currentStreak;
        break;
    }
    
    if (currentValue >= value) {
      state.buddy.unlockedSkins.push(id);
      getEventBus().emit('buddy:skinUnlocked', { skin });
    }
  }
}

/**
 * 与搭子互动
 */
function interact(action) {
  const state = getState();
  state.buddy.lastInteraction = Date.now();
  
  switch (action) {
    case 'pet':
      state.buddy.mood = Math.min(100, state.buddy.mood + 10);
      changeBehavior('happy', 3000);
      break;
    case 'feed':
      state.buddy.energy = Math.min(100, state.buddy.energy + 20);
      changeBehavior('happy', 3000);
      break;
    case 'play':
      state.buddy.mood = Math.min(100, state.buddy.mood + 15);
      state.buddy.energy = Math.max(0, state.buddy.energy - 10);
      changeBehavior('celebrating', 5000);
      break;
  }
  
  saveState();
  getEventBus().emit('buddy:interacted', { action });
}

/**
 * 切换皮肤
 */
function changeSkin(skinId) {
  const state = getState();
  if (state.buddy.unlockedSkins.includes(skinId)) {
    state.buddy.currentSkin = skinId;
    saveState();
    getEventBus().emit('buddy:skinChanged', { skinId });
    return true;
  }
  return false;
}

/**
 * 获取当前表情
 */
function getCurrentEmoji() {
  const state = getState();
  const skin = SKINS[state.buddy.currentSkin];
  
  // 如果是特殊行为，使用行为表情
  if (state.buddy.behavior !== 'idle') {
    const emojis = BEHAVIOR_EMOJIS[state.buddy.behavior];
    if (emojis) {
      return emojis[Math.floor(Math.random() * emojis.length)];
    }
  }
  
  return skin?.emoji || '😺';
}

/**
 * 获取所有皮肤
 */
function getAllSkins() {
  return Object.values(SKINS);
}

/**
 * 清理
 */
function dispose() {
  if (behaviorTimer) clearTimeout(behaviorTimer);
  if (stateDecayTimer) clearInterval(stateDecayTimer);
}

module.exports = {
  initBuddy,
  interact,
  changeSkin,
  changeBehavior,
  getCurrentEmoji,
  getAllSkins,
  SKINS,
  BEHAVIOR_EMOJIS,
  dispose
};
