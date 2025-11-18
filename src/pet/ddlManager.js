const vscode = require('vscode');
const { getEventBus } = require('../core/eventBus');
const { getLogger } = require('../utils/logger');

/**
 * DDL管理器 - 宠物提醒官
 * 宠物帮助记录、倒计时、触发提醒
 */
class DDLManager {
  constructor(petCore) {
    this.petCore = petCore;
    this.logger = getLogger();
    this.eventBus = getEventBus();

    // DDL任务列表
    this.tasks = [];

    // 检查定时器
    this.checkTimer = null;
  }

  /**
   * 初始化DDL管理器
   */
  initialize(savedTasks = []) {
    this.tasks = savedTasks;
    this.startCheckTimer();
    this.logger.info('DDL Manager initialized');
  }

  /**
   * 添加DDL任务
   */
  addTask(taskName, deadline) {
    const task = {
      id: Date.now().toString(),
      name: taskName,
      deadline: new Date(deadline),
      createdAt: new Date(),
      completed: false,
      reminded: false
    };

    this.tasks.push(task);
    this.eventBus.emit('ddl:taskAdded', task);

    // 宠物回应
    this.petCore.changeBehavior('acknowledging', 3000);

    return task;
  }

  /**
   * 完成DDL任务
   */
  completeTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      task.completed = true;
      task.completedAt = new Date();

      // 更新统计
      this.petCore.state.statistics.ddlsCompleted++;

      // 宠物庆祝
      this.petCore.changeBehavior('celebrating', 5000);

      this.eventBus.emit('ddl:taskCompleted', task);

      return task;
    }
    return null;
  }

  /**
   * 删除DDL任务
   */
  deleteTask(taskId) {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const task = this.tasks.splice(index, 1)[0];
      this.eventBus.emit('ddl:taskDeleted', task);
      return true;
    }
    return false;
  }

  /**
   * 获取所有任务
   */
  getTasks() {
    return [...this.tasks];
  }

  /**
   * 获取未完成任务
   */
  getPendingTasks() {
    return this.tasks.filter(t => !t.completed);
  }

  /**
   * 启动检查定时器
   */
  startCheckTimer() {
    // 每10秒检查一次DDL
    this.checkTimer = setInterval(() => {
      this.checkDeadlines();
    }, 10000);
  }

  /**
   * 检查截止时间
   */
  checkDeadlines() {
    try {
      const now = new Date();
      const pendingTasks = this.getPendingTasks();

      for (const task of pendingTasks) {
        // 确保deadline是Date对象
        const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
        const timeLeft = deadline.getTime() - now.getTime();
        const hoursLeft = timeLeft / (1000 * 60 * 60);

        // 小于3小时且大于0:气泡提示
        if (hoursLeft < 3 && hoursLeft > 0 && !task.reminded) {
          this.showDDLWarning(task, hoursLeft);
          task.reminded = true;
        }

        // 已过期
        if (timeLeft < 0 && !task.warned) {
          this.showDDLOverdue(task);
          task.warned = true;
        }
      }
    } catch (error) {
      this.logger.error('Error checking deadlines:', error);
    }
  }

  /**
   * 显示DDL警告(宠物气泡提示)
   */
  showDDLWarning(task, hoursLeft) {
    const hours = Math.floor(hoursLeft);
    const minutes = Math.floor((hoursLeft - hours) * 60);

    const message = `⏰ DDL 警告！还剩 ${hours} 小时 ${minutes} 分钟,喵口咖啡继续肝 ☕`;

    // 宠物行为变化
    this.petCore.changeBehavior('reminding', 5000);

    // 显示提醒
    vscode.window.showWarningMessage(message, '查看任务', '我知道了').then(selection => {
      if (selection === '查看任务') {
        this.eventBus.emit('ddl:showTaskList', {});
      }
    });

    this.eventBus.emit('ddl:warning', { task, hoursLeft });
  }

  /**
   * 显示DDL已过期
   */
  showDDLOverdue(task) {
    const message = `⚠️ DDL 已过期: "${task.name}"`;

    this.petCore.changeBehavior('worried', 5000);

    vscode.window.showErrorMessage(message, '标记完成', '查看任务').then(selection => {
      if (selection === '标记完成') {
        this.completeTask(task.id);
      } else if (selection === '查看任务') {
        this.eventBus.emit('ddl:showTaskList', {});
      }
    });

    this.eventBus.emit('ddl:overdue', { task });
  }

  /**
   * 获取任务倒计时信息
   */
  getTaskCountdown(taskId) {
    try {
      const task = this.tasks.find(t => t.id === taskId);
      if (!task) return null;

      const now = new Date();
      const deadline = task.deadline instanceof Date ? task.deadline : new Date(task.deadline);
      const timeLeft = deadline.getTime() - now.getTime();

      if (timeLeft < 0) {
        return { overdue: true, text: '已过期' };
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      let text = '';
      if (days > 0) text += `${days}天 `;
      if (hours > 0) text += `${hours}小时 `;
      if (minutes > 0 || text === '') text += `${minutes}分钟`;

      return { overdue: false, text: text.trim(), timeLeft, days, hours, minutes };
    } catch (error) {
      this.logger.error('Error getting task countdown:', error);
      return { overdue: false, text: '计算错误' };
    }
  }

  /**
   * 清理已完成的旧任务
   */
  cleanupOldTasks(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => {
      if (task.completed && task.completedAt) {
        return new Date(task.completedAt) > cutoffDate;
      }
      return true;
    });

    const cleaned = initialLength - this.tasks.length;
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} old tasks`);
      this.eventBus.emit('ddl:cleanedUp', { count: cleaned });
    }
  }

  /**
   * 停止检查定时器
   */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }
}

// 单例模式
let ddlManagerInstance = null;

function getDDLManager(petCore) {
  if (!ddlManagerInstance && petCore) {
    ddlManagerInstance = new DDLManager(petCore);
  }
  return ddlManagerInstance;
}

module.exports = {
  DDLManager,
  getDDLManager
};
