// Juice: shockwave rings, screen flashes, dash ghosts, muzzle
// flashes, floating texts, banners, slow-mo, and multi-colour
// bursts. Pure visuals — nothing here changes game state.
// Particle counts are capped so the frame rate stays smooth.

import { VIEW, PALETTE } from './config.js';
import { Spark } from './entities.js';

export const FX_CAPS = {
  sparkParts: 700,
  rings: 8,
  texts: 40,
  trails: 24,
  muzzles: 12,
};

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export class Fx {
  constructor() {
    this.clear();
  }

  clear() {
    this.rings = [];
    this.flashes = [];
    this.texts = [];
    this.trails = [];
    this.muzzles = [];
    this.bannerText = null;
    this.bannerSub = '';
    this.bannerColor = PALETTE.gold;
    this.bannerLife = 0;
    this.bannerMax = 1;
    this.slowmoTimer = 0;
  }

  get timeScale() {
    return this.slowmoTimer > 0 ? 0.35 : 1;
  }

  slowmo(dur) {
    this.slowmoTimer = Math.max(this.slowmoTimer, dur);
  }

  addRing(x, y, color, maxR, life, width, delay) {
    if (this.rings.length >= FX_CAPS.rings) this.rings.shift();
    this.rings.push({
      x, y, color, maxR, width: width || 4,
      life, maxLife: life, r: 0, delay: delay || 0,
    });
  }

  addFlash(color, life, alpha) {
    this.flashes.push({ color, life, maxLife: life, alpha: alpha || 0.25 });
  }

  addFloat(x, y, text, color, size) {
    if (this.texts.length >= FX_CAPS.texts) this.texts.shift();
    this.texts.push({ x, y, text, color, size: size || 20, life: 1.1, maxLife: 1.1 });
  }

  addTrail(x, y, angle) {
    if (this.trails.length >= FX_CAPS.trails) this.trails.shift();
    this.trails.push({ x, y, angle, life: 0.35, maxLife: 0.35 });
  }

  addMuzzle(x, y, angle) {
    if (this.muzzles.length >= FX_CAPS.muzzles) this.muzzles.shift();
    this.muzzles.push({ x, y, angle, life: 0.09, maxLife: 0.09 });
  }

  banner(text, sub, color, dur) {
    this.bannerText = text;
    this.bannerSub = sub || '';
    this.bannerColor = color || PALETTE.gold;
    this.bannerLife = dur || 2;
    this.bannerMax = this.bannerLife;
  }

  // Boss death, staged: three rings ripple out one after another,
  // the screen flashes white, and time briefly slows to a crawl.
  bossExplosion(x, y) {
    this.addRing(x, y, PALETTE.gold, 340, 0.7, 6, 0);
    this.addRing(x, y, '#ff4d6d', 260, 0.9, 5, 0.12);
    this.addRing(x, y, PALETTE.cyan, 420, 1.1, 4, 0.25);
    this.addFlash('#ffffff', 0.35, 0.5);
    this.slowmo(0.6);
  }

  // A death burst in several colours at once — the burst is split
  // across one Spark per colour so each keeps its own glow.
  burstMulti(x, y, colors, count, speed, sparks) {
    let parts = 0;
    for (const s of sparks) parts += s.parts.length;
    const budget = Math.max(0, FX_CAPS.sparkParts - parts);
    if (budget <= 0) return;
    const per = Math.max(1, Math.floor(Math.min(count, budget) / colors.length));
    for (const color of colors) {
      sparks.push(new Spark(x, y, color, per, speed));
    }
  }

  // dt is the (possibly slowed) game step; realDt is wall-clock time,
  // so the slow-mo window itself always lasts its real duration.
  update(dt, realDt) {
    if (this.slowmoTimer > 0) this.slowmoTimer = Math.max(0, this.slowmoTimer - realDt);
    for (const r of this.rings) {
      if (r.delay > 0) { r.delay -= dt; continue; }
      r.life -= dt;
      const t = 1 - Math.max(0, r.life / r.maxLife);
      r.r = r.maxR * easeOutCubic(t);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter((f) => f.life > 0);
    for (const t of this.texts) { t.y -= 34 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const t of this.trails) t.life -= dt;
    this.trails = this.trails.filter((t) => t.life > 0);
    for (const m of this.muzzles) m.life -= dt;
    this.muzzles = this.muzzles.filter((m) => m.life > 0);
    if (this.bannerLife > 0) this.bannerLife -= realDt;
  }

  // World-space effects: drawn inside the shake transform.
  drawWorld(ctx) {
    for (const t of this.trails) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.globalAlpha = a * 0.45;
      ctx.fillStyle = PALETTE.magenta;
      ctx.shadowColor = PALETTE.magenta;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.cyan;
      ctx.beginPath();
      ctx.ellipse(-4, -6, 9, 4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(-4, 6, 9, 4, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const m of this.muzzles) {
      const a = Math.max(0, m.life / m.maxLife);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.globalAlpha = a;
      ctx.strokeStyle = PALETTE.gold;
      ctx.shadowColor = PALETTE.gold;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, 5);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.fillStyle = '#fff8d6';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    for (const r of this.rings) {
      if (r.delay > 0 || r.r <= 0) continue;
      const a = Math.max(0, r.life / r.maxLife);
      ctx.save();
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = Math.max(1, r.width * a);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const t of this.texts) {
      const a = Math.max(0, t.life / t.maxLife);
      const pop = 1 + 0.35 * Math.max(0, (t.life / t.maxLife - 0.8) / 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = t.color;
      ctx.font = 'bold ' + Math.round(t.size * pop) + 'px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }

  // Screen-space effects: drawn last, over HUD and menus.
  drawScreen(ctx) {
    for (const f of this.flashes) {
      const a = Math.max(0, f.life / f.maxLife) * f.alpha;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.restore();
    }
    if (this.bannerText && this.bannerLife > 0) {
      const t = 1 - this.bannerLife / this.bannerMax;
      const scale = easeOutBack(Math.min(1, t * 4));
      const alpha = Math.min(1, t * 6) * (this.bannerLife < 0.4 ? this.bannerLife / 0.4 : 1);
      ctx.save();
      ctx.translate(VIEW.width / 2, 310);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = 'center';
      ctx.shadowColor = this.bannerColor;
      ctx.shadowBlur = 26;
      ctx.fillStyle = this.bannerColor;
      ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
      ctx.fillText(this.bannerText, 0, 0);
      ctx.shadowBlur = 0;
      if (this.bannerSub) {
        ctx.fillStyle = PALETTE.white;
        ctx.font = '22px "Trebuchet MS", sans-serif';
        ctx.fillText(this.bannerSub, 0, 38);
      }
      ctx.fillStyle = this.bannerColor;
      ctx.fillRect(-160 * Math.max(0, this.bannerLife / this.bannerMax), 56, 320 * Math.max(0, this.bannerLife / this.bannerMax), 3);
      ctx.restore();
    }
  }
}
