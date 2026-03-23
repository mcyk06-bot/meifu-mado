import { UNITS } from '../data/units.js';
import { ComboSystem } from './ComboSystem.js';

export class UnitSystem {
  constructor(gridSystem) {
    this.grid = gridSystem;
    this.combo = new ComboSystem(gridSystem);
    this.placedUnits = [];
    this.nextId = 0;
  }

  placeUnit(col, row, unitId) {
    const unitData = UNITS[unitId];
    if (!unitData) return null;

    const success = this.grid.placeUnit(col, row, unitId);
    if (!success) return null;

    const pos = this.grid.getPerspectivePos(col, row);
    const unit = {
      id: this.nextId++,
      unitId,
      col, row,
      x: pos.x, y: pos.y,
      scale: pos.scale,
      baseAtk: unitData.atk,
      baseRange: unitData.range,
      currentAtk: unitData.atk,
      currentRange: unitData.range,
      hp: unitData.hp,
      currentHp: unitData.hp,
      element: unitData.element,
      special: unitData.special,
      attackTimer: 0,
      attackSpeed: unitData.speed,
      // 般若用
      rageStack: 0,
      kinenEffects: []
    };

    this.placedUnits.push(unit);

    // 因縁チェック・再適用
    this.combo.checkAllKinen(this.placedUnits);
    this.combo.applyEffects(this.placedUnits);

    return unit;
  }

  removeUnit(col, row) {
    const unit = this.placedUnits.find(
      u => u.col === col && u.row === row
    );
    if (!unit) return;

    this.grid.removeUnit(col, row);
    this.placedUnits = this.placedUnits.filter(
      u => u.id !== unit.id
    );

    // 因縁再チェック
    this.combo.checkAllKinen(this.placedUnits);
    this.combo.applyEffects(this.placedUnits);
  }

  update(delta, enemySystem) {
    this.placedUnits.forEach(unit => {
      unit.attackTimer -= delta;
      if (unit.attackTimer > 0) return;

      // 地形補正を取得
      const terrainBonus = this.combo.applyTerrainBonus(unit);
      const effectiveRange = terrainBonus.range;
      const effectiveAtk = terrainBonus.atk;

      // 射程内の敵を取得
      const targets = enemySystem.getEnemiesInRange(
        unit.x, unit.y, effectiveRange
      );
      if (targets.length === 0) return;

      // 対象選定
      let target = this.selectTarget(
        unit, targets, enemySystem
      );
      if (!target) return;

      // 攻撃実行
      this.executeAttack(
        unit, target, effectiveAtk, enemySystem
      );
      unit.attackTimer = 1.0 / unit.attackSpeed;
    });
  }

  selectTarget(unit, targets, enemySystem) {
    // 轆轤首は遠距離ユニットを優先
    if (unit.special === 'target_ranged') {
      const rangedTargets = targets.filter(
        e => e.behavior === 'target_ranged'
      );
      if (rangedTargets.length > 0) return rangedTargets[0];
    }
    // 基本：最も前（pathIndex大）の敵
    return targets.reduce((a, b) =>
      a.pathIndex > b.pathIndex ? a : b
    );
  }

  executeAttack(unit, target, atk, enemySystem) {
    // 基本ダメージ
    let damage = atk;

    // 属性相性
    damage = this.applyElementBonus(
      unit.element, target.element, damage
    );

    // 前列後列ボーナス
    if (unit.special === 'front_row_bonus' &&
        unit.row >= this.grid.rows - 3) {
      damage = Math.floor(damage * 1.2);
    }
    if (unit.special === 'back_row_bonus' &&
        unit.row <= 2) {
      damage = Math.floor(damage * 1.2);
    }

    // 特殊攻撃
    switch (unit.special) {
      case 'slow':
        enemySystem.applyStatus(target.id, 'slow', 0, 2.0);
        break;
      case 'freeze':
        enemySystem.applyStatus(target.id, 'freeze', 0, 1.5);
        break;
      case 'dot':
        enemySystem.applyStatus(target.id, 'dot', 8, 5.0);
        break;
      case 'knockback':
        target.pathIndex = Math.max(
          0, target.pathIndex - 2
        );
        break;
      case 'area_attack':
        // 範囲攻撃：周囲の敵にも50%ダメージ
        const nearby = enemySystem.getEnemiesInRange(
          target.x, target.y, 1.5
        );
        nearby.forEach(e => {
          if (e.id !== target.id) {
            e.currentHp -= Math.floor(damage * 0.5);
          }
        });
        break;
      case 'rage':
        unit.rageStack = Math.min(10, unit.rageStack + 1);
        damage = Math.floor(
          damage * (1 + unit.rageStack * 0.1)
        );
        break;
    }

    target.currentHp -= damage;
    return damage;
  }

  applyElementBonus(attackerEl, defenderEl, damage) {
    // 五行相克
    const advantage = {
      wood: 'earth', earth: 'water',
      water: 'fire', fire: 'metal', metal: 'wood'
    };
    if (advantage[attackerEl] === defenderEl) {
      return Math.floor(damage * 1.5); // 相克有利
    }
    if (advantage[defenderEl] === attackerEl) {
      return Math.floor(damage * 0.7); // 相克不利
    }
    return damage;
  }

  getActiveKinen() {
    return this.combo.getActiveKinenNames();
  }
}