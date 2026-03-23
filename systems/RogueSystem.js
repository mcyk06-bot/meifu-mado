import { UNITS } from '../data/units.js';

export class RogueSystem {
  constructor() {
    this.floor = 1;       // 現在の階層
    this.choiceCount = 3; // 選択肢の数

    // 解放済みユニット
    this.unlockedUnits = ['skeleton_guard'];

    // 永続強化（ラン中ずっと有効）
    this.permanentBuffs = {
      atkMult: 1.0,
      hpMult: 1.0,
      goldBonus: 0,
      freeObstacles: 0
    };

    // コールバック
    this.onChoiceMade = null;
  }

  // ウェーブクリア後の選択肢を生成
  generateChoices(waveNumber, placedUnits, currentGold) {
    const allChoices = this.buildChoicePool(
      waveNumber, placedUnits, currentGold
    );

    // シャッフルして3枚抽出
    const shuffled = allChoices
      .sort(() => Math.random() - 0.5);

    return shuffled.slice(0, this.choiceCount);
  }

  buildChoicePool(waveNumber, placedUnits, gold) {
    const pool = [];

    // ── ゴールド系 ──────────────────────
    pool.push({
      id: 'gold_small',
      category: 'gold',
      title: '遺品の回収',
      description: '金を3獲得する',
      rarity: 'common',
      color: 0xffdd00,
      effect: (state) => { state.gold += 3; }
    });

    pool.push({
      id: 'gold_large',
      category: 'gold',
      title: '宝の発掘',
      description: '金を8獲得する\nただし次のウェーブの\n敵数+2',
      rarity: 'rare',
      color: 0xffaa00,
      effect: (state) => {
        state.gold += 8;
        state.nextWaveBonus = (state.nextWaveBonus || 0) + 2;
      }
    });

    // ── ユニット強化 ─────────────────────
    if (placedUnits.length > 0) {
      const randomUnit = placedUnits[
        Math.floor(Math.random() * placedUnits.length)
      ];
      const unitData = UNITS[randomUnit.unitId];

      pool.push({
        id: 'unit_atk_up',
        category: 'upgrade',
        title: `${unitData.name}の覚醒`,
        description: `${unitData.name}の\n攻撃力を+20%`,
        rarity: 'common',
        color: 0xff6644,
        effect: (state) => {
          const u = state.unitSystem.placedUnits
            .find(u => u.id === randomUnit.id);
          if (u) {
            u.baseAtk = Math.floor(u.baseAtk * 1.2);
            u.currentAtk = Math.floor(u.currentAtk * 1.2);
          }
        }
      });

      pool.push({
        id: 'unit_range_up',
        category: 'upgrade',
        title: `${unitData.name}の遠眼`,
        description: `${unitData.name}の\n射程+1`,
        rarity: 'common',
        color: 0x44aaff,
        effect: (state) => {
          const u = state.unitSystem.placedUnits
            .find(u => u.id === randomUnit.id);
          if (u) {
            u.baseRange += 1;
            u.currentRange += 1;
          }
        }
      });

      pool.push({
        id: 'unit_hp_up',
        category: 'upgrade',
        title: `${unitData.name}の鍛錬`,
        description: `${unitData.name}の\n最大HP+50%・全回復`,
        rarity: 'rare',
        color: 0x44ff88,
        effect: (state) => {
          const u = state.unitSystem.placedUnits
            .find(u => u.id === randomUnit.id);
          if (u) {
            u.hp = Math.floor(u.hp * 1.5);
            u.currentHp = u.hp;
          }
        }
      });
    }

    // ── 全体強化 ──────────────────────
    pool.push({
      id: 'all_atk',
      category: 'global',
      title: '闘気の解放',
      description: '全ユニットの\n攻撃力+10%',
      rarity: 'rare',
      color: 0xff4400,
      effect: (state) => {
        this.permanentBuffs.atkMult *= 1.1;
        state.unitSystem.placedUnits.forEach(u => {
          u.baseAtk = Math.floor(u.baseAtk * 1.1);
          u.currentAtk = Math.floor(u.currentAtk * 1.1);
        });
      }
    });

    pool.push({
      id: 'all_hp',
      category: 'global',
      title: '陰陽の加護',
      description: '全ユニットのHPを\n30%回復',
      rarity: 'common',
      color: 0x44ff88,
      effect: (state) => {
        state.unitSystem.placedUnits.forEach(u => {
          u.currentHp = Math.min(
            u.hp,
            u.currentHp + Math.floor(u.hp * 0.3)
          );
        });
      }
    });

    // ── 地形 ──────────────────────────
    pool.push({
      id: 'terrain_sacred',
      category: 'terrain',
      title: '聖地の顕現',
      description: 'ランダムな3マスに\n聖域が出現\n（攻撃力+30%）',
      rarity: 'rare',
      color: 0xffffaa,
      effect: (state) => {
        let placed = 0;
        let attempts = 0;
        while (placed < 3 && attempts < 50) {
          attempts++;
          const r = Math.floor(
            Math.random() * state.grid.rows
          );
          const c = Math.floor(
            Math.random() * state.grid.cols
          );
          const cell = state.grid.cells[r][c];
          if (!cell.isPath && !cell.terrain) {
            state.grid.setTerrain(c, r, 'sacred');
            placed++;
          }
        }
        state.redrawGrid && state.redrawGrid();
      }
    });

    pool.push({
      id: 'free_obstacle',
      category: 'obstacle',
      title: '陰陽師の結界',
      description: '結界石を3つ\n無料で置ける',
      rarity: 'common',
      color: 0x8888ff,
      effect: (state) => {
        state.gold += 6; // 結界石コスト2×3
      }
    });

    // ── プレイヤーHP回復 ──────────────
    pool.push({
      id: 'heal_hp',
      category: 'heal',
      title: '陰陽の秘術',
      description: '守護ラインのHPを\n3回復する',
      rarity: 'common',
      color: 0xff8888,
      effect: (state) => {
        state.hp = Math.min(20, state.hp + 3);
      }
    });

    // ── 上位階層限定 ──────────────────
    if (waveNumber >= 3) {
      pool.push({
        id: 'double_attack',
        category: 'special',
        title: '鬼火の二段撃ち',
        description: '全ユニットが\n攻撃速度+30%\n（永続）',
        rarity: 'legendary',
        color: 0xff00ff,
        effect: (state) => {
          state.unitSystem.placedUnits.forEach(u => {
            u.attackSpeed *= 1.3;
          });
        }
      });

      pool.push({
        id: 'summon_unit',
        category: 'summon',
        title: '冥府の使者',
        description: 'ランダムなユニットを\n無料で1体召喚',
        rarity: 'legendary',
        color: 0xaa00ff,
        effect: (state) => {
          const unitIds = Object.keys(UNITS);
          const randomId = unitIds[
            Math.floor(Math.random() * unitIds.length)
          ];
          state.gold += UNITS[randomId].cost;
          state.pendingSummon = randomId;
        }
      });
    }

    return pool;
  }

  applyChoice(choice, state) {
    choice.effect(state);
    this.onChoiceMade && this.onChoiceMade(choice);
  }

  advanceFloor() {
    this.floor++;
  }

  getRarityColor(rarity) {
    const colors = {
      common:    0xaaaaaa,
      rare:      0x4488ff,
      legendary: 0xff8800
    };
    return colors[rarity] || 0xffffff;
  }

  getRarityLabel(rarity) {
    const labels = {
      common:    '並',
      rare:      '稀',
      legendary: '極'
    };
    return labels[rarity] || '';
  }
}