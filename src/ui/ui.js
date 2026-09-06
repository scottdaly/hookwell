import { BUILDINGS, TOOLS, CATS, CHARTERS } from '../game/defs.js';
import { canAfford, costText } from '../game/place.js';
import { production } from '../game/sim.js';
import { idx } from '../game/state.js';

const TIMES = [[0.22, 'night'], [0.3, 'dawn'], [0.45, 'morning'], [0.55, 'noon'], [0.72, 'afternoon'], [0.82, 'dusk'], [1.01, 'night']];
export function timeName(t) { for (const [k, n] of TIMES) if (t < k) return n; return 'night'; }

export class UI {
  constructor(root, state, game) {
    this.root = root; this.state = state; this.game = game;
    root.innerHTML = `
      <div id="top" class="panel">
        <div class="title">HOOKWELL<small>a chartered city of wizards</small></div>
        <div class="day"></div>
        <div class="res"></div>
        <div class="spacer"></div>
        <div class="pop"></div>
        <div class="speed"><button data-s="0">II</button><button data-s="1" class="on">1×</button><button data-s="2">2×</button><button data-s="4">4×</button></div>
      </div>
      <div id="palette" class="panel"></div>
      <div id="ledger" class="panel"><h3>Charters</h3><div id="charters"></div><h3>Troubles</h3><div id="problems"></div><h3>Under the cursor</h3><div id="info"></div></div>
      <div id="log" class="panel"></div>
      <div id="tip"></div>
      <div id="ceremony"><div class="disc"></div><div class="card"><h2></h2><p></p></div></div>
      <div id="intro" class="panel">
        <h1>HOOKWELL<small>a chartered city of wizards</small></h1>
        <p>A meadow, an old road, and a spring that bubbles turquoise. The fluid is called <b>ley</b>. Wizards will come to live off it, if you give them somewhere to live.</p>
        <ol>
          <li>Lay <b>streets</b> from the old road. Every building must touch one.</li>
          <li>Build <b>lodgings</b>, an <b>allotment</b>, a <b>woodcutter</b> by the pines and a <b>stonecutter</b> on the rock. Apprentices arrive at dawn.</li>
          <li>Dig a <b>well</b>. With five people and a well, the Charter of Channels is sealed and you may cut ley into the streets.</li>
          <li>Ley must <b>circulate</b>. A channel that dead-ends pools and blooms. Close loops, or cap ends with cisterns.</li>
        </ol>
        <div class="keys"><kbd>WASD</kbd> pan · <kbd>Q</kbd><kbd>E</kbd> rotate · scroll zoom · <kbd>Esc</kbd> cancel · <kbd>Space</kbd> pause · right-drag pan</div>
        <p style="margin-top:12px"><button id="begin">Break ground</button></p>
      </div>`;
    this.el = {
      day: root.querySelector('#top .day'), res: root.querySelector('#top .res'), pop: root.querySelector('#top .pop'),
      palette: root.querySelector('#palette'), charters: root.querySelector('#charters'), problems: root.querySelector('#problems'),
      info: root.querySelector('#info'), log: root.querySelector('#log'), tip: root.querySelector('#tip'), ceremony: root.querySelector('#ceremony'),
      intro: root.querySelector('#intro'),
    };
    root.querySelector('#begin').onclick = () => { this.el.intro.classList.add('hidden'); state.paused = false; };
    root.querySelectorAll('#top .speed button').forEach(b => b.onclick = () => this.setSpeed(+b.dataset.s));
    this.paletteKey = '';
    this.lastCeremony = null;
    this.hover = null;
  }

  setSpeed(s) {
    const st = this.state;
    if (s === 0) st.paused = !st.paused; else { st.paused = false; st.speed = s; }
    this.root.querySelectorAll('#top .speed button').forEach(b => b.classList.toggle('on', st.paused ? b.dataset.s === '0' : +b.dataset.s === st.speed));
  }

  buildPalette() {
    const s = this.state;
    const key = Object.keys(s.charters).join(',') + '|' + this.game.tool + '|' + Object.entries(s.res).map(([k, v]) => k + Math.floor(v)).join();
    if (key === this.paletteKey) return;
    this.paletteKey = key;
    let html = '';
    for (const cat of CATS) {
      html += `<h3>${cat.name}</h3>`;
      const entries = [...Object.entries(TOOLS).filter(([, d]) => d.cat === cat.key).map(([k, d]) => ['tool', k, d]),
        ...Object.entries(BUILDINGS).filter(([, d]) => d.cat === cat.key).map(([k, d]) => ['building', k, d])];
      for (const [kind, k, d] of entries) {
        const unlocked = !!s.charters[d.charter];
        const sel = this.game.tool === k;
        const poor = unlocked && !canAfford(s, d.cost);
        const ch = CHARTERS.find(c => c.key === d.charter);
        html += `<div class="item ${unlocked ? '' : 'locked'} ${sel ? 'sel' : ''} ${poor ? 'poor' : ''}" data-k="${k}" data-kind="${kind}">
          <div class="seal">${d.glyph}</div>
          <div><div class="name">${d.name}</div>${unlocked ? `<div class="cost">${costText(d.cost)}</div>` : `<div class="lock">${ch ? ch.name : ''}</div>`}</div></div>`;
      }
    }
    this.el.palette.innerHTML = html;
    this.el.palette.querySelectorAll('.item').forEach(it => {
      it.onclick = () => { if (it.classList.contains('locked')) return; this.game.setTool(it.dataset.k === this.game.tool ? null : it.dataset.k); };
      it.onmouseenter = () => { this.hover = it.dataset.k; };
      it.onmouseleave = () => { if (this.hover === it.dataset.k) this.hover = null; };
    });
  }

  update() {
    const s = this.state;
    this.el.day.textContent = `Day ${s.day}, ${timeName(s.time)}${s.paused ? ' — paused' : ''}`;
    const r = s.res;
    this.el.res.innerHTML = `<span><i class="i-timber"></i><b>${Math.floor(r.timber)}</b> timber</span><span><i class="i-stone"></i><b>${Math.floor(r.stone)}</b> stone</span><span><i class="i-bread"></i><b>${Math.floor(r.bread)}</b> bread <small style="color:${(s.breadBalance || 0) < 0 ? 'var(--wax)' : 'var(--ink2)'}">${(s.breadBalance || 0) >= 0 ? '+' : ''}${(s.breadBalance || 0).toFixed(1)}/day</small></span><span><i class="i-ink"></i><b>${Math.floor(r.ink)}</b> ink</span><span><i class="i-ley"></i><b>${s.demand.toFixed(1)}/${s.pressure}</b> ley</span>`;
    this.el.pop.innerHTML = `<span>${s.ranks.apprentice} apprentices</span><span>${s.ranks.journeyman} journeymen</span><span>${s.ranks.master} masters</span>`;
    this.buildPalette();
    // charters
    let nextShown = false, html = '';
    for (const c of CHARTERS) {
      const done = !!s.charters[c.key];
      const cls = done ? 'done' : (!nextShown ? 'next' : '');
      if (!done) nextShown = true;
      html += `<div class="charter ${cls}"><div class="seal"></div><div><div class="n">${c.name}</div><div class="d">${done ? c.text : c.desc}</div></div></div>`;
    }
    this.el.charters.innerHTML = html;
    this.el.problems.innerHTML = s.problems.length ? s.problems.map(p => `<div class="problem ${p.kind}">${p.text}</div>`).join('') : `<div class="calm">All is in order. For now.</div>`;
    // log
    const lines = s.log.slice(-6).reverse();
    this.el.log.innerHTML = lines.map(l => `<div class="line ${l.kind}"><span class="d">DAY ${l.day}</span>${l.text}</div>`).join('') +
      (lines.length < 3 ? `<div class="hint">Lay a street from the old road at the west edge, then build lodgings beside it.</div>` : '');
    // ceremony
    if (s.charterFlash && s.charterFlash !== this.lastCeremony) {
      this.lastCeremony = s.charterFlash;
      const c = this.el.ceremony;
      c.style.display = 'block';
      c.querySelector('.disc').textContent = BUILDINGS[Object.keys(BUILDINGS).find(k => BUILDINGS[k].charter === s.charterFlash.key)]?.glyph || 'H';
      c.querySelector('h2').textContent = s.charterFlash.name;
      c.querySelector('p').textContent = s.charterFlash.text;
      c.querySelector('.disc').style.animation = 'none'; void c.offsetWidth; c.querySelector('.disc').style.animation = '';
    }
    if (!s.charterFlash) this.el.ceremony.style.display = 'none';
    this.updateInfo();
  }

  updateInfo() {
    const s = this.state, g = this.game;
    let html = '';
    const hoverKey = this.hover;
    if (hoverKey && (BUILDINGS[hoverKey] || TOOLS[hoverKey])) {
      const d = BUILDINGS[hoverKey] || TOOLS[hoverKey];
      html = `<b>${d.name}</b><div class="desc">${d.desc}</div><div class="row"><span>Cost</span><span>${costText(d.cost)}</span></div>`;
      if (d.housing) html += `<div class="row"><span>Houses</span><span>${d.housing.n} ${d.housing.rank}s</span></div>`;
      if (d.jobs) html += `<div class="row"><span>Employs</span><span>${d.jobs.n} ${d.jobs.rank}${d.jobs.n > 1 ? (d.jobs.rank.endsWith('n') ? '' : 's') : ''}</span></div>`;
      if (d.leyUse) html += `<div class="row"><span>Ley</span><span>${d.leyUse} pressure</span></div>`;
    } else if (g.hoverTile) {
      const [x, y] = g.hoverTile;
      const t = s.tiles[idx(x, y)];
      if (t.building) {
        const b = s.buildings.get(t.building), d = BUILDINGS[b.type];
        html = `<b>${d.name}</b><div class="desc">${d.desc}</div>`;
        if (d.housing) html += `<div class="row"><span>Residents</span><span>${b.residents.length} / ${d.housing.n}</span></div>`;
        if (d.jobs) html += `<div class="row"><span>Workers</span><span>${b.workers.length} / ${d.jobs.n}</span></div>`;
        if (d.leyUse) html += `<div class="row"><span>Ley</span><span>${b.supplied ? 'supplied' : b.onLey ? 'short (browned out)' : 'no channel adjacent'}</span></div>`;
        const out = production(s, b);
        for (const k in out) if (out[k] > 0) html += `<div class="row"><span>Makes</span><span>${out[k].toFixed(1)} ${k} / day</span></div>`;
        if (b.warped) html += `<div class="row" style="color:var(--wax)"><span>Warped by bloom</span><span>half output</span></div>`;
        for (const pid of [...b.residents, ...b.workers].slice(0, 6)) {
          const p = s.people.find(o => o.id === pid); if (!p) continue;
          const col = p.content > 60 ? '#4fb37a' : p.content > 30 ? '#d9a441' : '#b8342a';
          const bad = Object.entries(p.needs).filter(([k, v]) => (k === 'warped' ? v : !v)).map(([k]) => k);
          html += `<div class="row"><span><span class="face" style="background:${col}"></span>${p.rank}</span><span>${bad.length ? 'wants ' + bad.join(', ') : 'content'}</span></div>`;
        }
      } else if (t.terrain === 'spring') html = `<b>The Spring</b><div class="desc">Ley rises here, ${s.pressure} pressure into the channels that touch it.</div>`;
      else if (t.bloom) html = `<b>Bloom</b><div class="desc">Level ${t.bloom}. Fed by pooling ley nearby. Scour it, or ward it, and fix the channel that feeds it.</div>`;
      else if (t.channel) html = `<b>Ley channel</b><div class="desc">${t.ley >= 0 ? `${t.ley} tiles from the spring.` : 'Dry: not connected to a spring.'}${t.deadEnd ? ' <span style="color:var(--wax)">Dead end. Pooling.</span>' : ''}</div>`;
      else if (t.road) html = `<b>Street</b>`;
      else if (t.terrain === 'rock') html = `<b>Rock outcrop</b><div class="desc">A stonecutter's yard must touch this.</div>`;
      else if (t.tree === 1) html = `<b>Candle-pine</b><div class="desc">Timber for a woodcutter within 3 tiles.</div>`;
      else if (t.tree === 2) html = `<b>Inkwood</b><div class="desc">Company for homes within 2 tiles.</div>`;
      else html = `<span class="calm">Meadow.</span>`;
    }
    this.el.info.innerHTML = html;
  }

  showTip(x, y, text, bad) {
    const t = this.el.tip;
    if (!text) { t.style.display = 'none'; return; }
    t.style.display = 'block'; t.textContent = text; t.classList.toggle('bad', !!bad);
    t.style.left = (x + 16) + 'px'; t.style.top = (y + 16) + 'px';
  }
}
