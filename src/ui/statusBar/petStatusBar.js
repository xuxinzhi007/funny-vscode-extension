/**
 * Pet Status Bar - Display pet status in status bar
 * 搭子状态栏 - 在状态栏显示搭子信息
 * 
 * 支持三种模式：
 * - entertainment: 娱乐模式，显示表情、心情、能量
 * - work: 工作模式，只显示DDL提醒（低调专业）
 * - focus: 专注模式，极简显示（仅DDL临近时提醒）
 */

const vscode = require('vscode');
const { getEventBus } = require('../../core/eventBus');
const { getLogger } = require('../../utils/logger');

let statusBarItem = null;
let petCore = null;
let ddlManager = null;
let currentMode = 'entertainment'; // entertainment | work | focus

/**
 * Create and initialize Pet status bar
 * @param {PetCore} petCoreInstance - Pet core instance
 * @param {DDLManager} ddlManagerInstance - DDL manager instance
 * @param {string} initialMode - Initial display mode
 * @returns {vscode.StatusBarItem}
 */
function createPetStatusBar(petCoreInstance, ddlManagerInstance, initialMode = 'entertainment') {
  const logger = getLogger();
  const eventBus = getEventBus();

  petCore = petCoreInstance;
  ddlManager = ddlManagerInstance;
  currentMode = initialMode;

  // Create status bar item (left side, high priority)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    95 // Priority: between pomodoro (100) and other items
  );

  statusBarItem.command = 'funny-vscode-extension.togglePet';
  
  // Initial update
  updatePetStatusBar();

  // Listen to pet events
  eventBus.on('pet:stateChanged', () => {
    updatePetStatusBar();
  });

  eventBus.on('pet:levelUp', (data) => {
    if (currentMode === 'entertainment') {
      showTemporaryMessage(`🎉 升到 ${data.level} 级!`, 3000);
    }
  });

  eventBus.on('pet:behaviorChanged', () => {
    updatePetStatusBar();
  });

  eventBus.on('ddl:warning', (data) => {
    // DDL warning always shows, regardless of mode
    showTemporaryMessage(`⏰ DDL警告: ${data.task.title}`, 5000);
    updatePetStatusBar();
  });

  eventBus.on('ddl:added', () => {
    updatePetStatusBar();
  });

  eventBus.on('ddl:completed', () => {
    updatePetStatusBar();
  });

  eventBus.on('ddl:removed', () => {
    updatePetStatusBar();
  });

  // Auto switch to focus mode when pomodoro starts
  eventBus.on('pomodoro:started', (data) => {
    if (data.type === 'work' && currentMode === 'entertainment') {
      // Optionally auto-switch to focus mode
      // switchMode('focus');
    }
  });

  statusBarItem.show();
  logger.info(`Pet status bar created in ${currentMode} mode`);

  return statusBarItem;
}

/**
 * Update Pet status bar display based on current mode
 */
function updatePetStatusBar() {
  if (!statusBarItem || !petCore) {
    return;
  }

  const state = petCore.getState();
  
  switch (currentMode) {
    case 'entertainment':
      updateEntertainmentMode(state);
      break;
    case 'work':
      updateWorkMode(state);
      break;
    case 'focus':
      updateFocusMode(state);
      break;
  }
}

/**
 * Entertainment mode: Show pet emoji, mood, energy
 */
function updateEntertainmentMode(state) {
  // Get pet emoji based on behavior and mood
  const emoji = getPetEmoji(state);
  const mood = Math.round(state.mood);
  const energy = Math.round(state.energy);
  
  // Show level and stats
  statusBarItem.text = `${emoji} Lv.${state.level} ❤️${mood}% ⚡${energy}%`;
  
  // Tooltip with detailed info
  const ddlInfo = getNextDDLInfo();
  statusBarItem.tooltip = [
    `🐱 ${state.name}`,
    `📊 等级: ${state.level} (经验: ${state.exp})`,
    `❤️ 心情: ${mood}%`,
    `⚡ 能量: ${energy}%`,
    `🎭 行为: ${getBehaviorText(state.currentBehavior)}`,
    ddlInfo ? `\n⏰ ${ddlInfo}` : '',
    `\n💡 点击打开搭子面板`
  ].filter(Boolean).join('\n');
}

/**
 * Work mode: Only show DDL reminders (professional and low-key)
 */
function updateWorkMode(state) {
  const ddlInfo = getNextDDLInfo();
  
  if (ddlInfo) {
    // Show next DDL
    const nextDDL = getNextDDL();
    const timeLeft = getTimeLeftText(nextDDL);
    statusBarItem.text = `⏰ DDL: ${timeLeft}`;
    statusBarItem.tooltip = [
      `📋 ${nextDDL.title}`,
      `⏰ 截止: ${new Date(nextDDL.deadline).toLocaleString('zh-CN')}`,
      `⏳ 剩余: ${timeLeft}`,
      `\n💡 点击管理DDL任务`
    ].join('\n');
  } else {
    // No DDL
    statusBarItem.text = `✅ 无DDL`;
    statusBarItem.tooltip = `暂无DDL任务\n\n💡 点击添加DDL`;
  }
}

/**
 * Focus mode: Minimal display (only show when DDL is near)
 */
function updateFocusMode(state) {
  const nextDDL = getNextDDL();
  
  if (nextDDL) {
    const timeLeft = Date.now() - nextDDL.deadline;
    const hoursLeft = Math.abs(timeLeft) / (1000 * 60 * 60);
    
    // Only show when DDL is within 2 hours
    if (hoursLeft <= 2) {
      const timeText = getTimeLeftText(nextDDL);
      statusBarItem.text = `🔔 ${timeText}`;
      statusBarItem.tooltip = `⏰ DDL临近: ${nextDDL.title}\n💡 点击查看`;
      statusBarItem.show();
    } else {
      // Hide status bar when no urgent DDL
      statusBarItem.text = `🔔`;
      statusBarItem.tooltip = `专注模式\n💡 点击查看搭子`;
    }
  } else {
    // No DDL, show minimal indicator
    statusBarItem.text = `🔔`;
    statusBarItem.tooltip = `专注模式\n💡 点击查看搭子`;
  }
}

/**
 * Get pet emoji based on behavior and mood
 */
function getPetEmoji(state) {
  // Behavior takes priority
  switch (state.currentBehavior) {
    case 'happy':
    case 'celebrating':
      return '🎉';
    case 'working':
      return '💻';
    case 'sleeping':
      return '😴';
    case 'reminding':
      return '⏰';
    case 'worried':
      return '😰';
    case 'eating':
      return '🍔';
    case 'playing':
      return '🎮';
    case 'bored':
      return '😑';
  }
  
  // Default: based on mood
  if (state.mood > 80) return '😊';
  if (state.mood > 60) return '🙂';
  if (state.mood > 40) return '😐';
  if (state.mood > 20) return '😔';
  return '😢';
}

/**
 * Get behavior text in Chinese
 */
function getBehaviorText(behavior) {
  const texts = {
    idle: '空闲中',
    happy: '开心',
    celebrating: '庆祝',
    working: '工作中',
    sleeping: '睡觉',
    reminding: '提醒',
    worried: '担心',
    eating: '吃饭',
    playing: '玩耍',
    bored: '无聊'
  };
  return texts[behavior] || behavior;
}

/**
 * Get next DDL info text
 */
function getNextDDLInfo() {
  const nextDDL = getNextDDL();
  if (!nextDDL) return null;
  
  const timeLeft = getTimeLeftText(nextDDL);
  return `下个DDL: ${nextDDL.title} (${timeLeft})`;
}

/**
 * Get next DDL task
 */
function getNextDDL() {
  if (!ddlManager) return null;
  
  const tasks = ddlManager.getTasks();
  const incompleteTasks = tasks.filter(t => !t.completed);
  
  if (incompleteTasks.length === 0) return null;
  
  // Sort by deadline
  incompleteTasks.sort((a, b) => a.deadline - b.deadline);
  return incompleteTasks[0];
}

/**
 * Get time left text
 */
function getTimeLeftText(task) {
  const now = Date.now();
  const timeLeft = task.deadline - now;
  
  if (timeLeft < 0) {
    return '已超时';
  }
  
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}天`;
  } else if (hours > 0) {
    return `${hours}小时`;
  } else {
    return `${minutes}分钟`;
  }
}

/**
 * Show temporary message (for celebrations, etc.)
 */
function showTemporaryMessage(message, duration = 3000) {
  if (!statusBarItem) return;
  
  const originalText = statusBarItem.text;
  const originalTooltip = statusBarItem.tooltip;
  
  statusBarItem.text = message;
  statusBarItem.tooltip = message;
  
  setTimeout(() => {
    statusBarItem.text = originalText;
    statusBarItem.tooltip = originalTooltip;
  }, duration);
}

/**
 * Switch display mode
 * @param {string} mode - 'entertainment' | 'work' | 'focus'
 */
function switchMode(mode) {
  if (!['entertainment', 'work', 'focus'].includes(mode)) {
    return;
  }
  
  currentMode = mode;
  updatePetStatusBar();
  
  const logger = getLogger();
  logger.info(`Pet status bar mode switched to: ${mode}`);
  
  // Show notification
  const modeNames = {
    entertainment: '娱乐模式',
    work: '工作模式',
    focus: '专注模式'
  };
  vscode.window.showInformationMessage(`搭子状态栏已切换到: ${modeNames[mode]}`);
}

/**
 * Get current mode
 */
function getCurrentMode() {
  return currentMode;
}

/**
 * Cycle through modes
 */
function cycleMode() {
  const modes = ['entertainment', 'work', 'focus'];
  const currentIndex = modes.indexOf(currentMode);
  const nextIndex = (currentIndex + 1) % modes.length;
  switchMode(modes[nextIndex]);
}

/**
 * Get status bar item
 * @returns {vscode.StatusBarItem}
 */
function getPetStatusBar() {
  return statusBarItem;
}

/**
 * Dispose status bar
 */
function disposePetStatusBar() {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = null;
  }
}

module.exports = {
  createPetStatusBar,
  updatePetStatusBar,
  switchMode,
  getCurrentMode,
  cycleMode,
  getPetStatusBar,
  disposePetStatusBar
};

