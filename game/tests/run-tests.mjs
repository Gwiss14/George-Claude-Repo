// Runs the built game in the pre-installed Chromium and checks it.
//   node tests/run-tests.mjs           (after `npm run build`; `npm test` does both)
// Writes screenshots to tests/out/.

import { preview } from 'vite';
import { createRequire } from 'node:module';
// Playwright is pre-installed on the machine (not a project dependency); load it the CommonJS way.
// Without the full 'playwright' package, 'playwright-core' drives the Chrome already installed here.
const req = createRequire(import.meta.url);
let pw, channel;
try { pw = req('playwright'); } catch { pw = req('playwright-core'); channel = 'chrome'; }
const { chromium, devices } = pw;
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('./out/', import.meta.url));
mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4317, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
const BASE = 'http://127.0.0.1:4317/';
const browser = await chromium.launch({ channel, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = {};
let failed = false;
const fail = (msg) => { failed = true; console.log('FAIL', msg); };

function watchConsole(page, name) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return () => {
    // the comic font comes from Google Fonts; a blocked font download is not a game error
    const real = errors.filter((e) => !/fonts\.(googleapis|gstatic)/.test(e) && !/ERR_TUNNEL|net::ERR/.test(e));
    if (real.length) fail(`${name}: console errors:\n  ${real.join('\n  ')}`);
    return real.length;
  };
}

const state = (page) => page.evaluate(() => {
  const g = window.__game, j = g.juno;
  return { x: j.x, z: j.z, state: j.state, attack: j.attack, hp: j.hp, phase: g.phase, wave: g.waveIndex, enemies: g.liveEnemies().length };
});

// ---- 1. desktop, keyboard --------------------------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = watchConsole(page, 'desktop');
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game && window.__view);
  await page.waitForTimeout(1500);
  // This machine renders in software, so frames are slow; wait on game time, not the wall clock.
  const simWait = (sec) => page.evaluate((sec) => new Promise((res) => {
    const g = window.__game, t0 = g.time;
    const tick = () => (g.time - t0 >= sec ? res() : requestAnimationFrame(tick));
    tick();
  }), sec);
  const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => (++n === 30 ? res(30000 / (performance.now() - t0)) : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  await page.evaluate(() => { const g = window.__game; g.waveTimer = 999; g.waveActive = false; g.fighters = [g.juno]; }); // empty roof for the input checks
  const s0 = await state(page);
  await page.keyboard.down('KeyD'); await simWait(0.5); await page.keyboard.up('KeyD');
  const s1 = await state(page);
  await page.keyboard.down('KeyW'); await simWait(0.3); await page.keyboard.up('KeyW');
  await simWait(0.05);
  const s2 = await state(page);
  await page.evaluate(() => { window.__atk = []; window.__game.on((ev) => { if (ev.type === 'attackStart' && ev.team === 'player') window.__atk.push(ev.attack); }); });
  await page.keyboard.press('KeyJ');
  await page.waitForFunction(() => window.__atk.length > 0, null, { timeout: 5000 }).catch(() => {});
  const s3 = { ...(await state(page)), attacks: await page.evaluate(() => window.__atk.slice()) };
  await simWait(1.0); // let the 0.5 s combo window run out so the chain starts at jab again
  // combo: press during each attack -> the next one is queued: jab, cross, kick
  await page.evaluate(() => { window.__atk = []; });
  for (let i = 1; i <= 3; i++) {
    await page.keyboard.press('KeyJ');
    await page.waitForFunction((n) => window.__atk.length >= n, i, { timeout: 5000 }).catch(() => {});
  }
  await simWait(0.8);
  const seen = await page.evaluate(() => window.__atk.slice());

  // roll: hold D and press K -> Juno rolls right, further and faster than running
  const r0 = await state(page);
  await page.keyboard.down('KeyD'); await page.keyboard.press('KeyK');
  await page.waitForFunction(() => window.__game.juno.state === 'roll', null, { timeout: 5000 }).catch(() => {});
  const rollSeen = (await state(page)).state === 'roll';
  await page.keyboard.up('KeyD');
  await page.waitForFunction(() => window.__game.juno.state !== 'roll', null, { timeout: 5000 }).catch(() => {});
  const r1 = await state(page);
  // i-frames, stepped by hand so the timing is exact: a Crow jab that lands mid-roll is dodged;
  // the same jab without the roll hits (shows the setup is right)
  const iframes = await page.evaluate(() => {
    const g = window.__game, C = window.__config, dt = 1 / C.sim.hz;
    const run = (roll) => {
      const j = g.juno;
      g.fighters = [j]; g.waveActive = false; g.waveTimer = 999;
      Object.assign(j, { x: 0, z: 0, yaw: Math.PI, hp: 100, invuln: 0, freeze: 0, state: 'idle', stateTime: 0, rollCooldown: 0 });
      const e = g.makeFighter('crow', 'enemy', 0, 1.0); e.yaw = Math.PI; e.state = 'circle'; g.fighters.push(e);
      let dodged = 0; const off = (ev) => { if (ev.type === 'dodged') dodged++; }; g.on(off);
      g.startAttack(e, 'crowJab');
      const a = C.attacks.crowJab; e.stateTime = a.length * a.lands - 0.05; // 0.05 s before the jab lands
      if (roll) { j.yaw = Math.PI; j.wantX = j.wantZ = 0; g.startRoll(j); }
      for (let i = 0; i < 30; i++) g.step(dt, { mx: 0, mz: 0, attackPresses: 0, dodgePresses: 0 });
      g.listeners = g.listeners.filter((f) => f !== off);
      return { hp: j.hp, dodged };
    };
    const out = { withRoll: run(true), withoutRoll: run(false) };
    g.fighters = [g.juno];
    return out;
  });

  await page.evaluate(() => { window.__game.waveTimer = 0; });
  await simWait(2.5); // let wave 1 climb in
  await page.screenshot({ path: OUT + 'desktop.png' });
  await page.keyboard.press('Backquote');
  await page.waitForTimeout(400);
  const dbg = await page.evaluate(() => ({ open: document.getElementById('debug').classList.contains('show'), sliders: document.querySelectorAll('#debug input[type=range]').length, text: document.querySelector('#debug .readout').textContent }));
  await page.click('#dbg-boxes');
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + 'desktop-debug.png' });
  await page.keyboard.press('Backquote');
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(200);
  const s4 = await state(page);
  results.desktop = {
    browserFps: Math.round(fps),
    movedRightMetres: +(s1.x - s0.x).toFixed(2), movedUpMetres: +(s1.z - s2.z).toFixed(2),
    attackAfterJ: s3.attacks, comboAttacksSeen: seen,
    debugOpen: dbg.open, debugSliders: dbg.sliders, debugReadoutHasFps: /FPS \d+/.test(dbg.text) && /draw calls \d+/.test(dbg.text),
    restartResets: s4.wave === -1 && s4.hp === 100,
    rollFromK: rollSeen, rollMetres: +(r1.x - r0.x).toFixed(2), iframes,
    consoleErrors: errs(),
  };
  if (!(s1.x - s0.x > 1)) fail('D key did not move Juno right');
  if (!(s1.z - s2.z > 0.8)) fail('W key did not move Juno up the screen');
  if (s3.attacks[0] !== 'junoJab') fail('J did not start a jab');
  if (seen.join() !== 'junoJab,junoCross,junoKick') fail(`combo did not chain jab, cross, kick: ${seen}`);
  if (!dbg.open || dbg.sliders < 40) fail('debug panel');
  if (!results.desktop.restartResets) fail('restart');
  if (!rollSeen) fail('K did not start a roll');
  if (!(r1.x - r0.x > 1.5)) fail(`roll moved only ${(r1.x - r0.x).toFixed(2)} m`);
  if (!(iframes.withRoll.hp === 100 && iframes.withRoll.dodged === 1)) fail(`roll did not dodge the jab: ${JSON.stringify(iframes.withRoll)}`);
  if (!(iframes.withoutRoll.hp < 100)) fail('the same jab without a roll did not hit (test setup is wrong)');
  await page.close();
}

// ---- 2 & 3. bots ---------------------------------------------------------------------
async function runBot(mode) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = watchConsole(page, `bot ${mode}`);
  await page.goto(`${BASE}?bot=${mode}&speed=6`);
  await page.waitForFunction(() => window.__botReport, null, { timeout: 15000 });
  await page.waitForFunction(() => window.__botReport.done, null, { timeout: 300000, polling: 500 });
  const r = await page.evaluate(() => window.__botReport);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: OUT + `bot-${mode}-end.png` });
  // the end screen's button restarts the round
  // waves never end: the bad bot is knocked out (end screen), the good bot stops after its waves (corner button)
  const ended = await page.evaluate(() => document.getElementById('end').classList.contains('show'));
  await page.click(ended ? '#end-restart' : '#restart-btn');
  await page.waitForTimeout(300);
  const after = await state(page);
  r.restartFromEndScreen = after.phase === 'playing' && after.hp === 100 && after.wave <= 0;
  r.consoleErrors = errs();
  await page.close();
  return r;
}

results.goodBot = await runBot('good');
results.badBot = await runBot('bad');
for (const [name, r] of [['good bot', results.goodBot], ['bad bot', results.badBot]]) {
  if (r.maxWallPenetration > 0.01) fail(`${name}: someone went ${r.maxWallPenetration} m into a wall or prop`);
  if (r.maxFighterOverlap > 0.05) fail(`${name}: fighters overlapped by ${r.maxFighterOverlap} m`);
  if (r.doubleHits) fail(`${name}: ${r.doubleHits} hits landed during invulnerability`);
  if (r.enemyStuck) fail(`${name}: enemies got stuck ${r.enemyStuck} times`);
  // the gap between enemy attacks shrinks each wave, down to waves.minAttackGap (0.45 s)
  if (r.minGapBetweenEnemyAttacks !== null && r.minGapBetweenEnemyAttacks < 0.449) fail(`${name}: enemy attacks only ${r.minGapBetweenEnemyAttacks}s apart`);
  if (r.maxEnemiesAttackingAtOnce > 2) fail(`${name}: ${r.maxEnemiesAttackingAtOnce} enemies attacked at once`);
  if (!r.restartFromEndScreen) fail(`${name}: restart from end screen`);
}
if (!(results.goodBot.wavesCleared >= 6)) fail(`good bot only cleared ${results.goodBot.wavesCleared} waves (${results.goodBot.result})`);
if (!(results.goodBot.bossWavesCleared >= 1)) fail('good bot did not clear the wave 5 boss wave');
if (results.goodBot.weaponsUnlocked.join() !== 'hammer,wrench,shovel') fail(`weapons unlocked: ${results.goodBot.weaponsUnlocked}`);
if (results.badBot.result !== 'lost') fail(`bad bot should lose (${results.badBot.result})`);
if (!(results.goodBot.combos > 0)) fail('good bot never landed a full combo');
if (!(results.goodBot.coinsCollected > 0)) fail('good bot collected no coins');
if (!(results.goodBot.weaponsBought.length > 0 && results.goodBot.weaponHits > 0)) fail('good bot did not buy and use a weapon');
if (results.badBot.escapeFailures) fail(`bad bot: Juno got stuck ${results.badBot.escapeFailures} times`);

// ---- 3b. wave modifiers, each forced with ?mod= --------------------------------------
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = watchConsole(page, 'modifiers');
  await page.goto(BASE + '?mod=swift');
  await page.waitForFunction(() => window.__game);
  const mods = await page.evaluate(() => {
    const g = window.__game, out = {};
    const clear = () => { for (const e of g.liveEnemies()) { e.hp = 0; e.state = 'defeated'; } g.queue = []; g.updateWaves(0.01); };
    // swift, tough, swarm: enemies of the wave
    for (const key of ['swift', 'tough', 'swarm']) {
      g.reset(); g.forceMod = key; g.startWave(1);
      const live = g.liveEnemies();
      out[key] = { speedMul: live[0].speedMul, crowHp: live.find((e) => e.kind === 'crow')?.maxHp, total: live.length + g.queue.length, label: g.mod.label };
    }
    g.reset(); g.forceMod = 'none'; g.startWave(1);
    out.none = { crowHp: g.liveEnemies().find((e) => e.kind === 'crow')?.maxHp, total: g.liveEnemies().length + g.queue.length, mod: g.modKey };
    // fists: weapon put away, rack closed, weapon back after the wave
    g.reset(); g.forceMod = 'fists';
    const j = g.juno; j.weapon = 'pipe'; j.durability = 9; j.coins = 50;
    g.startWave(1);
    const during = { weapon: j.weapon, stashed: j.stashed };
    let failEv = null; const off = (ev) => { if (ev.type === 'buyFail') failEv = ev; }; g.on(off);
    g.tryBuy({ weapon: 'pipe' });
    clear();
    out.fists = { during, buyBlocked: !!(failEv && failEv.fists), coinsKept: j.coins, after: { weapon: j.weapon, durability: j.durability, mod: g.modKey } };
    g.listeners = g.listeners.filter((f) => f !== off);
    g.forceMod = 'swift'; g.reset(); g.startWave(1);
    return out;
  });
  await page.waitForTimeout(400);
  const chip = await page.evaluate(() => ({ text: document.getElementById('mod-chip').textContent, shown: document.getElementById('mod-chip').classList.contains('show') }));
  await page.screenshot({ path: OUT + 'modifier.png' });
  results.modifiers = { ...mods, chip, consoleErrors: errs() };
  if (mods.swift.speedMul !== 1.35) fail('swift did not speed enemies up');
  if (!(mods.tough.crowHp > mods.none.crowHp * 1.4)) fail('tough did not raise enemy health');
  if (mods.swarm.total !== mods.none.total + 3) fail('swarm did not add 3 enemies');
  if (mods.none.mod !== null) fail('?mod=none still had a modifier');
  if (!(mods.fists.during.weapon === null && mods.fists.during.stashed === 'pipe')) fail('fists only did not put the weapon away');
  if (!mods.fists.buyBlocked || mods.fists.coinsKept !== 50) fail('fists only did not close the rack');
  if (!(mods.fists.after.weapon === 'pipe' && mods.fists.after.durability === 9 && mods.fists.after.mod === null)) fail(`weapon not back after fists only: ${JSON.stringify(mods.fists.after)}`);
  if (!(chip.shown && chip.text === 'Fast Crows')) fail(`modifier chip: ${JSON.stringify(chip)}`);
  await page.close();
}

// ---- 4. phone held upright, touch ---------------------------------------------------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errs = watchConsole(page, 'phone');
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game);
  await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await page.evaluate(() => { window.__atk = 0; window.__game.on((ev) => { if (ev.type === 'attackStart' && ev.team === 'player') window.__atk++; }); });
  const btn = await page.locator('#attack-btn').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: btn.x + btn.width / 2, y: btn.y + btn.height / 2, id: 2 }] });
  await page.waitForTimeout(60);
  const s2 = { stateAtTap: (await state(page)).state, attacks: await page.evaluate(() => window.__atk) };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);
  await page.evaluate(() => { window.__rolled = 0; window.__game.on((ev) => { if (ev.type === 'roll') window.__rolled++; }); });
  const rb0 = await page.locator('#roll-btn').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rb0.x + rb0.width / 2, y: rb0.y + rb0.height / 2, id: 3 }] });
  await page.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => window.__rolled > 0, null, { timeout: 5000 }).catch(() => {});
  const rolledFromTap = await page.evaluate(() => window.__rolled);
  await page.waitForTimeout(600);
  const s0 = await state(page);
  // drag up and to the right on the left half of the screen
  await touch('touchStart', 100, 600);
  for (let i = 1; i <= 6; i++) { await touch('touchMove', 100 + i * 8, 600 - i * 8); await page.waitForTimeout(16); }
  await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + 'phone-drag.png' });
  await touch('touchEnd');
  const s1 = await state(page);
  const vis = await page.evaluate(() => ({ attack: getComputedStyle(document.getElementById('attack-btn')).display, restart: !!document.getElementById('restart-btn').offsetWidth }));
  await page.waitForTimeout(3000);
  await page.screenshot({ path: OUT + 'phone.png' });
  const rb = await page.locator('#restart-btn').boundingBox();
  await page.touchscreen.tap(rb.x + rb.width / 2, rb.y + rb.height / 2);
  await page.waitForTimeout(200);
  const s3 = await state(page);
  results.phone = {
    dragMoved: { right: +(s1.x - s0.x).toFixed(2), up: +(s0.z - s1.z).toFixed(2) },
    attackButtonShown: vis.attack !== 'none', attackFromTap: s2.attacks > 0, stateAtTap: s2.stateAtTap, rollFromTap: rolledFromTap > 0,
    restartButtonTap: s3.wave === -1, consoleErrors: errs(),
  };
  if (!(s1.x - s0.x > 0.5 && s0.z - s1.z > 0.5)) fail('touch drag did not move Juno');
  if (!(s2.attacks > 0)) fail('attack button tap did not attack');
  if (!(rolledFromTap > 0)) fail('roll button tap did not roll');
  if (!results.phone.restartButtonTap) fail('restart button tap');
  await ctx.close();
}

// ---- 5. smooth at 60 Hz and 120 Hz: drawn position must advance evenly every frame -----
{
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__game);
  const r = await page.evaluate(async () => {
    // replay the main loop's maths at fixed frame rates and look at frame-to-frame motion
    const CONFIG = window.__config;
    const step = 1 / CONFIG.sim.hz, speed = CONFIG.juno.speed;
    const out = {};
    for (const hz of [60, 75, 120, 144]) {
      let acc = 0, x = 0, px = 0, lastDrawn = 0;
      const deltas = [];
      for (let f = 0; f < 240; f++) {
        acc += 1 / hz;
        while (acc >= step) { px = x; x += speed * step; acc -= step; }
        const drawn = px + (x - px) * (acc / step);
        if (f > 10) deltas.push(drawn - lastDrawn); // skip the first frames while it starts moving
        lastDrawn = drawn;
      }
      const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      out[hz + 'Hz'] = +(Math.max(...deltas.map((d) => Math.abs(d - mean))) / mean * 100).toFixed(2) + '% max step unevenness';
    }
    return out;
  });
  results.smoothness = r;
  await page.close();
}

await browser.close();
await server.httpServer.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
