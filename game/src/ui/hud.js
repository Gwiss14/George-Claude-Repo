// Health bars, wave label, banners and the end-of-round screen.

export class Hud {
  constructor(game, onRestart) {
    this.game = game;
    this.el = (id) => document.getElementById(id);
    this.hpFill = this.el('hp-fill');
    this.hpText = this.el('hp-text');
    this.wave = this.el('wave');
    this.boss = this.el('boss');
    this.bossFill = this.el('boss-fill');
    this.banner = this.el('banner');
    this.end = this.el('end');
    this.endTitle = this.el('end-title');
    this.endSub = this.el('end-sub');
    this.bannerTimer = 0;
    this.endTimer = 0;
    for (const id of ['restart-btn', 'end-restart']) {
      this.el(id).addEventListener('click', (e) => { e.stopPropagation(); onRestart(); });
    }
    game.on((ev) => {
      if (ev.type === 'wave') this.show(ev.wave === ev.total ? 'Final wave: Grudge!' : `Wave ${ev.wave}`);
      if (ev.type === 'waveClear') this.show('Wave cleared  +25');
      if (ev.type === 'reset') { this.end.classList.remove('show'); this.endTimer = 0; }
    });
  }

  show(text) {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    this.bannerTimer = 1.6;
  }

  update(dt) {
    const g = this.game, j = g.juno;
    this.hpFill.style.width = `${(j.hp / j.maxHp) * 100}%`;
    this.hpText.textContent = `${Math.ceil(j.hp)}`;
    const total = 3;
    this.wave.textContent = g.waveIndex < 0 ? 'Get ready' : `Wave ${g.waveIndex + 1} / ${total}`;
    const boss = g.fighters.find((f) => f.kind === 'grudge');
    this.boss.style.display = boss ? 'block' : 'none';
    if (boss) this.bossFill.style.width = `${(boss.hp / boss.maxHp) * 100}%`;

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.banner.classList.remove('show');
    }
    if (g.phase !== 'playing') {
      this.endTimer += dt;
      if (this.endTimer > 1.2 && !this.end.classList.contains('show')) {
        const won = g.phase === 'won';
        this.endTitle.textContent = won ? 'Roof cleared!' : 'Knocked out';
        this.endSub.textContent = won ? 'The Tin Crows fly home.' : `You reached wave ${g.waveIndex + 1}.`;
        this.end.classList.toggle('won', won);
        this.end.classList.add('show');
      }
    }
  }
}
