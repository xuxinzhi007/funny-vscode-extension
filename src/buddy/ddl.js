/**
 * 编程搭子 - DDL 任务管理
 */

const vscode = require('vscode');
const { getState, saveState } = require('./state');
const { getEventBus } = require('../core/eventBus');

let checkTimer = null;

/**
 * 初始化 DDL 管理器
 */
function initDDL() {
  // 每分钟检查一次 DDL
  checkTimer = setInterval(checkDDLs, 60000);
  checkDDLs(); // 立即检查一次
}

/**
 * 添加 DDL 任务
 */
function addTask(name, deadline, description = '') {
  const state = getState();
  
  const task = {
    id: Date.now().toString(),
    name,
    deadline: deadline.toISOString(),
    description,
    completed: false,
    createdAt: new Date().toISOString(),
    reminded: false
  };
  
  state.ddlTasks.push(task);
  saveState();
  
  getEventBus().emit('ddl:added', { task });
  
  return task;
}

/**
 * 完成任务
 */
function completeTask(taskId) {
  const state = getState();
  const task = state.ddlTasks.find(t => t.id === taskId);
  
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    saveState();
    
    getEventBus().emit('ddl:completed', { task });
    return true;
  }
  
  return false;
}

/**
 * 删除任务
 */
function deleteTask(taskId) {
  const state = getState();
  const index = state.ddlTasks.findIndex(t => t.id === taskId);
  
  if (index !== -1) {
    const task = state.ddlTasks.splice(index, 1)[0];
    saveState();
    
    getEventBus().emit('ddl:deleted', { task });
    return true;
  }
  
  return false;
}

/**
 * 获取所有任务
 */
function getTasks() {
  return getState().ddlTasks;
}

/**
 * 获取待完成任务
 */
function getPendingTasks() {
  return getState().ddlTasks.filter(t => !t.completed);
}

/**
 * 获取任务倒计时
 */
function getTaskCountdown(taskId) {
  const state = getState();
  const task = state.ddlTasks.find(t => t.id === taskId);
  
  if (!task) return null;
  
  const now = new Date();
  const deadline = new Date(task.deadline);
  const diff = deadline - now;
  
  if (diff < 0) {
    return { overdue: true, text: '已过期', hours: 0, minutes: 0 };
  }
  
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  
  let text;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    text = `${days}天${hours % 24}小时`;
  } else if (hours > 0) {
    text = `${hours}小时${minutes}分钟`;
  } else {
    text = `${minutes}分钟`;
  }
  
  return { overdue: false, text, hours, minutes, totalMinutes: hours * 60 + minutes };
}

/**
 * 检查 DDL 状态
 */
function checkDDLs() {
  const state = getState();
  const now = new Date();
  
  for (const task of state.ddlTasks) {
    if (task.completed) continue;
    
    const deadline = new Date(task.deadline);
    const hoursLeft = (deadline - now) / 3600000;
    
    // 已过期
    if (hoursLeft < 0) {
      if (!task.reminded) {
        task.reminded = true;
        vscode.window.showWarningMessage(
          `⚠️ DDL "${task.name}" 已过期！`,
          '标记完成',
          '删除'
        ).then(action => {
          if (action === '标记完成') completeTask(task.id);
          else if (action === '删除') deleteTask(task.id);
        });
      }
    }
    // 2小时内
    else if (hoursLeft < 2 && !task.reminded) {
      task.reminded = true;
      getEventBus().emit('ddl:urgent', { task, hoursLeft });
      
      vscode.window.showWarningMessage(
        `😰 "${task.name}" 还有不到 ${Math.ceil(hoursLeft * 60)} 分钟就截止了！`,
        '我知道了'
      );
    }
    // 24小时内（只提醒一次）
    else if (hoursLeft < 24 && hoursLeft >= 2 && !task.reminded) {
      // 不设置 reminded，让 2 小时时再提醒
      getEventBus().emit('ddl:approaching', { task, hoursLeft });
    }
  }
  
  saveState();
}

/**
 * 获取最近的 DDL
 */
function getNextDDL() {
  const pending = getPendingTasks();
  if (pending.length === 0) return null;
  
  pending.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  return pending[0];
}

/**
 * 清理
 */
function dispose() {
  if (checkTimer) clearInterval(checkTimer);
}

module.exports = {
  initDDL,
  addTask,
  completeTask,
  deleteTask,
  getTasks,
  getPendingTasks,
  getTaskCountdown,
  getNextDDL,
  dispose
};
