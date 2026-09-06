// Screenshots every style in the lab: node tools/shootlab.mjs [style...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.env.HW_URL || 'http://localhost:5177';
mkdirSync('shots/lab', { recursive: true });
const styles = process.argv.slice(2).length ? process.argv.slice(2) : ['crooked', 'paper', 'gouache', 'glass', 'clay', 'etching'];
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
page.on('pageerror', e => console.log('PAGE ERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
for (const s of styles) {
  await page.goto(`${BASE}/lab.html?style=${s}`, { waitUntil: 'load' });
  try { await page.waitForFunction(() => window.__lab, null, { timeout: 20000 }); } catch (e) { console.log('no __lab for', s); }
  await page.waitForTimeout(900);
  await page.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none'; });
  await page.screenshot({ path: `shots/lab/${s}.png` });
  console.log('shot', s);
}
await browser.close();
