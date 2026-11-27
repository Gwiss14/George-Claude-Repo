// Checks Roof Rumble (index.html) on an iPhone-sized screen in the pre-installed Chromium.
//   node tests/run-survivor-tests.mjs   (after `npm run build`; `npm run test:survivor` does both)
import { preview } from 'vite';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const server = await preview({ preview: { port: 4361, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
const BASE = 'http://127.0.0.1:4361/';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = {};
let failed = false;
const fail = (m) => { failed = true; console.log('FAIL', m); };
const watch = (page) => { const e = []; page.on('pageerror', (x) => e.push(String(x))); page.on('console', (m) => m.type() === 'error' && e.push(m.text())); return () => e.filter((x) => !/fonts\.(googleapis|gstatic)|net::ERR/.test(x)); };
const simWait = (page, sec) => page.evaluate((sec) => new Promise((res) => { const r = window.__run, t0 = r.time; const f = () => (r.time - t0 >= sec || r.phase !== 'play' ? res() : requestAnimationFrame(f)); f(); }), sec);

// ---- 1. a player on an iPhone: title → play → drag → level-up card → pause → results → shop ----
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__run);
  const titleShown = await page.isVisible('#play-btn');
  await page.tap('#play-btn', { force: true }); // it pulses, so it is never "stable"
  await page.waitForTimeout(300);
  const playing = await page.evaluate(() => !document.getElementById('hud').hidden && window.__run.phase === 'play');
  // drag up with one thumb: Juno runs north (-Z)
  const cdp = await ctx.newCDPSession(page);
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const z0 = await page.evaluate(() => window.__run.juno.z);
  await t('touchStart', [{ x: 195, y: 500, id: 1 }]);
  for (let i = 1; i <= 6; i++) { await t('touchMove', [{ x: 195, y: 500 - i * 10, id: 1 }]); await page.waitForTimeout(16); }
  await simWait(page, 0.8);
  await t('touchEnd', []);
  const z1 = await page.evaluate(() => window.__run.juno.z);
  // ROLL: hold the stick to the right with one finger, tap ROLL with another
  await page.evaluate(() => { const r = window.__run; r.enemies = []; r.juno.x = -3; r.juno.z = 0; r.juno.px = -3; r.juno.pz = 0; });
  await simWait(page, 0.2);
  // watch every step from inside the game: frames can hold several steps, so a check from outside may miss the roll
  await page.evaluate(() => { const r = window.__run, step = r.step.bind(r), w = window.__rollWatch = { rolling: false, safe: true, hurt: false };
    r.step = (dt, inp) => { step(dt, inp); const j = r.juno; if (j.rollT > 0) { if (!w.rolling) w.hurt = r.hurtJuno(10, j.x - 1, j.z); w.rolling = true; w.safe = w.safe && j.iframes > 0; } }; });
  const rb = await page.locator('#roll-btn').boundingBox();
  const rx0 = await page.evaluate(() => window.__run.juno.x);
  await t('touchStart', [{ x: 120, y: 420, id: 2 }]);
  await t('touchMove', [{ x: 170, y: 420, id: 2 }]);
  await t('touchStart', [{ x: 170, y: 420, id: 2 }, { x: rb.x + rb.width / 2, y: rb.y + rb.height / 2, id: 3 }]);
  await t('touchEnd', [{ x: 170, y: 420, id: 2 }]);
  await simWait(page, 0.08);
  const mid = await page.evaluate(() => window.__rollWatch);
  await t('touchEnd', []);
  await simWait(page, 0.4);
  const roll1 = await page.evaluate(() => ({ x: window.__run.juno.x, rolls: window.__run.juno.rolls, cd: window.__run.juno.rollCd }));
  // a second tap during the cooldown does nothing (a long cooldown, so slow frames can't run it out mid-tap)
  await page.evaluate(() => { window.__run.juno.rollCd = 5; });
  await page.tap('#roll-btn');
  await simWait(page, 0.05);
  const roll2 = await page.evaluate(() => window.__run.juno.rolls);
  await page.screenshot({ path: OUT + 'survivor-roll-cooldown.png' });
  const rolled = { moved: +(roll1.x - rx0).toFixed(2), rollingMidway: mid.rolling, safeMidway: mid.safe, hurtWhileRolling: mid.hurt, rolls: roll1.rolls, blockedOnCooldown: roll2 === roll1.rolls && roll1.cd > 0 };
  // fighting: tap PUNCH and KICK; then keyboard strings J J K and K K J make their combos
  const combos = [];
  await page.evaluate(() => window.__run.on((ev) => { if (ev.type === 'swing') (window.__swings ||= []).push(ev); }));
  const put = () => page.evaluate(() => { const r = window.__run, j = r.juno; r.enemies = []; j.yaw = Math.PI; j.keys = ''; j.comboT = 0;
    for (let i = 0; i < 3; i++) r.addEnemy('grunt', 50); r.enemies.forEach((e, i) => { e.x = j.x + (i - 1) * 0.5; e.z = j.z - 1.1; e.px = e.x; e.pz = e.z; e.speed = 0; }); window.__swings = []; });
  await put();
  await page.tap('#punch-btn'); await simWait(page, 0.35);
  await page.tap('#kick-btn'); await simWait(page, 0.5);
  const tapped = await page.evaluate(() => window.__swings.map((s) => s.move + ':' + s.hits));
  for (const str of ['JJK', 'KKJ']) {
    await simWait(page, 0.8); await put();
    for (const k of str) { await page.keyboard.press('Key' + k); await simWait(page, 0.2); }
    await simWait(page, 0.6);
    combos.push(await page.evaluate(() => window.__swings.filter((s) => s.combo).map((s) => s.combo + ':' + s.hits)));
  }
  await page.screenshot({ path: OUT + 'survivor-combo.png' });
  // a short fight against real spawns with the bot's hands, to see KOs happen
  await page.evaluate(() => { window.__run.enemies = []; window.__run.juno.xp = window.__run.juno.xpNeed - 0.01; });
  for (let i = 0; i < 30; i++) { await page.keyboard.press(i % 3 === 2 ? 'KeyK' : 'KeyJ'); await simWait(page, 0.2); }
  const fought = await page.evaluate(() => ({ kills: window.__run.kills, phase: window.__run.phase }));
  // force a level-up and tap the first card
  await page.evaluate(() => { const r = window.__run; if (r.phase === 'play') { r.pendingLevels++; r.offerLevelUp(); } });
  await page.waitForSelector('.card');
  await page.screenshot({ path: OUT + 'survivor-levelup.png' });
  const key = await page.getAttribute('.card', 'data-key');
  await page.tap('.card', { force: true });
  await page.waitForTimeout(200);
  const afterFirst = await page.evaluate((k) => window.__run.lv(k), key);
  // more level-ups may be waiting: keep picking until the run carries on
  for (let i = 0; i < 6 && await page.evaluate(() => window.__run.phase === 'levelup'); i++) { await page.tap('.card', { force: true }); await page.waitForTimeout(200); }
  await page.evaluate(() => { window.__run.juno.xpNeed = 1e9; }); // no more level-ups popping up during the rest of this check
  const after = await page.evaluate(() => ({ phase: window.__run.phase }));
  after.lvl = afterFirst;
  // pause and resume
  await page.tap('#pause-btn');
  const t0 = await page.evaluate(() => window.__run.time);
  await page.waitForTimeout(600);
  const t1 = await page.evaluate(() => window.__run.time);
  await page.tap('#resume-btn', { force: true });
  await simWait(page, 2);
  await page.screenshot({ path: OUT + 'survivor-playing.png' });
  // give up → results → coins banked → buy an upgrade → it is kept after a reload
  await page.tap('#pause-btn'); await page.tap('#quit-btn');
  await page.waitForSelector('#results:not([hidden])');
  await page.screenshot({ path: OUT + 'survivor-results.png' });
  const banked = await page.evaluate(() => window.__ui.save.bank);
  await page.evaluate(() => { window.__ui.save.bank += 100; });
  await page.tap('#end-shop-btn');
  await page.tap('#buy-might');
  const might = await page.evaluate(() => window.__ui.save.shop.might);
  await page.screenshot({ path: OUT + 'survivor-shop.png' });
  await page.reload();
  await page.waitForFunction(() => window.__ui);
  const kept = await page.evaluate(() => window.__ui.save.shop.might);
  results.player = { titleShown, playing, ranNorth: +(z0 - z1).toFixed(2), rolled, tapped, combos, fought, pickedCard: key, after, pausedFor: +(t1 - t0).toFixed(3), banked, mightBought: might, mightKept: kept, errors: errs() };
  if (!titleShown || !playing) fail('PLAY did not start a run');
  if (!(z0 - z1 > 1.5)) fail('dragging up did not move Juno north');
  if (!(rolled.rolls === 1 && rolled.moved > 2)) fail(`ROLL did not roll Juno the way the stick points: ${JSON.stringify(rolled)}`);
  if (!rolled.rollingMidway || !rolled.safeMidway || rolled.hurtWhileRolling) fail(`Juno could be hurt mid-roll: ${JSON.stringify(rolled)}`);
  if (!rolled.blockedOnCooldown) fail('a second roll went through during the cooldown');
  if (!(tapped.length === 2 && tapped[0] === 'punch:3' && tapped[1].startsWith('kick:') && tapped[1] !== 'kick:0')) fail(`PUNCH / KICK buttons: ${JSON.stringify(tapped)}`);
  if (!(combos[0][0] || '').startsWith('ROUNDHOUSE:') || combos[0][0] === 'ROUNDHOUSE:0') fail(`J J K did not make a ROUNDHOUSE that hits: ${JSON.stringify(combos)}`);
  if (!(combos[1][0] || '').startsWith('UPPERCUT:') || combos[1][0] === 'UPPERCUT:0') fail(`K K J did not make an UPPERCUT that hits: ${JSON.stringify(combos)}`);
  if (!(fought.kills > 0)) fail('pressing J / K did not knock out any Crow');
  if (after.phase !== 'play' || after.lvl < 1) fail(`tapping a level-up card: ${JSON.stringify(after)}`);
  if (Math.abs(t1 - t0) > 0.001) fail('pause did not stop the run');
  if (might !== 1 || kept !== 1) fail('shop purchase not kept');
  if (results.player.errors.length) fail(`errors: ${results.player.errors}`);
  await ctx.close();
}

// ---- 2. bot plays full runs: survives, levels, never stuck, never inside a wall, draw calls stay low ----
async function botRun() {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errs = watch(page);
  await page.goto(BASE + '?bot=1&speed=6');
  await page.waitForFunction(() => window.__botReport, null, { timeout: 15000 });
  let maxCalls = 0;
  const shot = { done: false };
  while (true) {
    const s = await page.evaluate(() => ({ done: window.__botReport.done, calls: window.__view.renderer.info.render.calls, t: window.__run.time }));
    maxCalls = Math.max(maxCalls, s.calls);
    if (!shot.done && s.t > 100) { await page.screenshot({ path: OUT + 'survivor-busy.png' }); shot.done = true; }
    if (s.done) break;
    await page.waitForTimeout(400);
  }
  const r = await page.evaluate(() => window.__botReport);
  await ctx.close();
  return { ...r, maxDrawCalls: maxCalls, errors: errs() };
}
results.bot = [];
for (let i = 0; i < 2; i++) results.bot.push(await botRun());
for (const r of results.bot) {
  if (r.maxPenetration > 0.02) fail(`something went ${r.maxPenetration} m into a wall or prop`);
  if (r.stuckSeconds > 3) fail(`bot stuck ${r.stuckSeconds} s`);
  // the low 3D camera shows more of the roof and city than the old top-down one, so the budget is 180, not 160
  if (r.maxDrawCalls > 180) fail(`${r.maxDrawCalls} draw calls`);
  if (r.errors.length) fail(`bot run errors: ${r.errors}`);
}
const best = Math.max(...results.bot.map((r) => r.time));
if (best < 90) fail(`bot never reached the first boss (best ${best} s)`);
if (!results.bot.some((r) => r.level >= 8)) fail('bot never reached level 8');
if (!results.bot.some((r) => r.rolls > 0)) fail('the bot never rolled');
for (const r of results.bot) if (Object.keys(r.combos).length < 4) fail(`bot landed only these combos: ${JSON.stringify(r.combos)}`);

await browser.close();
await server.httpServer.close();
console.log(JSON.stringify(results, null, 2));
console.log(failed ? '\nSOME CHECKS FAILED' : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
