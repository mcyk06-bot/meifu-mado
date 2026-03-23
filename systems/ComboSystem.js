import { KINEN } from '../data/units.js';

export class ComboSystem {
  constructor(gridSystem) {
    this.grid = gridSystem;
    this.activeKinen = [];
  }

  // 全ユニットの配置を見て因縁を検出
  checkAllKinen(placedUnits) {
    this.activeKinen = [];

    KINEN.forEach(kinen => {
      if (this.isKinenActive(kinen, placedUnits)) {
        this.activeKinen.push(kinen);
      }
    });

    return this.activeKinen;
  }

  isKinenActive(kinen, placedUnits) {
    const unitIds = placedUnits.map(u => u.unitId);

    // 必要なユニットが全員いるか
    const hasAll = kinen.units.every(id =>
      unitIds.includes(id)
    );
    if (!hasAll) return false;

    // 隣接条件チェック
    if (kinen.condition === 'adjacent') {
      return this.checkAdjacent(
        kinen.units[0],
        kinen.units[1],
        placedUnits
      );
    }

    // 数量条件チェック
    if (kinen.condition === 'count_3') {
      const count = unitIds.filter(
        id => id === kinen.units[0]
      ).length;
      return count >= 3;
    }

    return true;
  }

  checkAdjacent(unitIdA, unitIdB, placedUnits) {
    const a = placedUnits.find(u => u.unitId === unitIdA);
    const b = placedUnits.find(u => u.unitId === unitIdB);
    if (!a || !b) return false;

    const dx = Math.abs(a.col - b.col);
    const dy = Math.abs(a.row - b.row);
    return dx + dy === 1; // 上下左右1マス
  }

  // 因縁効果をユニットに適用
  applyEffects(placedUnits) {
    // まず全ユニットを基本値にリセット
    placedUnits.forEach(u => {
      u.currentAtk = u.baseAtk;
      u.currentRange = u.baseRange;
      u.kinenEffects = [];
    });

    this.activeKinen.forEach(kinen => {
      placedUnits.forEach(u => {
        const effect = kinen.effect[u.unitId];
        if (!effect) return;

        if (effect.atkMult) {
          u.currentAtk = Math.floor(
            u.currentAtk * effect.atkMult
          );
        }
        if (effect.rangePlus) {
          u.currentRange += effect.rangePlus;
        }
        u.kinenEffects.push({
          kinenId: kinen.id,
          name: kinen.name,
          effect
        });
      });
    });

    return placedUnits;
  }

  // 地形による補正
  applyTerrainBonus(unit) {
    const terrainEffect = this.grid.getTerrainEffect(
      unit.col, unit.row
    );
    let finalAtk = unit.currentAtk;
    let finalRange = unit.currentRange;

    if (terrainEffect.allyAtkMult) {
      finalAtk = Math.floor(finalAtk * terrainEffect.allyAtkMult);
    }
    if (terrainEffect.rangeMinus) {
      finalRange = Math.max(1,
        finalRange - terrainEffect.rangeMinus
      );
    }
    // 水属性特別補正
    if (terrainEffect.waterAtkMult &&
        unit.element === 'water') {
      finalAtk = Math.floor(finalAtk * terrainEffect.waterAtkMult);
    }

    return { atk: finalAtk, range: finalRange };
  }

  getActiveKinenNames() {
    return this.activeKinen.map(k => k.name);
  }
}