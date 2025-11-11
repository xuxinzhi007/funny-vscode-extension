/**
 * Achievement Tab Template Generator
 */

function generateAchievementTab(achievements) {
  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const achievementsList = unlockedAchievements.length > 0
    ? unlockedAchievements.map(a => `<span class="badge">🏆${a.name}</span>`).join('')
    : '<div class="empty">暂无成就</div>';

  return `
    <div class="tab-content" id="tab-achievement">
      <div class="section">
        <div class="title">
          <span>🏆 成就系统 (${unlockedAchievements.length}/${achievements.length})</span>
        </div>
        ${achievementsList}
      </div>
    </div>
  `;
}

module.exports = { generateAchievementTab };
