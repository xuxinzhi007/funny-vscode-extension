/**
 * 全局常量定义
 */

module.exports = {
  // 命令 ID
  COMMANDS: {
    OPEN_PANEL: 'coding-buddy.openPanel',
    START_FOCUS: 'coding-buddy.startFocus',
    PAUSE_FOCUS: 'coding-buddy.pauseFocus',
    STOP_FOCUS: 'coding-buddy.stopFocus',
    ADD_DDL: 'coding-buddy.addDDL',
    VIEW_DDL: 'coding-buddy.viewDDL'
  },

  // 事件名称
  EVENTS: {
    // Buddy 事件
    BUDDY_STATE_UPDATED: 'buddy:stateUpdated',
    BUDDY_BEHAVIOR_CHANGED: 'buddy:behaviorChanged',
    BUDDY_LEVEL_UP: 'buddy:levelUp',
    BUDDY_SKIN_UNLOCKED: 'buddy:skinUnlocked',
    BUDDY_SKIN_CHANGED: 'buddy:skinChanged',
    BUDDY_INTERACTED: 'buddy:interacted',

    // Focus 事件
    FOCUS_STARTED: 'focus:started',
    FOCUS_PAUSED: 'focus:paused',
    FOCUS_RESUMED: 'focus:resumed',
    FOCUS_STOPPED: 'focus:stopped',
    FOCUS_COMPLETED: 'focus:completed',
    FOCUS_TICK: 'focus:tick',

    // DDL/Task 事件
    TASK_ADDED: 'ddl:added',
    TASK_COMPLETED: 'ddl:completed',
    TASK_DELETED: 'ddl:deleted',
    TASK_URGENT: 'ddl:urgent',
    TASK_APPROACHING: 'ddl:approaching',

    // Code 事件
    CODE_CHANGED: 'code:changed',

    // Chat 事件
    CHAT_COMMAND: 'chat:command'
  },

  // 行为类型
  BEHAVIORS: {
    IDLE: 'idle',
    WORKING: 'working',
    RESTING: 'resting',
    CELEBRATING: 'celebrating',
    SLEEPY: 'sleepy',
    ANXIOUS: 'anxious',
    HAPPY: 'happy'
  },

  // Focus 类型
  FOCUS_TYPES: {
    WORK: 'work',
    BREAK: 'break'
  },

  // 任务状态
  TASK_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    OVERDUE: 'overdue'
  },

  // 配置默认值
  DEFAULTS: {
    FOCUS_WORK_MINUTES: 25,
    FOCUS_BREAK_MINUTES: 5,
    FOCUS_LONG_BREAK_MINUTES: 15,
    SESSIONS_UNTIL_LONG_BREAK: 4,
    STATE_DECAY_INTERVAL: 60000, // 1分钟
    DDL_CHECK_INTERVAL: 60000 // 1分钟
  }
};
