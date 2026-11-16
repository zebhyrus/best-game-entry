// Wave director: decides what spawns, when, and which three
// upgrades the moth chooses between after a wave is cleared.

import { WAVES, UPGRADES, VIEW } from './config.js';
import { shuffle } from './rng.js';
import { Thorn } from './entities.js';

const COMPOSITION = [
  ['thornling'],
  ['thornling', 'thornling', 'dart'],
  ['thornling', 'dart', 'spitter'],
  ['thornling', 'dart', 'spitter', 'splitter'],
  ['thornling', 'dart', 'spitter', 'splitter'],
];

export class WaveDirector {
  constructor(rng) {
    this.rng = rng;
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.betweenWaves = false;
    this.draft = [];
    this.spawned = 0;
    this.eliteAt = new Set([0]);
  }

  isBossWave(n) {
    return n > 0 && n % WAVES.bossEvery === 0;
  }

  startWave(n) {
    this.wave = n;
    this.queue = [];
    const count = WAVES.baseCount + WAVES.perWave * n;
    const kinds = COMPOSITION[Math.min(COMPOSITION.length - 1, Math.floor((n - 1) / 2))];
    for (let i = 0; i < count; i++) {
      this.queue.push(kinds[Math.floor(this.rng() * kinds.length)]);
    }
    if (this.isBossWave(n)) this.queue.push('monarch');
    this.queue = shuffle(this.rng, this.queue);
    this.spawnTimer = 0.5;
    this.betweenWaves = false;
    // Elites: the first spawn and the middle spawn of each wave.
    this.spawned = 0;
    this.eliteAt = new Set([0, Math.floor(this.queue.length / 2)]);
  }

  spawnPoint(player) {
    // Pick an edge point at least 260px from the moth.
    for (let tries = 0; tries < 12; tries++) {
      const edge = Math.floor(this.rng() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) { x = this.rng() * VIEW.width; y = -30; }
      if (edge === 1) { x = this.rng() * VIEW.width; y = VIEW.height + 30; }
      if (edge === 2) { x = -30; y = this.rng() * VIEW.height; }
      if (edge === 3) { x = VIEW.width + 30; y = this.rng() * VIEW.height; }
      if (Math.hypot(x - player.x, y - player.y) > 260) return { x, y };
    }
    return { x: 40, y: 40 };
  }

  update(dt, player, enemies) {
    if (this.queue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const kind = this.queue.shift();
      const at = this.spawnPoint(player);
      const thorn = new Thorn(kind, at.x, at.y, this.wave);
      if (this.eliteAt.has(this.spawned)) {
        thorn.elite = true;
        thorn.hp = Math.round(thorn.hp * 3);
        thorn.maxHp = thorn.hp;
        thorn.radius = Math.round(thorn.radius * 1.4);
        thorn.speed *= 1.15;
        thorn.score *= 3;
      }
      enemies.push(thorn);
      this.spawned += 1;
      this.spawnTimer = Math.max(0.25, WAVES.spawnGap - this.wave * 0.03);
    }
  }

  draftUpgrades() {
    const pool = shuffle(this.rng, UPGRADES);
    this.draft = pool.slice(0, 3);
    return this.draft;
  }

  get remaining() {
    return this.queue.length;
  }
}
