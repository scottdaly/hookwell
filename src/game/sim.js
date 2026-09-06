import { W, H, DAY_SECONDS, BUILDINGS, CHARTERS, LEY, RANKS } from './defs.js';
import { idx, inBounds, tileAt, neighbors4, neighbors8, ring4, log, buildingCells, buildingCenter } from './state.js';
import { placeBuilding, removeBuilding } from './place.js';

// ---------------------------------------------------------------- ley network
export function recomputeLey(s) {
  const tiles = s.tiles;
  for (const t of tiles) { t.ley = -1; t.light = 0; }
  // sources: spring tile and ley wells
  const sources = [];
  sources.push([s.spring.x, s.spring.y, LEY.springPressure]);
  for (const b of s.buildings.values()) if (BUILDINGS[b.type].source) sources.push([b.x, b.y, BUILDINGS[b.type].source]);
  let pressure = 0;
  // BFS over channel tiles starting from tiles adjacent to sources
  const q = [];
  for (const [sx, sy, p] of sources) {
    let touching = false;
    for (const [nx, ny] of neighbors4(sx, sy)) {
      const t = tileAt(s, nx, ny);
      if (t && t.road && t.channel) { touching = true; if (t.ley < 0) { t.ley = 1; q.push([nx, ny]); } }
    }
    if (touching) pressure += p;
  }
  while (q.length) {
    const [x, y] = q.shift();
    const d = tiles[idx(x, y)].ley;
    for (const [nx, ny] of neighbors4(x, y)) {
      const t = tileAt(s, nx, ny);
      if (t && t.road && t.channel && t.ley < 0) { t.ley = d + 1; q.push([nx, ny]); }
    }
  }
  // cisterns touching a live channel add pressure and cap dead ends
  const capped = new Set();
  const consumers = [];
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    const cells = buildingCells(s, b);
    let best = -1;
    const adj = def.onChannel ? cells : ring4(cells);
    for (const [nx, ny] of adj) {
      const t = tiles[idx(nx, ny)];
      if (t.channel && t.ley >= 0 && (best < 0 || t.ley < best)) best = t.ley;
    }
    b.dist = best;
    b.onLey = best >= 0;
    if (def.pressure && best >= 0) {
      pressure += def.pressure;
      for (const [nx, ny] of adj) capped.add(idx(nx, ny));
    }
    if (def.leyUse && best >= 0) consumers.push(b);
    b.supplied = false;
  }
  consumers.sort((a, b) => a.dist - b.dist);
  let demand = 0, left = pressure;
  for (const b of consumers) {
    const use = BUILDINGS[b.type].leyUse;
    demand += use;
    if (left >= use - 1e-6) { left -= use; b.supplied = true; }
  }
  s.pressure = pressure; s.demand = demand;
  // dead ends: live channel tile with <=1 channel neighbour (sources count as neighbours), not capped
  s.pooling = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = tiles[idx(x, y)];
    t.deadEnd = false;
    if (!t.channel || t.ley < 0) { t.pool = 0; continue; }
    let n = 0;
    for (const [nx, ny] of neighbors4(x, y)) {
      const u = tileAt(s, nx, ny);
      if (!u) continue;
      if (u.channel && u.ley >= 0) n++;
      else if (u.terrain === 'spring') n++;
      else if (u.building && BUILDINGS[s.buildings.get(u.building).type].source) n++;
    }
    if (n <= 1 && !capped.has(idx(x, y))) { t.deadEnd = true; s.pooling.push([x, y]); }
    else t.pool = 0;
  }
  // light map from supplied lamps
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (!def.light || !b.supplied) continue;
    const r = def.light;
    for (let y = b.y - 3; y <= b.y + 3; y++) for (let x = b.x - 3; x <= b.x + 3; x++) {
      const t = tileAt(s, x, y); if (!t) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d <= r) t.light = Math.max(t.light, 1 - d / (r + 0.5));
    }
  }
  s.leyDirty = false;
}

// ---------------------------------------------------------------- helpers
function countTreesAround(s, x, y, r) {
  let n = 0;
  for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
    const t = tileAt(s, xx, yy);
    if (t && t.tree === 1 && Math.hypot(xx - x, yy - y) <= r + 0.5) n++;
  }
  return n;
}
function buildingsWithin(s, b, type, r) {
  const c = buildingCenter(b);
  let n = 0;
  for (const o of s.buildings.values()) if (o.type === type) {
    const oc = buildingCenter(o);
    if (Math.hypot(oc.x - c.x, oc.y - c.y) <= r) n++;
  }
  return n;
}
export function touchesRoad(s, b) { return ring4(buildingCells(s, b)).some(([x, y]) => s.tiles[idx(x, y)].road); }

// door tile: first road tile adjacent to the footprint (stable order)
export function doorTile(s, b) {
  const def = BUILDINGS[b.type];
  if (def.onChannel) return [b.x, b.y];
  const cells = buildingCells(s, b);
  for (const [x, y] of ring4(cells)) if (s.tiles[idx(x, y)].road) return [x, y];
  return null;
}

// per-day production of a building given its current staffing/supply
export function production(s, b) {
  const def = BUILDINGS[b.type];
  const workers = b.workers.length;
  const out = {};
  const mult = b.warped ? 0.5 : 1;
  switch (b.type) {
    case 'garden': {
      if (!workers) break;
      if (b.onLey) { out.ink = 1.5 * mult; out.bread = 1 * mult; }
      else out.bread = 5 * mult;
      break;
    }
    case 'woodcutter': {
      const trees = Math.min(countTreesAround(s, b.x, b.y, 3), 10);
      out.timber = workers * trees * 0.9 * mult;
      break;
    }
    case 'stonecutter': out.stone = workers * 5 * mult; break;
    case 'scriptorium': out.ink = b.supplied ? workers * 2.5 * mult : 0; break;
    case 'bakery': {
      const g = buildingsWithin(s, b, 'garden', 4);
      out.bread = workers ? (2 + g * (b.supplied ? 3 : 1)) * mult : 0;
      break;
    }
    case 'alembic': out.ink = b.supplied ? workers * 6 * mult : 0; break;
    case 'chancery': out.ink = workers * 1.5 * mult; break;
    case 'observatory': out.ink = b.supplied ? workers * 8 * mult : 0; break;
  }
  return out;
}

// ---------------------------------------------------------------- people
function freeHome(s, rank) {
  let best = null, bestScore = -1;
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (!def.housing || def.housing.rank !== rank) continue;
    if (b.residents.length >= def.housing.n) continue;
    if (!touchesRoad(s, b)) continue;
    const score = 10 - b.residents.length + (b.supplied ? 3 : 0) + (b.warped ? -5 : 0);
    if (score > bestScore) { best = b; bestScore = score; }
  }
  return best;
}
function freeJob(s, rank, fromB) {
  let best = null, bestD = 1e9;
  const c = fromB ? buildingCenter(fromB) : { x: 0, y: 0 };
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (!def.jobs || def.jobs.rank !== rank) continue;
    if (b.workers.length >= def.jobs.n) continue;
    if (!touchesRoad(s, b)) continue;
    const bc = buildingCenter(b);
    const d = Math.hypot(bc.x - c.x, bc.y - c.y) + (b.warped ? 6 : 0);
    if (d < bestD) { best = b; bestD = d; }
  }
  return best;
}

export function arrivalCount(s, rank) {
  // how many of this rank could arrive today
  let housing = 0;
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (def.housing && def.housing.rank === rank && touchesRoad(s, b) && !b.warped) housing += def.housing.n - b.residents.length;
  }
  if (housing <= 0) return 0;
  if (s.res.bread < s.pop * 0.5 + 2) return 0;
  if (rank === 'journeyman') {
    // journeymen want a lit town
    const lamps = [...s.buildings.values()].filter(b => b.type === 'lamp' && b.supplied).length;
    if (lamps < 1) return 0;
  }
  if (rank === 'master' && s.built.chancery < 1) return 0;
  return Math.min(housing, rank === 'apprentice' ? 3 : 2);
}

function spawnPerson(s, rank, home) {
  const p = {
    id: s.nextPid++, rank, home: home.id, work: null, content: 60,
    x: s.entry.x, y: s.entry.y, path: null, target: null, mode: 'arrive', visible: true, speed: 0.9 + s.rnd() * 0.3,
    needs: { bread: true, light: false, company: false, work: false, ley: true }, seed: s.rnd(), face: 0, wait: 0,
  };
  home.residents.push(p.id);
  s.people.push(p);
  return p;
}

function removePerson(s, p, why) {
  const home = s.buildings.get(p.home);
  if (home) home.residents = home.residents.filter(i => i !== p.id);
  const work = s.buildings.get(p.work);
  if (work) work.workers = work.workers.filter(i => i !== p.id);
  s.people = s.people.filter(o => o !== p);
  log(s, `A ${p.rank} left Hookwell (${why}).`, 'bad');
}

// ---------------------------------------------------------------- pathfinding on roads
const pathCache = new Map();
let pathCacheVersion = -1;
export function findPath(s, from, to) {
  if (pathCacheVersion !== s.version) { pathCache.clear(); pathCacheVersion = s.version; }
  const key = from[0] + ',' + from[1] + '>' + to[0] + ',' + to[1];
  if (pathCache.has(key)) return pathCache.get(key);
  const start = idx(from[0], from[1]), goal = idx(to[0], to[1]);
  const prev = new Int32Array(W * H).fill(-1);
  const seen = new Uint8Array(W * H);
  const q = [start]; seen[start] = 1;
  let found = start === goal;
  while (q.length && !found) {
    const cur = q.shift();
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [nx, ny] of neighbors4(cx, cy)) {
      if (!inBounds(nx, ny)) continue;
      const i = idx(nx, ny);
      if (seen[i]) continue;
      if (!s.tiles[i].road) continue;
      seen[i] = 1; prev[i] = cur; q.push(i);
      if (i === goal) { found = true; break; }
    }
  }
  let path = null;
  if (found) {
    path = [];
    let c = goal;
    while (c !== -1) { path.push([c % W, (c / W) | 0]); if (c === start) break; c = prev[c]; }
    path.reverse();
  }
  pathCache.set(key, path);
  return path;
}

function setDestination(s, p, tile, mode) {
  const from = [Math.round(p.x), Math.round(p.y)];
  const path = findPath(s, from, tile);
  p.mode = mode;
  if (!path) { p.path = null; p.x = tile[0]; p.y = tile[1]; return; }
  p.path = path.slice(1).map(([x, y]) => [x + (s.rnd() - 0.5) * 0.35, y + (s.rnd() - 0.5) * 0.35]);
  if (p.path.length === 0) p.path = null;
}

function companySpots(s) {
  const out = [];
  for (const b of s.buildings.values()) if (BUILDINGS[b.type].company) { const d = doorTile(s, b); if (d) out.push(d); }
  return out;
}

export function updatePeople(s, dt) {
  const t = s.time;
  const workHours = t > 0.3 && t < 0.72;
  const night = t < 0.24 || t > 0.8;
  for (const p of s.people) {
    const home = s.buildings.get(p.home);
    const work = s.buildings.get(p.work);
    // movement along path
    if (p.path && p.path.length) {
      const [tx, ty] = p.path[0];
      const dx = tx - p.x, dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      const step = p.speed * 1.4 * dt * (s.speed || 1);
      if (d <= step) { p.x = tx; p.y = ty; p.path.shift(); if (!p.path.length) p.path = null; }
      else { p.x += dx / d * step; p.y += dy / d * step; p.heading = Math.atan2(dx, dy); }
      p.visible = true;
      continue;
    }
    // arrived somewhere / idle: decide what to do
    p.wait -= dt * (s.speed || 1);
    if (p.mode === 'arrive') { p.mode = 'home'; p.visible = false; }
    if (p.mode === 'home') {
      p.visible = false;
      if (workHours && !night) {
        if (work) { const d = doorTile(s, work); if (d) { setDestination(s, p, d, 'toWork'); p.visible = true; } }
        else if (p.wait <= 0 && s.rnd() < 0.3) {
          const spots = companySpots(s);
          const d = spots.length ? spots[Math.floor(s.rnd() * spots.length)] : null;
          if (d) { setDestination(s, p, d, 'toLoiter'); p.visible = true; } else p.wait = 6;
        }
      } else if (!night && p.wait <= 0 && s.rnd() < 0.15) {
        const spots = companySpots(s);
        if (spots.length) { setDestination(s, p, spots[Math.floor(s.rnd() * spots.length)], 'toLoiter'); p.visible = true; }
        p.wait = 8;
      }
    } else if (p.mode === 'toWork') { p.mode = 'work'; p.visible = true; p.wait = 3 + s.rnd() * 4; }
    else if (p.mode === 'work') {
      // stand by the door, occasionally step inside
      if (p.wait <= 0) { p.visible = !p.visible; p.wait = 4 + s.rnd() * 8; }
      if (!workHours || night || !work) { const d = home && doorTile(s, home); if (d) setDestination(s, p, d, 'toHome'); else p.mode = 'home'; p.visible = true; }
    } else if (p.mode === 'toLoiter') { p.mode = 'loiter'; p.wait = 6 + s.rnd() * 10; p.visible = true; }
    else if (p.mode === 'loiter') {
      if (p.wait <= 0 || night) { const d = home && doorTile(s, home); if (d) setDestination(s, p, d, 'toHome'); else p.mode = 'home'; }
    } else if (p.mode === 'toHome') { p.mode = 'home'; p.visible = false; p.wait = 5 + s.rnd() * 5; }
  }
}

// ---------------------------------------------------------------- daily / periodic
function evaluateNeeds(s, dtDays) {
  const lampsOn = true;
  for (const p of s.people) {
    const home = s.buildings.get(p.home);
    const n = p.needs;
    n.bread = s.res.bread > 0;
    n.work = !!p.work;
    if (home) {
      const c = buildingCenter(home);
      let light = 0;
      for (const [x, y] of buildingCells(s, home)) for (const [nx, ny] of neighbors8(x, y)) { const t = tileAt(s, nx, ny); if (t) light = Math.max(light, t.light); }
      n.light = light > 0.05;
      let company = false;
      for (const b of s.buildings.values()) {
        const def = BUILDINGS[b.type];
        if (!def.company) continue;
        const bc = buildingCenter(b);
        if (Math.hypot(bc.x - c.x, bc.y - c.y) <= def.company) company = true;
      }
      if (!company) {
        for (let y = home.y - 2; y <= home.y + 2 && !company; y++) for (let x = home.x - 2; x <= home.x + 2; x++) {
          const t = tileAt(s, x, y); if (t && t.tree === 2) { company = true; break; }
        }
      }
      n.company = company;
      n.ley = p.rank === 'apprentice' ? true : home.supplied;
      n.wonder = true;
      if (p.rank === 'master') {
        let w = false;
        for (const b of s.buildings.values()) { const def = BUILDINGS[b.type]; if (def.wonder) { const bc = buildingCenter(b); if (Math.hypot(bc.x - c.x, bc.y - c.y) <= def.wonder) w = true; } }
        n.wonder = w;
      }
      n.warped = home.warped;
    }
    let delta = 0;
    delta += n.bread ? 6 : -30;
    delta += n.light ? 6 : -8;
    delta += n.company ? 5 : -6;
    delta += n.work ? 4 : -5;
    delta += n.ley ? 4 : -14;
    delta += n.wonder ? 2 : -10;
    if (n.warped) delta -= 16;
    p.content = Math.max(0, Math.min(100, p.content + delta * dtDays * 2.2));
  }
  // leavers
  for (const p of [...s.people]) {
    if (p.content <= 0.5) {
      const why = !p.needs.bread ? 'no bread' : !p.needs.ley ? 'no ley at home' : p.needs.warped ? 'bloom at the door' : !p.needs.light ? 'dark streets' : !p.needs.company ? 'no company' : !p.needs.wonder ? 'nothing to look up to' : 'idle';
      removePerson(s, p, why);
      s.version++;
    }
  }
}

function assignJobs(s) {
  for (const p of s.people) {
    if (p.work && !s.buildings.get(p.work)) p.work = null;
    if (p.work) continue;
    const home = s.buildings.get(p.home);
    const job = freeJob(s, p.rank, home);
    if (job) { job.workers.push(p.id); p.work = job.id; }
  }
}

function dawn(s) {
  // arrivals
  let arrived = [];
  for (const rank of RANKS) {
    const n = arrivalCount(s, rank);
    for (let i = 0; i < n; i++) {
      const home = freeHome(s, rank);
      if (!home) break;
      spawnPerson(s, rank, home);
      arrived.push(rank);
    }
  }
  if (arrived.length) {
    const counts = {};
    for (const r of arrived) counts[r] = (counts[r] || 0) + 1;
    const plural = { apprentice: 'apprentices', journeyman: 'journeymen', master: 'masters' };
    log(s, Object.entries(counts).map(([r, n]) => `${n} ${n > 1 ? plural[r] : r}`).join(' and ') + ' arrived by the old road.', 'good');
    s.version++;
  }
}

function checkCharters(s) {
  for (const c of CHARTERS) {
    if (s.charters[c.key]) continue;
    if (c.cond(s)) {
      s.charters[c.key] = true;
      s.charterFlash = { key: c.key, name: c.name, text: c.text, t: 0 };
      log(s, `${c.name} sealed. ${c.text}`, 'charter');
      if (c.key === 'city') s.won = true;
      s.version++;
      break; // one per tick, so the ceremony is seen
    }
  }
}

function updateBloom(s, dt) {
  const T = s.tiles;
  // pooling dead ends
  for (const [x, y] of s.pooling || []) {
    const t = T[idx(x, y)];
    t.pool += dt;
    if (t.pool > LEY.poolSeconds) {
      t.pool = LEY.poolSeconds * 0.35;
      // spawn bloom on a nearby empty tile
      const cands = neighbors8(x, y).filter(([nx, ny]) => { const u = tileAt(s, nx, ny); return u && !u.road && !u.building && u.terrain === 'grass' && u.bloom < 3; });
      if (cands.length) {
        const [nx, ny] = cands[Math.floor(s.rnd() * cands.length)];
        const u = T[idx(nx, ny)];
        if (!u.bloom) { u.bloom = 1; u.tree = 0; log(s, 'Bloom is rising where a channel pools.', 'bad'); }
        else u.bloom = Math.min(3, u.bloom + 1);
        s.version++;
      }
    }
  }
  // wards
  const warded = new Set();
  for (const b of s.buildings.values()) {
    const def = BUILDINGS[b.type];
    if (!def.ward) continue;
    for (let y = b.y - def.ward; y <= b.y + def.ward; y++) for (let x = b.x - def.ward; x <= b.x + def.ward; x++) {
      if (inBounds(x, y) && Math.hypot(x - b.x, y - b.y) <= def.ward + 0.4) warded.add(idx(x, y));
    }
  }
  // grow / spread / clear
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), t = T[i];
    if (!t.bloom) continue;
    if (warded.has(i)) {
      t.bloomT += dt;
      if (t.bloomT > LEY.wardClearSeconds) { t.bloomT = 0; t.bloom--; s.version++; }
      continue;
    }
    // fed if any pooling tile within 3
    let fed = false;
    for (const [px, py] of s.pooling || []) if (Math.hypot(px - x, py - y) <= 3.5) { fed = true; break; }
    if (!fed) continue;
    t.bloomT += dt;
    if (t.bloom < 3 && t.bloomT > LEY.bloomGrowSeconds) { t.bloomT = 0; t.bloom++; s.version++; }
    else if (t.bloom >= 3 && t.bloomT > LEY.bloomSpreadSeconds) {
      t.bloomT = 0;
      const cands = neighbors4(x, y).filter(([nx, ny]) => { const u = tileAt(s, nx, ny); return u && !u.road && !u.building && u.terrain === 'grass' && !u.bloom && !warded.has(idx(nx, ny)); });
      if (cands.length) { const [nx, ny] = cands[Math.floor(s.rnd() * cands.length)]; T[idx(nx, ny)].bloom = 1; T[idx(nx, ny)].tree = 0; s.version++; }
    }
  }
  // warping: any building with bloom on an 8-neighbour tile
  for (const b of s.buildings.values()) {
    let warped = false;
    for (const [x, y] of buildingCells(s, b)) for (const [nx, ny] of neighbors8(x, y)) { const u = tileAt(s, nx, ny); if (u && u.bloom) warped = true; }
    if (warped !== b.warped) { b.warped = warped; s.version++; }
  }
}

function collectProblems(s) {
  const P = [];
  if (s.res.bread <= 0) P.push({ kind: 'bread', text: 'No bread. People are going hungry and will leave.' });
  else if ((s.breadBalance || 0) < -0.5 && s.pop > 0) P.push({ kind: 'bread', text: `Bread is running short: ${(-s.breadBalance).toFixed(1)} more eaten than baked each day. More allotments (away from channels) or a bakery.` });
  if (s.pooling && s.pooling.length) P.push({ kind: 'pool', text: `${s.pooling.length} channel dead end${s.pooling.length > 1 ? 's are' : ' is'} pooling. Close the loop or cap with a cistern.` });
  let bloom = 0; for (const t of s.tiles) if (t.bloom) bloom++;
  if (bloom) P.push({ kind: 'bloom', text: `Bloom on ${bloom} tile${bloom > 1 ? 's' : ''}. Scour it, or ward it.` });
  if (s.demand > s.pressure + 1e-6) P.push({ kind: 'ley', text: `Ley is short: ${s.demand.toFixed(1)} needed, ${s.pressure} pressure. Farthest buildings brown out. Add cisterns or a ley well.` });
  const unstaffed = [...s.buildings.values()].filter(b => BUILDINGS[b.type].jobs && b.workers.length === 0 && touchesRoad(s, b));
  if (unstaffed.length) P.push({ kind: 'jobs', text: `${unstaffed.length} workplace${unstaffed.length > 1 ? 's have' : ' has'} no workers. Build homes for the right rank.` });
  const dark = s.people.filter(p => !p.needs.light).length;
  if (dark && s.charters.channels) P.push({ kind: 'dark', text: `${dark} people live on dark streets. Put ley lamps on channels near homes.` });
  const lonely = s.people.filter(p => !p.needs.company).length;
  if (lonely) P.push({ kind: 'company', text: `${lonely} people have no company. A well, a tavern or an inkwood within reach of home.` });
  const noley = s.people.filter(p => !p.needs.ley).length;
  if (noley) P.push({ kind: 'noley', text: `${noley} journeymen or masters have no ley at home.` });
  const offroad = [...s.buildings.values()].filter(b => !BUILDINGS[b.type].onChannel && !touchesRoad(s, b));
  if (offroad.length) P.push({ kind: 'road', text: `${offroad.length} building${offroad.length > 1 ? 's do' : ' does'} not touch a street.` });
  s.problems = P;
}

// ---------------------------------------------------------------- main tick
let needAcc = 0, jobAcc = 0;
export function tick(s, dt) {
  if (s.paused) { updatePeople(s, 0); return; }
  dt *= s.speed;
  if (s.leyDirty) recomputeLey(s);
  const prevTime = s.time;
  s.time += dt / DAY_SECONDS;
  if (s.time >= 1) { s.time -= 1; s.day++; }
  if (prevTime < 0.25 && s.time >= 0.25) { dawn(s); }
  const dtDays = dt / DAY_SECONDS;

  // production and consumption
  let bread = 0;
  for (const b of s.buildings.values()) {
    b.active = false;
    if (!touchesRoad(s, b) && !BUILDINGS[b.type].onChannel) continue;
    const out = production(s, b);
    for (const k in out) {
      if (out[k] > 0) b.active = true;
      s.res[k] += out[k] * dtDays;
      if (k === 'ink') s.totalInk += out[k] * dtDays;
    }
    if (BUILDINGS[b.type].eatsBread && b.workers.length) bread += BUILDINGS[b.type].eatsBread;
  }
  bread += s.people.length * 1.0;
  s.res.bread = Math.max(0, s.res.bread - bread * dtDays);
  let breadIn = 0;
  for (const b of s.buildings.values()) { if (!touchesRoad(s, b)) continue; const o = production(s, b); if (o.bread) breadIn += o.bread; }
  s.breadBalance = breadIn - bread;

  jobAcc += dt;
  if (jobAcc > 1.5) { jobAcc = 0; assignJobs(s); }
  needAcc += dtDays;
  if (needAcc > 0.02) { evaluateNeeds(s, needAcc); needAcc = 0; collectProblems(s); checkCharters(s); }
  updateBloom(s, dt);
  if (s.leyDirty) recomputeLey(s);

  s.pop = s.people.length;
  s.ranks = { apprentice: 0, journeyman: 0, master: 0 };
  for (const p of s.people) s.ranks[p.rank]++;
  if (s.charterFlash) { s.charterFlash.t += dt; if (s.charterFlash.t > 9) s.charterFlash = null; }
  updatePeople(s, dt / (s.speed || 1));
}
