import { W, H, START_RES, BUILDINGS } from './defs.js';

// Deterministic PRNG so scenarios and screenshots are reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const idx = (x, y) => y * W + x;
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

export function makeTile() {
  return {
    terrain: 'grass',   // grass | rock | spring
    tree: 0,            // 0 none, 1 candle-pine, 2 inkwood
    treeSeed: 0,
    road: false,
    channel: false,
    bloom: 0,           // 0..3
    bloomT: 0,
    building: null,     // building id occupying this tile
    pool: 0,            // pooling ley timer (dead end)
    ley: -1,            // BFS distance from a source, -1 if unconnected
    light: 0,           // lamp light reaching this tile (0..1)
    fert: 0,            // noise value used for terrain color
  };
}

export function createState(seed = 7) {
  const rnd = mulberry32(seed);
  const tiles = new Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = makeTile();
    t.fert = rnd();
    t.treeSeed = rnd();
    tiles[idx(x, y)] = t;
  }
  const s = {
    seed, rnd, tiles,
    day: 1, time: 0.3, speed: 1, paused: false,
    res: { ...START_RES },
    totalInk: 0,
    buildings: new Map(), nextId: 1,
    people: [], nextPid: 1,
    charters: { founding: true },
    charterFlash: null,
    log: [],
    version: 1,      // bump on any structural change (renderer diffs on it)
    leyDirty: true,
    pop: 0, ranks: { apprentice: 0, journeyman: 0, master: 0 }, built: {},
    pressure: 0, demand: 0,
    problems: [],
    spring: { x: 18, y: 17 },
    entry: { x: 0, y: 24 },
    lastArrivalDay: 0,
    won: false,
  };
  for (const k of Object.keys(BUILDINGS)) s.built[k] = 0;
  generateTerrain(s);
  return s;
}

function generateTerrain(s) {
  const rnd = s.rnd;
  // spring on a small rock knoll
  const sp = s.spring;
  s.tiles[idx(sp.x, sp.y)].terrain = 'spring';
  // rock outcrops: a ridge NE and a knoll SW, plus small ones
  const rocks = [
    [27, 8, 4], [29, 11, 3], [31, 6, 2], [5, 28, 2], [8, 32, 2], [4, 6, 2], [33, 30, 2],
  ];
  for (const [cx, cy, r] of rocks) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!inBounds(x, y)) continue;
      const d = Math.hypot(x - cx, (y - cy) * 1.3);
      if (d <= r - 0.2 + rnd() * 0.9) s.tiles[idx(x, y)].terrain = s.tiles[idx(x, y)].terrain === 'spring' ? 'spring' : 'rock';
    }
  }
  // candle-pine woods: several groves, denser at the edges
  const groves = [[8, 10, 5], [12, 26, 4], [30, 22, 4], [22, 30, 3], [3, 18, 3], [33, 15, 3], [15, 4, 3], [26, 2, 2]];
  for (const [cx, cy, r] of groves) {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
      if (!inBounds(x, y)) continue;
      const t = s.tiles[idx(x, y)];
      if (t.terrain !== 'grass') continue;
      const d = Math.hypot(x - cx, y - cy) / r;
      if (rnd() < 0.85 - d * 0.7) t.tree = 1;
    }
  }
  // scattered singles
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
    const t = s.tiles[idx(x, y)];
    if (t.terrain === 'grass' && Math.hypot(x - sp.x, y - sp.y) > 4) t.tree = 1;
  }
  // keep the meadow around the spring and the entry clear
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = s.tiles[idx(x, y)];
    if (Math.hypot(x - sp.x, y - sp.y) < 3.5 && t.terrain === 'grass') t.tree = 0;
  }
  // old road stub from the west edge
  for (let x = 0; x <= 3; x++) { const t = s.tiles[idx(x, s.entry.y)]; t.road = true; t.tree = 0; }
}

export function tileAt(s, x, y) { return inBounds(x, y) ? s.tiles[idx(x, y)] : null; }

export function footprint(def, x, y) {
  const out = [];
  for (let dy = 0; dy < def.size[1]; dy++) for (let dx = 0; dx < def.size[0]; dx++) out.push([x + dx, y + dy]);
  return out;
}

export function neighbors4(x, y) { return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]; }
export function neighbors8(x, y) {
  const o = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) o.push([x + dx, y + dy]);
  return o;
}

// tiles adjacent (4-neigh) to a footprint, excluding the footprint itself
export function ring4(cells) {
  const set = new Set(cells.map(([x, y]) => idx(x, y)));
  const out = [];
  const seen = new Set();
  for (const [x, y] of cells) for (const [nx, ny] of neighbors4(x, y)) {
    if (!inBounds(nx, ny)) continue;
    const i = idx(nx, ny);
    if (set.has(i) || seen.has(i)) continue;
    seen.add(i); out.push([nx, ny]);
  }
  return out;
}

export function log(s, text, kind = 'note') {
  s.log.push({ day: s.day, time: s.time, text, kind });
  if (s.log.length > 60) s.log.shift();
}

export function buildingCells(s, b) { return footprint(BUILDINGS[b.type], b.x, b.y); }

export function buildingCenter(b) {
  const d = BUILDINGS[b.type];
  return { x: b.x + d.size[0] / 2 - 0.5, y: b.y + d.size[1] / 2 - 0.5 };
}

export function distTiles(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
