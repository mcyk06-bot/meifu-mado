export class GridSystem {
  constructor(cols, rows, cellW, cellH, offsetX, offsetY) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = cellW;
    this.cellH = cellH;
    this.offsetX = offsetX;
    this.offsetY = offsetY;

    // セルの状態管理
    this.cells = [];
    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        this.cells[r][c] = {
          col: c, row: r,
          type: 'empty',    // empty/path/blocked
          terrain: null,    // sacred/miasma/fog/flame/holy_water
          obstacle: null,   // barrier/scarecrow/jizo
          unit: null,
          isPath: false
        };
      }
    }
  }

  // パース変換（台形遠近法）
  // 奥（row=0）ほど小さく・手前（row=max）ほど大きく
  getPerspectivePos(col, row) {
    const t = row / (this.rows - 1); // 0=奥 1=手前
    const scaleX = 0.5 + t * 0.5;   // 奥0.5倍 手前1.0倍
    const scaleY = 0.4 + t * 0.6;

    const centerX = this.offsetX + (this.cols * this.cellW) / 2;
    const baseX = this.offsetX + col * this.cellW;
    const x = centerX + (baseX - centerX) * scaleX;
    const y = this.offsetY + row * this.cellH * scaleY;

    return { x, y, scale: scaleY };
  }

  // セルをパス（経路）として設定
  setPath(pathCoords) {
    pathCoords.forEach(([c, r]) => {
      this.cells[r][c].isPath = true;
      this.cells[r][c].type = 'path';
    });
  }

  // 地形を設定
  setTerrain(col, row, terrainType) {
    if (!this.isValid(col, row)) return;
    this.cells[row][col].terrain = terrainType;
  }

  // 障害物を設置
  placeObstacle(col, row, obstacleType) {
    const cell = this.cells[row][col];
    if (cell.isPath) return false;  // 経路には置けない
    if (cell.unit) return false;    // ユニットがいれば置けない
    if (cell.obstacle) return false;
    cell.obstacle = obstacleType;
    if (obstacleType === 'barrier') {
      cell.type = 'blocked'; // 敵も通れない
    }
    return true;
  }

  // ユニットを配置
  placeUnit(col, row, unit) {
    const cell = this.cells[row][col];
    if (cell.isPath) return false;
    if (cell.unit) return false;
    if (cell.obstacle === 'barrier') return false;
    cell.unit = unit;
    return true;
  }

  removeUnit(col, row) {
    this.cells[row][col].unit = null;
  }

  isValid(col, row) {
    return col >= 0 && col < this.cols &&
           row >= 0 && row < this.rows;
  }

  // 地形効果を取得
  getTerrainEffect(col, row) {
    const terrain = this.cells[row][col].terrain;
    const effects = {
      sacred:     { allyAtkMult: 1.3 },
      miasma:     { enemyAtkMult: 1.2, allyAtkMult: 0.8 },
      fog:        { rangeMinus: 2 },
      flame:      { enemyDotDamage: 5 },
      holy_water: { waterAtkMult: 1.4 }
    };
    return effects[terrain] || {};
  }

  // 位置から行番号でソート（奥から手前の描画順）
  getDrawOrder() {
    const result = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        result.push(this.cells[r][c]);
      }
    }
    return result;
  }
}