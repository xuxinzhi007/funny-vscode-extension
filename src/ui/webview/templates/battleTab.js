/**
 * Battle Tab Template Generator
 * TODO: Extract from original webview.js
 */

function generateBattleTab(gameState) {
  // Simplified version - full implementation would extract from original webview.js
  return `
    <div class="tab-content" id="tab-battle">
      <div class="section">
        <div class="title">
          <span>⚔️ 战斗场地 - 第 <span id="currentWave">${gameState.battle.wave}</span> 波</span>
        </div>
        <!-- Battle content would go here -->
        <p style="text-align: center; padding: 20px;">战斗系统 - 待完整实现</p>
      </div>
    </div>
  `;
}

module.exports = { generateBattleTab };
