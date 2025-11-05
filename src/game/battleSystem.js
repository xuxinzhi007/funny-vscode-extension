// 战斗系统模块

/**
 * 角色类 - 玩家和敌人的基类
 */
class Character {
  constructor(name, stats, isEnemy = false) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.maxHealth = stats.health || 100;
    this.health = this.maxHealth;
    this.attack = stats.attack || 10;
    this.defense = stats.defense || 0;
    this.critRate = stats.critRate || 0.1; // 暴击率 (0-1)
    this.critDamage = stats.critDamage || 1.5; // 暴击伤害倍率
    this.healthRegen = stats.healthRegen || 1; // 每秒恢复
    this.isEnemy = isEnemy;
    this.isDead = false;
    this.x = isEnemy ? 80 : 20; // 位置百分比
    this.y = 50;
  }

  /**
   * 计算伤害
   */
  calculateDamage(target) {
    // 基础伤害 = 攻击力 - 防御力
    let baseDamage = Math.max(1, this.attack - target.defense);

    // 判断是否暴击
    const isCrit = Math.random() < this.critRate;
    if (isCrit) {
      baseDamage *= this.critDamage;
    }

    // 添加随机波动 (90%-110%)
    const damage = Math.floor(baseDamage * (0.9 + Math.random() * 0.2));

    return {
      damage,
      isCrit
    };
  }

  /**
   * 受到伤害
   */
  takeDamage(damage) {
    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.isDead = true;
    }
  }

  /**
   * 恢复生命
   */
  regenerate() {
    if (!this.isDead && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.healthRegen);
    }
  }

  /**
   * 移动角色
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }
}

/**
 * 战斗系统类
 */
class BattleSystem {
  constructor() {
    this.wave = 1;
    this.player = null;
    this.enemies = [];
    this.battleLog = [];
    this.isInBattle = false;
    this.gold = 0;
    this.experience = 0;
    this.playerLevel = 1;
    this.battleInterval = null;
    this.regenInterval = null;
  }

  /**
   * 初始化玩家
   */
  initPlayer(stats) {
    this.player = new Character('勇士', stats || {
      health: 100,
      attack: 15,
      defense: 5,
      critRate: 0.15,
      critDamage: 2.0,
      healthRegen: 2
    }, false);
  }

  /**
   * 生成敌人
   */
  generateEnemies(wave) {
    this.enemies = [];
    const enemyCount = Math.min(1 + Math.floor(wave / 2), 5); // 每波敌人数量

    const enemyTypes = [
      { name: '史莱姆', health: 50, attack: 8, defense: 2 },
      { name: '哥布林', health: 70, attack: 12, defense: 3 },
      { name: '骷髅战士', health: 90, attack: 15, defense: 5 },
      { name: '兽人', health: 120, attack: 18, defense: 7 },
      { name: 'Boss', health: 200, attack: 25, defense: 10 }
    ];

    for (let i = 0; i < enemyCount; i++) {
      // 根据波次选择敌人类型
      const typeIndex = Math.min(Math.floor(wave / 3), enemyTypes.length - 1);
      const enemyType = enemyTypes[typeIndex];

      // 根据波次增强敌人属性
      const waveMultiplier = 1 + (wave - 1) * 0.1;
      const stats = {
        health: Math.floor(enemyType.health * waveMultiplier),
        attack: Math.floor(enemyType.attack * waveMultiplier),
        defense: Math.floor(enemyType.defense * waveMultiplier),
        critRate: 0.05 + wave * 0.01,
        critDamage: 1.5,
        healthRegen: 0.5
      };

      const enemy = new Character(enemyType.name, stats, true);
      // 设置敌人初始位置
      enemy.x = 80;
      enemy.y = 30 + (i * 15);
      this.enemies.push(enemy);
    }
  }

  /**
   * 开始新的波次
   */
  startWave(wave) {
    this.wave = wave || this.wave;
    this.generateEnemies(this.wave);
    this.isInBattle = true;
    this.addLog(`第 ${this.wave} 波开始！敌人数量: ${this.enemies.length}`);

    // 启动战斗循环
    this.startBattleLoop();
  }

  /**
   * 启动战斗循环
   */
  startBattleLoop() {
    // 清除旧的定时器
    if (this.battleInterval) {
      clearInterval(this.battleInterval);
    }
    if (this.regenInterval) {
      clearInterval(this.regenInterval);
    }

    // 战斗逻辑 - 每1秒执行一次攻击
    this.battleInterval = setInterval(() => {
      if (!this.isInBattle) {
        this.stopBattleLoop();
        return;
      }

      this.executeBattleRound();
    }, 1000);

    // 生命恢复 - 每秒执行
    this.regenInterval = setInterval(() => {
      if (this.player && !this.player.isDead) {
        this.player.regenerate();
      }
      this.enemies.forEach(enemy => {
        if (!enemy.isDead) {
          enemy.regenerate();
        }
      });
    }, 1000);
  }

  /**
   * 停止战斗循环
   */
  stopBattleLoop() {
    if (this.battleInterval) {
      clearInterval(this.battleInterval);
      this.battleInterval = null;
    }
    if (this.regenInterval) {
      clearInterval(this.regenInterval);
      this.regenInterval = null;
    }
  }

  /**
   * 执行一轮战斗
   */
  executeBattleRound() {
    // 检查战斗是否结束
    if (this.checkBattleEnd()) {
      return;
    }

    // 玩家攻击最近的敌人
    if (!this.player.isDead) {
      const target = this.findNearestEnemy();
      if (target) {
        // 移动到敌人附近
        this.moveCharacter(this.player, target);

        // 如果足够近，进行攻击
        if (this.isInRange(this.player, target)) {
          const { damage, isCrit } = this.player.calculateDamage(target);
          target.takeDamage(damage);
          this.addLog(`${this.player.name} 攻击 ${target.name}，造成 ${damage} 伤害${isCrit ? ' (暴击!)' : ''}`);

          if (target.isDead) {
            this.addLog(`${target.name} 被击败了！`);
            this.gold += Math.floor(10 * this.wave * (1 + Math.random()));
            this.experience += Math.floor(5 * this.wave);
          }
        }
      }
    }

    // 敌人攻击玩家
    this.enemies.forEach(enemy => {
      if (!enemy.isDead && !this.player.isDead) {
        // 移动到玩家附近
        this.moveCharacter(enemy, this.player);

        // 如果足够近，进行攻击
        if (this.isInRange(enemy, this.player)) {
          const { damage, isCrit } = enemy.calculateDamage(this.player);
          this.player.takeDamage(damage);
          this.addLog(`${enemy.name} 攻击 ${this.player.name}，造成 ${damage} 伤害${isCrit ? ' (暴击!)' : ''}`);

          if (this.player.isDead) {
            this.addLog(`${this.player.name} 阵亡了！`);
            this.endBattle(false);
          }
        }
      }
    });
  }

  /**
   * 移动角色向目标
   */
  moveCharacter(character, target) {
    const speed = 5; // 每次移动5个单位
    const dx = target.x - character.x;
    const dy = target.y - character.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 15) { // 如果距离大于15，则移动
      character.x += (dx / distance) * speed;
      character.y += (dy / distance) * speed;
    }
  }

  /**
   * 检查是否在攻击范围内
   */
  isInRange(character, target) {
    const dx = target.x - character.x;
    const dy = target.y - character.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= 15; // 攻击范围为15
  }

  /**
   * 找到最近的敌人
   */
  findNearestEnemy() {
    let nearest = null;
    let minDistance = Infinity;

    this.enemies.forEach(enemy => {
      if (!enemy.isDead) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
          minDistance = distance;
          nearest = enemy;
        }
      }
    });

    return nearest;
  }

  /**
   * 检查战斗是否结束
   */
  checkBattleEnd() {
    // 玩家死亡
    if (this.player.isDead) {
      this.endBattle(false);
      return true;
    }

    // 所有敌人死亡
    const allEnemiesDead = this.enemies.every(enemy => enemy.isDead);
    if (allEnemiesDead) {
      this.endBattle(true);
      return true;
    }

    return false;
  }

  /**
   * 结束战斗
   */
  endBattle(victory) {
    this.isInBattle = false;
    this.stopBattleLoop();

    if (victory) {
      this.addLog(`第 ${this.wave} 波胜利！获得 ${Math.floor(this.gold)} 金币`);
      // 检查是否升级
      this.checkLevelUp();
    } else {
      this.addLog(`战斗失败！`);
    }
  }

  /**
   * 检查升级
   */
  checkLevelUp() {
    const expNeeded = this.playerLevel * 100;
    if (this.experience >= expNeeded) {
      this.playerLevel++;
      this.experience -= expNeeded;
      this.addLog(`恭喜！升级到 Lv.${this.playerLevel}！`);

      // 升级时提升属性
      this.player.maxHealth += 20;
      this.player.health = this.player.maxHealth;
      this.player.attack += 3;
      this.player.defense += 1;
      this.player.healthRegen += 0.5;
    }
  }

  /**
   * 重置玩家状态
   */
  resetPlayer() {
    if (this.player) {
      this.player.health = this.player.maxHealth;
      this.player.isDead = false;
      this.player.x = 20;
      this.player.y = 50;
    }
  }

  /**
   * 升级属性
   */
  upgradeAttribute(attribute, cost) {
    if (this.gold < cost) {
      return false;
    }

    this.gold -= cost;

    switch (attribute) {
      case 'health':
        this.player.maxHealth += 20;
        this.player.health = this.player.maxHealth;
        break;
      case 'attack':
        this.player.attack += 5;
        break;
      case 'defense':
        this.player.defense += 2;
        break;
      case 'critRate':
        this.player.critRate = Math.min(0.8, this.player.critRate + 0.05);
        break;
      case 'critDamage':
        this.player.critDamage += 0.2;
        break;
      case 'healthRegen':
        this.player.healthRegen += 1;
        break;
    }

    return true;
  }

  /**
   * 添加日志
   */
  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.battleLog.push({ time: timestamp, message });

    // 限制日志数量
    if (this.battleLog.length > 50) {
      this.battleLog.shift();
    }
  }

  /**
   * 获取战斗状态
   */
  getBattleState() {
    return {
      wave: this.wave,
      player: this.player ? {
        id: this.player.id,
        name: this.player.name,
        health: Math.floor(this.player.health),
        maxHealth: this.player.maxHealth,
        attack: this.player.attack,
        defense: this.player.defense,
        critRate: this.player.critRate,
        critDamage: this.player.critDamage,
        healthRegen: this.player.healthRegen,
        isDead: this.player.isDead,
        x: this.player.x,
        y: this.player.y
      } : null,
      enemies: this.enemies.map(enemy => ({
        id: enemy.id,
        name: enemy.name,
        health: Math.floor(enemy.health),
        maxHealth: enemy.maxHealth,
        isDead: enemy.isDead,
        x: enemy.x,
        y: enemy.y
      })),
      isInBattle: this.isInBattle,
      gold: Math.floor(this.gold),
      experience: this.experience,
      playerLevel: this.playerLevel,
      battleLog: this.battleLog.slice(-10) // 只返回最近10条日志
    };
  }

  /**
   * 清理资源
   */
  dispose() {
    this.stopBattleLoop();
  }
}

// 创建全局战斗系统实例
let battleSystemInstance = null;

function getBattleSystem() {
  if (!battleSystemInstance) {
    battleSystemInstance = new BattleSystem();
  }
  return battleSystemInstance;
}

module.exports = {
  BattleSystem,
  getBattleSystem
};
