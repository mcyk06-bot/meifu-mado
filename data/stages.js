// グリッドサイズ：9列 x 13行
// path: 敵が通るセル座標
// terrain: 地形の初期配置

export const STAGES = {
  stage1: {
    name: '黄泉の入口',
    gridCols: 9,
    gridRows: 13,
    // 蛇行経路（列, 行）
    path: [
      [4,0],[4,1],[4,2],
      [4,3],[3,3],[2,3],[1,3],
      [1,4],[1,5],[1,6],
      [1,7],[2,7],[3,7],[4,7],[5,7],[6,7],[7,7],
      [7,8],[7,9],[7,10],
      [7,11],[6,11],[5,11],[4,11],[3,11],[2,11],
      [2,12]
    ],
    toriiiPos: { col: 4, row: 0 }, // 鳥居位置
    goalPos: { col: 2, row: 12 },   // 守護ライン

    // 初期地形
    terrain: [
      { col: 0, row: 3, type: 'sacred' },   // 聖域
      { col: 8, row: 7, type: 'miasma' },   // 瘴気
      { col: 5, row: 2, type: 'fog' },      // 霧
    ],

    // ウェーブ定義
    waves: [
      {
        enemies: [
          { type: 'skeleton', count: 5, interval: 1.5 }
        ]
      },
      {
        enemies: [
          { type: 'skeleton', count: 8, interval: 1.2 },
          { type: 'rokurokubi', count: 2, interval: 3.0 }
        ]
      },
      {
        enemies: [
          { type: 'skeleton', count: 6, interval: 1.0 },
          { type: 'yurei', count: 3, interval: 2.0 },
          { type: 'daidarabocchi', count: 1, interval: 0 }
        ]
      }
    ]
  }
};