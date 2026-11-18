// First-person controls.
// Desktop: click to lock the mouse for aiming (Esc frees it; dragging also aims), WASD / arrows
// to move (left/right arrows turn), click or Space to shoot, R to reload, E to buy.
// Touch: drag on the left to move, drag on the right to aim. Shoot with a quick tap on the right,
// with a second finger anywhere while the first one aims or moves (hold to keep firing), or FIRE.

import { CONFIG } from '../config.js';

export class FpsInput {
  constructor({ canvas, onDebug }) {
    this.keys = new Set();
    this.state = { forward: 0, strafe: 0, yaw: Math.PI, pitch: 0, fireHeld: false, firePresses: 0, buyPresses: 0, reloadPresses: 0 };
    this.mouseFire = false; this.touchFire = false;
    this.bot = null;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.look = { id: null, x: 0, y: 0 };
    this.fireTouches = new Set(); // extra fingers held down while aiming or moving: they shoot
    this.drag = null;
    this.canvas = canvas;
    const S = this.state, look = (dx, dy) => {
      const k = CONFIG.fps.lookSpeed;
      S.yaw -= dx * k;
      S.pitch = Math.max(-1.3, Math.min(1.3, S.pitch - dy * k));
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') { onDebug(); e.preventDefault(); return; }
      if (e.repeat) return;
      if (e.code === 'KeyE') S.buyPresses++;
      if (e.code === 'KeyR') S.reloadPresses++;
      if (e.code === 'Space') { S.firePresses++; e.preventDefault(); }
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseFire = false; });

    // mouse: pointer lock when the page allows it, otherwise drag to aim
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseFire = true; S.firePresses++;
      if (!this.locked) {
        this.drag = { x: e.clientX, y: e.clientY };
        try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* not allowed here: dragging still aims */ }
      }
    });
    window.addEventListener('mouseup', () => { this.mouseFire = false; this.drag = null; });
    window.addEventListener('mousemove', (e) => {
      if (this.locked) look(e.movementX, e.movementY);
      else if (this.drag) { look(e.clientX - this.drag.x, e.clientY - this.drag.y); this.drag = { x: e.clientX, y: e.clientY }; }
    });

    // touch: left half moves, right half aims
    const moveZone = document.getElementById('touch-zone');
    const lookZone = document.getElementById('look-zone');
    const base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
    const extraFinger = (e) => { this.fireTouches.add(e.pointerId); S.firePresses++; e.preventDefault(); };
    const liftFinger = (e) => this.fireTouches.delete(e.pointerId);
    for (const z of [moveZone, lookZone]) { z.addEventListener('pointerup', liftFinger); z.addEventListener('pointercancel', liftFinger); }
    moveZone.addEventListener('pointerdown', (e) => {
      if (this.stick.id !== null) { extraFinger(e); return; }
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0, sx: e.clientX, sy: e.clientY, t: e.timeStamp };
      moveZone.setPointerCapture(e.pointerId);
      base.style.display = 'block'; base.style.left = `${e.clientX}px`; base.style.top = `${e.clientY}px`;
      knob.style.transform = 'translate(-50%, -50%)';
      e.preventDefault();
    });
    moveZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy), m = 55;
      if (d > m) { dx *= m / d; dy *= m / d; }
      this.stick.x = dx / m; this.stick.y = -dy / m;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const isTap = (e, start) => e.type === 'pointerup' && e.timeStamp - start.t < CONFIG.fps.tapTime * 1000
      && Math.hypot(e.clientX - start.sx, e.clientY - start.sy) < CONFIG.fps.tapSlop;
    const endStick = (e) => {
      if (e.pointerId !== this.stick.id) return;
      if (isTap(e, this.stick)) S.firePresses++; // a tap on the move side shoots too
      this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      base.style.display = 'none';
    };
    moveZone.addEventListener('pointerup', endStick);
    moveZone.addEventListener('pointercancel', endStick);
    lookZone.addEventListener('pointerdown', (e) => {
      if (this.look.id !== null) { extraFinger(e); return; }
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: e.timeStamp };
      lookZone.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    lookZone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.look.id) return;
      look((e.clientX - this.look.x) * 1.4, (e.clientY - this.look.y) * 1.4);
      this.look.x = e.clientX; this.look.y = e.clientY;
    });
    const endLook = (e) => {
      if (e.pointerId !== this.look.id) return;
      // a quick tap that barely moved is a shot, not an aim
      if (isTap(e, this.look)) S.firePresses++; // timed from when the finger touched and lifted
      this.look.id = null;
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    const hold = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('pointerdown', (e) => { down(); el.classList.add('down'); e.preventDefault(); e.stopPropagation(); });
      for (const t of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(t, () => { up(); el.classList.remove('down'); });
    };
    hold('attack-btn', () => { this.touchFire = true; S.firePresses++; }, () => { this.touchFire = false; });
    hold('buy-btn', () => { S.buyPresses++; }, () => {});
    hold('reload-btn', () => { S.reloadPresses++; }, () => {});
  }

  get locked() { return document.pointerLockElement === this.canvas; }

  // Called once per frame (or per step for bots). Presses stay until the game uses them.
  sample(dt) {
    const S = this.state;
    if (this.bot) {
      const b = this.bot;
      Object.assign(S, { forward: b.forward, strafe: b.strafe, yaw: b.yaw, pitch: b.pitch, fireHeld: b.fire });
      if (b.buy) { S.buyPresses++; b.buy = false; }
      return S;
    }
    const k = this.keys;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const str = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
    S.yaw += turn * CONFIG.fps.turnKeys * dt;
    S.forward = fwd + this.stick.y;
    S.strafe = str + this.stick.x;
    S.fireHeld = this.mouseFire || this.touchFire || this.fireTouches.size > 0 || k.has('Space');
    return S;
  }
}
