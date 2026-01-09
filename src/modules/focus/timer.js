/**
 * 编程搭子 - 专注模式（番茄钟）
 */

const vscode = require('vscode');
const { getState, saveState } = require('../buddy/state');
const { getEventBus } = require('../../core/eventBus');

let tickInterval = null;

/**
 * 开始工作专注
 */
function startWork(customMinutes) {
  const state = getState();
  
  if (state.focus.isActive && !state.focus.isPaused) {
    return { success: false, message: '专注模式已在进行中' };
  }
  
  // 如果是暂停状态，先停止
  if (state.focus.isActive && state.focus.isPaused) {
    stop();
  }
  
  const minutes = customMinutes || state.settings.focusWorkMinutes;
  const seconds = minutes * 60;
  
  state.focus.isActive = true;
  state.focus.isPaused = false;
  state.focus.type = 'work';
  state.focus.totalSeconds = seconds;
  state.focus.remainingSeconds = seconds;
  
  startTimer();
  saveState();
  
  getEventBus().emit('focus:started', { type: 'work', minutes });
  
  return { success: true, message: `开始 ${minutes} 分钟专注` };
}

/**
 * 开始休息
 */
function startBreak(isLongBreak = false) {
  const state = getState();
  
  if (state.focus.isActive && !state.focus.isPaused) {
    return { success: false, message: '请先结束当前专注' };
  }
  
  // 如果是暂停状态，先停止
  if (state.focus.isActive && state.focus.isPaused) {
    stop();
  }
  
  const minutes = isLongBreak 
    ? state.settings.focusLongBreakMinutes 
    : state.settings.focusBreakMinutes;
  const seconds = minutes * 60;
  
  state.focus.isActive = true;
  state.focus.isPaused = false;
  state.focus.type = 'break';
  state.focus.totalSeconds = seconds;
  state.focus.remainingSeconds = seconds;
  
  startTimer();
  saveState();
  
  getEventBus().emit('focus:started', { type: 'break', minutes, isLongBreak });
  
  return { success: true, message: `开始 ${minutes} 分钟休息` };
}

/**
 * 暂停
 */
function pause() {
  const state = getState();
  
  if (!state.focus.isActive || state.focus.isPaused) {
    return { success: false, message: '没有可暂停的专注' };
  }
  
  state.focus.isPaused = true;
  stopTimer();
  saveState();
  
  getEventBus().emit('focus:paused');
  
  return { success: true, message: '已暂停' };
}

/**
 * 继续
 */
function resume() {
  const state = getState();
  
  if (!state.focus.isActive || !state.focus.isPaused) {
    return { success: false, message: '没有可继续的专注' };
  }
  
  state.focus.isPaused = false;
  startTimer();
  saveState();
  
  getEventBus().emit('focus:resumed');
  
  return { success: true, message: '继续专注' };
}

/**
 * 停止
 */
function stop() {
  const state = getState();
  
  if (!state.focus.isActive) {
    return { success: false, message: '没有进行中的专注' };
  }
  
  state.focus.isActive = false;
  state.focus.isPaused = false;
  state.focus.remainingSeconds = 0;
  
  stopTimer();
  saveState();
  
  getEventBus().emit('focus:stopped');
  
  return { success: true, message: '已停止' };
}

/**
 * 启动计时器
 */
function startTimer() {
  stopTimer();
  
  tickInterval = setInterval(() => {
    const state = getState();
    
    if (!state.focus.isActive || state.focus.isPaused) {
      return;
    }
    
    state.focus.remainingSeconds--;
    
    getEventBus().emit('focus:tick', {
      remaining: state.focus.remainingSeconds,
      total: state.focus.totalSeconds,
      type: state.focus.type
    });
    
    if (state.focus.remainingSeconds <= 0) {
      completeSession();
    }
  }, 1000);
}

/**
 * 停止计时器
 */
function stopTimer() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

/**
 * 完成一个专注周期
 */
function completeSession() {
  const state = getState();
  const type = state.focus.type;
  const minutes = Math.floor(state.focus.totalSeconds / 60);
  
  state.focus.isActive = false;
  state.focus.isPaused = false;
  
  stopTimer();
  
  if (type === 'work') {
    state.focus.completedToday++;
    state.focus.completedTotal++;
    
    // 判断是否该长休息
    const isLongBreakTime = state.focus.completedToday % state.settings.sessionsUntilLongBreak === 0;
    
    getEventBus().emit('focus:completed', { 
      type: 'work', 
      minutes,
      completedToday: state.focus.completedToday,
      isLongBreakTime
    });
    
    // 显示通知
    const breakType = isLongBreakTime ? '长休息' : '短休息';
    const breakMinutes = isLongBreakTime 
      ? state.settings.focusLongBreakMinutes 
      : state.settings.focusBreakMinutes;
    
    vscode.window.showInformationMessage(
      `🎉 完成第 ${state.focus.completedToday} 个番茄钟！要开始${breakType}吗？`,
      `开始${breakType} (${breakMinutes}分钟)`,
      '继续工作'
    ).then(action => {
      if (action?.startsWith('开始')) {
        startBreak(isLongBreakTime);
      }
    });
  } else {
    getEventBus().emit('focus:completed', { type: 'break', minutes });
    
    vscode.window.showInformationMessage(
      '☕ 休息结束！准备好继续工作了吗？',
      '开始工作'
    ).then(action => {
      if (action === '开始工作') {
        startWork();
      }
    });
  }
  
  saveState();
}

/**
 * 获取格式化的剩余时间
 */
function getFormattedTime() {
  const state = getState();
  const seconds = state.focus.remainingSeconds;
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 获取专注状态
 */
function getFocusState() {
  const state = getState();
  return {
    ...state.focus,
    formattedTime: getFormattedTime(),
    progress: state.focus.totalSeconds > 0 
      ? ((state.focus.totalSeconds - state.focus.remainingSeconds) / state.focus.totalSeconds) * 100 
      : 0
  };
}

/**
 * 清理
 */
function dispose() {
  stopTimer();
}

module.exports = {
  startWork,
  startBreak,
  pause,
  resume,
  stop,
  getFormattedTime,
  getFocusState,
  dispose
};
