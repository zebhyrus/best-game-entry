// The game itself: state machine, the update loop, collisions,
// scoring and combo, waves and bosses, and the screenshot staging
// hook (?shot=title|play|boss|over|upgrade).

import { VIEW, PALETTE, PLAYER, ENEMY_TYPES } from './config.js';
import { makeRng } from './rng.js';
import { Moth, Bolt, Thorn, ThornShot, Spark, Mote, FloatText } from './entities.js';
import { WaveDirector } from './waves.js';
import { SoundEngine } from './audio.js';
import { Input } from './input.js';
import {
  Reef, drawMoth, drawThorn, drawBolt, drawThornShot, drawSpark,
  drawMote, drawFloatText, drawHud, drawTitle, drawUpgrade,
  drawPause, drawGameOver,
} from './render.js';

const BEST_KEY = 'lumen-moth-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = makeRng(20261116);
    this.reef = new Reef(20261116);
    this.sound = new SoundEngine();
    this.input = new Input(canvas);
    this.state = 'title';
    this.time = 0;
    this.player = new Moth(VIEW.width / 2, VIEW.height / 2);
    this.director = new WaveDirector(makeRng(777));
    this.enemies = [];
    this.bolts = [];
    this.enemyShots = [];
    this.sparks = [];
    this.motes = [];
    this.floats = [];
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.wave = 0;
    this.shake = 0;
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
    } catch (e) { this.best = 0; }
    this.last = performance.now();
    this.staged = null;

    canvas.addEventListener('mousedown', () => this.sound.unlock());
    canvas.addEventListener('touchstart', () => this.sound.unlock());
    window.addEventListener('keydown', () => this.sound.unlock());
    this.loop = this.loop.bind(this);
  }

  get comboMult() {
    return 1 + Math.min(this.combo, 20) * 0.1;
  }

  get waveActive() {
    return this.state === 'play';
  }

  start() {
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.enemies = [];
    this.bolts = [];
    this.enemyShots = [];
    this.sparks = [];
    this.motes = [];
    this.floats = [];
    this.player = new Moth(VIEW.width / 2, VIEW.height / 2);
    this.director = new WaveDirector(makeRng((Math.random() * 1e9) | 0));
    this.wave = 1;
    this.director.startWave(1);
    this.state = 'play';
  }

  addScore(base, x, y) {
    const gained = Math.round(base * this.comboMult);
    this.score += gained;
    this.floats.push(new FloatText(x, y, '+' + gained, PALETTE.gold));
    if (this.score > this.best) {
      this.best = this.score;
      try { window.localStorage.setItem(BEST_KEY, String(this.best)); } catch (e) { /* no storage */ }
    }
  }

  burst(x, y, color, count, speed) {
    this.sparks.push(new Spark(x, y, color, count, speed || 260));
  }

  killEnemy(e, index) {
    e.dead = true;
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = this.player.comboWindow;
    this.addScore(e.score, e.x, e.y);
    this.burst(e.x, e.y, e.color, e.isBoss ? 60 : 16, e.isBoss ? 420 : 260);
    this.sound.explode();
    if (e.isBoss) {
      this.shake = 18;
      for (let i = 0; i < 6; i++) {
        this.motes.push(new Mote(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, 150, 10));
      }
    } else {
      this.shake = Math.max(this.shake, 4);
    }
    if (e.kind === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const child = new Thorn('thornling', e.x + (Math.random() - 0.5) * 30, e.y + (Math.random() - 0.5) * 30, this.wave);
        this.enemies.push(child);
      }
    }
    if (Math.random() < (e.isBoss ? 1 : 0.22)) {
      this.motes.push(new Mote(e.x, e.y, 50, e.isBoss ? 10 : 4));
    }
    this.enemies.splice(index, 1);
  }

  playerHit(damage, x, y) {
    const p = this.player;
    if (p.invuln > 0 || p.dashTimeLeft > 0 || this.state !== 'play') return;
    p.hp -= damage;
    p.invuln = 0.9;
    this.shake = Math.max(this.shake, 9);
    this.combo = 0;
    this.comboTimer = 0;
    this.burst(p.x, p.y, PALETTE.coral, 14, 300);
    this.sound.hurt();
    this.floats.push(new FloatText(p.x, p.y - 24, '-' + damage, PALETTE.coral));
    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'over';
      this.burst(p.x, p.y, PALETTE.cyan, 70, 460);
      this.sound.explode();
    }
  }

  fireBolts() {
    const p = this.player;
    const n = p.shots;
    const spread = 0.14;
    for (let i = 0; i < n; i++) {
      const offset = (i - (n - 1) / 2) * spread;
      const a = p.aimAngle + offset;
      this.bolts.push(new Bolt(
        p.x + Math.cos(a) * (p.radius + 6),
        p.y + Math.sin(a) * (p.radius + 6),
        a, p.bulletSpeed, p.bulletDamage, p.pierce,
      ));
    }
    this.sound.shoot();
  }

  updatePlay(dt) {
    const p = this.player;
    const inp = this.input;
    p.wingPhase += dt;
    p.invuln = Math.max(0, p.invuln - dt);
    p.dashRecharge = Math.max(0, p.dashRecharge - dt);
    p.fireTimer -= dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;

    // Aim at the mouse.
    p.aimAngle = Math.atan2(inp.mouseY - p.y, inp.mouseX - p.x);

    // Movement: keyboard, or the touch joystick.
    let mx = (inp.down('d', 'arrowright') ? 1 : 0) - (inp.down('a', 'arrowleft') ? 1 : 0);
    let my = (inp.down('s', 'arrowdown') ? 1 : 0) - (inp.down('w', 'arrowup') ? 1 : 0);
    const vec = inp.moveVec();
    mx += vec.x;
    my += vec.y;
    const mag = Math.hypot(mx, my) || 1;
    mx /= mag;
    my /= mag;

    if (inp.wasPressed(' ', 'shift') && p.dashRecharge <= 0 && p.dashTimeLeft <= 0) {
      p.dashTimeLeft = PLAYER.dashTime;
      p.dashRecharge = p.dashCooldown;
      p.vx = mx * PLAYER.dashSpeed || Math.cos(p.aimAngle) * PLAYER.dashSpeed;
      p.vy = my * PLAYER.dashSpeed || Math.sin(p.aimAngle) * PLAYER.dashSpeed;
      this.sound.dash();
      if (p.dashTrail) this.burst(p.x, p.y, PALETTE.magenta, 10, 200);
    }

    if (p.dashTimeLeft > 0) {
      p.dashTimeLeft -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    } else {
      p.x += mx * PLAYER.speed * dt;
      p.y += my * PLAYER.speed * dt;
    }
    p.x = Math.max(p.radius, Math.min(VIEW.width - p.radius, p.x));
    p.y = Math.max(p.radius, Math.min(VIEW.height - p.radius, p.y));

    // Shooting.
    if (inp.mouseDown && p.fireTimer <= 0) {
      this.fireBolts();
      p.fireTimer = p.fireInterval;
    }

    // Waves.
    this.director.update(dt, p, this.enemies);

    // Enemies.
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, p.x, p.y);
      // Spitter fires.
      if (e.kind === 'spitter') {
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.2;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          this.enemyShots.push(new ThornShot(e.x, e.y, Math.cos(a) * 200, Math.sin(a) * 200));
          this.sound.hit();
        }
      }
      // Boss radial bursts + summons.
      if (e.isBoss) {
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = 2.8;
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + e.angle;
            this.enemyShots.push(new ThornShot(e.x, e.y, Math.cos(a) * 170, Math.sin(a) * 170));
          }
          this.sound.boss();
        }
        e.summonTimer -= dt;
        if (e.summonTimer <= 0) {
          e.summonTimer = 7;
          for (let k = 0; k < 2; k++) {
            this.enemies.push(new Thorn('thornling', e.x + (Math.random() - 0.5) * 160, e.y + (Math.random() - 0.5) * 160, this.wave));
          }
        }
      }
      // Touch damage.
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius - 2) {
        this.playerHit(e.touch, e.x, e.y);
      }
      // Keep inside the reef.
      e.x = Math.max(-60, Math.min(VIEW.width + 60, e.x));
      e.y = Math.max(-60, Math.min(VIEW.height + 60, e.y));
    }

    // Bolts vs enemies.
    for (let bi = this.bolts.length - 1; bi >= 0; bi--) {
      const b = this.bolts[bi];
      b.update(dt);
      if (b.dead || b.x < -20 || b.x > VIEW.width + 20 || b.y < -20 || b.y > VIEW.height + 20) {
        this.bolts.splice(bi, 1);
        continue;
      }
      for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
        const e = this.enemies[ei];
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          e.hp -= b.damage;
          e.flash = 1;
          this.floats.push(new FloatText(e.x, e.y - e.radius - 6, String(b.damage), PALETTE.softCyan));
          this.burst(b.x, b.y, PALETTE.cyan, 4, 160);
          this.sound.hit();
          if (e.hp <= 0) this.killEnemy(e, ei);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.dead = true;
          }
          break;
        }
      }
      if (b.dead) this.bolts.splice(bi, 1);
    }

    // Enemy shots vs player.
    for (let i = this.enemyShots.length - 1; i >= 0; i--) {
      const s = this.enemyShots[i];
      s.update(dt);
      if (s.dead) { this.enemyShots.splice(i, 1); continue; }
      if (Math.hypot(s.x - p.x, s.y - p.y) < s.radius + p.radius - 2) {
        this.playerHit(8, s.x, s.y);
        this.enemyShots.splice(i, 1);
      }
    }

    // Motes.
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.update(dt, p.x, p.y, p.pickupRadius);
      if (m.dead) { this.motes.splice(i, 1); continue; }
      if (Math.hypot(m.x - p.x, m.y - p.y) < m.radius + p.radius) {
        this.addScore(m.value, m.x, m.y);
        p.hp = Math.min(p.maxHp, p.hp + m.heal);
        this.sound.pickup();
        this.motes.splice(i, 1);
      }
    }

    // Wave cleared?
    if (this.director.remaining === 0 && this.enemies.length === 0) {
      this.wave += 1;
      this.director.draftUpgrades();
      this.state = 'upgrade';
      this.sound.waveClear();
    }
  }

  updateFx(dt) {
    for (const s of this.sparks) s.update(dt);
    this.sparks = this.sparks.filter((s) => s.alive);
    for (const f of this.floats) f.update(dt);
    this.floats = this.floats.filter((f) => !f.dead);
    this.shake = Math.max(0, this.shake - dt * 30);
  }

  loop(now) {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    const inp = this.input;
    inp.uiMode = this.state !== 'play';

    if (inp.wasPressed('m')) this.sound.toggleMute();

    if (this.state === 'title') {
      if (inp.wasPressed('enter') || inp.mousePressed) this.start();
    } else if (this.state === 'play') {
      if (inp.wasPressed('p', 'escape')) {
        this.state = 'pause';
      } else {
        this.updatePlay(dt);
      }
    } else if (this.state === 'pause') {
      if (inp.wasPressed('p', 'escape', 'enter')) this.state = 'play';
    } else if (this.state === 'upgrade') {
      const pick = this.pickUpgrade();
      if (pick) {
        pick.apply(this.player);
        this.sound.upgrade();
        this.director.startWave(this.wave);
        this.state = 'play';
      }
    } else if (this.state === 'over') {
      if (inp.wasPressed('r', 'enter') || inp.mousePressed) this.start();
    }

    this.updateFx(dt);
    this.draw();
    inp.endFrame();
    requestAnimationFrame(this.loop);
  }

  pickUpgrade() {
    const inp = this.input;
    const draft = this.director.draft;
    for (let i = 0; i < draft.length; i++) {
      if (inp.wasPressed(String(i + 1))) return draft[i];
    }
    if (inp.mousePressed) {
      const w = 300;
      const gap = 36;
      const total = w * 3 + gap * 2;
      const x0 = (VIEW.width - total) / 2;
      for (let i = 0; i < draft.length; i++) {
        const x = x0 + i * (w + gap);
        if (inp.mouseX >= x && inp.mouseX <= x + w && inp.mouseY >= 250 && inp.mouseY <= 460) {
          return draft[i];
        }
      }
    }
    return null;
  }

  draw() {
    const ctx = this.ctx;
    const shX = (Math.random() - 0.5) * this.shake;
    const shY = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(shX, shY);
    this.reef.draw(ctx, this.time, shX, shY);
    if (this.state !== 'title') {
      for (const m of this.motes) drawMote(ctx, m, this.time);
      for (const e of this.enemies) drawThorn(ctx, e);
      for (const s of this.enemyShots) drawThornShot(ctx, s);
      for (const b of this.bolts) drawBolt(ctx, b);
      // The moth is gone on the game-over screen — it died.
      if (this.state !== 'over') drawMoth(ctx, this.player, this.time);
      for (const s of this.sparks) drawSpark(ctx, s);
      for (const f of this.floats) drawFloatText(ctx, f);
    } else {
      // A lone moth drifts over the reef on the title screen.
      const tx = VIEW.width / 2 + Math.sin(this.time * 0.5) * 180;
      const ty = 620 + Math.sin(this.time * 0.9) * 18;
      const ghost = { ...this.player, x: tx, y: ty, aimAngle: -Math.PI / 2, invuln: 0, wingPhase: this.time * 2 };
      drawMoth(ctx, ghost, this.time);
    }
    ctx.restore();

    if (this.state === 'title') drawTitle(ctx, this.time, this.best, this.input.touchMode);
    else if (this.state === 'play' || this.state === 'pause') {
      drawHud(ctx, this);
      if (this.state === 'pause') drawPause(ctx, this.input.touchMode);
    } else if (this.state === 'upgrade') {
      drawHud(ctx, this);
      drawUpgrade(ctx, this.director.draft, this.input.touchMode);
    } else if (this.state === 'over') {
      drawGameOver(ctx, this, this.input.touchMode);
    }
  }

  // Screenshot staging: ?shot=title|play|boss|over|upgrade sets a
  // fixed, deterministic scene from the shipped code — real renders,
  // no mock pixels. A fixed seed keeps every run identical.
  stage(shot) {
    this.staged = shot;
    const rng = makeRng(4242);
    if (shot === 'title') {
      this.state = 'title';
      return;
    }
    if (shot === 'play' || shot === 'boss' || shot === 'over' || shot === 'upgrade') {
      this.start();
      this.director = new WaveDirector(rng);
      this.wave = shot === 'boss' ? 5 : 3;
      this.player.x = 640;
      this.player.y = 430;
      this.player.aimAngle = -0.5;
      this.score = shot === 'boss' ? 12450 : 3280;
      this.kills = shot === 'boss' ? 61 : 24;
      this.best = Math.max(this.best, this.score);
      this.combo = shot === 'boss' ? 7 : 5;
      this.comboTimer = 2.2;
      if (shot === 'play' || shot === 'upgrade') {
        const spots = [
          ['thornling', 300, 220], ['dart', 880, 260], ['spitter', 1020, 520],
          ['thornling', 220, 600], ['splitter', 700, 180], ['dart', 980, 680],
          ['thornling', 480, 640],
        ];
        for (const [kind, x, y] of spots) {
          this.enemies.push(new Thorn(kind, x, y, this.wave));
        }
        this.bolts.push(new Bolt(560, 420, -0.5, 640, 13, 0));
        this.bolts.push(new Bolt(520, 445, -0.4, 640, 13, 0));
        this.bolts.push(new Bolt(590, 400, -0.6, 640, 13, 0));
        this.motes.push(new Mote(760, 380, 50, 0));
        this.motes.push(new Mote(420, 300, 50, 0));
        this.burst(880, 260, '#ffb347', 12, 220);
      }
      if (shot === 'boss') {
        const boss = new Thorn('monarch', 640, 220, 5);
        boss.hp = Math.round(boss.maxHp * 0.62);
        this.enemies.push(boss);
        this.enemies.push(new Thorn('thornling', 300, 300, 5));
        this.enemies.push(new Thorn('dart', 980, 320, 5));
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          this.enemyShots.push(new ThornShot(640 + Math.cos(a) * 130, 220 + Math.sin(a) * 130, Math.cos(a) * 170, Math.sin(a) * 170));
        }
        this.bolts.push(new Bolt(560, 400, -1.2, 640, 13, 0));
        this.bolts.push(new Bolt(600, 410, -1.35, 640, 13, 0));
        this.player.hp = 62;
      }
      if (shot === 'over') {
        this.score = 4810;
        this.kills = 37;
        this.wave = 4;
        this.best = Math.max(this.best, this.score);
        this.state = 'over';
        this.enemies = [];
        this.bolts = [];
        return;
      }
      if (shot === 'upgrade') {
        this.enemies = [];
        this.bolts = [];
        this.director.draftUpgrades();
        this.state = 'upgrade';
        return;
      }
      this.director.queue = [];
      this.state = 'play';
    }
  }

  run() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) {
      this.stage(shot);
      this.draw();
    }
    requestAnimationFrame(this.loop);
  }
}
