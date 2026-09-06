import { createState, footprint } from './game/state.js';
import { BUILDINGS, TOOLS } from './game/defs.js';
import { tick, recomputeLey } from './game/sim.js';
import { checkBuilding, placeBuilding, checkTool, applyTool } from './game/place.js';
import { View } from './render/scene.js';
import { UI } from './ui/ui.js';
import { SCENARIOS } from './debug/scenarios.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.state = createState(+(params.get('seed') || 7));
    this.view = new View(document.getElementById('c'), this.state);
    this.ui = new UI(document.getElementById('ui'), this.state, this);
    this.tool = null;
    this.hoverTile = null;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false, button: 0, lastX: 0, lastY: 0, dragging: false };
    this.state.paused = true;
    const scenario = params.get('scenario');
    if (scenario && SCENARIOS[scenario]) {
      SCENARIOS[scenario](this.state);
      this.ui.el.intro.classList.add('hidden');
      this.state.paused = params.has('paused');
    }
    if (params.has('time')) this.state.time = +params.get('time');
    if (params.has('nointro')) { this.ui.el.intro.classList.add('hidden'); this.state.paused = false; }
    recomputeLey(this.state);
    // look at the entry road by default
    this.view.cam.x = (10 - 18 + 0.5) * 4; this.view.cam.z = (22 - 18 + 0.5) * 4; this.view.cam.dist = 58; this.view.cam.yaw = 0.45;
    this.bind();
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
    window.__hw = this; // debug / screenshot API
  }

  setTool(t) { this.tool = t; this.ui.paletteKey = ''; }

  bind() {
    const c = this.view.renderer.domElement;
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Escape') this.setTool(null);
      if (e.key === ' ') { e.preventDefault(); this.ui.setSpeed(0); }
      if (e.key === '1') this.ui.setSpeed(1); if (e.key === '2') this.ui.setSpeed(2); if (e.key === '3') this.ui.setSpeed(4);
      if (e.key.toLowerCase() === 'r' && !this.state.paused) this.setTool('road');
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    c.addEventListener('contextmenu', e => e.preventDefault());
    c.addEventListener('pointerdown', e => {
      this.mouse.down = true; this.mouse.button = e.button; this.mouse.lastX = e.clientX; this.mouse.lastY = e.clientY; this.mouse.dragging = false;
      if (e.button === 0 && this.tool) this.act(e);
    });
    window.addEventListener('pointerup', e => { this.mouse.down = false; if (e.button === 2 && !this.mouse.dragging) this.setTool(null); });
    c.addEventListener('pointermove', e => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
      if (this.mouse.down) {
        const dx = e.clientX - this.mouse.lastX, dy = e.clientY - this.mouse.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) this.mouse.dragging = true;
        const cam = this.view.cam;
        if (this.mouse.button === 2 || (this.mouse.button === 0 && !this.tool)) {
          const k = cam.dist * 0.0016;
          const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
          cam.x -= (dx * cy - dy * sy) * k; cam.z -= (-dx * sy - dy * cy) * k;
        } else if (this.mouse.button === 1) { cam.yaw -= dx * 0.006; cam.pitch = Math.max(0.35, Math.min(1.35, cam.pitch + dy * 0.004)); }
        else if (this.mouse.button === 0 && this.tool && (this.tool === 'road' || this.tool === 'channel')) this.act(e); // drag to paint streets
        this.mouse.lastX = e.clientX; this.mouse.lastY = e.clientY;
      }
    });
    c.addEventListener('wheel', e => { e.preventDefault(); this.view.cam.dist *= Math.exp(e.deltaY * 0.0012); }, { passive: false });
  }

  act(e) {
    const t = this.view.pickTile(e.clientX, e.clientY);
    if (!t) return;
    const s = this.state;
    if (BUILDINGS[this.tool]) {
      const [x, y] = this.anchor(t);
      const r = placeBuilding(s, this.tool, x, y);
      if (!r.ok) this.flash(r.reason);
      else if (!e.shiftKey && BUILDINGS[this.tool].size[0] * BUILDINGS[this.tool].size[1] > 1) this.setTool(null);
    } else if (TOOLS[this.tool]) {
      const r = applyTool(s, this.tool, t[0], t[1]);
      if (!r.ok && !this.mouse.dragging) this.flash(r.reason);
    }
  }
  anchor([x, y]) { const d = BUILDINGS[this.tool]; return [x - Math.floor((d.size[0] - 1) / 2), y - Math.floor((d.size[1] - 1) / 2)]; }
  flash(reason) { this.flashText = reason; this.flashT = 1.2; }

  updateCursor() {
    const v = this.view, s = this.state;
    const t = v.pickTile(this.mouse.x, this.mouse.y);
    this.hoverTile = t;
    if (!t || !this.tool) { v.setGhost(null); this.ui.showTip(this.mouse.x, this.mouse.y, this.flashT > 0 ? this.flashText : null, true); return; }
    if (BUILDINGS[this.tool]) {
      const d = BUILDINGS[this.tool];
      const [x, y] = this.anchor(t);
      const r = checkBuilding(s, this.tool, x, y);
      v.setGhost(footprint(d, x, y), r.ok, d.onChannel ? 0.5 : 3);
      const rad = d.company || d.wonder || d.ward || d.light || (this.tool === 'woodcutter' ? 3 : 0) || (this.tool === 'bakery' ? 4 : 0);
      if (rad) v.setGhostRadius(x + (d.size[0] - 1) / 2, y + (d.size[1] - 1) / 2, rad, d.ward ? 0x7a4fb3 : d.light ? 0xffc36a : 0xd9a441);
      this.ui.showTip(this.mouse.x, this.mouse.y, r.ok ? d.name : `${d.name}: ${r.reason}`, !r.ok);
    } else {
      const d = TOOLS[this.tool];
      const r = checkTool(s, this.tool, t[0], t[1]);
      v.setGhost([t], r.ok, 0.3);
      this.ui.showTip(this.mouse.x, this.mouse.y, r.ok ? d.name : `${d.name}: ${r.reason}`, !r.ok);
    }
  }

  frame(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    const cam = this.view.cam;
    const k = cam.dist * 0.9 * dt;
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    if (this.keys.has('w') || this.keys.has('arrowup')) { cam.x -= sy * k; cam.z -= cy * k; }
    if (this.keys.has('s') || this.keys.has('arrowdown')) { cam.x += sy * k; cam.z += cy * k; }
    if (this.keys.has('a') || this.keys.has('arrowleft')) { cam.x -= cy * k; cam.z += sy * k; }
    if (this.keys.has('d') || this.keys.has('arrowright')) { cam.x += cy * k; cam.z -= sy * k; }
    if (this.keys.has('q')) cam.yaw += dt * 1.6;
    if (this.keys.has('e')) cam.yaw -= dt * 1.6;
    if (this.flashT > 0) this.flashT -= dt;
    tick(this.state, dt);
    this.updateCursor();
    this.ui.update();
    this.view.render(dt);
    requestAnimationFrame(t => this.frame(t));
  }

  // ---- debug API used by tools/shoot.mjs and tools/playtest.mjs
  doPlace(type, x, y) { return placeBuilding(this.state, type, x, y); }
  doTool(tool, x, y) { return applyTool(this.state, tool, x, y); }
  advance(seconds) { const s = this.state; const was = s.paused; s.paused = false; const sp = s.speed; s.speed = 1; for (let t = 0; t < seconds; t += 0.25) tick(s, 0.25); s.speed = sp; s.paused = was; }
  setCamera({ x, z, yaw, pitch, dist }) {
    const c = this.view.cam;
    if (x !== undefined) c.x = x; if (z !== undefined) c.z = z; if (yaw !== undefined) c.yaw = yaw; if (pitch !== undefined) c.pitch = pitch; if (dist !== undefined) c.dist = dist;
  }
  lookAtTile(tx, ty, opts = {}) { this.setCamera({ x: (tx - 18 + 0.5) * 4, z: (ty - 18 + 0.5) * 4, ...opts }); }
  setTime(t) { this.state.time = t; this.view.sync(true); }
  hideUI(h) { document.getElementById('ui').style.display = h ? 'none' : ''; }
}

new Game();
