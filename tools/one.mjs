import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
p.on('pageerror', e => console.log('PAGE ERROR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('console', m.text().slice(0, 200)); });
await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1500);
await p.evaluate(() => { const h = document.getElementById('hud'); if (h) h.style.display = 'none'; });
await p.screenshot({ path: out }); await b.close(); console.log('ok');
