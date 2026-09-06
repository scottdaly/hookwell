// Hookwell building and rule definitions.
// Costs are in timber / stone / ink. Rates are per day.

export const TILE = 4;           // metres per tile
export const W = 36, H = 36;     // map size in tiles
export const DAY_SECONDS = 75;   // real seconds per in-game day

export const RANKS = ['apprentice', 'journeyman', 'master'];

export const CHARTERS = [
  { key: 'founding', name: 'Charter of Founding', text: 'Roads, lodgings, gardens, timber and stone. A well to gather at.',
    cond: () => true, desc: 'Granted on arrival.' },
  { key: 'channels', name: 'Charter of Channels', text: 'The spring may be cut into the streets. Lamps and a scriptorium follow.',
    cond: s => s.pop >= 5 && s.built.well > 0, desc: '5 inhabitants and a well.' },
  { key: 'quills', name: 'Charter of Quills', text: 'Ink flows. Journeymen may settle; cisterns hold what the streets cannot.',
    cond: s => s.totalInk >= 12, desc: 'Make 12 ink in total.' },
  { key: 'chancery', name: 'Charter of the Chancery', text: 'A town that keeps its own ledger may raise a Chancery.',
    cond: s => s.pop >= 12 && s.res.ink >= 30, desc: '12 inhabitants and 30 ink in hand.' },
  { key: 'wards', name: 'Charter of Wards', text: 'Ward stones, still-houses and a tavern. Inkwoods may be planted.',
    cond: s => s.built.chancery > 0, desc: 'Build the Chancery.' },
  { key: 'masters', name: 'Charter of Masters', text: 'Towers for masters, a deeper well, and an observatory.',
    cond: s => s.pop >= 20 && s.totalInk >= 100 && s.built.alembic > 0, desc: '20 inhabitants, 100 ink made in total, a still-house.' },
  { key: 'city', name: 'The City Charter', text: 'Three masters in residence. Hookwell is a city.',
    cond: s => s.ranks.master >= 3, desc: 'Three masters living in towers.' },
];

// glyph: single letter stamped on the seal by the door.
export const BUILDINGS = {
  lodging: { name: 'Apprentice Lodging', glyph: 'A', size: [1, 1], cat: 'homes', charter: 'founding',
    cost: { timber: 8, stone: 2 }, housing: { rank: 'apprentice', n: 3 },
    desc: 'A tall thin house for three apprentices. Wants bread, a lit street and company.' },
  jhouse: { name: 'Journeyman House', glyph: 'J', size: [1, 1], cat: 'homes', charter: 'quills',
    cost: { timber: 10, stone: 8, ink: 3 }, housing: { rank: 'journeyman', n: 2 }, leyUse: 1,
    desc: 'A jettied house for two journeymen. Must sit on a ley channel or they will not stay.' },
  tower: { name: "Master's Tower", glyph: 'M', size: [1, 1], cat: 'homes', charter: 'masters',
    cost: { timber: 10, stone: 22, ink: 20 }, housing: { rank: 'master', n: 1 }, leyUse: 1, nearChancery: 7,
    desc: 'One master, one tower. Needs ley and must stand within 7 tiles of the Chancery.' },

  garden: { name: 'Allotment', glyph: 'G', size: [1, 1], cat: 'work', charter: 'founding',
    cost: { timber: 3 }, jobs: { rank: 'apprentice', n: 1 },
    desc: 'Bread. Next to a ley channel it grows strange and yields ink instead.' },
  woodcutter: { name: "Woodcutter's Lodge", glyph: 'W', size: [1, 1], cat: 'work', charter: 'founding',
    cost: { timber: 4, stone: 3 }, jobs: { rank: 'apprentice', n: 2 },
    desc: 'Timber from candle-pines within 3 tiles. More trees, more timber.' },
  stonecutter: { name: "Stonecutter's Yard", glyph: 'S', size: [1, 1], cat: 'work', charter: 'founding',
    cost: { timber: 6 }, jobs: { rank: 'apprentice', n: 2 }, needsRock: true,
    desc: 'Stone. Must touch a rock outcrop.' },
  scriptorium: { name: 'Scriptorium', glyph: 'Q', size: [2, 1], cat: 'work', charter: 'channels',
    cost: { timber: 12, stone: 6 }, jobs: { rank: 'apprentice', n: 3 }, leyUse: 2,
    desc: 'A long hall of copyists. With ley, each writes 2.5 ink a day.' },
  bakery: { name: 'Bakery', glyph: 'B', size: [1, 1], cat: 'work', charter: 'quills',
    cost: { timber: 8, stone: 6, ink: 2 }, jobs: { rank: 'apprentice', n: 2 }, leyUse: 1,
    desc: 'A ley-fired oven. Bakes 3 bread a day for every allotment within 4 tiles (1 without ley).' },
  alembic: { name: 'Still-house', glyph: 'X', size: [1, 1], cat: 'work', charter: 'wards',
    cost: { timber: 12, stone: 10, ink: 10 }, jobs: { rank: 'journeyman', n: 2 }, leyUse: 2,
    desc: 'A copper still under a timber cage. Journeymen distil 6 ink a day each, with ley.' },
  tavern: { name: 'The Hooked Lantern', glyph: 'T', size: [1, 1], cat: 'work', charter: 'wards',
    cost: { timber: 14, stone: 6, ink: 4 }, jobs: { rank: 'journeyman', n: 1 }, company: 4, eatsBread: 3,
    desc: 'A tavern. Company for every home within 4 tiles. Eats 3 bread a day.' },
  observatory: { name: 'Observatory', glyph: 'O', size: [2, 2], cat: 'work', charter: 'masters',
    cost: { timber: 20, stone: 30, ink: 30 }, jobs: { rank: 'master', n: 2 }, leyUse: 2, wonder: 8,
    desc: 'Masters read the sky and write 8 ink a day each. A wonder for 8 tiles around.' },

  well: { name: 'Well', glyph: 'V', size: [1, 1], cat: 'civic', charter: 'founding',
    cost: { stone: 6 }, company: 4,
    desc: 'Somewhere to gather. Company for every home within 4 tiles.' },
  lamp: { name: 'Ley Lamp', glyph: 'L', size: [1, 1], cat: 'ley', charter: 'channels', onChannel: true,
    cost: { stone: 2 }, leyUse: 0.5, light: 2.5,
    desc: 'A crook-pole lamp on a channel. Lights homes within 2 tiles at night.' },
  cistern: { name: 'Cistern', glyph: 'C', size: [1, 1], cat: 'ley', charter: 'quills',
    cost: { stone: 8, ink: 2 }, pressure: 2, caps: true,
    desc: 'Caps a channel dead end so it cannot pool, and adds 2 pressure to the network.' },
  wardstone: { name: 'Ward Stone', glyph: 'D', size: [1, 1], cat: 'ley', charter: 'wards',
    cost: { stone: 4, ink: 6 }, ward: 3,
    desc: 'Stops bloom within 3 tiles and slowly clears it.' },
  leywell: { name: 'Ley Well', glyph: 'Y', size: [1, 1], cat: 'ley', charter: 'masters',
    cost: { stone: 16, ink: 24 }, source: 8,
    desc: 'A second spring, bored by hand. 8 pressure into adjacent channels.' },
  chancery: { name: 'The Chancery', glyph: 'H', size: [2, 2], cat: 'civic', charter: 'chancery', unique: true,
    cost: { timber: 30, stone: 30, ink: 20 }, jobs: { rank: 'journeyman', n: 2 }, leyUse: 1, wonder: 6,
    desc: 'Where charters are sealed. Two journeymen clerk here. A wonder for 6 tiles around.' },
};

export const LEY = {
  springPressure: 10,
  poolSeconds: 40,       // how long a dead end pools before it blooms
  bloomGrowSeconds: 50,  // level 1 -> 2 -> 3
  bloomSpreadSeconds: 90,
  wardClearSeconds: 25,
};

export const START_RES = { timber: 50, stone: 30, bread: 30, ink: 0 };

export const CATS = [
  { key: 'roads', name: 'Streets' },
  { key: 'homes', name: 'Homes' },
  { key: 'work', name: 'Work' },
  { key: 'civic', name: 'Civic' },
  { key: 'ley', name: 'Ley' },
];

export const TOOLS = {
  road: { name: 'Street', glyph: 'R', cost: { timber: 1 }, cat: 'roads', charter: 'founding', desc: 'A cobbled street. Every building must touch one. Clears trees.' },
  channel: { name: 'Ley Channel', glyph: 'N', cost: { stone: 1 }, cat: 'roads', charter: 'channels', desc: 'Cut a ley gutter into a street. Ley flows from the spring along connected channels. Dead ends pool and bloom; close loops or cap with cisterns.' },
  pine: { name: 'Plant Candle-pine', glyph: 'P', cost: { timber: 2 }, cat: 'roads', charter: 'founding', desc: 'Plant a candle-pine. Feeds woodcutters within 3 tiles.' },
  inkwood: { name: 'Plant Inkwood', glyph: 'I', cost: { ink: 4 }, cat: 'roads', charter: 'wards', desc: 'A civic tree with blue-black leaves. Company for homes within 2 tiles.' },
  scour: { name: 'Scour Bloom', glyph: 'Z', cost: {}, cat: 'roads', charter: 'founding', desc: 'Scrape bloom off a tile by hand. It will return if the channel still pools.' },
  demolish: { name: 'Demolish', glyph: 'X', cost: {}, cat: 'roads', charter: 'founding', desc: 'Remove a building or street. Half the materials come back.' },
};
