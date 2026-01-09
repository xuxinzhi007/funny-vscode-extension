/**
 * 编程搭子 - 核心模块（协调者）
 * 管理搭子整体逻辑和事件响应
 */

const { getState, saveState } = require('./state');
const { getEventBus } = require('../../core/eventBus');
const { changeBehavior, getCurrentEmoji } = require('./behavior');
const { changeSkin, checkSkinUnlocks, getAllSkins, SKINS } = require('./skins');

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
 * 启动状态衰减（每分钟）
 */
function startStateDecay() {
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
 * 清理
 */
function dispose() {
  if (stateDecayTimer) clearInterval(stateDecayTimer);
}

module.exports = {
  initBuddy,
  interact,
  changeBehavior,
  changeSkin,
  getCurrentEmoji,
  getAllSkins,
  SKINS,
  dispose
};
