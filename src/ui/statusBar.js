/**
 * 编程搭子 - 状态栏
 * 显示搭子状态、DDL、专注模式
 */

const vscode = require('vscode');
const { getState } = require('../buddy/state');
const { getCurrentEmoji } = require('../buddy/buddy');
const { getNextDDL, getTaskCountdown } = require('../buddy/ddl');
const { getFocusState, getFormattedTime } = require('../buddy/focus');
const { getEventBus } = require('../core/eventBus');

let statusBarItem = null;
let updateTimer = null;

/**
 * 创建状态栏
 */
function createStatusBar() {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  
  statusBarItem.command = 'coding-buddy.openPanel';
  statusBarItem.tooltip = '点击打开编程搭子';
  
  // 初始更新
  updateStatusBar();
  
  // 定时更新（每秒，用于专注模式倒计时）
  updateTimer = setInterval(updateStatusBar, 1000);
  
  // 监听事件更新
  const eventBus = getEventBus();
  eventBus.on('buddy:stateUpdated', updateStatusBar);
  eventBus.on('buddy:behaviorChanged', updateStatusBar);
  eventBus.on('focus:tick', updateStatusBar);
  eventBus.on('focus:started', updateStatusBar);
  eventBus.on('focus:stopped', updateStatusBar);
  eventBus.on('ddl:added', updateStatusBar);
  eventBus.on('ddl:completed', updateStatusBar);
  
  statusBarItem.show();
  
  return statusBarItem;
}

/**
 * 更新状态栏显示
 */
function updateStatusBar() {
  if (!statusBarItem) return;
  
  const state = getState();
  if (!state) return;
  
  const parts = [];
  
  // 1. 搭子表情和名字
  const emoji = getCurrentEmoji();
  parts.push(`${emoji} ${state.buddy.name}`);
  
  // 2. 专注模式（如果激活）
  const focus = getFocusState();
  if (focus.isActive) {
    const icon = focus.type === 'work' ? '🍅' : '☕';
    const time = getFormattedTime();
    parts.push(`${icon} ${time}`);
  }
  
  // 3. DDL 提醒
  const nextDDL = getNextDDL();
  if (nextDDL) {
    const countdown = getTaskCountdown(nextDDL.id);
    if (countdown) {
      if (countdown.overdue) {
        parts.push(`⚠️ DDL过期!`);
      } else if (countdown.totalMinutes < 120) {
        parts.push(`⏰ ${countdown.text}`);
      } else {
        // 只显示有几个 DDL
        const pendingCount = state.ddlTasks.filter(t => !t.completed).length;
        if (pendingCount > 0) {
          parts.push(`📋 ${pendingCount}个DDL`);
        }
      }
    }
  }
  
  // 4. 今日统计（简化）
  const lines = state.stats.today.linesAdded;
  if (lines > 0) {
    parts.push(`📊 ${lines}行`);
  }
  
  statusBarItem.text = parts.join(' | ');
  
  // 更新 tooltip
  statusBarItem.tooltip = buildTooltip(state, focus, nextDDL);
}

/**
 * 构建 tooltip
 */
function buildTooltip(state, focus, nextDDL) {
  const lines = [];
  
  lines.push(`🐱 ${state.buddy.name} Lv.${state.buddy.level}`);
  lines.push(`❤️ 心情: ${Math.round(state.buddy.mood)}%  ⚡ 能量: ${Math.round(state.buddy.energy)}%`);
  lines.push('');
  
  if (focus.isActive) {
    const type = focus.type === 'work' ? '专注中' : '休息中';
    lines.push(`🍅 ${type}: ${getFormattedTime()}`);
    lines.push(`   今日完成: ${focus.completedToday} 个番茄钟`);
    lines.push('');
  }
  
  if (nextDDL) {
    const countdown = getTaskCountdown(nextDDL.id);
    lines.push(`📋 最近DDL: ${nextDDL.name}`);
    lines.push(`   ${countdown?.overdue ? '已过期!' : `还剩 ${countdown?.text}`}`);
    lines.push('');
  }
  
  lines.push(`📊 今日: +${state.stats.today.linesAdded} 行代码`);
  lines.push(`🔥 连续编程: ${state.stats.total.currentStreak} 天`);
  lines.push('');
  lines.push('点击打开编程搭子面板');
  
  return lines.join('\n');
}

/**
 * 清理
 */
function dispose() {
  if (updateTimer) clearInterval(updateTimer);
  if (statusBarItem) statusBarItem.dispose();
}

module.exports = {
  createStatusBar,
  updateStatusBar,
  dispose
};
