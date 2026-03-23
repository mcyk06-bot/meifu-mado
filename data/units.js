export const UNITS = {
  onmyoji: {
    id: 'onmyoji',
    name: '陰陽師',
    element: 'void',
    cost: 3,
    hp: 80,
    atk: 15,
    range: 3,
    speed: 1.0,
    special: 'buff_adjacent', // 隣接強化
    passive: 'absorb_damage', // ダメージ肩代わり
    color: 0xffffff,
    description: '隣接ユニットを強化する司令塔'
  },
  oni_musha: {
    id: 'oni_musha',
    name: '鬼武者',
    element: 'metal',
    cost: 4,
    hp: 200,
    atk: 45,
    range: 1,
    speed: 0.8,
    special: 'cleave', // 範囲近接
    passive: 'front_row_bonus', // 前列+20%
    color: 0xff4400,
    description: '前列最強の壁・近接特化'
  },
  kappa: {
    id: 'kappa',
    name: '河童',
    element: 'water',
    cost: 2,
    hp: 100,
    atk: 20,
    range: 2,
    speed: 1.2,
    special: 'slow', // 敵を遅延
    passive: 'row_attack', // 列全体攻撃
    color: 0x00aaff,
    description: '敵を遅らせる妨害役'
  },
  kitsune: {
    id: 'kitsune',
    name: '狐火',
    element: 'fire',
    cost: 3,
    hp: 90,
    atk: 35,
    range: 3,
    speed: 1.0,
    special: 'dot', // 継続ダメージ
    passive: 'area_attack', // 範囲攻撃
    color: 0xff8800,
    description: '炎のDoTで複数敵を焼く'
  },
  tengu: {
    id: 'tengu',
    name: '天狗',
    element: 'wood',
    cost: 4,
    hp: 110,
    atk: 40,
    range: 5,
    speed: 0.9,
    special: 'knockback', // 吹き飛ばし
    passive: 'back_row_bonus', // 奥列+20%
    color: 0x00cc44,
    description: '最長射程・敵を吹き飛ばす'
  },
  yukionna: {
    id: 'yukionna',
    name: '雪女',
    element: 'water',
    cost: 4,
    hp: 85,
    atk: 30,
    range: 4,
    speed: 1.1,
    special: 'freeze', // 完全停止
    passive: 'group_freeze', // 3体で全体凍結
    color: 0xaaeeff,
    description: '凍結で敵の動きを完全封止'
  },
  hannya: {
    id: 'hannya',
    name: '般若',
    element: 'fire',
    cost: 5,
    hp: 150,
    atk: 60,
    range: 2,
    speed: 0.7,
    special: 'rage', // 怒り蓄積・自己強化
    passive: 'rampage_risk', // 暴走リスク
    color: 0xff0055,
    description: '怒りを蓄積して爆発的火力'
  }
};

// 因縁定義
export const KINEN = [
  {
    id: 'fated_rivals',
    name: '宿命の対決',
    units: ['oni_musha', 'hannya'],
    effect: {
      oni_musha: { atkMult: 1.5 },
      hannya: { rampageChance: 0.2 }
    },
    description: '鬼武者の攻撃力+50%・般若に暴走リスク'
  },
  {
    id: 'master_student',
    name: '師弟の絆',
    units: ['onmyoji', 'kitsune'],
    condition: 'adjacent',
    effect: {
      kitsune: { rangePlus: 2 },
      onmyoji: { absorbDamage: true }
    },
    description: '隣接時・狐火の射程+2・陰陽師が庇う'
  },
  {
    id: 'blizzard',
    name: '極寒の冥府',
    units: ['yukionna'],
    condition: 'count_3',
    effect: {
      global: { enemySpeedMult: 0.3, allyMoveLock: true }
    },
    description: '雪女3体で全体凍結・敵速度-70%'
  },
  {
    id: 'water_wood',
    name: '水木の恵み',
    units: ['kappa', 'tengu'],
    condition: 'adjacent',
    effect: {
      kappa: { atkMult: 1.3 },
      tengu: { rangePlus: 1 }
    },
    description: '隣接で相互強化'
  }
];