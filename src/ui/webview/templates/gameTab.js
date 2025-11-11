/**
 * Game Tab Template Generator
 * Generates the home/game tab HTML
 */

const { formatNumber } = require('../../../game/gameState');

function generateGameTab(gameState) {
  return `
    <!-- 首页标签 -->
    <div class="tab-content active" id="tab-home">
      <!-- 顶部金币信息栏 -->
      <div class="stats-compact">
        <div class="stat-group">
          <div class="coins-compact">💰 ${formatNumber(gameState.coins)}</div>
          <div class="rate-compact">⚡ +${formatNumber(gameState.coinsPerSecond)}/s</div>
        </div>
        <div class="stat-group">
          <div class="battle-gold-compact">⚔️ ${gameState.battle.gold} 金币</div>
          <div class="battle-level-compact">👤 Lv.${gameState.battle.playerLevel}</div>
        </div>
      </div>

      <!-- 战斗区域 -->
      <div class="home-battle-section">
        <div class="battle-header">
          <span class="battle-wave-info">⚔️ 第 <span id="homeWave">${gameState.battle.wave}</span> 波</span>
          <button class="quick-btn start" id="homeStartBtn" onclick="startBattle()">▶️</button>
          <button class="quick-btn stop" id="homeStopBtn" onclick="stopBattle()" disabled>⏸️</button>
          <button class="quick-btn next" id="homeNextBtn" onclick="nextWave()" disabled>⏭️</button>
        </div>

        <!-- 战场画布 -->
        <div class="battlefield-home">
          <canvas id="battleCanvas" width="300" height="200"></canvas>
        </div>

        <!-- 玩家状态条 -->
        <div class="player-stats-compact">
          <div class="stat-bar-compact">
            <div class="stat-label-compact">❤️</div>
            <div class="progress-bar-compact">
              <div class="progress" id="homePlayerHealthBar" style="width: 100%; background: #ff4444;"></div>
            </div>
            <div class="stat-value-compact" id="homePlayerHealthText">100/100</div>
          </div>
          <div class="stat-row-compact">
            <span>⚔️ <span id="homePlayerAttack">${gameState.battle.playerStats.attack}</span></span>
            <span>🛡️ <span id="homePlayerDefense">${gameState.battle.playerStats.defense}</span></span>
            <span>💥 <span id="homePlayerCritRate">${(gameState.battle.playerStats.critRate * 100).toFixed(0)}%</span></span>
          </div>
        </div>

        <!-- 快速操作 -->
        <div class="quick-actions">
          <button class="action-btn" onclick="clickCoin()">💰 点击+1</button>
          <button class="action-btn" onclick="switchTab(event, 'battle')">⚔️ 战斗详情</button>
          <button class="action-btn" onclick="switchTab(event, 'upgrade')">🏭 升级</button>
        </div>
      </div>
    </div>
  `;
}

module.exports = { generateGameTab };
