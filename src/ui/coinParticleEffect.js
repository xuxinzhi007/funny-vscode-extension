// 敲代码爆金币粒子效果模块
const vscode = require('vscode');

// 关键词特效映射
const KEYWORD_EFFECTS = {
  // 函数关键词 - 爆炸效果
  functions: {
    keywords: ['function', 'func', 'def', 'fn', 'async', 'await'],
    effect: 'explosion',
    symbols: ['💥', '🔥', '⚡', '✨']
  },
  // 类关键词 - 钻石效果
  classes: {
    keywords: ['class', 'interface', 'struct', 'enum', 'type'],
    effect: 'diamond',
    symbols: ['💎', '👑', '🌟', '⭐']
  },
  // 循环关键词 - 旋转效果
  loops: {
    keywords: ['for', 'while', 'loop', 'foreach', 'map', 'filter'],
    effect: 'spin',
    symbols: ['🔄', '♻️', '🌀', '⚙️']
  },
  // 条件关键词 - 问号效果
  conditions: {
    keywords: ['if', 'else', 'switch', 'case', 'when', 'match'],
    effect: 'question',
    symbols: ['❓', '❗', '⚠️', '🎯']
  },
  // 变量关键词 - 盒子效果
  variables: {
    keywords: ['const', 'let', 'var', 'val'],
    effect: 'box',
    symbols: ['📦', '🎁', '📫', '🗃️']
  },
  // 返回关键词 - 箭头效果
  returns: {
    keywords: ['return', 'yield', 'break', 'continue'],
    effect: 'arrow',
    symbols: ['↩️', '⬅️', '🔙', '↪️']
  }
};

/**
 * 初始化金币粒子效果
 */
function initCoinParticleEffect(context) {
  // 监听文本变化事件（输入时触发金币）
  const textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const codeEffectEnabled = config.get('enableCodeEffect', false);
    const keywordEffectEnabled = config.get('enableKeywordEffect', true);

    if (!codeEffectEnabled || !event.contentChanges.length) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) {
      return;
    }

    // 每次输入触发效果
    event.contentChanges.forEach(change => {
      if (change.text && change.text.trim()) {
        const position = change.range.start;

        // 检测关键词特效
        if (keywordEffectEnabled) {
          const detectedKeyword = detectKeyword(editor, position, change.text);
          if (detectedKeyword) {
            triggerKeywordEffect(editor, position, detectedKeyword);
            return; // 触发关键词特效后，不再显示普通金币
          }
        }

        // 普通金币效果
        createCoinParticlesAtPosition(editor, position);
      }
    });
  });

  context.subscriptions.push(textChangeListener);
}

/**
 * 检测是否输入了关键词
 */
function detectKeyword(editor, position, text) {
  // 获取当前行的文本
  const line = editor.document.lineAt(position.line);
  const lineText = line.text.substring(0, position.character + text.length);

  // 检查每个关键词类别
  for (const [category, config] of Object.entries(KEYWORD_EFFECTS)) {
    for (const keyword of config.keywords) {
      // 检查是否刚好输入完这个关键词
      const regex = new RegExp(`\\b${keyword}\\b$`, 'i');
      if (regex.test(lineText)) {
        return { category, keyword, config };
      }
    }
  }

  return null;
}

/**
 * 触发关键词特效
 */
function triggerKeywordEffect(editor, position, keywordData) {
  const { keyword, config } = keywordData;

  // 1. 文字破碎效果 - 把关键词打散
  createShatterEffect(editor, position, keyword);

  // 2. 特殊符号爆炸效果
  createSymbolExplosion(editor, position, config.symbols);
}

/**
 * 文字破碎效果 - 每个字母向不同方向飞出
 */
function createShatterEffect(editor, position, keyword) {
  const letters = keyword.split('');

  letters.forEach((letter, index) => {
    // 每个字母向不同方向飞出
    const angle = (360 / letters.length) * index;
    const distance = 30 + Math.random() * 20;

    setTimeout(() => {
      createFlyingLetter(editor, position, letter, angle, distance);
    }, index * 30); // 每个字母延迟30ms
  });
}

/**
 * 创建飞出的字母
 */
function createFlyingLetter(editor, position, letter, angle, distance) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // 计算偏移方向
  const offsetX = Math.cos(angle * Math.PI / 180) * distance;
  const offsetY = Math.sin(angle * Math.PI / 180) * distance;

  // 阶段1：飞出
  const decoration1 = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: letter,
      color: color,
      textDecoration: `none;
        position: absolute;
        font-size: 18px;
        font-weight: bold;
        margin-left: ${offsetX * 0.3}px;
        margin-top: ${offsetY * 0.3 - 20}px;
        pointer-events: none;
        z-index: 100;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decoration1, [range]);

  // 阶段2：继续飞远 + 淡出
  setTimeout(() => {
    decoration1.dispose();
    const decoration2 = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: letter,
        color: color + '80',
        textDecoration: `none;
          position: absolute;
          font-size: 16px;
          font-weight: bold;
          margin-left: ${offsetX * 0.6}px;
          margin-top: ${offsetY * 0.6 - 25}px;
          pointer-events: none;
          z-index: 100;`
      }
    });
    editor.setDecorations(decoration2, [range]);

    // 阶段3：几乎消失
    setTimeout(() => {
      decoration2.dispose();
      const decoration3 = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: letter,
          color: color + '20',
          textDecoration: `none;
            position: absolute;
            font-size: 14px;
            font-weight: bold;
            margin-left: ${offsetX}px;
            margin-top: ${offsetY - 30}px;
            pointer-events: none;
            z-index: 100;`
        }
      });
      editor.setDecorations(decoration3, [range]);

      setTimeout(() => {
        decoration3.dispose();
      }, 200);
    }, 200);
  }, 200);
}

/**
 * 符号爆炸效果
 */
function createSymbolExplosion(editor, position, symbols) {
  const particleCount = 5 + Math.floor(Math.random() * 3); // 5-7个符号

  for (let i = 0; i < particleCount; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const angle = (360 / particleCount) * i + Math.random() * 30;
    const distance = 25 + Math.random() * 15;

    setTimeout(() => {
      createFlyingSymbol(editor, position, symbol, angle, distance);
    }, i * 40);
  }
}

/**
 * 创建飞出的符号
 */
function createFlyingSymbol(editor, position, symbol, angle, distance) {
  const offsetX = Math.cos(angle * Math.PI / 180) * distance;
  const offsetY = Math.sin(angle * Math.PI / 180) * distance;

  // 阶段1
  const decoration1 = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: symbol,
      textDecoration: `none;
        position: absolute;
        font-size: 24px;
        margin-left: ${offsetX * 0.5}px;
        margin-top: ${offsetY * 0.5 - 20}px;
        pointer-events: none;
        z-index: 100;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decoration1, [range]);

  setTimeout(() => {
    decoration1.dispose();
    const decoration2 = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: symbol,
        textDecoration: `none;
          position: absolute;
          font-size: 28px;
          opacity: 0.6;
          margin-left: ${offsetX}px;
          margin-top: ${offsetY - 25}px;
          pointer-events: none;
          z-index: 100;`
      }
    });
    editor.setDecorations(decoration2, [range]);

    setTimeout(() => {
      decoration2.dispose();
    }, 250);
  }, 250);
}

/**
 * 在指定位置创建金币粒子效果
 */
function createCoinParticlesAtPosition(editor, position) {
  // 金币符号
  const coinSymbols = ['💰', '🪙', '💴', '💵', '💶', '💷', '💸'];

  // 创建多个金币粒子（简单的淡出效果）
  const particleCount = Math.floor(Math.random() * 2) + 2; // 2-3个粒子

  for (let i = 0; i < particleCount; i++) {
    const coin = coinSymbols[Math.floor(Math.random() * coinSymbols.length)];
    const fontSize = Math.floor(Math.random() * 8) + 14; // 14-22px

    // 创建逐渐淡出的金币效果
    createFadingCoin(editor, position, coin, fontSize, i * 100);
  }

  // 添加闪光效果
  createSparkEffect(editor, position);
}

/**
 * 创建淡出的金币效果
 */
function createFadingCoin(editor, position, coin, fontSize, delay) {
  setTimeout(() => {
    // 阶段1：完全显示（使用after并绝对定位，不影响文本流）
    const decoration1 = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: coin,
        color: '#FFD700',
        textDecoration: `none;
          position: absolute;
          font-size: ${fontSize}px;
          margin-left: -${fontSize/2}px;
          margin-top: -${fontSize * 1.5}px;
          pointer-events: none;
          z-index: 100;`
      }
    });

    const range = new vscode.Range(position, position);
    editor.setDecorations(decoration1, [range]);

    // 阶段2：半透明 + 上浮
    setTimeout(() => {
      decoration1.dispose();
      const decoration2 = vscode.window.createTextEditorDecorationType({
        after: {
          contentText: coin,
          color: '#FFD70080',
          textDecoration: `none;
            position: absolute;
            font-size: ${fontSize * 1.2}px;
            margin-left: -${fontSize * 0.6}px;
            margin-top: -${fontSize * 2}px;
            pointer-events: none;
            z-index: 100;`
        }
      });
      editor.setDecorations(decoration2, [range]);

      // 阶段3：几乎透明 + 继续上浮
      setTimeout(() => {
        decoration2.dispose();
        const decoration3 = vscode.window.createTextEditorDecorationType({
          after: {
            contentText: coin,
            color: '#FFD70020',
            textDecoration: `none;
              position: absolute;
              font-size: ${fontSize * 1.4}px;
              margin-left: -${fontSize * 0.7}px;
              margin-top: -${fontSize * 2.5}px;
              pointer-events: none;
              z-index: 100;`
          }
        });
        editor.setDecorations(decoration3, [range]);

        // 完全消失
        setTimeout(() => {
          decoration3.dispose();
        }, 200);
      }, 200);
    }, 200);
  }, delay);
}

/**
 * 创建闪光效果
 */
function createSparkEffect(editor, position) {
  const sparkSymbols = ['✨', '⭐', '💫', '🌟', '✴️'];
  const spark = sparkSymbols[Math.floor(Math.random() * sparkSymbols.length)];

  // 闪光逐渐消失（浮动在上方）
  const decoration1 = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: spark,
      color: '#FFFFFF',
      textDecoration: `none;
        position: absolute;
        font-size: 16px;
        margin-left: -8px;
        margin-top: -24px;
        pointer-events: none;
        z-index: 100;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decoration1, [range]);

  setTimeout(() => {
    decoration1.dispose();
    const decoration2 = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: spark,
        color: '#FFFFFF80',
        textDecoration: `none;
          position: absolute;
          font-size: 18px;
          margin-left: -9px;
          margin-top: -28px;
          pointer-events: none;
          z-index: 100;`
      }
    });
    editor.setDecorations(decoration2, [range]);

    setTimeout(() => {
      decoration2.dispose();
    }, 200);
  }, 150);
}

/**
 * 清理金币粒子效果
 */
function disposeCoinParticleEffect() {
  // 清理工作（如果需要）
}

module.exports = {
  initCoinParticleEffect,
  disposeCoinParticleEffect
};
