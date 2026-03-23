import { GridSystem }   from './systems/GridSystem.js';
import { UnitSystem }   from './systems/UnitSystem.js';
import { EnemySystem }  from './systems/EnemySystem.js';
import { WaveSystem }   from './systems/WaveSystem.js';
import { RogueSystem }  from './systems/RogueSystem.js';
import { STAGES }       from './data/stages.js';
import { UNITS }        from './data/units.js';
import { ENEMIES }      from './data/enemies.js';

// ─────────────────────────────────────────
// PixiJS 初期化
// ─────────────────────────────────────────
const GAME_W = 390;
const GAME_H = 844;

const app = new PIXI.Application({
  width: 800,
  height: 600,
  backgroundColor: 0x1a0a2e,
  antialias: true
});
document.body.appendChild(app.renderer.view);

// ─────────────────────────────────────────
// レイヤー
// ─────────────────────────────────────────
const layers = {
  bg:        new PIXI.Container(),
  terrain:   new PIXI.Container(),
  path:      new PIXI.Container(),
  obstacles: new PIXI.Container(),
  units:     new PIXI.Container(),
  enemies:   new PIXI.Container(),
  effects:   new PIXI.Container(),
  ui:        new PIXI.Container(),
};
Object.values(layers).forEach(l => app.stage.addChild(l));
layers.enemies.sortableChildren = true;

// ─────────────────────────────────────────
// システム初期化
// ─────────────────────────────────────────
const stage   = STAGES.stage1;
const CELL_W  = 40;
const CELL_H  = 55;
const OFFSET_X = 15;
const OFFSET_Y = 80;

const grid = new GridSystem(
  stage.gridCols, stage.gridRows,
  CELL_W, CELL_H, OFFSET_X, OFFSET_Y
);

const pathCoords = stage.path.map(([c, r]) => ({
  col: c, row: r
}));
grid.setPath(stage.path);

stage.terrain.forEach(t =>
  grid.setTerrain(t.col, t.row, t.type)
);

const unitSystem  = new UnitSystem(grid);
const enemySystem = new EnemySystem(grid, pathCoords);
const waveSystem  = new WaveSystem(enemySystem, ENEMIES);
const rogueSystem = new RogueSystem();

waveSystem.loadWaves(stage.waves);

// ─────────────────────────────────────────
// ゲーム状態
// ─────────────────────────────────────────
const state = {
  phase:             'placement',
  hp:                20,
  maxHp:             20,
  gold:              10,
  wave:              0,
  selectedUnit:      null,
  selectedObstacle:  null,
  pendingSummon:     null,
  nextWaveBonus:     0,
  enemySprites:      {},
  unitSprites:       {},
  obstacleSprites:   [],
  grid,
  unitSystem,
  redrawGrid:        null,
};

// ─────────────────────────────────────────
// コールバック設定
// ─────────────────────────────────────────
waveSystem.onWaveComplete = (waveIdx) => {
  state.gold += 3 + waveIdx;
  state.phase = 'roguelike';
  drawRoguelikeUI();
};

waveSystem.onAllWavesComplete = () => {
  state.phase = 'clear';
  showStageClear();
};

enemySystem.onReachGoal = (enemy) => {
  state.hp -= 1;
  if (state.hp <= 0) {
    state.hp = 0;
    state.phase = 'gameover';
    showGameOver();
  }
  drawHUD();
};

enemySystem.onDefeat = (enemy) => {
  state.gold += enemy.reward || 1;
  const sp = state.enemySprites[enemy.id];
  if (sp) {
    layers.enemies.removeChild(sp);
    delete state.enemySprites[enemy.id];
  }
  drawHUD();
};

// ─────────────────────────────────────────
// グリッド描画
// ─────────────────────────────────────────
function drawGrid() {
  layers.bg.removeChildren();
  layers.path.removeChildren();

  const g = new PIXI.Graphics();

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c];
      const pos  = grid.getPerspectivePos(c, r);
      const w    = CELL_W * pos.scale;
      const h    = CELL_H * pos.scale;

      let fillColor = 0x1a0010;
      let fillAlpha = 0.6;
      let lineColor = 0x553344;
      let lineAlpha = 0.4;

      if (cell.isPath) {
        fillColor = 0x2d1800; fillAlpha = 0.9;
        lineColor = 0x885522; lineAlpha = 0.6;
      }

      const terrainStyles = {
        sacred:     [0xffffaa, 0.45, 0xffff66, 0.7],
        miasma:     [0x330044, 0.75, 0xaa00cc, 0.6],
        fog:        [0x223344, 0.65, 0x4488aa, 0.5],
        flame:      [0x550000, 0.75, 0xff3300, 0.6],
        holy_water: [0x002244, 0.65, 0x0066ff, 0.7],
      };

      if (cell.terrain && terrainStyles[cell.terrain]) {
        const [fc, fa, lc, la] =
          terrainStyles[cell.terrain];
        fillColor = fc; fillAlpha = fa;
        lineColor = lc; lineAlpha = la;
      }

      g.lineStyle(0.5 * pos.scale, lineColor, lineAlpha);
      g.beginFill(fillColor, fillAlpha);
      g.drawRect(
        pos.x - w / 2,
        pos.y - h / 2,
        w, h
      );
      g.endFill();

      // 地形ラベル
      if (cell.terrain) {
        const labels = {
          sacred:     '聖',
          miasma:     '瘴',
          fog:        '霧',
          flame:      '炎',
          holy_water: '水'
        };
        const lbl = new PIXI.Text(
          labels[cell.terrain] || '', {
          fontFamily: 'serif',
          fontSize:   8 * pos.scale,
          fill:       0xffffff,
          alpha:      0.6
        });
        lbl.anchor.set(0.5);
        lbl.x = pos.x;
        lbl.y = pos.y;
        layers.bg.addChild(lbl);
      }
    }
  }

  layers.bg.addChildAt(g, 0);

  // 鳥居
  drawTorii();
  // ゴールライン
  drawGoalLine();
}

state.redrawGrid = drawGrid;

// ─────────────────────────────────────────
// 鳥居
// ─────────────────────────────────────────
function drawTorii() {
  const pos = grid.getPerspectivePos(
    stage.toriiiPos.col,
    stage.toriiiPos.row
  );
  const s = pos.scale;
  const g = new PIXI.Graphics();

  g.lineStyle(3 * s, 0xcc2200);
  g.moveTo(pos.x - 22 * s, pos.y + 5 * s);
  g.lineTo(pos.x - 22 * s, pos.y - 45 * s);
  g.moveTo(pos.x + 22 * s, pos.y + 5 * s);
  g.lineTo(pos.x + 22 * s, pos.y - 45 * s);
  g.moveTo(pos.x - 28 * s, pos.y - 42 * s);
  g.lineTo(pos.x + 28 * s, pos.y - 42 * s);
  g.moveTo(pos.x - 20 * s, pos.y - 32 * s);
  g.lineTo(pos.x + 20 * s, pos.y - 32 * s);

  layers.bg.addChild(g);

  const label = new PIXI.Text('冥　府', {
    fontFamily: 'serif',
    fontSize:   10 * s,
    fill:       0xff4400,
    letterSpacing: 2
  });
  label.anchor.set(0.5);
  label.x = pos.x;
  label.y = pos.y - 55 * s;
  layers.bg.addChild(label);
}

// ─────────────────────────────────────────
// ゴールライン
// ─────────────────────────────────────────
function drawGoalLine() {
  const y = grid.getPerspectivePos(
    0, grid.rows - 1
  ).y + CELL_H * 0.5;

  const g = new PIXI.Graphics();
  g.lineStyle(2, 0xff0000, 0.8);
  g.moveTo(0, y);
  g.lineTo(GAME_W, y);
  layers.path.addChild(g);

  const lbl = new PIXI.Text('── 守護ライン ──', {
    fontFamily: 'serif',
    fontSize:   11,
    fill:       0xff4444
  });
  lbl.anchor.set(0.5);
  lbl.x = GAME_W / 2;
  lbl.y = y + 10;
  layers.path.addChild(lbl);
}

// ─────────────────────────────────────────
// ユニットスプライト生成
// ─────────────────────────────────────────
function createUnitSprite(unit) {
  const container = new PIXI.Container();
  const pos       = grid.getPerspectivePos(unit.col, unit.row);
  const s         = pos.scale;
  const unitData  = UNITS[unit.unitId];

  // 影
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.3);
  shadow.drawEllipse(0, 14 * s, 14 * s, 5 * s);
  shadow.endFill();

  // 本体（六角形）
  const body = new PIXI.Graphics();
  body.beginFill(unitData.color, 0.88);
  body.lineStyle(1.5 * s, 0xffffff, 0.5);
  const r = 15 * s;
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  body.drawPolygon(points);
  body.endFill();

  // 名前
  const nameText = new PIXI.Text(unitData.name, {
    fontFamily: 'serif',
    fontSize:   8 * s,
    fill:       0xffffff,
    dropShadow: true,
    dropShadowDistance: 1,
    dropShadowAlpha: 0.8
  });
  nameText.anchor.set(0.5, 0);
  nameText.y = 18 * s;

  // HPバー背景
  const hpBg = new PIXI.Graphics();
  hpBg.beginFill(0x440000, 0.8);
  hpBg.drawRect(-16 * s, -24 * s, 32 * s, 4 * s);
  hpBg.endFill();

  // HPバー本体
  const hpBar = new PIXI.Graphics();
  hpBar.name = 'hpBar';
  hpBar.beginFill(0x00ff66);
  hpBar.drawRect(-16 * s, -24 * s, 32 * s, 4 * s);
  hpBar.endFill();

  // 射程サークル（選択時に表示）
  const rangeCircle = new PIXI.Graphics();
  rangeCircle.name  = 'rangeCircle';
  rangeCircle.alpha = 0;
  rangeCircle.lineStyle(1, unitData.color, 0.4);
  rangeCircle.drawCircle(0, 0, unit.currentRange * CELL_W);

  container.addChild(
    rangeCircle, shadow, body, hpBg, hpBar, nameText
  );
  container.x       = pos.x;
  container.y       = pos.y;
  container.zIndex  = unit.row;
  container.interactive = true;
  container.cursor  = 'pointer';

  container.on('pointerdown', () => {
    toggleRangeCircle(container);
  });

  return container;
}

function toggleRangeCircle(sprite) {
  const rc = sprite.getChildByName('rangeCircle');
  if (!rc) return;
  rc.alpha = rc.alpha > 0 ? 0 : 1;
}

// ─────────────────────────────────────────
// 敵スプライト生成
// ─────────────────────────────────────────
function createEnemySprite(enemy) {
  const container = new PIXI.Container();

  // 影
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.25);
  shadow.drawEllipse(0, 12, 10, 4);
  shadow.endFill();

  // 本体
  const body = new PIXI.Graphics();
  body.beginFill(enemy.color || 0xeeeecc, 0.9);

  // 敵の種類ごとに形を変える
  switch (enemy.behavior) {
    case 'phase_through':
      // 幽霊：ひし形
      body.drawPolygon([0,-14, 10,0, 0,14, -10,0]);
      break;
    case 'accelerate':
      // 火車：炎型
      body.drawPolygon([
        0,-16, 6,-6, 14,-10,
        8,0, 14,10, 4,6,
        0,16, -4,6, -14,10,
        -8,0, -14,-10, -6,-6
      ]);
      break;
    default:
      // 基本：骸骨丸
      body.drawCircle(0, 0, 12);
  }
  body.endFill();

  // 目（表情）
  const eyes = new PIXI.Graphics();
  eyes.beginFill(0xff0000, 0.9);
  eyes.drawCircle(-4, -3, 2.5);
  eyes.drawCircle( 4, -3, 2.5);
  eyes.endFill();

  // HPバー
  const hpBg = new PIXI.Graphics();
  hpBg.beginFill(0x440000, 0.7);
  hpBg.drawRect(-14, -20, 28, 3);
  hpBg.endFill();

  const hpBar = new PIXI.Graphics();
  hpBar.name = 'hpBar';

  // 凍結インジケーター
  const freezeIndicator = new PIXI.Graphics();
  freezeIndicator.name  = 'freezeIndicator';
  freezeIndicator.alpha = 0;
  freezeIndicator.lineStyle(2, 0x88ddff, 0.9);
  freezeIndicator.drawCircle(0, 0, 15);

  container.addChild(
    shadow, freezeIndicator,
    body, eyes, hpBg, hpBar
  );
  container.x = enemy.x;
  container.y = enemy.y;

  updateEnemyHpBar(container, enemy);

  return container;
}

function updateEnemyHpBar(sprite, enemy) {
  const hpBar = sprite.getChildByName('hpBar');
  if (!hpBar) return;
  hpBar.clear();
  const ratio = Math.max(0, enemy.currentHp / enemy.hp);
  const color = ratio > 0.6 ? 0x00ff44 :
                ratio > 0.3 ? 0xffaa00 : 0xff2200;
  hpBar.beginFill(color, 0.9);
  hpBar.drawRect(-14, -20, 28 * ratio, 3);
  hpBar.endFill();

  // 凍結表示
  const fi = sprite.getChildByName('freezeIndicator');
  if (fi) fi.alpha = enemy.isFrozen ? 1 : 0;
}

// ─────────────────────────────────────────
// HUD（ヘッドアップディスプレイ）
// ─────────────────────────────────────────
let hudContainer = null;

function drawHUD() {
  if (hudContainer) layers.ui.removeChild(hudContainer);
  hudContainer = new PIXI.Container();

  // 上部バー背景
  const topBar = new PIXI.Graphics();
  topBar.beginFill(0x110022, 0.88);
  topBar.drawRect(0, 0, GAME_W, 58);
  topBar.endFill();
  hudContainer.addChild(topBar);

  // HP
  const hpRatio = state.hp / state.maxHp;
  const hpBarBg = new PIXI.Graphics();
  hpBarBg.beginFill(0x440000, 0.8);
  hpBarBg.drawRoundedRect(10, 8, 110, 14, 3);
  hpBarBg.endFill();

  const hpBarFill = new PIXI.Graphics();
  const hpCol = hpRatio > 0.6 ? 0xff4444 :
                hpRatio > 0.3 ? 0xff8800 : 0xff0000;
  hpBarFill.beginFill(hpCol, 0.9);
  hpBarFill.drawRoundedRect(10, 8, 110 * hpRatio, 14, 3);
  hpBarFill.endFill();

  const hpText = new PIXI.Text(
    `❤ ${state.hp} / ${state.maxHp}`, {
    fontFamily: 'serif', fontSize: 11,
    fill: 0xffffff
  });
  hpText.x = 15; hpText.y = 9;

  // ゴールド
  const goldText = new PIXI.Text(`💰 ${state.gold}`, {
    fontFamily: 'serif', fontSize: 16,
    fill: 0xffdd00
  });
  goldText.x = GAME_W / 2 - 30;
  goldText.y = 8;

  // ウェーブ
  const prog = waveSystem.getWaveProgress();
  const waveText = new PIXI.Text(
    `Wave ${prog.current + 1} / ${prog.total}`, {
    fontFamily: 'serif', fontSize: 13,
    fill: 0xaaaaff
  });
  waveText.anchor.set(1, 0);
  waveText.x = GAME_W - 10;
  waveText.y = 8;

  // 階層
  const floorText = new PIXI.Text(
    `${rogueSystem.floor}階層`, {
    fontFamily: 'serif', fontSize: 11,
    fill: 0xccaacc
  });
  floorText.x = GAME_W - 70;
  floorText.y = 28;

  // 因縁表示
  const kinenList = unitSystem.getActiveKinen();
  if (kinenList.length > 0) {
    const kinenText = new PIXI.Text(
      '⚡ ' + kinenList.join(' / '), {
      fontFamily: 'serif', fontSize: 9,
      fill: 0xffaa00
    });
    kinenText.x = 10;
    kinenText.y = 38;
    hudContainer.addChild(kinenText);
  }

  hudContainer.addChild(
    hpBarBg, hpBarFill, hpText,
    goldText, waveText, floorText
  );

  layers.ui.addChild(hudContainer);
}

// ─────────────────────────────────────────
// ユニット選択パネル
// ─────────────────────────────────────────
let panelContainer = null;

function drawUnitPanel() {
  if (panelContainer) layers.ui.removeChild(panelContainer);
  panelContainer = new PIXI.Container();

  const PANEL_H = 145;
  const py      = GAME_H - PANEL_H;

  // 背景
  const bg = new PIXI.Graphics();
  bg.beginFill(0x110022, 0.92);
  bg.lineStyle(1, 0x553366, 0.8);
  bg.drawRect(0, py, GAME_W, PANEL_H);
  bg.endFill();
  panelContainer.addChild(bg);

  // 出陣ボタン（配置フェーズのみ）
  if (state.phase === 'placement') {
    const btn = new PIXI.Graphics();
    btn.beginFill(0x882200, 0.95);
    btn.lineStyle(2, 0xff4400, 0.9);
    btn.drawRoundedRect(0, 0, 90, 28, 6);
    btn.endFill();
    btn.x = GAME_W / 2 - 45;
    btn.y = py - 36;
    btn.interactive = true;
    btn.cursor = 'pointer';

    const btnText = new PIXI.Text('⚔ 出陣！', {
      fontFamily: 'serif', fontSize: 14,
      fill: 0xffffff
    });
    btnText.anchor.set(0.5);
    btnText.x = 45; btnText.y = 14;
    btn.addChild(btnText);
    btn.on('pointerdown', onStartWave);
    panelContainer.addChild(btn);
  }

  // ユニットカード
  const unitEntries = Object.entries(UNITS);
  unitEntries.forEach(([id, data], i) => {
    const cardW = 46;
    const gap   = 4;
    const startX = 8;
    const x = startX + i * (cardW + gap);
    const y = py + 8;

    if (x + cardW > GAME_W - 8) return;

    const canAfford  = state.gold >= data.cost;
    const isSelected = state.selectedUnit === id;

    const card = new PIXI.Graphics();
    card.beginFill(
      isSelected ? 0x442200 :
      canAfford  ? 0x221133 : 0x111111,
      0.95
    );
    card.lineStyle(
      isSelected ? 2 : 1,
      isSelected ? 0xffaa00 :
      canAfford  ? 0x664477 : 0x333333
    );
    card.drawRoundedRect(0, 0, cardW, 82, 5);
    card.endFill();
    card.x = x; card.y = y;
    card.interactive = true;
    card.cursor = canAfford ? 'pointer' : 'not-allowed';

    // アイコン
    const icon = new PIXI.Graphics();
    icon.beginFill(data.color, canAfford ? 0.85 : 0.3);
    const r2 = 14;
    const pts = [];
    for (let k = 0; k < 6; k++) {
      const ang = (Math.PI / 3) * k - Math.PI / 6;
      pts.push(Math.cos(ang) * r2, Math.sin(ang) * r2);
    }
    icon.drawPolygon(pts);
    icon.endFill();
    icon.x = cardW / 2; icon.y = 26;

    const nameT = new PIXI.Text(data.name, {
      fontFamily: 'serif', fontSize: 8.5,
      fill: canAfford ? 0xffffff : 0x555555
    });
    nameT.anchor.set(0.5, 0);
    nameT.x = cardW / 2; nameT.y = 46;

    const costT = new PIXI.Text(`💰${data.cost}`, {
      fontFamily: 'serif', fontSize: 10,
      fill: canAfford ? 0xffdd00 : 0x555555
    });
    costT.anchor.set(0.5, 0);
    costT.x = cardW / 2; costT.y = 60;

    // 属性バッジ
    const elemColors = {
      void: 0x888888, metal: 0xffcc00,
      water: 0x4488ff, fire: 0xff4400,
      wood: 0x44cc44, earth: 0xaa8833
    };
    const badge = new PIXI.Graphics();
    badge.beginFill(elemColors[data.element] || 0x888888, 0.8);
    badge.drawCircle(0, 0, 4);
    badge.endFill();
    badge.x = cardW - 8; badge.y = 8;

    card.addChild(icon, nameT, costT, badge);

    card.on('pointerdown', () => {
      if (!canAfford) return;
      state.selectedUnit = (state.selectedUnit === id)
        ? null : id;
      state.selectedObstacle = null;
      drawUnitPanel();
    });

    panelContainer.addChild(card);
  });

  // 障害物カード
  const obstacles = [
    {
      id: 'barrier', name: '結界石',
      cost: 2, color: 0x8888ff,
      desc: '敵の\n経路変更'
    },
    {
      id: 'scarecrow', name: '藁人形',
      cost: 1, color: 0xaaaa44,
      desc: '囮・\nヘイト引'
    },
    {
      id: 'jizo', name: '地蔵',
      cost: 2, color: 0x888888,
      desc: '周囲\nHP回復'
    },
  ];

  obstacles.forEach((obs, i) => {
    const cardW  = 46;
    const gap    = 4;
    const startX = GAME_W - (cardW + gap) * 3 - 4;
    const x = startX + i * (cardW + gap);
    const y = py + 8;

    const canAfford  = state.gold >= obs.cost;
    const isSelected = state.selectedObstacle === obs.id;

    const card = new PIXI.Graphics();
    card.beginFill(
      isSelected ? 0x002244 :
      canAfford  ? 0x112233 : 0x111111,
      0.95
    );
    card.lineStyle(
      isSelected ? 2 : 1,
      isSelected ? 0x44aaff :
      canAfford  ? 0x334455 : 0x222222
    );
    card.drawRoundedRect(0, 0, cardW, 82, 5);
    card.endFill();
    card.x = x; card.y = y;
    card.interactive = true;
    card.cursor = canAfford ? 'pointer' : 'not-allowed';

    const icon2 = new PIXI.Graphics();
    icon2.beginFill(obs.color, canAfford ? 0.8 : 0.3);
    icon2.drawRect(-8, -10, 16, 20);
    icon2.endFill();
    icon2.x = cardW / 2; icon2.y = 26;

    const nameT2 = new PIXI.Text(obs.name, {
      fontFamily: 'serif', fontSize: 8,
      fill: canAfford ? 0xffffff : 0x555555
    });
    nameT2.anchor.set(0.5, 0);
    nameT2.x = cardW / 2; nameT2.y = 44;

    const costT2 = new PIXI.Text(`💰${obs.cost}`, {
      fontFamily: 'serif', fontSize: 10,
      fill: canAfford ? 0xffdd00 : 0x555555
    });
    costT2.anchor.set(0.5, 0);
    costT2.x = cardW / 2; costT2.y = 60;

    card.addChild(icon2, nameT2, costT2);

    card.on('pointerdown', () => {
      if (!canAfford) return;
      state.selectedObstacle = (
        state.selectedObstacle === obs.id
      ) ? null : obs.id;
      state.selectedUnit = null;
      drawUnitPanel();
    });

    panelContainer.addChild(card);
  });

  layers.ui.addChild(panelContainer);
  drawHUD();
}

// ─────────────────────────────────────────
// グリッドタッチ操作
// ─────────────────────────────────────────
function setupGridInteraction() {
  const hitArea = new PIXI.Graphics();
  hitArea.beginFill(0, 0.001);
  hitArea.drawRect(0, 58, GAME_W, GAME_H - 58 - 145);
  hitArea.endFill();
  hitArea.interactive = true;
  hitArea.on('pointerdown', onGridTap);
  layers.terrain.addChild(hitArea);
}

function onGridTap(e) {
  if (state.phase !== 'placement') return;

  const gpos = e.data.global;
  const cell = screenToCell(gpos.x, gpos.y);
  if (!cell) return;

  const { col, row } = cell;
  const cellData = grid.cells[row][col];
  if (cellData.isPath) return;

  // ユニット配置
  if (state.selectedUnit) {
    const unitData = UNITS[state.selectedUnit];
    if (state.gold < unitData.cost) return;

    const unit = unitSystem.placeUnit(
      col, row, state.selectedUnit
    );
    if (unit) {
      state.gold -= unitData.cost;
      const sp = createUnitSprite(unit);
      state.unitSprites[unit.id] = sp;
      layers.units.addChild(sp);
      drawUnitPanel();
    }
    return;
  }

  // 障害物配置
  if (state.selectedObstacle) {
    const costs = { barrier: 2, scarecrow: 1, jizo: 2 };
    const cost  = costs[state.selectedObstacle] || 1;
    if (state.gold < cost) return;

    const ok = grid.placeObstacle(
      col, row, state.selectedObstacle
    );
    if (ok) {
      state.gold -= cost;
      drawObstacle(col, row, state.selectedObstacle);
      drawUnitPanel();
    }
  }
}

function screenToCell(sx, sy) {
  let best = null;
  let minD = Infinity;

  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const pos = grid.getPerspectivePos(c, r);
      const dx  = sx - pos.x;
      const dy  = sy - pos.y;
      const d   = Math.sqrt(dx * dx + dy * dy);
      if (d < minD) { minD = d; best = { col: c, row: r }; }
    }
  }

  return minD < CELL_W * 1.2 ? best : null;
}

function drawObstacle(col, row, type) {
  const pos = grid.getPerspectivePos(col, row);
  const s   = pos.scale;
  const g   = new PIXI.Graphics();

  const colors = {
    barrier:   0x8888ff,
    scarecrow: 0xaaaa44,
    jizo:      0x888888
  };
  g.beginFill(colors[type] || 0xffffff, 0.85);
  g.lineStyle(1.5 * s, 0xffffff, 0.5);
  g.drawRoundedRect(-9 * s, -18 * s, 18 * s, 24 * s, 3 * s);
  g.endFill();

  const lbl = new PIXI.Text(
    type === 'barrier'   ? '⛩' :
    type === 'scarecrow' ? '案' : '地', {
    fontFamily: 'serif',
    fontSize:   12 * s,
    fill:       0xffffff
  });
  lbl.anchor.set(0.5);
  lbl.x = pos.x; lbl.y = pos.y - 5 * s;

  const cont = new PIXI.Container();
  cont.addChild(g, lbl);
  cont.x = pos.x; cont.y = pos.y;
  layers.obstacles.addChild(cont);
  state.obstacleSprites.push(cont);
}

// ─────────────────────────────────────────
// ウェーブ開始
// ─────────────────────────────────────────
function onStartWave() {
  if (state.phase !== 'placement') return;
  if (!waveSystem.hasMoreWaves() &&
      state.wave > 0) return;

  state.phase = 'wave';
  waveSystem.startNextWave();
  drawUnitPanel();
  drawHUD();
}

// ─────────────────────────────────────────
// ローグライクUI
// ─────────────────────────────────────────
function drawRoguelikeUI() {
  layers.effects.removeChildren();

  const choices = rogueSystem.generateChoices(
    state.wave,
    unitSystem.placedUnits,
    state.gold
  );

  // 暗幕
  const overlay = new PIXI.Graphics();
  overlay.beginFill(0x000000, 0.78);
  overlay.drawRect(0, 0, GAME_W, GAME_H);
  overlay.endFill();
  layers.effects.addChild(overlay);

  // タイトル
  const title = new PIXI.Text('── 強化を選べ ──', {
    fontFamily: 'serif', fontSize: 20,
    fill: 0xffdd88, dropShadow: true,
    dropShadowColor: 0xff4400,
    dropShadowDistance: 2
  });
  title.anchor.set(0.5);
  title.x = GAME_W / 2;
  title.y = GAME_H * 0.18;
  layers.effects.addChild(title);

  const waveLabel = new PIXI.Text(
    `Wave ${state.wave} クリア`, {
    fontFamily: 'serif', fontSize: 13,
    fill: 0xccaacc
  });
  waveLabel.anchor.set(0.5);
  waveLabel.x = GAME_W / 2;
  waveLabel.y = GAME_H * 0.25;
  layers.effects.addChild(waveLabel);

  // カード3枚
  const cardW = 108;
  const cardH = 170;
  const gap   = 8;
  const totalW = cardW * 3 + gap * 2;
  const startX = (GAME_W - totalW) / 2;
  const startY = GAME_H * 0.32;

  choices.forEach((choice, i) => {
    const x = startX + i * (cardW + gap);
    const card = new PIXI.Graphics();

    card.beginFill(0x1a0033, 0.95);
    card.lineStyle(
      2,
      rogueSystem.getRarityColor(choice.rarity),
      0.9
    );
    card.drawRoundedRect(0, 0, cardW, cardH, 8);
    card.endFill();
    card.x = x; card.y = startY;
    card.interactive = true;
    card.cursor = 'pointer';

    // レアリティラベル
    const rarityLabel = new PIXI.Text(
      rogueSystem.getRarityLabel(choice.rarity), {
      fontFamily: 'serif', fontSize: 10,
      fill: rogueSystem.getRarityColor(choice.rarity)
    });
    rarityLabel.anchor.set(0.5, 0);
    rarityLabel.x = cardW / 2; rarityLabel.y = 8;

    // タイトル
    const titleT = new PIXI.Text(choice.title, {
      fontFamily: 'serif', fontSize: 13,
      fill: 0xffccff,
      wordWrap: true, wordWrapWidth: cardW - 12,
      align: 'center'
    });
    titleT.anchor.set(0.5, 0);
    titleT.x = cardW / 2; titleT.y = 26;

    // 区切り線
    const divider = new PIXI.Graphics();
    divider.lineStyle(
      1,
      rogueSystem.getRarityColor(choice.rarity),
      0.4
    );
    divider.moveTo(10, 56);
    divider.lineTo(cardW - 10, 56);

    // 説明
    const descT = new PIXI.Text(choice.description, {
      fontFamily: 'serif', fontSize: 10,
      fill: 0xccaacc,
      wordWrap: true, wordWrapWidth: cardW - 12,
      align: 'center'
    });
    descT.anchor.set(0.5, 0);
    descT.x = cardW / 2; descT.y = 64;

    // カテゴリアイコン
    const catIcons = {
      gold: '💰', upgrade: '⬆', global: '🌐',
      terrain: '🗾', obstacle: '⛩', heal: '❤',
      special: '⚡', summon: '👻'
    };
    const iconT = new PIXI.Text(
      catIcons[choice.category] || '✨', {
      fontSize: 28
    });
    iconT.anchor.set(0.5, 0);
    iconT.x = cardW / 2; iconT.y = 120;

    card.addChild(
      rarityLabel, titleT, divider, descT, iconT
    );

    // ホバー演出
    card.on('pointerover', () => {
      card.scale.set(1.04);
    });
    card.on('pointerout', () => {
      card.scale.set(1.0);
    });
    card.on('pointerdown', () => {
      rogueSystem.applyChoice(choice, state);
      state.wave++;
      layers.effects.removeChildren();
      state.phase = 'placement';
      drawUnitPanel();
      drawHUD();
    });

    layers.effects.addChild(card);
  });
}

// ─────────────────────────────────────────
// ゲームオーバー・ステージクリア
// ─────────────────────────────────────────
function showGameOver() {
  layers.effects.removeChildren();

  const ov = new PIXI.Graphics();
  ov.beginFill(0x000000, 0.88);
  ov.drawRect(0, 0, GAME_W, GAME_H);
  ov.endFill();
  layers.effects.addChild(ov);

  const title = new PIXI.Text('冥府に呑まれた', {
    fontFamily: 'serif', fontSize: 28,
    fill: 0xff2200,
    dropShadow: true,
    dropShadowColor: 0xaa0000,
    dropShadowDistance: 3
  });
  title.anchor.set(0.5);
  title.x = GAME_W / 2; title.y = GAME_H * 0.38;
  layers.effects.addChild(title);

  const sub = new PIXI.Text(
    `到達 Wave：${state.wave}　階層：${rogueSystem.floor}`, {
    fontFamily: 'serif', fontSize: 15,
    fill: 0xccaaaa
  });
  sub.anchor.set(0.5);
  sub.x = GAME_W / 2; sub.y = GAME_H * 0.48;
  layers.effects.addChild(sub);

  const retryBtn = new PIXI.Graphics();
  retryBtn.beginFill(0x550000, 0.9);
  retryBtn.lineStyle(2, 0xff2200);
  retryBtn.drawRoundedRect(0, 0, 120, 40, 8);
  retryBtn.endFill();
  retryBtn.x = GAME_W / 2 - 60;
  retryBtn.y = GAME_H * 0.58;
  retryBtn.interactive = true;
  retryBtn.cursor = 'pointer';

  const retryT = new PIXI.Text('もう一度', {
    fontFamily: 'serif', fontSize: 16,
    fill: 0xffffff
  });
  retryT.anchor.set(0.5);
  retryT.x = 60; retryT.y = 20;
  retryBtn.addChild(retryT);
  retryBtn.on('pointerdown', () => {
    location.reload();
  });
  layers.effects.addChild(retryBtn);
}

function showStageClear() {
  layers.effects.removeChildren();

  const ov = new PIXI.Graphics();
  ov.beginFill(0x000022, 0.88);
  ov.drawRect(0, 0, GAME_W, GAME_H);
  ov.endFill();
  layers.effects.addChild(ov);

  const title = new PIXI.Text('冥府を制した', {
    fontFamily: 'serif', fontSize: 30,
    fill: 0xffdd00,
    dropShadow: true,
    dropShadowColor: 0xff8800,
    dropShadowDistance: 3
  });
  title.anchor.set(0.5);
  title.x = GAME_W / 2; title.y = GAME_H * 0.38;
  layers.effects.addChild(title);
}

// ─────────────────────────────────────────
// 敵スプライト更新
// ─────────────────────────────────────────
function syncEnemySprites() {
  // 新しい敵のスプライトを生成
  enemySystem.enemies.forEach(e => {
    if (!state.enemySprites[e.id]) {
      const sp = createEnemySprite(e);
      state.enemySprites[e.id] = sp;
      layers.enemies.addChild(sp);
    }
  });

  // 既存スプライトの位置・状態更新
  enemySystem.enemies.forEach(e => {
    const sp = state.enemySprites[e.id];
    if (!sp) return;
    sp.x       = e.x;
    sp.y       = e.y;
    sp.zIndex  = Math.floor(e.y);
    updateEnemyHpBar(sp, e);
  });

  layers.enemies.sortChildren();
}

// ─────────────────────────────────────────
// メインループ
// ─────────────────────────────────────────
app.ticker.add((delta) => {
  if (state.phase === 'gameover' ||
      state.phase === 'clear') return;

  const dt = delta / 60;

  if (state.phase === 'wave') {
    waveSystem.update(dt);
    enemySystem.update(dt);
    unitSystem.update(dt, enemySystem);
    syncEnemySprites();
  }
});

// ─────────────────────────────────────────
// 初期化・起動
// ─────────────────────────────────────────
drawGrid();
setupGridInteraction();
drawUnitPanel();
drawHUD();

console.log('冥府魔導 ── 起動');
