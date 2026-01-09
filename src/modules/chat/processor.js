/**
 * 编程搭子 - 聊天系统
 * 支持预设对话和 AI 对话
 */

const vscode = require('vscode');
const { getState } = require('../buddy/state');
const { getEventBus } = require('../../core/eventBus');

// 预设对话库
const PRESET_RESPONSES = {
  // 问候
  greetings: {
    patterns: [/^(你好|hi|hello|嗨|hey)/i],
    responses: [
      '你好呀！今天也要加油哦 💪',
      '嗨！准备好写代码了吗？',
      '你好～有什么我能帮你的吗？'
    ]
  },
  
  // 查询统计
  stats: {
    patterns: [/今天.*(写|代码|多少|行|统计)/i, /^\/stats$/i],
    handler: () => {
      const state = getState();
      const { linesAdded, linesDeleted, focusMinutes } = state.stats.today;
      const files = state.stats.today.filesModified.size;
      return `📊 今日统计：\n` +
             `• 新增 ${linesAdded} 行代码\n` +
             `• 删除 ${linesDeleted} 行\n` +
             `• 修改了 ${files} 个文件\n` +
             `• 专注 ${focusMinutes} 分钟`;
    }
  },
  
  // 查询 DDL
  ddl: {
    patterns: [/(ddl|任务|截止|deadline)/i, /^\/ddl$/i],
    handler: () => {
      const state = getState();
      const tasks = state.ddlTasks.filter(t => !t.completed);
      if (tasks.length === 0) {
        return '🎉 目前没有待完成的 DDL，太棒了！';
      }
      let msg = `📋 你有 ${tasks.length} 个待完成的 DDL：\n`;
      tasks.slice(0, 5).forEach((task, i) => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const hours = Math.floor((deadline - now) / 3600000);
        const timeStr = hours < 0 ? '已过期！' : 
                       hours < 24 ? `${hours}小时后` : 
                       `${Math.floor(hours/24)}天后`;
        msg += `${i+1}. ${task.name} - ${timeStr}\n`;
      });
      return msg;
    }
  },
  
  // 开始专注
  focus: {
    patterns: [/(开始|启动).*(专注|番茄|工作)/i, /^\/focus$/i],
    handler: () => {
      getEventBus().emit('chat:command', { action: 'startFocus' });
      return '🍅 好的，专注模式启动！我会安静陪着你～';
    }
  },
  
  // 休息
  rest: {
    patterns: [/(休息|累|疲|困)/i, /^\/rest$/i],
    responses: [
      '要不要休息一下？我帮你开个 5 分钟的休息时间？',
      '写代码也要注意休息哦，起来活动活动吧 🧘',
      '累了就休息一下，我陪你 ☕'
    ]
  },
  
  // 鼓励
  encourage: {
    patterns: [/(难|不会|烦|崩|bug|报错)/i],
    responses: [
      '别灰心，bug 都是纸老虎！💪',
      '遇到问题很正常，休息一下再看说不定就通了',
      '你可以的！要不要说说具体什么问题？',
      '深呼吸，冷静分析，你一定能解决的 🤗'
    ]
  },
  
  // 闲聊
  chat: {
    patterns: [/(无聊|聊|说)/i],
    responses: [
      '我一直在这里陪着你呢～',
      '要不要听个冷笑话？为什么程序员总是分不清万圣节和圣诞节？因为 Oct 31 = Dec 25 🎃',
      '今天天气怎么样？适合写代码吗？😄'
    ]
  },
  
  // 默认回复
  default: {
    responses: [
      '嗯嗯，我在听～',
      '有什么我能帮你的吗？',
      '你可以问我今天的统计、DDL，或者让我帮你开启专注模式哦',
      '试试输入 /stats 查看统计，/ddl 查看任务，/focus 开始专注'
    ]
  }
};

let lastProactiveTime = {};

/**
 * 处理用户消息
 */
function processMessage(message) {
  const state = getState();
  const settings = state.settings;
  
  // 如果配置了 AI，使用 AI 回复
  if (settings.aiProvider && settings.aiApiKey) {
    return processWithAI(message, settings);
  }
  
  // 使用预设对话
  return processWithPreset(message);
}

/**
 * 预设对话处理
 */
function processWithPreset(message) {
  const msg = message.trim();
  
  for (const [key, config] of Object.entries(PRESET_RESPONSES)) {
    if (key === 'default') continue;
    
    if (config.patterns?.some(p => p.test(msg))) {
      if (config.handler) {
        return config.handler();
      }
      return randomPick(config.responses);
    }
  }
  
  return randomPick(PRESET_RESPONSES.default.responses);
}

/**
 * AI 对话处理
 */
async function processWithAI(message, settings) {
  try {
    const state = getState();
    const systemPrompt = buildSystemPrompt(state);
    
    // 根据不同的 AI 提供商调用 API
    switch (settings.aiProvider) {
      case 'openai':
        return await callOpenAI(message, systemPrompt, settings);
      case 'claude':
        return await callClaude(message, systemPrompt, settings);
      case 'custom':
        return await callCustomAPI(message, systemPrompt, settings);
      default:
        return processWithPreset(message);
    }
  } catch (error) {
    console.error('AI chat error:', error);
    return '抱歉，AI 服务暂时不可用，我用预设回复你：' + processWithPreset(message);
  }
}

/**
 * 构建 AI 系统提示词
 */
function buildSystemPrompt(state) {
  const { stats, ddlTasks, focus } = state;
  
  return `你是一个编程搭子（编程伙伴），名叫"小搭子"。你住在用户的 VSCode 里，陪伴他们写代码。

你的性格：
- 友好、温暖、有点可爱
- 关心用户的健康和状态
- 会适时提醒休息
- 遇到用户沮丧时会鼓励

当前用户状态：
- 今日写了 ${stats.today.linesAdded} 行代码
- 今日专注了 ${stats.today.focusMinutes} 分钟
- 有 ${ddlTasks.filter(t => !t.completed).length} 个待完成的 DDL
- 专注模式：${focus.isActive ? '进行中' : '未开启'}

回复要求：
- 简短友好，不要太长
- 可以用 emoji
- 如果用户问代码问题，尽量帮忙解答
- 如果用户看起来累了，建议休息`;
}

/**
 * 调用 OpenAI API
 */
async function callOpenAI(message, systemPrompt, settings) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 200
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用 Claude API
 */
async function callClaude(message, systemPrompt, settings) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.aiApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const data = await response.json();
  return data.content[0].text;
}

/**
 * 调用自定义 API
 */
async function callCustomAPI(message, systemPrompt, settings) {
  const response = await fetch(settings.aiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.aiApiKey}`
    },
    body: JSON.stringify({
      message,
      systemPrompt
    })
  });
  
  const data = await response.json();
  return data.response || data.message || data.content;
}

/**
 * 获取主动对话消息
 */
function getProactiveMessage() {
  const state = getState();
  const now = Date.now();
  
  // 简化版本，移除 PROACTIVE_MESSAGES 结构
  // 可根据需要扩展
  return null;
}

/**
 * 随机选择
 */
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  processMessage,
  getProactiveMessage,
  PRESET_RESPONSES
};
