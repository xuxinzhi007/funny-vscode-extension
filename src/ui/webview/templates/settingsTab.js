/**
 * Settings Tab Template Generator
 */

function generateSettingsTab(rippleEnabled, rippleSize, codeEffectEnabled, keywordCategories) {
  const categoryHTML = Object.entries(keywordCategories).map(([category, config]) => {
    const categoryNames = {
      functions: '💥 函数关键词',
      classes: '💎 类关键词',
      loops: '🔄 循环关键词',
      conditions: '❓ 条件关键词',
      variables: '📦 变量关键词',
      returns: '↩️ 返回关键词'
    };
    const categoryName = categoryNames[category] || category;

    return `
      <div class="config-category">
        <div class="config-category-title">
          <span>${categoryName}</span>
        </div>
        <div class="config-keywords">
          ${(config.keywords || []).map(kw => `<span class="keyword-tag">${kw}</span>`).join('')}
        </div>
        <div class="config-keywords" style="margin-top: 6px;">
          <span style="opacity: 0.6; font-size: 10px;">符号:</span>
          ${(config.symbols || []).map(sym => `<span style="font-size: 14px; margin: 0 2px;">${sym}</span>`).join('')}
        </div>
        <div class="category-controls">
          <button class="toggle-switch ${config.enabled ? 'enabled' : ''}"
                  onclick="toggleCategory(event, '${category}')"
                  data-category="${category}">
            ${config.enabled ? '✅ 已启用' : '❌ 已禁用'}
          </button>
          <button class="edit-btn" onclick="editCategory(event, '${category}')">
            ✏️ 编辑
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="tab-content" id="tab-settings">
      <div class="section">
        <div class="title">
          <span>⚙️ 游戏设置</span>
        </div>
        <button class="save-btn" onclick="showSaveInfo()">📁 存档信息</button>
        <button class="save-btn" onclick="backupSave()">💾 备份存档</button>
        <button class="reset-btn" onclick="resetGame()">重置游戏</button>
      </div>
      <div class="section">
        <div class="title">
          <span>🎨 视觉特效</span>
        </div>
        <div class="item">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div class="item-name">🌊 波纹特效</div>
            <span class="settings-icon" onclick="toggleRippleConfigPanel(event)" title="配置">⚙️</span>
          </div>
          <div class="item-detail">点击时显示彩色波纹动画</div>
          <button class="btn" id="rippleToggleBtn" onclick="toggleRipple()">
            ${rippleEnabled ? '✅ 已启用' : '❌ 已禁用'}
          </button>
        </div>
        <div class="config-panel" id="rippleConfig">
          <div class="config-header">
            <span>波纹特效设置</span>
            <button class="close-btn" onclick="toggleRippleConfigPanel(event)">✕</button>
          </div>
          <div class="config-content">
            <div class="config-item">
              <div class="config-item-header">
                <span class="config-item-title">波纹大小</span>
                <span id="rippleSizeValue">${rippleSize}px</span>
              </div>
              <input type="range" min="50" max="300" value="${rippleSize}" class="slider" id="sizeSlider" oninput="updateRippleSize(event, this.value)">
            </div>
          </div>
        </div>
        <div class="item" style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div class="item-name">💥 编码特效</div>
            <span class="settings-icon" onclick="toggleConfigPanel(event)" title="配置">⚙️</span>
          </div>
          <div class="item-detail">金币粒子 + 关键词爆炸特效（func、class等）</div>
          <button class="btn" id="codeEffectToggleBtn" onclick="toggleCodeEffect()">
            ${codeEffectEnabled ? '✅ 已启用' : '❌ 已禁用'}
          </button>
        </div>
        <div class="config-panel" id="codeEffectConfig">
          <div class="config-header">
            <div class="config-title">💥 编码特效配置</div>
            <span class="close-btn" onclick="toggleConfigPanel(event)" title="关闭">✕</span>
          </div>

          <div style="font-size: 11px; margin-bottom: 16px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px;">
            <strong>✨ 关键词特效</strong>
            <div style="margin-top: 6px; opacity: 0.8;">每个类别都可以独立开启/关闭和自定义</div>
          </div>

          ${categoryHTML}

          <div style="margin-top: 16px; padding: 10px; background: var(--vscode-input-background); border-radius: 4px; font-size: 10px; opacity: 0.7;">
            <strong>💡 提示</strong>
            <div style="margin-top: 4px;">• 点击"✏️ 编辑"可自定义关键词和符号</div>
            <div>• 输入关键词时会触发文字破碎和符号爆炸特效</div>
            <div>• 普通文字输入显示金币粒子特效</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

module.exports = { generateSettingsTab };
