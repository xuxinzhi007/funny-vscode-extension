/**
 * 编程搭子 - 行为系统
 */

const { getState, saveState } = require('./state');
const { getEventBus } = require('../../core/eventBus');

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
 * 获取当前表情
 */
function getCurrentEmoji() {
  const state = getState();
  const { SKINS } = require('./skins');
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
 * 清理
 */
function dispose() {
  if (behaviorTimer) clearTimeout(behaviorTimer);
}

module.exports = {
  BEHAVIOR_EMOJIS,
  changeBehavior,
  getCurrentEmoji,
  dispose
};
