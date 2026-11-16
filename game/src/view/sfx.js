// Tiny synthesized sounds (no audio files). Audio starts after the first key press or tap.

export class Sfx {
  constructor() {
    this.ctx = null;
    const unlock = () => {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  tone(freq, endFreq, dur, type = 'square', vol = 0.15, delay = 0) {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.2) {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g).connect(c.destination);
    s.start();
  }

  hit(big) { this.tone(big ? 140 : 220, 50, big ? 0.18 : 0.09, 'square', 0.18); this.noise(big ? 0.12 : 0.06, 0.25); }
  whoosh(player) { this.noise(0.05, player ? 0.05 : 0.03); }
  chime(win) { this.tone(660, 660, 0.15, 'triangle', 0.12); this.tone(990, 990, win ? 0.4 : 0.2, 'triangle', 0.12, 0.12); }
  combo() { this.tone(520, 1040, 0.12, 'square', 0.14); this.tone(780, 1560, 0.2, 'square', 0.12, 0.08); this.noise(0.15, 0.2); }
  coin() { this.tone(1320, 1320, 0.05, 'square', 0.07); this.tone(1760, 1760, 0.09, 'square', 0.07, 0.05); }
  nope() { this.tone(180, 140, 0.15, 'square', 0.1); }
  snap() { this.noise(0.12, 0.3); this.tone(400, 90, 0.15, 'sawtooth', 0.12); }
  roll() { this.noise(0.14, 0.08); this.tone(260, 120, 0.12, 'triangle', 0.06); }
  dodged() { this.tone(880, 1320, 0.1, 'triangle', 0.12); }
  lose() { this.tone(300, 60, 0.7, 'sawtooth', 0.12); }
}
