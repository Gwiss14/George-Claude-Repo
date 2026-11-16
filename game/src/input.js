// Keyboard and touch input, merged into one move vector and counts of attack and roll presses.
// move.y is "up the screen" (north, -Z in the world).

export class Input {
  constructor({ onRestart, onDebug }) {
    this.keys = new Set();
    this.attackPresses = 0;
    this.dodgePresses = 0;
    this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.bot = null; // test bots write { mx, my, attack, dodge } here
    this.maxStick = 55; // px

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote') { onDebug(); e.preventDefault(); return; }
      if (e.repeat) return;
      if (e.code === 'KeyJ' || e.code === 'Space') { this.attackPresses++; e.preventDefault(); }
      if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { this.dodgePresses++; e.preventDefault(); }
      if (e.code === 'KeyR') onRestart();
      this.keys.add(e.code);
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const zone = document.getElementById('touch-zone');
    const base = document.getElementById('stick-base');
    const knob = document.getElementById('stick-knob');
    zone.addEventListener('pointerdown', (e) => {
      if (this.stick.id !== null) return;
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: 0, y: 0 };
      zone.setPointerCapture(e.pointerId);
      base.style.display = 'block';
      base.style.left = `${e.clientX}px`; base.style.top = `${e.clientY}px`;
      knob.style.transform = 'translate(-50%, -50%)';
      document.body.classList.add('touching');
      e.preventDefault();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.stick.id) return;
      let dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const d = Math.hypot(dx, dy), m = this.maxStick;
      if (d > m) { dx *= m / d; dy *= m / d; }
      this.stick.x = dx / m; this.stick.y = -dy / m;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = (e) => {
      if (e.pointerId !== this.stick.id) return;
      this.stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
      base.style.display = 'none';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    const button = (id, press) => {
      const b = document.getElementById(id);
      b.addEventListener('pointerdown', (e) => { press(); b.classList.add('down'); e.preventDefault(); });
      const up = () => b.classList.remove('down');
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    };
    button('attack-btn', () => this.attackPresses++);
    button('roll-btn', () => this.dodgePresses++);
  }

  move() {
    if (this.bot) return { x: this.bot.mx, y: this.bot.my };
    const k = this.keys;
    let x = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    let y = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    if (this.stick.id !== null) { x += this.stick.x; y += this.stick.y; }
    const n = Math.hypot(x, y);
    return n > 1 ? { x: x / n, y: y / n } : { x, y };
  }

  takeAttacks() {
    let n = this.attackPresses;
    this.attackPresses = 0;
    if (this.bot && this.bot.attack) { n++; this.bot.attack = false; }
    return n;
  }

  takeDodges() {
    let n = this.dodgePresses;
    this.dodgePresses = 0;
    if (this.bot && this.bot.dodge) { n++; this.bot.dodge = false; }
    return n;
  }
}
