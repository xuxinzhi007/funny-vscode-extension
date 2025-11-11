/**
 * Script Generator
 * Generates JavaScript for the webview
 * TODO: Extract full scripts from original webview.js
 */

function generateScripts(rippleEnabled, rippleSize, codeEffectEnabled, lotteryPrices) {
  return `
    <script>
      const vscode = acquireVsCodeApi();
      let RIPPLE_ENABLED = ${rippleEnabled};
      let RIPPLE_SIZE = ${rippleSize};
      let CODE_EFFECT_ENABLED = ${codeEffectEnabled};

      // Message handler
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'updateGameState') {
          updateUI(message);
        } else if (message.command === 'upgradeSuccess') {
          handleUpgradeSuccess(message);
        } else if (message.command === 'configChanged') {
          handleConfigChanged(message);
        } else if (message.command === 'categoryToggled') {
          handleCategoryToggled(message);
        } else if (message.command === 'categoryUpdated') {
          handleCategoryUpdated(message);
        }
      });

      // UI update function
      function updateUI(data) {
        // TODO: Implement full UI update logic
        console.log('Update UI:', data);
      }

      function handleUpgradeSuccess(message) {
        // TODO: Implement upgrade success handler
        console.log('Upgrade success:', message);
      }

      function handleConfigChanged(message) {
        if (message.rippleEnabled !== undefined) {
          RIPPLE_ENABLED = message.rippleEnabled;
          const toggleBtn = document.getElementById('rippleToggleBtn');
          if (toggleBtn) {
            toggleBtn.textContent = RIPPLE_ENABLED ? '✅ 已启用' : '❌ 已禁用';
          }
        }
        if (message.rippleSize !== undefined) {
          RIPPLE_SIZE = message.rippleSize;
        }
        if (message.codeEffectEnabled !== undefined) {
          CODE_EFFECT_ENABLED = message.codeEffectEnabled;
          const codeToggleBtn = document.getElementById('codeEffectToggleBtn');
          if (codeToggleBtn) {
            codeToggleBtn.textContent = CODE_EFFECT_ENABLED ? '✅ 已启用' : '❌ 已禁用';
          }
        }
      }

      function handleCategoryToggled(message) {
        // TODO: Implement category toggle handler
        console.log('Category toggled:', message);
      }

      function handleCategoryUpdated(message) {
        // TODO: Implement category update handler
        console.log('Category updated:', message);
      }

      // Tab switching
      function switchTab(event, tabName) {
        event.stopPropagation();
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById('tab-' + tabName).classList.add('active');
      }

      // Command functions
      function clickCoin() {
        vscode.postMessage({ command: 'clickCoin' });
      }

      function showSaveInfo() {
        vscode.postMessage({ command: 'showSaveInfo' });
      }

      function backupSave() {
        vscode.postMessage({ command: 'backupSave' });
      }

      function resetGame() {
        if (confirm('确定要重置游戏吗？所有进度将丢失！')) {
          vscode.postMessage({ command: 'resetGame' });
        }
      }

      function toggleRipple() {
        vscode.postMessage({ command: 'toggleRipple' });
      }

      function toggleCodeEffect() {
        vscode.postMessage({ command: 'toggleCodeEffect' });
      }

      function toggleConfigPanel(event) {
        event.stopPropagation();
        const panel = document.getElementById('codeEffectConfig');
        if (panel) {
          panel.classList.toggle('visible');
        }
      }

      function toggleRippleConfigPanel(event) {
        event.stopPropagation();
        const panel = document.getElementById('rippleConfig');
        if (panel) {
          panel.classList.toggle('visible');
        }
      }

      function updateRippleSize(event, value) {
        event.stopPropagation();
        RIPPLE_SIZE = parseInt(value);
        document.getElementById('rippleSizeValue').textContent = value + 'px';
        vscode.postMessage({ command: 'updateRippleSize', size: RIPPLE_SIZE });
      }

      function toggleCategory(event, category) {
        event.stopPropagation();
        vscode.postMessage({ command: 'toggleCategory', category: category });
      }

      function editCategory(event, category) {
        event.stopPropagation();
        vscode.postMessage({ command: 'editCategory', category: category });
      }

      // Battle functions
      function startBattle() {
        vscode.postMessage({ command: 'battle_start' });
      }

      function stopBattle() {
        vscode.postMessage({ command: 'battle_stop' });
      }

      function nextWave() {
        vscode.postMessage({ command: 'battle_nextWave' });
      }

      function upgradeAttribute(attribute, cost) {
        vscode.postMessage({ command: 'battle_upgrade', attribute: attribute, cost: cost });
      }

      // Lottery function
      let isSpinning = false;
      function startLottery() {
        if (isSpinning) return;
        isSpinning = true;

        const btn = document.getElementById('lotteryBtn');
        const wheel = document.getElementById('wheel');

        btn.disabled = true;
        btn.textContent = '抽奖中...';

        vscode.postMessage({ command: 'lottery' });

        wheel.classList.add('spinning');

        setTimeout(() => {
          wheel.classList.remove('spinning');
          isSpinning = false;
          btn.textContent = '🎰 抽奖一次 (${lotteryPrices.normal}金币)';
        }, 4000);
      }

      // Click handler for upgrades
      document.addEventListener('click', (e) => {
        const item = e.target.closest('.item');
        if (item && !e.target.disabled) {
          const upgradeKey = item.getAttribute('data-upgrade');
          if (upgradeKey) {
            vscode.postMessage({ command: 'buyUpgrade', upgradeKey: upgradeKey });
          }
        }
      });

      // TODO: Add remaining scripts from original webview.js
      // This is a simplified version for the refactoring task
    </script>
  `;
}

module.exports = { generateScripts };
