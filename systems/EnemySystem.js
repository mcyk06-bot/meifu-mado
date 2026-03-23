export class EnemySystem {
  constructor(gridSystem, pathCoords) {
    this.grid = gridSystem;
    this.path = pathCoords; // [{col,row}, ...]
    this.enemies = [];
    this.nextId = 0;
  }

  spawnEnemy(enemyData) {
    const enemy = {
      id: this.nextId++,
      ...enemyData,
      currentHp: enemyData.hp,
      pathIndex: 0,
      x: 0, y: 0,
      // 行動状態
      isFrozen: false,
      freezeTimer: 0,
      isSlowed: false,
      slowTimer: 0,
      dotDamage: 0,
      dotTimer: 0,
      // 加速用
      speedMult: 1.0,
      // 変身用
      transformed: false
    };

    // 初期位置を鳥居に設定
    const startPos = this.grid.getPerspectivePos(
      this.path[0].col,
      this.path[0].row
    );
    enemy.x = startPos.x;
    enemy.y = startPos.y;

    this.enemies.push(enemy);
    return enemy;
  }

  update(delta) {
    const toRemove = [];

    this.enemies.forEach(enemy => {
      // 凍結中は動かない
      if (enemy.isFrozen) {
        enemy.freezeTimer -= delta;
        if (enemy.freezeTimer <= 0) enemy.isFrozen = false;
        return;
      }

      // DoTダメージ
      if (enemy.dotDamage > 0) {
        enemy.dotTimer -= delta;
        if (enemy.dotTimer <= 0) {
          enemy.currentHp -= enemy.dotDamage;
          enemy.dotTimer = 1.0;
        }
      }

      // 行動パターン別移動
      const speed = this.getEffectiveSpeed(enemy);

      switch (enemy.behavior) {
        case 'straight':
        case 'target_ranged':
          this.moveStraight(enemy, speed, delta);
          break;
        case 'random_path':
          this.moveRandom(enemy, speed, delta);
          break;
        case 'phase_through':
          this.movePhase(enemy, speed, delta);
          break;
        case 'accelerate':
          enemy.speedMult = Math.min(3.0,
            enemy.speedMult + 0.001 * delta
          );
          this.moveStraight(enemy, speed, delta);
          break;
        case 'transform':
          this.handleTransform(enemy);
          this.moveStraight(enemy, speed, delta);
          break;
      }

      // ゴール到達チェック
      if (enemy.pathIndex >= this.path.length) {
        toRemove.push(enemy.id);
        // ゴール到達イベント発火
        this.onReachGoal && this.onReachGoal(enemy);
      }

      // HP0チェック
      if (enemy.currentHp <= 0) {
        toRemove.push(enemy.id);
        this.onDefeat && this.onDefeat(enemy);
      }
    });

    // 死亡・到達した敵を除去
    this.enemies = this.enemies.filter(
      e => !toRemove.includes(e.id)
    );
  }

  getEffectiveSpeed(enemy) {
    let speed = enemy.speed * enemy.speedMult;
    if (enemy.isSlowed) speed *= 0.5;
    return speed;
  }

  moveStraight(enemy, speed, delta) {
    if (enemy.pathIndex >= this.path.length) return;

    const target = this.path[enemy.pathIndex];
    const targetPos = this.grid.getPerspectivePos(
      target.col, target.row
    );

    const dx = targetPos.x - enemy.x;
    const dy = targetPos.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = speed * 60 * delta;

    if (dist <= moveAmount) {
      enemy.x = targetPos.x;
      enemy.y = targetPos.y;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / dist) * moveAmount;
      enemy.y += (dy / dist) * moveAmount;
    }
  }

  moveRandom(enemy, speed, delta) {
    // ランダム分岐（簡易版：パス上でたまに隣接セルへ）
    if (Math.random() < 0.001) {
      const randomOffset = Math.floor(Math.random() * 3) - 1;
      enemy.pathIndex = Math.max(0, Math.min(
        this.path.length - 1,
        enemy.pathIndex + randomOffset
      ));
    }
    this.moveStraight(enemy, speed, delta);
  }

  movePhase(enemy, speed, delta) {
    // 障害物を無視して直線移動
    if (enemy.pathIndex >= this.path.length) return;
    const goal = this.path[this.path.length - 1];
    const goalPos = this.grid.getPerspectivePos(
      goal.col, goal.row
    );
    const dx = goalPos.x - enemy.x;
    const dy = goalPos.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveAmount = speed * 60 * delta;

    if (dist <= moveAmount) {
      enemy.pathIndex = this.path.length;
    } else {
      enemy.x += (dx / dist) * moveAmount;
      enemy.y += (dy / dist) * moveAmount;
    }
  }

  handleTransform(enemy) {
    // HPが半分を切ったら属性変化
    if (!enemy.transformed &&
        enemy.currentHp < enemy.hp * 0.5) {
      enemy.transformed = true;
      const elements = ['fire','water','wood','metal','earth'];
      enemy.element = elements[
        Math.floor(Math.random() * elements.length)
      ];
      enemy.color = 0xff00ff; // 変身後の色
    }
  }

  // 敵に状態異常を付与
  applyStatus(enemyId, statusType, value, duration) {
    const enemy = this.enemies.find(e => e.id === enemyId);
    if (!enemy) return;

    switch (statusType) {
      case 'freeze':
        enemy.isFrozen = true;
        enemy.freezeTimer = duration;
        break;
      case 'slow':
        enemy.isSlowed = true;
        enemy.slowTimer = duration;
        break;
      case 'dot':
        enemy.dotDamage = value;
        enemy.dotTimer = 1.0;
        break;
    }
  }

  // 範囲内の敵を取得
  getEnemiesInRange(x, y, range) {
    return this.enemies.filter(e => {
      const dx = e.x - x;
      const dy = e.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= range * 64;
    });
  }
}