// Screenshot harness: opens the real game in headless Chromium and captures the inspection
// situations from CREATIVE_CONSTITUTION.md at gameplay scale.
//   node tools/shoot.mjs               -> all standard shots into shots/
//   node tools/shoot.mjs early-noon    -> one shot
//   node tools/shoot.mjs --custom '{"scenario":"mature","time":0.5,"cam":{"x":0,"z":0,"dist":30}}' out.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.HW_URL || 'http://localhost:5177';
const OUT = process.env.HW_OUT || 'shots';
mkdirSync(OUT, { recursive: true });

// tile -> world helper mirrors scene.js: (t - 18 + 0.5) * 4
const T = (tx, ty) => ({ x: (tx - 18 + 0.5) * 4, z: (ty - 18 + 0.5) * 4 });

export const SHOTS = {
  'early-noon':      { scenario: 'early', time: 0.5, cam: { ...T(9, 24), yaw: 0.5, pitch: 0.8, dist: 40 } },
  'early-dusk':      { scenario: 'early', time: 0.765, cam: { ...T(9, 24), yaw: 0.5, pitch: 0.8, dist: 40 } },
  'mature-noon':     { scenario: 'mature', time: 0.5, cam: { ...T(17, 20), yaw: 0.6, pitch: 0.8, dist: 62 } },
  'mature-night':    { scenario: 'mature', time: 0.9, cam: { ...T(17, 20), yaw: 0.6, pitch: 0.8, dist: 62 } },
  'mature-dusk':     { scenario: 'mature', time: 0.765, cam: { ...T(17, 19), yaw: 2.2, pitch: 0.55, dist: 48 } },
  'mature-street':   { scenario: 'mature', time: 0.5, cam: { ...T(9, 24), yaw: 0.9, pitch: 0.5, dist: 26 } },
  'mature-loop':     { scenario: 'mature', time: 0.5, cam: { ...T(18, 17), yaw: -0.4, pitch: 0.65, dist: 34 } },
  'close-lodging':   { scenario: 'early', time: 0.5, cam: { ...T(6, 23), yaw: 0.4, pitch: 0.42, dist: 26 } },
  'close-garden':    { scenario: 'early', time: 0.5, cam: { ...T(10.5, 25), yaw: -0.3, pitch: 0.5, dist: 20 } },
  'close-well':      { scenario: 'early', time: 0.5, cam: { ...T(10, 23), yaw: 0.6, pitch: 0.5, dist: 14 } },
  'close-woodcutter':{ scenario: 'early', time: 0.5, cam: { ...T(13, 22), yaw: 0.8, pitch: 0.45, dist: 22 } },
  'close-jhouse':    { scenario: 'mature', time: 0.5, cam: { ...T(17, 21), yaw: 0.3, pitch: 0.42, dist: 26 } },
  'close-chancery':  { scenario: 'mature', time: 0.5, cam: { ...T(18.5, 13), yaw: 0.5, pitch: 0.5, dist: 30 } },
  'close-lamp':      { scenario: 'mature', time: 0.9, cam: { ...T(12, 24), yaw: 0.0, pitch: 0.62, dist: 17 } },
  'close-bloom':     { scenario: 'mature', time: 0.5, cam: { ...T(26, 22.5), yaw: 0.5, pitch: 0.45, dist: 20 } },
  'close-alembic':   { scenario: 'mature', time: 0.5, cam: { ...T(22, 20), yaw: -0.6, pitch: 0.42, dist: 24 } },
  'close-tower':     { scenario: 'mature', time: 0.5, cam: { ...T(15, 12), yaw: 0.6, pitch: 0.36, dist: 40 } },
  'close-people':    { scenario: 'mature', time: 0.42, cam: { ...T(10, 24), yaw: Math.PI, pitch: 0.36, dist: 14 } },
  'close-bakery':    { scenario: 'mature', time: 0.5, cam: { ...T(9, 23), yaw: 0.3, pitch: 0.42, dist: 20 } },
  'close-tavern':    { scenario: 'mature', time: 0.5, cam: { ...T(14, 23.5), yaw: 0.2, pitch: 0.78, dist: 22 } },
  'close-stonecutter':{ scenario: 'mature', time: 0.5, cam: { ...T(24, 11), yaw: 0.6, pitch: 0.45, dist: 22 } },
  'close-observatory':{ scenario: 'mature', time: 0.5, cam: { ...T(12.5, 15.5), yaw: 0.5, pitch: 0.42, dist: 30 } },
  'close-scriptorium':{ scenario: 'mature', time: 0.5, cam: { ...T(16.5, 16), yaw: -0.3, pitch: 0.42, dist: 26 } },
  'close-leywell':   { scenario: 'mature', time: 0.5, cam: { ...T(13.5, 21), yaw: 0.6, pitch: 0.45, dist: 18 } },
  'close-spring':    { scenario: 'mature', time: 0.5, cam: { ...T(18, 17), yaw: 0.4, pitch: 0.5, dist: 22 } },
  'title':           { scenario: '', time: 0.5, cam: { ...T(9, 24), yaw: 0.5, pitch: 0.8, dist: 40 }, ui: true },
};

async function shoot(page, name, spec, outPath) {
  const q = new URLSearchParams({ paused: '1', nointro: '1' });
  if (spec.scenario) q.set('scenario', spec.scenario);
  q.set('time', String(spec.time));
  await page.goto(`${BASE}/?${q}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hw && window.__hw.view, null, { timeout: 30000 });
  await page.evaluate((spec) => {
    const g = window.__hw;
    g.state.paused = true;
    g.setCamera(spec.cam);
    g.setTime(spec.time);
    g.hideUI(!spec.ui);
    if (spec.ui) { g.ui.el.intro.classList.add('hidden'); }
  }, spec);
  await page.waitForTimeout(700);
  if (process.env.HW_DEBUG) {
    const info = await page.evaluate(() => { const s = window.__hw.state; return { pooling: s.pooling, pressure: s.pressure, demand: s.demand, pop: s.pop, problems: s.problems.map(p => p.text), buildings: [...s.buildings.values()].map(b => `${b.type}@${b.x},${b.y} sup=${b.supplied} w=${b.workers.length} r=${b.residents.length}`) }; });
    console.log(JSON.stringify(info, null, 1));
  }
  await page.screenshot({ path: outPath });
  console.log('shot', outPath);
}

const args = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: +(process.env.HW_DSF || 1.5) });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 300)); });
try {
  if (args[0] === '--custom') {
    const spec = JSON.parse(args[1]);
    await shoot(page, 'custom', spec, args[2] || `${OUT}/custom.png`);
  } else {
    const names = args.length ? args : Object.keys(SHOTS);
    for (const n of names) { if (!SHOTS[n]) { console.log('unknown shot', n); continue; } await shoot(page, n, SHOTS[n], `${OUT}/${n}.png`); }
  }
} finally { await browser.close(); }
