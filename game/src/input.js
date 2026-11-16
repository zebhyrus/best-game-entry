// Keyboard + mouse + touch state, kept in one place so the game
// loop only ever reads this object.
//
// Touch scheme (phones): left half of the screen is a floating
// joystick (touch down = stick origin, drag = move), right half is
// aim-and-fire (touch point = aim, holding fires), a DASH button
// sits bottom-right and a pause button top-right. A tap anywhere
// also counts as a click edge, so title / upgrade / game-over
// screens work with a tap. Desktop play is untouched: touch UI
// only appears once a touch device is detected.

import { VIEW } from './config.js';

const STICK_RADIUS = 70;
export const DASH_BTN = { x: VIEW.width - 92, y: VIEW.height - 92, r: 56 };
export const PAUSE_BTN = { x: VIEW.width - 34, y: 132, r: 22 };

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.pressed = new Set();
    this.canvas = canvas;

    // Touch state.
    this.touchMode = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.uiMode = false; // set by the game loop: true outside 'play'
    this.uiTouchIds = new Set();
    this.moveTouch = null; // { id, ox, oy, x, y } in game coords
    this.aimTouch = null; // { id }
    this.dashTouchId = null;
    this.dashQueued = false;
    this.pauseQueued = false;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
      this.moveTouch = null;
      this.aimTouch = null;
      this.dashTouchId = null;
    });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        // Edge only: a button already held from before does not count
        // as a fresh click (so holding fire never auto-picks an
        // upgrade card or skips the game-over screen).
        if (!this.mouseDown) this.mousePressed = true;
        this.mouseDown = true;
      }
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    });
    window.addEventListener('mouseup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.touchMode = true;
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const x = (t.clientX - r.left) * (canvas.width / r.width);
        const y = (t.clientY - r.top) * (canvas.height / r.height);
        if (Math.hypot(x - DASH_BTN.x, y - DASH_BTN.y) <= DASH_BTN.r) {
          this.dashTouchId = t.identifier;
          this.dashQueued = true;
          continue;
        }
        if (Math.hypot(x - PAUSE_BTN.x, y - PAUSE_BTN.y) <= PAUSE_BTN.r) {
          this.pauseQueued = true;
          continue;
        }
        if (this.uiMode) {
          // Outside gameplay a tap is just a click (title, upgrade
          // cards, game over): no joystick, no firing afterwards.
          this.uiTouchIds.add(t.identifier);
          if (!this.mouseDown) this.mousePressed = true;
          this.mouseDown = true;
          this.mouseX = x;
          this.mouseY = y;
          continue;
        }
        if (x < VIEW.width / 2 && !this.moveTouch) {
          this.moveTouch = { id: t.identifier, ox: x, oy: y, x, y };
          continue;
        }
        if (!this.aimTouch) {
          this.aimTouch = { id: t.identifier };
          // Aim + fire, with the same edge rule as a mouse click.
          if (!this.mouseDown) this.mousePressed = true;
          this.mouseDown = true;
          this.mouseX = x;
          this.mouseY = y;
        }
      }
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      for (const t of e.changedTouches) {
        const x = (t.clientX - r.left) * (canvas.width / r.width);
        const y = (t.clientY - r.top) * (canvas.height / r.height);
        if (this.moveTouch && t.identifier === this.moveTouch.id) {
          this.moveTouch.x = x;
          this.moveTouch.y = y;
        } else if (this.aimTouch && t.identifier === this.aimTouch.id) {
          this.mouseX = x;
          this.mouseY = y;
        }
      }
    }, { passive: false });
    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (this.uiTouchIds.has(t.identifier)) {
          this.uiTouchIds.delete(t.identifier);
          if (this.uiTouchIds.size === 0) this.mouseDown = false;
        }
        if (this.moveTouch && t.identifier === this.moveTouch.id) this.moveTouch = null;
        if (this.aimTouch && t.identifier === this.aimTouch.id) {
          this.aimTouch = null;
          this.mouseDown = false;
        }
        if (this.dashTouchId === t.identifier) this.dashTouchId = null;
      }
    };
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  wasPressed(...names) {
    if (names.includes(' ') && this.dashQueued) return true;
    if ((names.includes('p') || names.includes('escape')) && this.pauseQueued) return true;
    return names.some((n) => this.pressed.has(n));
  }

  // Movement vector from the touch joystick, magnitude at most 1.
  moveVec() {
    const m = this.moveTouch;
    if (!m) return { x: 0, y: 0 };
    let dx = (m.x - m.ox) / STICK_RADIUS;
    let dy = (m.y - m.oy) / STICK_RADIUS;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    return { x: dx, y: dy };
  }

  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
    this.dashQueued = false;
    this.pauseQueued = false;
  }
}
