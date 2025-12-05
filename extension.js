/**
 * Coding Buddy - 编程搭子
 * 一个住在 VSCode 里的小伙伴，陪你写代码
 */

const vscode = require('vscode');

// 核心模块
const { getEventBus } = require('./src/core/eventBus');

// 搭子模块
const { initState, getState, saveState, checkDailyReset } = require('./src/buddy/state');
const { initBuddy, dispose: disposeBuddy } = require('./src/buddy/buddy');
const { initDDL, addTask, getPendingTasks, getTaskCountdown, dispose: disposeDDL } = require('./src/buddy/ddl');
const { startWork, startBreak, pause, resume, stop, getFocusState, dispose: disposeFocus } = require('./src/buddy/focus');

// UI 模块
const { createStatusBar, dispose: disposeStatusBar } = require('./src/ui/statusBar');
const { BuddyWebviewProvider } = require('./src/ui/webviewPanel');

let saveTimer = null;
let codeChangeListener = null;

/**
 * 激活扩展
 */
function activate(context) {
  console.log('Coding Buddy is activating...');

  // 初始化状态
  initState(context);
  
  // 初始化搭子系统
  initBuddy();
  
  // 初始化 DDL 管理
  initDDL();

  // 创建状态栏
  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  // 注册侧边栏视图
  const webviewProvider = new BuddyWebviewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('codingBuddyView', webviewProvider)
  );

  // ========== 注册命令 ==========

  // 打开面板
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.codingBuddyContainer');
    })
  );

  // 开始专注
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.startFocus', () => {
      const result = startWork();
      if (result.success) {
        vscode.window.showInformationMessage('🍅 ' + result.message);
      }
    })
  );

  // 暂停专注
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.pauseFocus', () => {
      const result = pause();
      vscode.window.showInformationMessage(result.message);
    })
  );

  // 停止专注
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.stopFocus', () => {
      const result = stop();
      vscode.window.showInformationMessage(result.message);
    })
  );

  // 添加 DDL
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.addDDL', async () => {
      const name = await vscode.window.showInputBox({
        prompt: '输入任务名称',
        placeHolder: '例如: 完成项目报告'
      });
      
      if (!name) return;
      
      const deadlineStr = await vscode.window.showInputBox({
        prompt: '输入截止时间',
        placeHolder: 'YYYY-MM-DD HH:mm',
        validateInput: (value) => {
          if (!value) return '请输入截止时间';
          const date = new Date(value.replace(' ', 'T'));
          if (isNaN(date.getTime())) return '日期格式错误';
          if (date < new Date()) return '截止时间不能早于现在';
          return null;
        }
      });
      
      if (!deadlineStr) return;
      
      const deadline = new Date(deadlineStr.replace(' ', 'T'));
      addTask(name, deadline);
      vscode.window.showInformationMessage(`📝 已添加 DDL: ${name}`);
    })
  );

  // 查看 DDL
  context.subscriptions.push(
    vscode.commands.registerCommand('coding-buddy.viewDDL', () => {
      const tasks = getPendingTasks();
      
      if (tasks.length === 0) {
        vscode.window.showInformationMessage('🎉 目前没有待完成的 DDL！');
        return;
      }
      
      const items = tasks.map(task => {
        const countdown = getTaskCountdown(task.id);
        return {
          label: task.name,
          description: countdown?.overdue ? '⚠️ 已过期' : `⏰ ${countdown?.text}`
        };
      });
      
      vscode.window.showQuickPick(items, { placeHolder: '你的 DDL 列表' });
    })
  );

  // ========== 监听代码变化 ==========
  
  codeChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document.uri.scheme !== 'file') return;
    
    const changes = event.contentChanges;
    if (changes.length === 0) return;
    
    let linesAdded = 0;
    let linesDeleted = 0;
    
    for (const change of changes) {
      const addedLines = change.text.split('\n').length - 1;
      const deletedLines = change.range.end.line - change.range.start.line;
      
      linesAdded += addedLines;
      linesDeleted += deletedLines;
    }
    
    // 发送代码变化事件
    getEventBus().emit('code:changed', {
      fileName: event.document.fileName,
      linesAdded: Math.max(0, linesAdded),
      linesDeleted: Math.max(0, linesDeleted)
    });
  });
  
  context.subscriptions.push(codeChangeListener);

  // ========== 自动保存 ==========
  
  saveTimer = setInterval(() => {
    checkDailyReset();
    saveState();
  }, 30000); // 每30秒保存

  // ========== 监听聊天命令 ==========
  
  getEventBus().on('chat:command', (data) => {
    if (data.action === 'startFocus') {
      startWork();
    }
  });

  console.log('Coding Buddy activated!');
}

/**
 * 停用扩展
 */
function deactivate() {
  console.log('Coding Buddy deactivating...');
  
  // 保存状态
  saveState();
  
  // 清理定时器
  if (saveTimer) clearInterval(saveTimer);
  
  // 清理模块
  disposeBuddy();
  disposeDDL();
  disposeFocus();
  disposeStatusBar();
  
  // 清理事件总线
  getEventBus().clear();
  
  console.log('Coding Buddy deactivated');
}

module.exports = { activate, deactivate };
