/**
 * Lottery Tab Template Generator
 */

function generateLotteryTab(gameState, lotteryPrizes, lotteryPrices) {
  const prizeSectors = lotteryPrizes.map((prize, index) => {
    const angle = (360 / lotteryPrizes.length) * index;
    return `<div class="prize-sector" style="transform: rotate(${angle}deg); background: ${prize.color};">${prize.name}</div>`;
  }).join('');

  return `
    <div class="tab-content" id="tab-lottery">
      <div class="section">
        <div class="title">
          <span>🎰 幸运转盘</span>
        </div>
        <div class="lottery-container">
          <div class="wheel-pointer"></div>
          <div class="wheel-wrapper">
            <div class="wheel" id="wheel">
              ${prizeSectors}
            </div>
            <div class="wheel-center">GO</div>
          </div>
        </div>
        <button class="lottery-btn" id="lotteryBtn" onclick="startLottery()"
                ${gameState.coins < lotteryPrices.normal ? 'disabled' : ''}>
          🎰 抽奖一次 (${lotteryPrices.normal}金币)
        </button>
        <div class="lottery-info">奖励包括金币、加速道具、折扣券等</div>
      </div>
    </div>
  `;
}

module.exports = { generateLotteryTab };
