/**
 * Enhanced Code Effect - CSS-based particle effects
 * 使用 CSS 动画实现更流畅、更酷炫的代码特效
 */

const vscode = require('vscode');

// CSS 样式（注入到编辑器）
const EFFECT_STYLES = `
  /* 粒子容器 */
  .code-effect-particle {
    position: absolute;
    pointer-events: none;
    z-index: 9999;
    will-change: transform, opacity;
  }

  /* 光波扩散效果 */
  .ripple-wave {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid;
    animation: ripple-expand 0.6s ease-out forwards;
  }

  @keyframes ripple-expand {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(3);
      opacity: 0;
    }
  }

  /* 粒子爆炸效果 */
  .particle-burst {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: particle-fly 0.8s ease-out forwards;
  }

  @keyframes particle-fly {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(0);
      opacity: 0;
    }
  }

  /* 火花效果 */
  .spark-particle {
    width: 3px;
    height: 12px;
    background: linear-gradient(to bottom, #fff, transparent);
    animation: spark-fly 0.5s ease-out forwards;
  }

  @keyframes spark-fly {
    0% {
      transform: translate(0, 0) rotate(var(--angle)) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) rotate(var(--angle)) scale(0);
      opacity: 0;
    }
  }

  /* 文字爆炸效果 */
  .text-explode {
    font-size: 16px;
    font-weight: bold;
    animation: text-burst 0.6s ease-out forwards;
  }

  @keyframes text-burst {
    0% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translate(var(--tx), var(--ty)) scale(0.5) rotate(var(--rotate));
      opacity: 0;
    }
  }

  /* 光环效果 */
  .glow-ring {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    box-shadow: 0 0 10px var(--color), 0 0 20px var(--color);
    animation: glow-pulse 0.5s ease-out forwards;
  }

  @keyframes glow-pulse {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  /* 代码雨效果 */
  .code-rain {
    font-family: monospace;
    font-size: 12px;
    color: #0f0;
    animation: rain-fall 1s linear forwards;
  }

  @keyframes rain-fall {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(100px);
      opacity: 0;
    }
  }

  /* 能量波效果 */
  .energy-wave {
    width: 40px;
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--color), transparent);
    animation: wave-expand 0.4s ease-out forwards;
  }

  @keyframes wave-expand {
    0% {
      transform: scaleX(0);
      opacity: 1;
    }
    100% {
      transform: scaleX(3);
      opacity: 0;
    }
  }
`;

/**
 * 初始化增强的代码特效
 */
function initEnhancedCodeEffect(context) {
  // 注入样式
  injectStyles();

  // 监听文本变化
  const textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
    const config = vscode.workspace.getConfiguration('funny-vscode-extension');
    const codeEffectEnabled = config.get('enableCodeEffect', false);

    if (!codeEffectEnabled || !event.contentChanges.length) {
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) {
      return;
    }

    event.contentChanges.forEach(change => {
      if (change.text && change.text.trim()) {
        const position = change.range.start;
        
        // 检测关键词
        const keyword = detectKeyword(editor, position, change.text);
        if (keyword) {
          triggerKeywordExplosion(editor, position, keyword);
        } else {
          triggerTypingEffect(editor, position);
        }
      }
    });
  });

  context.subscriptions.push(textChangeListener);
}

/**
 * 注入 CSS 样式
 */
function injectStyles() {
  // 创建样式元素（如果不存在）
  if (typeof document !== 'undefined' && !document.getElementById('code-effect-styles')) {
    const style = document.createElement('style');
    style.id = 'code-effect-styles';
    style.textContent = EFFECT_STYLES;
    document.head.appendChild(style);
  }
}

/**
 * 检测关键词
 */
function detectKeyword(editor, position, text) {
  const line = editor.document.lineAt(position.line);
  const lineText = line.text.substring(0, position.character + text.length);
  
  const config = vscode.workspace.getConfiguration('funny-vscode-extension');
  const keywordCategories = config.get('keywordCategories', {});

  for (const [category, categoryConfig] of Object.entries(keywordCategories)) {
    if (!categoryConfig.enabled) continue;

    for (const keyword of categoryConfig.keywords || []) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lineText)) {
        return {
          category,
          keyword,
          color: getCategoryColor(category),
          symbols: categoryConfig.symbols || []
        };
      }
    }
  }

  return null;
}

/**
 * 获取类别颜色
 */
function getCategoryColor(category) {
  const colors = {
    functions: '#FFD700',
    classes: '#FF69B4',
    loops: '#00CED1',
    conditions: '#FF6347',
    variables: '#9370DB',
    returns: '#32CD32'
  };
  return colors[category] || '#FFD700';
}

/**
 * 触发关键词爆炸效果
 */
function triggerKeywordExplosion(editor, position, keywordData) {
  const { keyword, color, symbols } = keywordData;

  // 创建装饰器
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: '',
      textDecoration: `none; position: relative;`
    }
  });

  const range = new vscode.Range(position, position);

  // 1. 光环效果
  createGlowRing(editor, position, color);

  // 2. 粒子爆炸
  createParticleBurst(editor, position, color, 12);

  // 3. 能量波
  createEnergyWave(editor, position, color);

  // 4. 符号爆炸
  if (symbols.length > 0) {
    createSymbolExplosion(editor, position, symbols);
  }

  // 5. 文字破碎
  createTextShatter(editor, position, keyword, color);

  // 清理装饰器
  setTimeout(() => {
    decorationType.dispose();
  }, 1000);
}

/**
 * 触发普通打字效果
 */
function triggerTypingEffect(editor, position) {
  // 1. 小光波
  createRippleWave(editor, position, '#4EC9B0');

  // 2. 火花
  createSparks(editor, position, 3);
}

/**
 * 创建光环效果
 */
function createGlowRing(editor, position, color) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: '●',
      color: color,
      textDecoration: `none;
        position: absolute;
        margin-left: -8px;
        margin-top: -8px;
        font-size: 16px;
        animation: glow-pulse 0.5s ease-out;
        text-shadow: 0 0 10px ${color}, 0 0 20px ${color};
        pointer-events: none;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decorationType, [range]);

  setTimeout(() => decorationType.dispose(), 500);
}

/**
 * 创建粒子爆炸
 */
function createParticleBurst(editor, position, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    const distance = 30 + Math.random() * 20;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '●',
        color: color,
        textDecoration: `none;
          position: absolute;
          margin-left: -4px;
          margin-top: -4px;
          font-size: 8px;
          animation: particle-fly 0.8s ease-out;
          --tx: ${tx}px;
          --ty: ${ty}px;
          pointer-events: none;`
      }
    });

    const range = new vscode.Range(position, position);
    editor.setDecorations(decorationType, [range]);

    setTimeout(() => decorationType.dispose(), 800);
  }
}

/**
 * 创建能量波
 */
function createEnergyWave(editor, position, color) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: '━━━',
      color: color,
      textDecoration: `none;
        position: absolute;
        margin-left: -20px;
        margin-top: -2px;
        animation: wave-expand 0.4s ease-out;
        --color: ${color};
        pointer-events: none;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decorationType, [range]);

  setTimeout(() => decorationType.dispose(), 400);
}

/**
 * 创建符号爆炸
 */
function createSymbolExplosion(editor, position, symbols) {
  const count = Math.min(symbols.length, 6);
  
  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    const angle = (360 / count) * i;
    const distance = 40;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: symbol,
        textDecoration: `none;
          position: absolute;
          margin-left: -8px;
          margin-top: -8px;
          font-size: 20px;
          animation: text-burst 0.6s ease-out;
          --tx: ${tx}px;
          --ty: ${ty}px;
          --rotate: ${angle}deg;
          pointer-events: none;`
      }
    });

    const range = new vscode.Range(position, position);
    editor.setDecorations(decorationType, [range]);

    setTimeout(() => decorationType.dispose(), 600);
  }
}

/**
 * 创建文字破碎效果
 */
function createTextShatter(editor, position, text, color) {
  const letters = text.split('');
  
  letters.forEach((letter, index) => {
    const angle = (360 / letters.length) * index;
    const distance = 25;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance;

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: letter,
        color: color,
        textDecoration: `none;
          position: absolute;
          margin-left: ${index * 8 - 20}px;
          margin-top: -8px;
          font-size: 14px;
          font-weight: bold;
          animation: text-burst 0.6s ease-out;
          --tx: ${tx}px;
          --ty: ${ty}px;
          --rotate: ${angle * 2}deg;
          pointer-events: none;`
      }
    });

    const range = new vscode.Range(position, position);
    editor.setDecorations(decorationType, [range]);

    setTimeout(() => decorationType.dispose(), 600);
  });
}

/**
 * 创建光波效果
 */
function createRippleWave(editor, position, color) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: '○',
      color: color,
      textDecoration: `none;
        position: absolute;
        margin-left: -6px;
        margin-top: -6px;
        font-size: 12px;
        animation: ripple-expand 0.6s ease-out;
        pointer-events: none;`
    }
  });

  const range = new vscode.Range(position, position);
  editor.setDecorations(decorationType, [range]);

  setTimeout(() => decorationType.dispose(), 600);
}

/**
 * 创建火花效果
 */
function createSparks(editor, position, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 360;
    const distance = 15 + Math.random() * 10;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance - 10;

    const decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '✦',
        color: '#FFD700',
        textDecoration: `none;
          position: absolute;
          margin-left: -4px;
          margin-top: -4px;
          font-size: 8px;
          animation: spark-fly 0.5s ease-out;
          --tx: ${tx}px;
          --ty: ${ty}px;
          --angle: ${angle}deg;
          pointer-events: none;`
      }
    });

    const range = new vscode.Range(position, position);
    editor.setDecorations(decorationType, [range]);

    setTimeout(() => decorationType.dispose(), 500);
  }
}

module.exports = {
  initEnhancedCodeEffect
};
