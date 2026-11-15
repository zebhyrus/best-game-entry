// The things that move: the moth, its bolts, the thorn-creatures,
// sparks, light motes and floating numbers. Pure data + movement;
// the game loop owns collisions and lifetimes.

import { PLAYER, ENEMY_TYPES } from './config.js';

export class Moth {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER.radius;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.fireInterval = PLAYER.fireInterval;
    this.bulletSpeed = PLAYER.bulletSpeed;
    this.bulletDamage = PLAYER.bulletDamage;
    this.shots = 1;
    this.pierce = 0;
    this.pickupRadius = PLAYER.pickupRadius;
    this.comboWindow = PLAYER.comboWindow;
    this.dashCooldown = PLAYER.dashCooldown;
    this.dashTrail = false;
    this.dashTimeLeft = 0;
    this.dashRecharge = 0;
    this.invuln = 0;
    this.fireTimer = 0;
    this.wingPhase = 0;
    this.aimAngle = -Math.PI / 2;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.dashTimeLeft = 0;
    this.dashRecharge = 0;
    this.invuln = 0;
  }
}

export class Bolt {
  constructor(x, y, angle, speed, damage, pierce) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = PLAYER.bulletRadius;
    this.damage = damage;
    this.pierce = pierce;
    this.life = 1.4;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export class Thorn {
  constructor(kind, x, y, wave) {
    const t = ENEMY_TYPES[kind];
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.radius = t.radius;
    this.hp = Math.round(t.hp * (1 + (wave - 1) * 0.12));
    this.maxHp = this.hp;
    this.speed = t.speed * (1 + Math.min(0.5, (wave - 1) * 0.03));
    this.score = t.score;
    this.touch = t.touch;
    this.color = t.color;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 2.4;
    this.state = 'chase';
    this.stateTimer = Math.random() * 1.5;
    this.shootTimer = 1.5 + Math.random();
    this.flash = 0;
    this.dead = false;
    this.isBoss = kind === 'monarch';
    this.burstTimer = 2.5;
    this.summonTimer = 6;
  }

  update(dt, px, py) {
    this.flash = Math.max(0, this.flash - dt * 6);
    this.angle += this.spin * dt;
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    if (this.kind === 'dart') {
      this.stateTimer -= dt;
      if (this.state === 'chase') {
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
        if (this.stateTimer <= 0 && dist < 320) {
          this.state = 'windup';
          this.stateTimer = 0.45;
        }
      } else if (this.state === 'windup') {
        if (this.stateTimer <= 0) {
          this.state = 'dash';
          this.stateTimer = 0.4;
          this.vx = nx * 520;
          this.vy = ny * 520;
        }
      } else {
        this.x += (this.vx || 0) * dt;
        this.y += (this.vy || 0) * dt;
        if (this.stateTimer <= 0) {
          this.state = 'chase';
          this.stateTimer = 1.2 + Math.random();
        }
      }
      return;
    }

    if (this.kind === 'spitter') {
      if (dist > 340) {
        this.x += nx * this.speed * dt;
        this.y += ny * this.speed * dt;
      } else if (dist < 220) {
        this.x -= nx * this.speed * 0.7 * dt;
        this.y -= ny * this.speed * 0.7 * dt;
      } else {
        this.x += -ny * this.speed * 0.4 * dt;
        this.y += nx * this.speed * 0.4 * dt;
      }
      return;
    }

    // thornling, splitter, monarch: steady pursuit, monarch slower.
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }
}

export class ThornShot {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = 6;
    this.life = 5;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}

export class Spark {
  constructor(x, y, color, count, speed) {
    this.parts = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.4 + Math.random() * 0.4,
        max: 0.8,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  update(dt) {
    for (const p of this.parts) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  get alive() { return this.parts.length > 0; }
}

export class Mote {
  constructor(x, y, value, heal) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.heal = heal || 0;
    this.radius = 7;
    this.life = 12;
    this.phase = Math.random() * Math.PI * 2;
    this.dead = false;
  }

  update(dt, px, py, pullRadius) {
    this.life -= dt;
    this.phase += dt * 4;
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < pullRadius) {
      const pull = 520 * (1 - dist / pullRadius) + 120;
      this.x += (dx / dist) * pull * dt;
      this.y += (dy / dist) * pull * dt;
    }
    if (this.life <= 0) this.dead = true;
  }
}

export class FloatText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color || '#f2feff';
    this.life = 0.9;
    this.dead = false;
  }

  update(dt) {
    this.y -= 46 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
