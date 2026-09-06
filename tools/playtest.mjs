// Scripted playtest: drives the real game through a plausible build order using only the
// player's own actions (placeBuilding / applyTool with costs), advancing simulated time,
// and reports the pace of progression plus any trouble. Screenshots the UI at each charter.
//   node tools/playtest.mjs            (writes shots/play/*.png and prints a day-by-day ledger)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.HW_URL || 'http://localhost:5177';
mkdirSync('shots/play', { recursive: true });

// The build order. Each step: [label, fn(api)] where api runs in the page. Steps wait until affordable.
const PLAN = [
  ['main street', `for (let x = 4; x <= 12; x++) T('road', x, 24);`],
  ['first lodging', `B('lodging', 6, 23)`],
  ['allotment', `B('garden', 8, 25)`],
  ['woodcutter by the grove', `B('woodcutter', 11, 25)`],
  ['second lodging', `B('lodging', 8, 23)`],
  ['lane to the rock and a stonecutter', `
    const s = window.__hw.state; const W = 36;
    const rockNear = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = s.tiles[(y + dy) * W + x + dx]; if (t && t.terrain === 'rock') return true; } return false; };
    const cands = [];
    for (let y = 25; y <= 31; y++) for (let x = 3; x <= 12; x++) { const t = s.tiles[y * W + x]; if (t.terrain === 'grass' && !t.building && !t.road && rockNear(x, y)) cands.push([x, y]); }
    cands.sort((a, b) => (a[1] - 24) + Math.abs(a[0] - 8) * 0.3 - ((b[1] - 24) + Math.abs(b[0] - 8) * 0.3));
    for (const [x, y] of cands) {
      let ok = true;
      for (let yy = 25; yy < y; yy++) { const t = s.tiles[yy * W + x]; if (t.terrain !== 'grass' || t.building) { ok = false; break; } }
      if (!ok) continue;
      for (let yy = 25; yy < y; yy++) T('road', x, yy);
      if (B('stonecutter', x, y)) return;
    }
    B('stonecutter', -1, -1);`],
  ['well', `B('well', 10, 23)`],
  ['third lodging', `B('lodging', 5, 25)`],
  ['second allotment', `B('garden', 10, 25)`],
  ['street to the spring', `for (let x = 12; x <= 18; x++) T('road', x, 19); T('road', 18, 18); for (let y = 19; y <= 24; y++) { T('road', 12, y); T('road', 16, y); } for (let x = 13; x <= 16; x++) T('road', x, 24);`],
  ['channel loop', `WAIT('channels'); T('channel', 18, 18); for (let x = 12; x <= 18; x++) T('channel', x, 19); for (let y = 20; y <= 24; y++) { T('channel', 12, y); T('channel', 16, y); } for (let x = 13; x <= 15; x++) T('channel', x, 24);`],
  ['scriptorium', `B('scriptorium', 13, 20)`],
  ['lamps', `B('lamp', 13, 24); B('lamp', 12, 21); B('lamp', 16, 21)`],
  ['fourth lodging', `B('lodging', 14, 25)`],
  ['bakery', `WAIT('quills'); B('bakery', 14, 23)`],
  ['journeyman houses', `B('jhouse', 11, 20); B('jhouse', 17, 21)`],
  ['allotments by the bakery', `B('garden', 13, 25); B('garden', 15, 25)`],
  ['fifth lodging', `FIT('lodging', 4, 25, 11, 25)`],
  ['second stonecutter', `
    const s = window.__hw.state; const W = 36;
    const rockNear = (x, y) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = s.tiles[(y + dy) * W + x + dx]; if (t && t.terrain === 'rock') return true; } return false; };
    const roadNear = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => { const t = s.tiles[(y + dy) * W + x + dx]; return t && t.road; });
    for (let y = 25; y <= 31; y++) for (let x = 3; x <= 12; x++) { const t = s.tiles[y * W + x]; if (t.terrain === 'grass' && !t.building && !t.road && rockNear(x, y) && roadNear(x, y)) { if (B('stonecutter', x, y)) return; } }`],
  ['chancery', `WAIT('chancery'); B('chancery', 13, 17)`],
  ['still-house', `WAIT('wards'); B('alembic', 15, 20)`],
  ['tavern', `B('tavern', 11, 22)`],
  ['third journeyman house', `B('jhouse', 17, 23)`],
  ['cistern', `B('cistern', 11, 21)`],
  ['inkwoods', `T('inkwood', 9, 22); T('inkwood', 15, 26)`],
  ['more lodgings', `FIT('lodging', 4, 22, 11, 23)`],
  ['more lodgings 2', `FIT('lodging', 4, 25, 15, 26)`],
  ['second well', `FIT('well', 4, 25, 11, 26)`],
  ['more allotments', `FIT('garden', 4, 25, 11, 26); FIT('garden', 4, 25, 11, 26); FIT('garden', 4, 22, 11, 23)`],
  ['second bakery', `FIT('bakery', 4, 22, 11, 26)`],
  ['tower 1', `WAIT('masters'); B('tower', 13, 22)`],
  ['tower 2', `B('tower', 15, 22)`],
  ['ley well', `B('leywell', 17, 20)`],
  ['tower 3', `FIT('tower', 13, 21, 17, 23)`],
];

const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
await page.goto(`${BASE}/?nointro=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__hw && window.__hw.view, null, { timeout: 30000 });

// install helpers in the page
await page.evaluate(() => {
  const g = window.__hw;
  g.state.paused = true;
  window.__pt = {
    B: (t, x, y) => { const r = g.doPlace(t, x, y); return r.ok; },
    T: (t, x, y) => { const r = g.doTool(t, x, y); return r.ok; },
    // place the first valid spot in a region; returns the refusal reason of the last try if none fit
    FIT: (t, x0, y0, x1, y1) => { let last = null; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const r = g.doPlace(t, x, y); if (r.ok) return null; last = r.reason; if (/afford/.test(r.reason)) return r.reason; } return last; },
  };
});

let stepIdx = 0;
let lastDay = 0;
const seenCharters = new Set(['founding']);
const start = Date.now();
for (let hour = 0; hour < 24 * 30; hour++) {
  // try to execute the next step(s)
  for (let guard = 0; guard < 4 && stepIdx < PLAN.length; guard++) {
    const [label, code] = PLAN[stepIdx];
    const res = await page.evaluate(({ code }) => {
      const g = window.__hw; const s = g.state;
      const B = window.__pt.B, T = window.__pt.T;
      let waiting = null;
      const WAIT = (c) => { if (!s.charters[c]) { waiting = c; throw new Error('wait'); } };
      // affordability check: try, and report whether anything was refused for money
      const before = JSON.stringify(s.res);
      let refused = null;
      const origB = B, origT = T;
      const B2 = (t, x, y) => { const r = g.doPlace(t, x, y); if (!r.ok && !(refused && /afford/.test(refused))) refused = `${t}@${x},${y}: ${r.reason}`; return r.ok; };
      const FIT = (t, x0, y0, x1, y1) => { const rr = window.__pt.FIT(t, x0, y0, x1, y1); if (rr && !(refused && /afford/.test(refused))) refused = `${t} in ${x0},${y0}-${x1},${y1}: ${rr}`; return !rr; };
      const T2 = (t, x, y) => { const r = g.doTool(t, x, y); if (!r.ok && !/already|a tree stands/.test(r.reason)) refused = `${t}@${x},${y}: ${r.reason}`; return r.ok; };
      try { new Function('B', 'T', 'WAIT', 'FIT', code)(B2, T2, WAIT, FIT); } catch (e) { if (e.message !== 'wait') return { error: e.message }; }
      return { waiting, refused };
    }, { code });
    if (res.error) { console.log('STEP ERROR', label, res.error); stepIdx++; continue; }
    if (res.waiting) break;
    if (res.refused && /afford/.test(res.refused)) break; // wait for resources
    if (res.refused) console.log(`  ! ${label}: ${res.refused}`);
    console.log(`  + day ${lastDay}: ${label}`);
    stepIdx++;
  }
  // advance one in-game hour (day = 75 s -> hour = 3.125 s)
  const st = await page.evaluate(() => { const g = window.__hw; g.advance(3.125); const s = g.state; return { day: s.day, time: s.time, pop: s.pop, ranks: s.ranks, res: Object.fromEntries(Object.entries(s.res).map(([k, v]) => [k, Math.round(v)])), totalInk: Math.round(s.totalInk), charters: Object.keys(s.charters), problems: s.problems.map(p => p.text), pressure: s.pressure, demand: s.demand, won: s.won, log: s.log.slice(-3).map(l => l.text) }; });
  for (const c of st.charters) if (!seenCharters.has(c)) {
    seenCharters.add(c);
    console.log(`=== DAY ${st.day} (${(st.day - 1 + st.time).toFixed(1)} days = ${((st.day - 1 + st.time) * 75 / 60).toFixed(1)} min at 1x): CHARTER ${c}`);
    await page.evaluate(() => { const g = window.__hw; g.ui.update(); g.view.render(0.016); });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `shots/play/charter-${c}.png` });
  }
  if (st.day !== lastDay) {
    lastDay = st.day;
    console.log(`day ${st.day}: pop ${st.pop} (${st.ranks.apprentice}a ${st.ranks.journeyman}j ${st.ranks.master}m) res ${JSON.stringify(st.res)} totalInk ${st.totalInk} ley ${st.demand}/${st.pressure}` + (st.problems.length ? `\n     troubles: ${st.problems.join(' | ')}` : ''));
    if (st.day % 4 === 0) { await page.evaluate(() => { window.__hw.ui.update(); window.__hw.view.render(0.016); }); await page.screenshot({ path: `shots/play/day-${String(st.day).padStart(2, '0')}.png` }); }
  }
  if (st.won) { console.log('CITY CHARTER reached on day', st.day); break; }
  if (st.day > 28) { console.log('gave up after day 28; steps done:', stepIdx, '/', PLAN.length); break; }
}
console.log('real seconds', ((Date.now() - start) / 1000).toFixed(0));
await browser.close();
