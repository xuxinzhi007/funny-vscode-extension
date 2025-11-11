/**
 * Upgrade Tab Template Generator
 */

const { formatNumber } = require('../../../game/gameState');

function generateUpgradeTab(gameState) {
  const upgradesList = Object.entries(gameState.upgrades).map(([key, upgrade]) => {
    const nextCost = Math.floor(upgrade.cost * Math.pow(1.15, upgrade.count));
    const canAfford = gameState.coins >= nextCost;
    return `
      <div class="item ${canAfford ? 'ok' : ''}" data-upgrade="${key}">
        <div class="item-name">${upgrade.name} <span class="count">[${upgrade.count}]</span></div>
        <div class="item-detail">+${upgrade.production * upgrade.count}/s</div>
        <button class="btn" ${!canAfford ? 'disabled' : ''}>${formatNumber(nextCost)}</button>
      </div>
    `;
  }).join('');

  return `
    <div class="tab-content" id="tab-upgrade">
      <div class="section">
        <div class="title">
          <span>🏭 自动化升级</span>
        </div>
        ${upgradesList}
      </div>
    </div>
  `;
}

module.exports = { generateUpgradeTab };
