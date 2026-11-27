// Checks the one-file page (dist-single/wrapped.html) in the pre-installed Chromium: the power-up machine,
// gun upgrades and the rifle scope, power-ups dropped by zombies, the deals after a wave, the zombie bodies,
// and a 6-wave bot run (wave 5 is the boss).   npm run build:single && node tests/run-feature-tests.mjs
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PAGE = 'file://' + new URL('../dist-single/wrapped.html', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = false;
const fail = (m) => { failed = true; console.log('FAIL', m); };
const watch = (page) => { const e = []; page.on('pageerror', (x) => e.push(String(x))); page.on('console', (m) => m.type() === 'error' && e.push(m.text())); return () => e.filter((x) => !/net::|fonts|sw\.js/.test(x)); };
const out = {};

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = watch(page);
await page.goto(PAGE);
await page.waitForFunction(() => window.__game && window.__view.zombies.ready, null, { timeout: 60000 });
const ev = (f, a) => page.evaluate(f, a);
const simWait = (sec) => ev((sec) => new Promise((res) => { const g = window.__game, t0 = g.time; const f = () => (g.time - t0 >= sec ? res() : requestAnimationFrame(f)); f(); }), sec);
// stand somewhere with no enemies and no wave coming, holding a gun, with coins
const stand = (x, z, gun = 'pistol', coins = 100) => ev(([x, z, gun, coins]) => {
  const g = window.__game, j = g.juno; g.fighters = g.fighters.filter((f) => f.team !== 'enemy'); g.waveTimer = 999; g.closeOffer();
  if (g.gun.id !== gun) g.gun = g.makeGun(gun); j.coins = coins; j.x = j.px = x; j.z = j.pz = z;
}, [x, z, gun, coins]);
const press = async (key) => { await page.keyboard.press(key); await simWait(0.1); };

// ---- 1. power-up machine: each pad sells its power-up ----
out.machine = {};
for (const [k, x] of [['rapid', -2.7], ['damage', -1.8], ['speed', -0.9]]) {
  await stand(x, 3.5); await simWait(0.1); await press('KeyE');
  out.machine[k] = await ev((k) => ({ left: +window.__game.powers[k].toFixed(1), coins: window.__game.juno.coins }), k);
  if (!(out.machine[k].left > 15 && out.machine[k].coins < 100)) fail(`machine did not sell ${k}: ${JSON.stringify(out.machine[k])}`);
}
await stand(-3.6, 3.5); await ev(() => { window.__game.juno.hp = 30; }); await simWait(0.1); await press('KeyE');
out.machine.health = await ev(() => window.__game.juno.hp);
if (out.machine.health !== 70) fail(`health pack: hp ${out.machine.health}`);
await stand(-2.7, 3.5, 'pistol', 2); await ev(() => { window.__game.powers.rapid = 0; }); await press('KeyE');
if (await ev(() => window.__game.powers.rapid) !== 0) fail('the machine sold rapid fire without enough coins');

// ---- 2. gun upgrades: rifle SCOPE, then AP ROUNDS, then maxed; the scope zooms ----
await stand(0.25, 3.5, 'rifle'); await simWait(0.1);
out.benchPrompt = await page.textContent('#pad-prompt');
await press('KeyE'); const lv1 = await ev(() => ({ lv: window.__game.gunUps.rifle, scope: !!window.__game.gunDef.scope }));
await press('KeyE'); const lv2 = await ev(() => ({ lv: window.__game.gunUps.rifle, pierce: window.__game.gunDef.pierce, coins: window.__game.juno.coins }));
await press('KeyE'); const lv3 = await ev(() => ({ lv: window.__game.gunUps.rifle, coins: window.__game.juno.coins }));
out.upgrades = { lv1, lv2, lv3 };
if (!(lv1.lv === 1 && lv1.scope && lv2.lv === 2 && lv2.pierce === 6 && lv3.lv === 2 && lv3.coins === lv2.coins)) fail(`rifle upgrades: ${JSON.stringify(out.upgrades)}`);
await stand(0, 0, 'rifle'); await ev(() => { window.__input.state.yaw = Math.PI; });
await press('KeyQ'); await simWait(0.2);
out.scoped = await ev(() => ({ aiming: window.__game.juno.aiming, fov: window.__view.camera.fov, ring: document.body.classList.contains('scoped'), gunShown: window.__view.hand.visible }));
await page.screenshot({ path: OUT + 'scope.png' });
await press('KeyQ'); await simWait(0.2);
out.unscoped = await ev(() => ({ aiming: window.__game.juno.aiming, fov: window.__view.camera.fov }));
if (!(out.scoped.aiming && out.scoped.fov < 30 && out.scoped.ring && !out.scoped.gunShown && !out.unscoped.aiming && out.unscoped.fov === 75)) fail(`scope: ${JSON.stringify([out.scoped, out.unscoped])}`);
await stand(0, 0, 'pistol'); await ev(() => { window.__input.state.yaw = Math.PI; });
await press('KeyQ'); await simWait(0.2);
if (await ev(() => window.__game.juno.aiming)) fail('a gun without a scope could scope in');
await press('KeyQ');

// ---- 3. a power-up dropped by a zombie is picked up by walking over it ----
await stand(0, 0); await ev(() => { const g = window.__game; g.pickups = []; g.powers.damage = 0; g.maybeDrop({ kind: 'grudge', x: 1.5, z: 0 }); });
out.dropped = await ev(() => window.__game.pickups.map((p) => p.power));
await ev(() => { const j = window.__game.juno; j.hp = 50; j.x = j.px = 1.5; }); await simWait(0.2);
out.picked = await ev(() => ({ left: window.__game.pickups.length, hp: window.__game.juno.hp, powers: { ...window.__game.powers } }));
if (out.dropped.length !== 1 || out.picked.left !== 0) fail(`drop: ${JSON.stringify([out.dropped, out.picked])}`);

// ---- 4. deals after a wave: they open, sell, hold the next wave, and Enter starts it ----
await ev(() => { const g = window.__game; g.waveTimer = 0.01; g.juno.coins = 40; g.juno.x = g.juno.px = 0; g.juno.z = g.juno.pz = 0; });
await page.waitForFunction(() => window.__game.liveEnemies().length > 0, null, { timeout: 20000 });
await simWait(1.5);
const zombieBodies = await ev(() => [...window.__view.fighters.values()].filter((v) => v.zombie).length);
await ev(() => { const g = window.__game, j = g.juno, e = g.liveEnemies()[0]; window.__input.state.yaw = Math.atan2(e.x - j.x, e.z - j.z); });
await simWait(0.3);
await page.screenshot({ path: OUT + 'zombies.png' });
if (zombieBodies < 1) fail('enemies are not wearing zombie bodies');
await ev(() => { const g = window.__game; g.queue = []; for (const e of g.liveEnemies()) g.applyShot(e, 9999, false, g.gunDef, 1, { x: e.x, y: 1, z: e.z }); });
await page.waitForFunction(() => !!window.__game.offer, null, { timeout: 20000 });
out.offer = await ev(() => ({ items: window.__game.offer.items.map((i) => `${i.kind}:${i.key || ''}:${i.cost}`), panel: !document.getElementById('offer').hidden }));
await page.screenshot({ path: OUT + 'deals.png' });
await press('Digit1');
const sold = await ev(() => window.__game.offer.items[0].sold);
await simWait(3);
const held = await ev(() => !window.__game.waveActive);
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.waveActive, null, { timeout: 30000 }).catch(() => {});
out.afterDeals = await ev(() => ({ offer: !!window.__game.offer, panel: !document.getElementById('offer').hidden, wave: window.__game.waveIndex + 1, active: window.__game.waveActive }));
if (!(out.offer.items.length === 3 && out.offer.panel && sold && held && out.afterDeals.active && !out.afterDeals.panel)) fail(`deals: ${JSON.stringify([out.offer, sold, held, out.afterDeals])}`);
out.errors = errors();
if (out.errors.length) fail(`errors: ${out.errors}`);
await page.close();

// ---- 5. the good bot plays 6 waves (wave 5 is the boss), buying guns, upgrades and deals ----
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = watch(p);
  await p.goto(PAGE + '?bot=good&speed=6&waves=6');
  await p.waitForFunction(() => window.__botReport && window.__botReport.done, null, { timeout: 600000 });
  out.bot = await p.evaluate(() => ({ result: window.__botReport.result, waves: window.__botReport.wavesCleared, upgrades: window.__game.gunUps }));
  out.bot.errors = errs();
  if (out.bot.waves < 6) fail(`bot cleared only ${out.bot.waves} waves`);
  if (out.bot.errors.length) fail(`bot run errors: ${out.bot.errors}`);
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
