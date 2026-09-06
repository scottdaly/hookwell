import { BUILDINGS, TOOLS } from './defs.js';
import { idx, inBounds, tileAt, footprint, ring4, neighbors8, log, buildingCells, buildingCenter } from './state.js';

export function canAfford(s, cost) {
  for (const k in cost) if ((s.res[k] || 0) < cost[k]) return false;
  return true;
}
export function pay(s, cost, mult = 1) {
  for (const k in cost) s.res[k] -= cost[k] * mult;
}
export function costText(cost) {
  return Object.entries(cost).map(([k, v]) => `${v} ${k}`).join(', ') || 'free';
}

// Validates placing a building of `type` with its top-left at x,y.
// Returns { ok, reason }.
export function checkBuilding(s, type, x, y) {
  const def = BUILDINGS[type];
  if (!def) return { ok: false, reason: 'unknown' };
  if (!s.charters[def.charter]) return { ok: false, reason: 'not chartered' };
  if (def.unique && s.built[type] > 0) return { ok: false, reason: 'only one may stand' };
  const cells = footprint(def, x, y);
  for (const [cx, cy] of cells) {
    const t = tileAt(s, cx, cy);
    if (!t) return { ok: false, reason: 'off the map' };
    if (t.building) return { ok: false, reason: 'occupied' };
    if (t.bloom) return { ok: false, reason: 'bloom must be scoured' };
    if (def.onChannel) {
      if (!t.road || !t.channel) return { ok: false, reason: 'needs a ley channel' };
    } else {
      if (t.terrain !== 'grass') return { ok: false, reason: t.terrain === 'rock' ? 'rock' : 'the spring' };
      if (t.road) return { ok: false, reason: 'on a street' };
    }
  }
  if (!def.onChannel) {
    const touchesRoad = ring4(cells).some(([nx, ny]) => s.tiles[idx(nx, ny)].road);
    if (!touchesRoad) return { ok: false, reason: 'must touch a street' };
  }
  if (def.needsRock) {
    const rock = cells.some(([cx, cy]) => neighbors8(cx, cy).some(([nx, ny]) => tileAt(s, nx, ny)?.terrain === 'rock'));
    if (!rock) return { ok: false, reason: 'must touch rock' };
  }
  if (def.nearChancery) {
    let ok = false;
    for (const b of s.buildings.values()) if (b.type === 'chancery') {
      const c = buildingCenter(b);
      if (Math.hypot(c.x - x, c.y - y) <= def.nearChancery) ok = true;
    }
    if (!ok) return { ok: false, reason: `within ${def.nearChancery} tiles of the Chancery` };
  }
  if (!canAfford(s, def.cost)) return { ok: false, reason: 'cannot afford: ' + costText(def.cost) };
  return { ok: true };
}

export function placeBuilding(s, type, x, y, opts = {}) {
  const r = checkBuilding(s, type, x, y);
  if (!r.ok) return r;
  const def = BUILDINGS[type];
  if (!opts.free) pay(s, def.cost);
  const id = s.nextId++;
  const b = { id, type, x, y, supplied: false, warped: false, workers: [], residents: [], seed: s.rnd(),
    builtDay: s.day, output: 0, active: false, dist: 99 };
  s.buildings.set(id, b);
  for (const [cx, cy] of footprint(def, x, y)) {
    const t = s.tiles[idx(cx, cy)];
    t.building = id;
    if (!def.onChannel) { t.tree = 0; }
  }
  s.built[type]++;
  s.version++; s.leyDirty = true;
  if (!opts.quiet) log(s, `${def.name} raised.`, 'build');
  return { ok: true, id };
}

export function removeBuilding(s, id, refund = true) {
  const b = s.buildings.get(id);
  if (!b) return;
  const def = BUILDINGS[b.type];
  for (const [cx, cy] of buildingCells(s, b)) s.tiles[idx(cx, cy)].building = null;
  for (const p of s.people) {
    if (p.home === id) p.home = null;
    if (p.work === id) p.work = null;
  }
  s.buildings.delete(id);
  s.built[b.type]--;
  if (refund) pay(s, def.cost, -0.5);
  s.version++; s.leyDirty = true;
}

export function checkTool(s, tool, x, y) {
  const def = TOOLS[tool];
  const t = tileAt(s, x, y);
  if (!t) return { ok: false, reason: 'off the map' };
  if (!s.charters[def.charter]) return { ok: false, reason: 'not chartered' };
  switch (tool) {
    case 'road':
      if (t.road) return { ok: false, reason: 'already a street' };
      if (t.building) return { ok: false, reason: 'occupied' };
      if (t.terrain !== 'grass') return { ok: false, reason: t.terrain };
      if (t.bloom) return { ok: false, reason: 'bloom must be scoured' };
      break;
    case 'channel':
      if (!t.road) return { ok: false, reason: 'channels go in streets' };
      if (t.channel) return { ok: false, reason: 'already channelled' };
      break;
    case 'pine': case 'inkwood':
      if (t.road || t.building || t.terrain !== 'grass' || t.bloom) return { ok: false, reason: 'no room' };
      if (t.tree) return { ok: false, reason: 'a tree stands here' };
      break;
    case 'scour':
      if (!t.bloom) return { ok: false, reason: 'no bloom here' };
      return { ok: true };
    case 'demolish':
      if (!t.building && !t.road && !t.tree) return { ok: false, reason: 'nothing here' };
      return { ok: true };
  }
  if (!canAfford(s, def.cost)) return { ok: false, reason: 'cannot afford: ' + costText(def.cost) };
  return { ok: true };
}

export function applyTool(s, tool, x, y, opts = {}) {
  const r = checkTool(s, tool, x, y);
  if (!r.ok) return r;
  const def = TOOLS[tool];
  const t = s.tiles[idx(x, y)];
  switch (tool) {
    case 'road': t.road = true; t.tree = 0; break;
    case 'channel': t.channel = true; break;
    case 'pine': t.tree = 1; t.treeSeed = s.rnd(); break;
    case 'inkwood': t.tree = 2; t.treeSeed = s.rnd(); break;
    case 'scour': t.bloom = 0; t.bloomT = 0; break;
    case 'demolish':
      if (t.building) { removeBuilding(s, t.building); }
      else if (t.road) {
        if (t.channel) { t.channel = false; s.res.stone += 1; }
        else { t.road = false; }
      } else if (t.tree) { t.tree = 0; s.res.timber += 1; }
      break;
  }
  if (!opts.free) pay(s, def.cost);
  s.version++; s.leyDirty = true;
  return { ok: true };
}
