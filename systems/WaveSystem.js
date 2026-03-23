export class WaveSystem {
  constructor(enemySystem, enemiesData) {
    this.enemySystem = enemySystem;
    this.enemiesData = enemiesData;

    this.currentWave = 0;
    this.waves = [];
    this.spawnQueue = [];
    this.timer = 0;
    this.isRunning = false;
    this.isComplete = false;

    // コールバック
    this.onWaveStart = null;
    this.onWaveComplete = null;
    this.onAllWavesComplete = null;
  }

  loadWaves(waveDefinitions) {
    this.waves = waveDefinitions;
    this.currentWave = 0;
  }

  startNextWave() {
    if (this.currentWave >= this.waves.length) {
      this.onAllWavesComplete &&
        this.onAllWavesComplete();
      return;
    }

    this.isRunning = true;
    this.isComplete = false;
    this.timer = 0;
    this.spawnQueue = this.buildSpawnQueue(
      this.waves[this.currentWave]
    );

    this.onWaveStart &&
      this.onWaveStart(this.currentWave);
  }

  buildSpawnQueue(waveDef) {
    const queue = [];
    let t = 0;

    waveDef.enemies.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        queue.push({
          time: t,
          type: group.type,
          delay: group.interval
        });
        t += group.interval;
      }
    });

    // 時間順にソート
    queue.sort((a, b) => a.time - b.time);
    return queue;
  }

  update(delta) {
    if (!this.isRunning) return;

    this.timer += delta;

    // スポーン処理
    while (
      this.spawnQueue.length > 0 &&
      this.timer >= this.spawnQueue[0].time
    ) {
      const spawn = this.spawnQueue.shift();
      this.spawnEnemy(spawn.type);
    }

    // ウェーブ終了判定
    // スポーンキューが空 かつ 敵が全滅
    if (
      this.spawnQueue.length === 0 &&
      this.enemySystem.enemies.length === 0 &&
      !this.isComplete
    ) {
      this.isComplete = true;
      this.isRunning = false;
      this.currentWave++;

      this.onWaveComplete &&
        this.onWaveComplete(this.currentWave - 1);
    }
  }

  spawnEnemy(type) {
    // enemiesDataから該当敵を検索
    const enemyData = Object.values(this.enemiesData)
      .find(e => e.id === type);

    if (!enemyData) {
      console.warn(`敵タイプ不明: ${type}`);
      return;
    }

    const enemy = this.enemySystem.spawnEnemy({
      ...enemyData
    });

    return enemy;
  }

  hasMoreWaves() {
    return this.currentWave < this.waves.length;
  }

  getWaveProgress() {
    return {
      current: this.currentWave,
      total: this.waves.length,
      remaining: this.spawnQueue.length,
      activeEnemies: this.enemySystem.enemies.length
    };
  }
}