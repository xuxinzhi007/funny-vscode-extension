/**
 * 编程搭子 - 状态管理
 * 管理搭子的所有状态数据
 */

const DEFAULT_STATE = {
  // 搭子基础信息
  buddy: {
    name: '小搭子',
    mood: 100,        // 心情 0-100
    energy: 100,      // 能量 0-100
    level: 1,
    exp: 0,
    currentSkin: 'default',
    unlockedSkins: ['default'],
    behavior: 'idle', // idle, working, resting, celebrating, sleepy, anxious
    lastInteraction: Date.now()
  },

  // DDL 任务
  ddlTasks: [],

  // 专注模式
  focus: {
    isActive: false,
    isPaused: false,
    type: 'work',     // work, break
    remainingSeconds: 0,
    totalSeconds: 0,
    completedToday: 0,
    completedTotal: 0
  },

  // 统计数据
  stats: {
    today: {
      date: new Date().toISOString().split('T')[0],
      linesAdded: 0,
      linesDeleted: 0,
      filesModified: new Set(),
      focusMinutes: 0,
      ddlsCompleted: 0
    },
    total: {
      codingDays: 0,
      totalLines: 0,
      totalFocusMinutes: 0,
      longestStreak: 0,
      currentStreak: 0,
      lastCodingDate: null
    }
  },

  // 设置
  settings: {
    focusWorkMinutes: 25,
    focusBreakMinutes: 5,
    focusLongBreakMinutes: 15,
    sessionsUntilLongBreak: 4,
    enableNotifications: true,
    enableChat: true,
    aiProvider: null,  // null = 预设对话, 'openai', 'claude', 'custom'
    aiApiKey: '',
    aiApiUrl: ''
  }
};

let state = null;
let context = null;

/**
 * 初始化状态
 */
function initState(extensionContext) {
  context = extensionContext;
  const saved = context.globalState.get('buddyState');
  
  if (saved) {
    state = mergeState(DEFAULT_STATE, saved);
    // 检查是否需要重置每日统计
    checkDailyReset();
  } else {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    state.stats.today.filesModified = new Set();
  }
  
  return state;
}

/**
 * 合并保存的状态和默认状态
 */
function mergeState(defaults, saved) {
  const merged = JSON.parse(JSON.stringify(defaults));
  
  // 递归合并
  function merge(target, source) {
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key]) {
          merge(target[key], source[key]);
        }
      } else {
        target[key] = source[key];
      }
    }
  }
  
  merge(merged, saved);
  
  // 特殊处理 Set
  merged.stats.today.filesModified = new Set(saved.stats?.today?.filesModified || []);
  
  return merged;
}

/**
 * 检查并执行每日重置
 */
function checkDailyReset() {
  const today = new Date().toISOString().split('T')[0];
  
  if (state.stats.today.date !== today) {
    // 更新连续编程天数
    const lastDate = state.stats.today.date;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (lastDate === yesterdayStr) {
      state.stats.total.currentStreak++;
      if (state.stats.total.currentStreak > state.stats.total.longestStreak) {
        state.stats.total.longestStreak = state.stats.total.currentStreak;
      }
    } else {
      state.stats.total.currentStreak = 0;
    }
    
    // 重置今日统计
    state.stats.today = {
      date: today,
      linesAdded: 0,
      linesDeleted: 0,
      filesModified: new Set(),
      focusMinutes: 0,
      ddlsCompleted: 0
    };
    
    // 重置专注模式今日计数
    state.focus.completedToday = 0;
  }
}

/**
 * 获取状态
 */
function getState() {
  return state;
}

/**
 * 更新状态
 */
function updateState(path, value) {
  const keys = path.split('.');
  let current = state;
  
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * 保存状态到存储
 */
function saveState() {
  if (!context) return;
  
  // 转换 Set 为数组以便序列化
  const toSave = JSON.parse(JSON.stringify(state, (key, value) => {
    if (value instanceof Set) {
      return Array.from(value);
    }
    return value;
  }));
  
  context.globalState.update('buddyState', toSave);
}

/**
 * 重置状态
 */
function resetState() {
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  state.stats.today.filesModified = new Set();
  saveState();
}

module.exports = {
  initState,
  getState,
  updateState,
  saveState,
  resetState,
  checkDailyReset
};
