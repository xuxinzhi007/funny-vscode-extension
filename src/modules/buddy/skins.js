/**
 * 编程搭子 - 皮肤系统
 */

const { getState, saveState } = require('./state');
const { getEventBus } = require('../../core/eventBus');

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
        currentValue = stats.today.ddlsCompleted;
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
 * 获取所有皮肤
 */
function getAllSkins() {
  return Object.values(SKINS);
}

module.exports = {
  SKINS,
  changeSkin,
  checkSkinUnlocks,
  getAllSkins
};
