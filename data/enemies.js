export const ENEMIES = {
  skeleton: {
    id: 'skeleton',
    name: '骸骨兵',
    element: 'void',
    hp: 60,
    speed: 1.0,
    atk: 10,
    reward: 1,
    behavior: 'straight',
    color: 0xeeeecc,
    description: '基本の敵・数で押してくる'
  },
  rokurokubi: {
    id: 'rokurokubi',
    name: '轆轤首',
    element: 'void',
    hp: 80,
    speed: 0.8,
    atk: 20,
    reward: 2,
    behavior: 'target_ranged', // 遠距離ユニット優先
    color: 0xffaacc,
    description: '遠距離ユニットを直接狙う'
  },
  hyakume: {
    id: 'hyakume',
    name: '百目鬼',
    element: 'void',
    hp: 90,
    speed: 1.1,
    atk: 15,
    reward: 2,
    behavior: 'random_path', // ランダム移動
    color: 0xffff00,
    description: '経路が読めないトリッキー敵'
  },
  yurei: {
    id: 'yurei',
    name: '幽霊',
    element: 'void',
    hp: 50,
    speed: 1.3,
    atk: 12,
    reward: 2,
    behavior: 'phase_through', // 壁すり抜け
    canPassObstacles: true,
    color: 0xccccff,
    description: '障害物を無視して移動'
  },
  daidarabocchi: {
    id: 'daidarabocchi',
    name: '大入道',
    element: 'earth',
    hp: 500,
    speed: 0.3,
    atk: 50,
    reward: 5,
    behavior: 'straight',
    color: 0x886644,
    description: '超低速・高耐久の盾敵'
  },
  kasha: {
    id: 'kasha',
    name: '火車',
    element: 'fire',
    hp: 70,
    speed: 0.6, // 後半加速
    atk: 25,
    reward: 3,
    behavior: 'accelerate', // 加速
    color: 0xff6600,
    description: '後半から急加速する'
  },
  nue: {
    id: 'nue',
    name: '鵺',
    element: 'random', // 途中で属性変化
    hp: 120,
    speed: 0.9,
    atk: 30,
    reward: 4,
    behavior: 'transform',
    color: 0x9900ff,
    description: '途中で属性が変わる変異体'
  }
};