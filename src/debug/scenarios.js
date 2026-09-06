import { placeBuilding, applyTool } from '../game/place.js';
import { recomputeLey, tick } from '../game/sim.js';
import { idx } from '../game/state.js';
import { CHARTERS } from '../game/defs.js';

// Reproducible inspection situations. Each builds a settlement by the same rules the player uses.
const road = (s, x, y) => applyTool(s, 'road', x, y, { free: true });
const chan = (s, x, y) => applyTool(s, 'channel', x, y, { free: true });
const put = (s, t, x, y) => { const r = placeBuilding(s, t, x, y, { free: true, quiet: true }); if (!r.ok) console.warn('scenario: could not place', t, x, y, r.reason); return r; };
const hline = (s, x0, x1, y, f = road) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) f(s, x, y); };
const vline = (s, x, y0, y1, f = road) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) f(s, x, y); };
const grant = (s, upto) => { for (const c of CHARTERS) { s.charters[c.key] = true; if (c.key === upto) break; } };
const populate = (s, days) => { const was = s.paused; s.paused = false; s.res.bread = 400; for (let i = 0; i < days * 75 * 2; i++) tick(s, 0.5); s.charterFlash = null; s.paused = was; };

export const SCENARIOS = {
  // A few days in: one street, a handful of buildings, the first apprentices.
  early(s) {
    s.res = { timber: 22, stone: 11, bread: 40, ink: 0 };
    hline(s, 4, 12, 24);
    vline(s, 12, 20, 24);
    put(s, 'lodging', 6, 23); put(s, 'lodging', 8, 25);
    put(s, 'garden', 10, 25); put(s, 'garden', 11, 25);
    put(s, 'woodcutter', 13, 22);
    put(s, 'well', 10, 23);
    s.day = 3; s.time = 0.5;
    recomputeLey(s);
    populate(s, 2);
    s.time = 0.5;
  },

  // A lit, channelled town with the Chancery, towers, a still-house and a bloom problem.
  mature(s) {
    grant(s, 'masters');
    s.res = { timber: 120, stone: 140, bread: 200, ink: 90 };
    // main street from the old road to the spring loop
    hline(s, 4, 17, 24); vline(s, 17, 19, 24);
    hline(s, 10, 17, 24, chan); vline(s, 17, 19, 24, chan);
    // the loop around the spring, with a spur touching the spring
    hline(s, 15, 21, 15); hline(s, 15, 21, 19); vline(s, 15, 15, 19); vline(s, 21, 15, 19); road(s, 18, 18);
    hline(s, 15, 21, 15, chan); hline(s, 15, 21, 19, chan); vline(s, 15, 15, 19, chan); vline(s, 21, 15, 19, chan); chan(s, 18, 18);
    // chancery street north of the loop
    hline(s, 15, 21, 13); vline(s, 15, 13, 15); vline(s, 21, 13, 15);
    hline(s, 15, 21, 13, chan); vline(s, 15, 13, 15, chan); vline(s, 21, 13, 15, chan);
    // east: a street to the quarry and a channel that dead-ends (the problem)
    hline(s, 21, 24, 15); vline(s, 24, 12, 22); hline(s, 21, 27, 22); vline(s, 21, 19, 22); hline(s, 22, 26, 12);
    hline(s, 21, 24, 15, chan); vline(s, 24, 15, 22, chan); hline(s, 21, 27, 22, chan); vline(s, 21, 19, 22, chan);
    // west: a second loop off the main street, capped by a cistern
    hline(s, 10, 14, 20); vline(s, 10, 20, 24); hline(s, 10, 14, 20, chan); vline(s, 10, 20, 24, chan);
    hline(s, 12, 15, 17); hline(s, 12, 15, 17, chan);
    // south lane to the allotments
    vline(s, 12, 24, 28); hline(s, 8, 13, 28);
    // homes
    put(s, 'lodging', 6, 23); put(s, 'lodging', 8, 23); put(s, 'lodging', 11, 25); put(s, 'lodging', 13, 25); put(s, 'lodging', 5, 25); put(s, 'lodging', 15, 25);
    put(s, 'jhouse', 16, 21); put(s, 'jhouse', 18, 21); put(s, 'jhouse', 12, 19); put(s, 'jhouse', 22, 17); put(s, 'jhouse', 11, 21);
    put(s, 'garden', 9, 25); put(s, 'garden', 7, 25); put(s, 'garden', 9, 29); put(s, 'garden', 10, 29); put(s, 'garden', 11, 29);
    put(s, 'well', 9, 21);
    put(s, 'woodcutter', 13, 29);
    put(s, 'scriptorium', 16, 16);
    put(s, 'bakery', 9, 23);
    put(s, 'chancery', 17, 11);
    put(s, 'tavern', 14, 23);
    put(s, 'alembic', 22, 20);
    put(s, 'cistern', 25, 21); put(s, 'cistern', 14, 21); put(s, 'cistern', 11, 17);
    put(s, 'leywell', 13, 21);
    put(s, 'tower', 15, 12); put(s, 'tower', 20, 12); put(s, 'tower', 22, 14);
    put(s, 'observatory', 12, 15);
    put(s, 'wardstone', 24, 23);
    // stonecutter: first grass tile touching rock beside the quarry street
    outer: for (let y = 10; y <= 14; y++) for (let x = 22; x <= 27; x++) { if (placeBuilding(s, 'stonecutter', x, y, { free: true, quiet: true }).ok) break outer; }
    for (const [x, y] of [[16, 19], [15, 17], [20, 15], [17, 22], [12, 24], [10, 21], [24, 18], [21, 21], [17, 13], [13, 17]]) put(s, 'lamp', x, y);
    applyTool(s, 'inkwood', 19, 17, { free: true }); applyTool(s, 'inkwood', 20, 17, { free: true }); applyTool(s, 'inkwood', 16, 25, { free: true }); applyTool(s, 'inkwood', 8, 21, { free: true });
    // a bloom problem near the eastern dead end
    for (const [x, y, l] of [[26, 23, 2], [27, 23, 1], [25, 23, 3], [26, 21, 1], [27, 21, 2]]) { const t = s.tiles[idx(x, y)]; if (!t.road && !t.building) { t.bloom = l; t.tree = 0; } }
    s.day = 14; s.time = 0.5;
    recomputeLey(s);
    populate(s, 3);
    s.res.ink = 60; s.res.bread = 120;
    s.time = 0.5;
  },
};
