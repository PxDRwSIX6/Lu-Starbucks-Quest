(() => {
"use strict";
const C = window.CONFIG;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const T = C.TILE, W = C.MAP_W, H = C.MAP_H;
const GRASS = 0, TREE = 1, WATER = 2, PATH = 3, BRIDGE = 4;
const FONT = '"Press Start 2P", monospace';

// ---------------------------------------------------------------
//  Ecrã
// ---------------------------------------------------------------
let scale = 1, cssScale = 1, vw = 800, vh = 600;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  canvas.style.width = innerWidth + "px";
  canvas.style.height = innerHeight + "px";
  cssScale = Math.max(0.75, Math.min(innerWidth / 800, innerHeight / 520));
  scale = cssScale * dpr;
  vw = canvas.width / scale;
  vh = canvas.height / scale;
}
addEventListener("resize", resize);
resize();

// ---------------------------------------------------------------
//  Utilitários
// ---------------------------------------------------------------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function circle(x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function outlinedText(text, x, y, fill, stroke = "#1e3932", lw = 4) {
  ctx.lineJoin = "round"; ctx.lineWidth = lw; ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

// ---------------------------------------------------------------
//  Som (WebAudio, sem ficheiros)
// ---------------------------------------------------------------
let actx = null;
function initAudio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (actx && actx.state === "suspended") actx.resume();
}
function tone(freq, start, dur, type = "square", vol = 0.06) {
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  const t = actx.currentTime + start;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination);
  o.start(t); o.stop(t + dur);
}
const sfxPickup = () => { tone(660, 0, 0.08); tone(990, 0.07, 0.14); };
const sfxWin = () => { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.13, 0.22, "square", 0.07)); };

// ---------------------------------------------------------------
//  Sprites
// ---------------------------------------------------------------
const DIRS = ["front", "back", "left", "right"];
const sprites = {};
let spritesMissing = 0;
for (const d of DIRS) {
  sprites[d] = [];
  for (let n = 1; n <= 4; n++) {
    const img = new Image();
    const s = { img, ok: false, err: false };
    img.onload = () => { s.ok = true; };
    img.onerror = () => { s.err = true; spritesMissing++; };
    img.src = `${C.PLAYER_FOLDER}/${d}${n}.${C.PLAYER_EXT}`;
    sprites[d].push(s);
  }
}
const coffeeImg = { img: new Image(), ok: false };
coffeeImg.img.onload = () => { coffeeImg.ok = true; };
coffeeImg.img.src = C.COFFEE_IMAGE;

function drawPlayerSprite(x, y, dir, frame, size) {
  const s = sprites[dir][frame % 4];
  if (s.ok) {
    const k0 = size / C.SPRITE_SIZE;
    const h = size, w = C.SPRITE_WIDTH ? C.SPRITE_WIDTH * k0 : h * s.img.naturalWidth / s.img.naturalHeight;
    ctx.drawImage(s.img, Math.round(x - w / 2), Math.round(y - h + C.FEET_OFFSET * (size / C.SPRITE_SIZE)), Math.round(w), Math.round(h));
  } else {
    // boneco temporário enquanto não há sprites
    const k = size / 64, bob = (frame % 2) * 2 * k;
    ctx.fillStyle = "#e86fa8"; rrect(x - 12 * k, y - 34 * k - bob, 24 * k, 26 * k, 6 * k); ctx.fill();
    circle(x, y - 44 * k - bob, 12 * k, "#ffd9b8");
    ctx.fillStyle = "#222";
    if (dir === "front") { ctx.fillRect(x - 6 * k, y - 46 * k - bob, 3 * k, 4 * k); ctx.fillRect(x + 3 * k, y - 46 * k - bob, 3 * k, 4 * k); }
    if (dir === "left") ctx.fillRect(x - 8 * k, y - 46 * k - bob, 3 * k, 4 * k);
    if (dir === "right") ctx.fillRect(x + 5 * k, y - 46 * k - bob, 3 * k, 4 * k);
    ctx.fillStyle = "#6b3fa0"; ctx.fillRect(x - 10 * k, y - 8 * k, 8 * k, 8 * k); ctx.fillRect(x + 2 * k, y - 8 * k, 8 * k, 8 * k);
  }
}

// ---------------------------------------------------------------
//  Mundo
// ---------------------------------------------------------------
let map, reach, mini, rng, spawn;
function tileAt(tx, ty) { return map[ty * W + tx]; }

function genWorld() {
  const seed = C.SEED != null ? C.SEED : (Math.random() * 1e9) | 0;
  rng = mulberry32(seed);
  map = new Uint8Array(W * H);
  const sx = W >> 1, sy = H >> 1;
  spawn = { x: (sx + 0.5) * T, y: (sy + 0.5) * T };

  // lagos
  for (let i = 0; i < 14; i++) {
    const cx = rng() * W, cy = rng() * H, rx = 2 + rng() * 4, ry = 2 + rng() * 3;
    for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++)
      for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy < 1 + (hash(x, y) - 0.5) * 0.5) map[y * W + x] = WATER;
      }
  }
  // florestas
  for (let i = 0; i < 24; i++) {
    const cx = rng() * W, cy = rng() * H, r = 3 + rng() * 6;
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        if ((x - cx) ** 2 + (y - cy) ** 2 < r * r && map[y * W + x] === GRASS && rng() < 0.55) map[y * W + x] = TREE;
      }
  }
  // árvores soltas
  for (let i = 0; i < W * H; i++) if (map[i] === GRASS && rng() < 0.035) map[i] = TREE;

  // caminhos (2 tiles de largura) — pontes sobre a água
  const laySegment = (x, y) => {
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return;
    const t = map[y * W + x];
    map[y * W + x] = t === WATER ? BRIDGE : PATH;
  };
  const rows = [sy, ...Array.from({ length: 3 }, () => 5 + Math.floor(rng() * (H - 10)))];
  const cols = [sx, ...Array.from({ length: 3 }, () => 5 + Math.floor(rng() * (W - 10)))];
  for (const r of rows) for (let x = 0; x < W; x++) { laySegment(x, r); laySegment(x, r + 1); }
  for (const c of cols) for (let y = 0; y < H; y++) { laySegment(c, y); laySegment(c + 1, y); }

  // borda de árvores
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) map[y * W + x] = TREE;

  // zona inicial limpa
  for (let y = sy - 3; y <= sy + 3; y++) for (let x = sx - 3; x <= sx + 3; x++)
    if (map[y * W + x] === TREE || map[y * W + x] === WATER) map[y * W + x] = GRASS;

  // alcançabilidade (BFS) — para nunca pôr cafés em sítios impossíveis
  reach = new Uint8Array(W * H);
  const q = [sy * W + sx]; reach[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const cur = q[i], cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const n = ny * W + nx, t = map[n];
      if (reach[n] || t === TREE || t === WATER) continue;
      reach[n] = 1; q.push(n);
    }
  }

  // minimapa
  mini = document.createElement("canvas"); mini.width = W; mini.height = H;
  const m = mini.getContext("2d");
  const colors = ["#6cc04a", "#2f8f3a", "#3b8fd9", "#d8b878", "#a9743f"];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { m.fillStyle = colors[map[y * W + x]]; m.fillRect(x, y, 1, 1); }
}

function solidAt(px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T);
  if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
  const t = map[ty * W + tx];
  return t === TREE || t === WATER;
}
function blocked(x, y) {
  const hw = C.HITBOX_W / 2, hh = C.HITBOX_H;
  return solidAt(x - hw, y - hh) || solidAt(x + hw, y - hh) || solidAt(x - hw, y) || solidAt(x + hw, y);
}

// ---------------------------------------------------------------
//  Estado do jogo
// ---------------------------------------------------------------
let state = "title"; // title | play | win
let time = 0;
let player, coffees, collected, particles, floats, winDelay;
let cam = { x: 0, y: 0 };

function placeCoffees() {
  coffees = [];
  let tries = 0;
  while (coffees.length < C.TOTAL_COFFEES && tries < 40000) {
    tries++;
    const tx = Math.floor(rng() * W), ty = Math.floor(rng() * H);
    if (!reach[ty * W + tx]) continue;
    const x = (tx + 0.5) * T, y = (ty + 0.75) * T;
    if (Math.hypot(x - spawn.x, y - spawn.y) < 400) continue;
    const minD = tries > 20000 ? 120 : 320;
    if (coffees.some(c => Math.hypot(c.x - x, c.y - y) < minD)) continue;
    coffees.push({ x, y, got: false, phase: rng() * 6 });
  }
}

function initGame() {
  genWorld();
  placeCoffees();
  player = { x: spawn.x, y: spawn.y, dir: "front", moving: false, animT: 0, frame: 0 };
  collected = 0; particles = []; floats = []; winDelay = null;
  winScene = null;
  document.getElementById("winButtons").style.display = "none";
}

// ---------------------------------------------------------------
//  Input
// ---------------------------------------------------------------
const held = new Set();
const KEYMAP = {
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
};
addEventListener("keydown", e => {
  initAudio();
  if (KEYMAP[e.code]) { held.add(KEYMAP[e.code]); e.preventDefault(); }
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") held.add("run");
  if (e.code === "Enter" || e.code === "Space") {
    e.preventDefault();
    if (state === "title") state = "play";
  }
  if (state === "win") {
    if (e.code === "KeyE") sendHearts();
    if (e.code === "KeyR") restart();
  }
});
addEventListener("keyup", e => {
  if (KEYMAP[e.code]) held.delete(KEYMAP[e.code]);
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") held.delete("run");
});
addEventListener("blur", () => held.clear());
canvas.addEventListener("pointerdown", () => { initAudio(); if (state === "title") state = "play"; });

// ---- Controlos de telemóvel: joystick analógico + botão sprint ----
const touchUI = document.getElementById("touchControls");
const joyBase = document.getElementById("joyBase");
const joyKnob = document.getElementById("joyKnob");
const sprintBtn = document.getElementById("sprintBtn");
const joy = { x: 0, y: 0, id: null };
const touchEnabled = C.TOUCH_CONTROLS === true || (C.TOUCH_CONTROLS === "auto" && matchMedia("(pointer: coarse)").matches);

joyBase.style.width = joyBase.style.height = C.JOYSTICK_SIZE + "px";
const knobSize = C.JOYSTICK_SIZE * 0.42;
joyKnob.style.width = joyKnob.style.height = knobSize + "px";
joyKnob.style.marginLeft = joyKnob.style.marginTop = -knobSize / 2 + "px";
sprintBtn.style.width = sprintBtn.style.height = C.SPRINT_BUTTON_SIZE + "px";

function updateTouchUI() { touchUI.style.display = touchEnabled && state !== "win" ? "block" : "none"; }

function joyMove(e) {
  const r = joyBase.getBoundingClientRect();
  const max = r.width / 2;
  let dx = e.clientX - (r.left + max), dy = e.clientY - (r.top + max);
  const d = Math.hypot(dx, dy);
  if (d > max) { dx = dx / d * max; dy = dy / d * max; }
  joy.x = dx / max; joy.y = dy / max;
  joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}
function joyReset() { joy.x = 0; joy.y = 0; joy.id = null; joyKnob.style.transform = "translate(0,0)"; }
joyBase.addEventListener("pointerdown", e => {
  e.preventDefault(); initAudio();
  joyBase.setPointerCapture(e.pointerId); joy.id = e.pointerId; joyMove(e);
  if (state === "title") state = "play";
});
joyBase.addEventListener("pointermove", e => { if (e.pointerId === joy.id) { e.preventDefault(); joyMove(e); } });
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  joyBase.addEventListener(ev, e => { if (e.pointerId === joy.id) joyReset(); });

const sprintOn = e => { e.preventDefault(); initAudio(); sprintBtn.setPointerCapture(e.pointerId); held.add("run"); sprintBtn.classList.add("active"); if (state === "title") state = "play"; };
const sprintOff = e => { held.delete("run"); sprintBtn.classList.remove("active"); };
sprintBtn.addEventListener("pointerdown", sprintOn);
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) sprintBtn.addEventListener(ev, sprintOff);

addEventListener("contextmenu", e => e.preventDefault());

document.getElementById("btnHearts").addEventListener("click", () => sendHearts());
document.getElementById("btnRestart").addEventListener("click", restart);
if (!C.HEARTS_ENABLED) document.getElementById("btnHearts").style.display = "none";

function restart() { initGame(); state = "play"; updateTouchUI(); }

// ---------------------------------------------------------------
//  Cena final
// ---------------------------------------------------------------
let winScene = null;
function enterWin() {
  state = "win";
  updateTouchUI();
  document.getElementById("winButtons").style.display = "flex";
  winScene = { t: 0, hearts: [], heartQueue: C.HEARTS_ENABLED ? C.HEARTS_PER_PRESS : 0, heartT: 0, confetti: [] };
  const cols = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff9ff3", "#00a862"];
  for (let i = 0; i < 160; i++) winScene.confetti.push({
    x: Math.random() * 1200, y: -Math.random() * 800, vy: 60 + Math.random() * 120, vx: (Math.random() - 0.5) * 40,
    rot: Math.random() * 6, vr: (Math.random() - 0.5) * 8, c: cols[(Math.random() * cols.length) | 0], s: 5 + Math.random() * 7,
  });
  sfxWin();
}
function sendHearts() {
  if (state !== "win" || !C.HEARTS_ENABLED || !winScene) return;
  winScene.heartQueue += C.HEARTS_PER_PRESS;
  tone(880, 0, 0.08, "sine", 0.08); tone(1175, 0.08, 0.12, "sine", 0.08);
}

// ---------------------------------------------------------------
//  Update
// ---------------------------------------------------------------
function update(dt) {
  if (state === "play") {
    let dx = 0, dy = 0, mag = 1;
    const jm = Math.hypot(joy.x, joy.y);
    if (jm > 0.18) { dx = joy.x; dy = joy.y; mag = clamp(jm, 0.4, 1); }
    else {
      if (held.has("left")) dx--; if (held.has("right")) dx++;
      if (held.has("up")) dy--; if (held.has("down")) dy++;
    }
    player.moving = dx !== 0 || dy !== 0;
    if (player.moving) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      const sp = C.SPEED * mag * (held.has("run") ? C.RUN_MULT : 1);
      const tryMove = (mx, my) => { const nx = player.x + mx, ny = player.y + my; if (!blocked(nx, ny)) { player.x = nx; player.y = ny; } };
      tryMove(dx * sp * dt, 0); tryMove(0, dy * sp * dt);
      player.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "back" : "front");
      player.animT += dt * (held.has("run") ? 1.4 : 1);
      player.frame = Math.floor(player.animT * C.ANIM_FPS) % 4;
    } else { player.animT = 0; player.frame = 0; }

    // apanhar cafés
    for (const c of coffees) {
      if (!c.got && Math.hypot(c.x - player.x, c.y - player.y) < C.PICKUP_RADIUS) {
        c.got = true; collected++; sfxPickup();
        floats.push({ x: c.x, y: c.y - 40, t: 0, text: "+1" });
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 100;
          particles.push({ x: c.x, y: c.y - 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.6, max: 0.6, color: i % 2 ? "#00a862" : "#fff3a0" });
        }
      }
    }
    if (collected >= C.TOTAL_COFFEES && winDelay === null) winDelay = 1.1;
    if (winDelay !== null) { winDelay -= dt; if (winDelay <= 0) enterWin(); }
  } else if (state === "title") {
    player.frame = 0;
  }

  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  for (const f of floats) { f.t += dt; f.y -= 40 * dt; }
  floats = floats.filter(f => f.t < 1);

  if (state === "win" && winScene) {
    winScene.t += dt;
    for (const c of winScene.confetti) {
      c.y += c.vy * dt; c.x += c.vx * dt; c.rot += c.vr * dt;
      if (c.y > vh + 20) { c.y = -20; c.x = Math.random() * vw; }
    }
    winScene.heartT -= dt;
    if (winScene.heartQueue > 0 && winScene.heartT <= 0) { winScene.heartT = 0.05; winScene.heartQueue--; winScene.spawnHeart = true; }
    for (const h of winScene.hearts) { h.x += h.vx * dt; h.y += h.vy * dt; h.life -= dt; }
    winScene.hearts = winScene.hearts.filter(h => h.life > 0);
  }

  // câmara
  const worldW = W * T, worldH = H * T;
  cam.x = clamp(player.x - vw / 2, 0, Math.max(0, worldW - vw));
  cam.y = clamp(player.y - vh / 2, 0, Math.max(0, worldH - vh));
}

// ---------------------------------------------------------------
//  Desenho do mundo
// ---------------------------------------------------------------
function drawGround() {
  const x0 = Math.max(0, Math.floor(cam.x / T)), x1 = Math.min(W - 1, Math.floor((cam.x + vw) / T));
  const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(H - 1, Math.floor((cam.y + vh) / T));
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = tileAt(tx, ty), r = hash(tx, ty);
    const px = Math.floor(tx * T - cam.x), py = Math.floor(ty * T - cam.y);
    if (t === WATER || t === BRIDGE) {
      ctx.fillStyle = "#3b8fd9"; ctx.fillRect(px, py, T + 1, T + 1);
      const w = Math.sin(time * 2 + tx * 1.3 + ty * 0.7 + r * 6);
      if (w > 0.4) { ctx.fillStyle = "#8cc8f5"; ctx.fillRect(px + 8 + r * 16, py + 10 + r * 20, 14, 2); }
      if (t === BRIDGE) {
        ctx.fillStyle = "#a9743f"; ctx.fillRect(px, py + 4, T + 1, T - 8);
        ctx.fillStyle = "#7a5128";
        for (let i = 0; i < T; i += 8) ctx.fillRect(px + i, py + 4, 2, T - 8);
        ctx.fillRect(px, py + 4, T + 1, 3); ctx.fillRect(px, py + T - 7, T + 1, 3);
      }
    } else if (t === PATH) {
      ctx.fillStyle = r < 0.5 ? "#d8b878" : "#d2b072"; ctx.fillRect(px, py, T + 1, T + 1);
      ctx.fillStyle = "#b89658";
      ctx.fillRect(px + r * 30, py + 8 + r * 20, 3, 3); ctx.fillRect(px + 10 + r * 25, py + 30 - r * 10, 3, 2);
    } else {
      ctx.fillStyle = r < 0.5 ? "#6cc04a" : "#66b944"; ctx.fillRect(px, py, T + 1, T + 1);
      if (r > 0.75 && t !== TREE) {
        ctx.fillStyle = "#4f9a35";
        ctx.fillRect(px + 10 + r * 10, py + 14, 2, 6); ctx.fillRect(px + 14 + r * 10, py + 12, 2, 8); ctx.fillRect(px + 18 + r * 10, py + 15, 2, 5);
      }
      if (r > 0.96 && t !== TREE) {
        const fc = ["#ffffff", "#ffd54a", "#ff7eb6", "#b388ff"][Math.floor(hash(tx + 5, ty + 9) * 4)];
        ctx.fillStyle = fc; ctx.fillRect(px + 20, py + 24, 4, 4); ctx.fillRect(px + 18, py + 26, 8, 0);
        ctx.fillStyle = "#ffe066"; ctx.fillRect(px + 21, py + 25, 2, 2);
      }
    }
  }
}

function drawTree(tx, ty) {
  const r = hash(tx + 99, ty + 7);
  const cx = tx * T + T / 2 - cam.x, by = (ty + 1) * T - cam.y - 4;
  const pal = r < 0.33 ? ["#2f8f3a", "#37a243", "#4cbf56"] : r < 0.66 ? ["#2a8546", "#339a52", "#47b565"] : ["#38953a", "#43ab45", "#5ac75c"];
  ellipse(cx, by + 2, 20, 7, "rgba(0,0,0,0.2)");
  ctx.fillStyle = "#7a4a25"; ctx.fillRect(cx - 5, by - 16, 10, 18);
  ctx.fillStyle = "#5e3719"; ctx.fillRect(cx + 1, by - 16, 4, 18);
  circle(cx, by - 34, 22, pal[0]);
  circle(cx - 11, by - 26, 16, pal[1]);
  circle(cx + 11, by - 26, 16, pal[1]);
  circle(cx - 6, by - 40, 9, pal[2]);
}

function drawCupShape(cx, by, h) {
  const w = h * 0.62, top = by - h * 0.78, bh = h * 0.78;
  const hw = f => (w / 2) * (1 - 0.28 * f);
  ctx.lineJoin = "round"; ctx.lineWidth = 2; ctx.strokeStyle = "#1e3932";
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(cx - hw(0), top); ctx.lineTo(cx + hw(0), top); ctx.lineTo(cx + hw(1), by); ctx.lineTo(cx - hw(1), by); ctx.closePath();
  ctx.fill(); ctx.stroke();
  // manga verde
  ctx.fillStyle = "#00704a";
  ctx.beginPath();
  ctx.moveTo(cx - hw(0.25), top + bh * 0.25); ctx.lineTo(cx + hw(0.25), top + bh * 0.25);
  ctx.lineTo(cx + hw(0.8), top + bh * 0.8); ctx.lineTo(cx - hw(0.8), top + bh * 0.8); ctx.closePath(); ctx.fill();
  // logo
  circle(cx, top + bh * 0.52, w * 0.17, "#ffffff");
  circle(cx, top + bh * 0.52, w * 0.11, "#00a862");
  // tampa
  ctx.fillStyle = "#1e3932"; rrect(cx - w / 2 - 2, top - h * 0.14, w + 4, h * 0.14, 3); ctx.fill();
  ctx.fillStyle = "#2c5a4d"; rrect(cx - w / 2 + 3, top - h * 0.22, w - 6, h * 0.09, 3); ctx.fill();
}

function drawCoffee(c) {
  const bob = Math.sin(time * 3 + c.phase) * 3;
  const cx = c.x - cam.x, by = c.y - cam.y;
  const pulse = 0.5 + 0.5 * Math.sin(time * 4 + c.phase);
  ellipse(cx, by, 14 - bob * 0.3, 5, "rgba(0,0,0,0.25)");
  circle(cx, by - 18 + bob, 24 + pulse * 3, `rgba(255,240,150,${0.12 + pulse * 0.1})`);
  if (coffeeImg.ok) {
    const h = C.COFFEE_SIZE, w = h * coffeeImg.img.naturalWidth / coffeeImg.img.naturalHeight;
    ctx.drawImage(coffeeImg.img, Math.round(cx - w / 2), Math.round(by - h + bob), Math.round(w), Math.round(h));
  } else {
    drawCupShape(cx, by + bob - 4, C.COFFEE_SIZE);
  }
}

function drawWorld() {
  drawGround();
  const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(W - 1, Math.floor((cam.x + vw) / T) + 1);
  const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(H - 1, Math.floor((cam.y + vh) / T) + 2);
  const items = [];
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++)
    if (tileAt(tx, ty) === TREE) items.push({ y: (ty + 1) * T, draw: () => drawTree(tx, ty) });
  for (const c of coffees) if (!c.got) {
    if (c.x > cam.x - 60 && c.x < cam.x + vw + 60 && c.y > cam.y - 60 && c.y < cam.y + vh + 60)
      items.push({ y: c.y, draw: () => drawCoffee(c) });
  }
  items.push({ y: player.y, draw: () => {
    const px = player.x - cam.x, py = player.y - cam.y;
    ellipse(px, py, C.SHADOW_SIZE, C.SHADOW_SIZE * 0.36, "rgba(0,0,0,0.28)");
    drawPlayerSprite(px, py, player.dir, player.frame, C.SPRITE_SIZE);
  } });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();

  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color; ctx.fillRect(p.x - cam.x - 2, p.y - cam.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  ctx.font = `14px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const f of floats) { ctx.globalAlpha = 1 - f.t; outlinedText(f.text, f.x - cam.x, f.y - cam.y, "#fff3a0", "#1e3932", 4); }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------
//  HUD
// ---------------------------------------------------------------
function drawHUD() {
  // contador
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1e3932"; ctx.lineWidth = 3;
  rrect(12, 12, 130, 40, 10); ctx.fill(); ctx.stroke();
  drawCupShape(34, 44, 28);
  ctx.font = `13px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#1e3932";
  ctx.fillText(`${collected}/${C.TOTAL_COFFEES}`, 58, 33);

  // minimapa
  if (C.SHOW_MINIMAP && mini) {
    const mw = 150, mh = Math.round(mw * H / W), mx = vw - mw - 14, my = 14;
    ctx.fillStyle = "#fff"; rrect(mx - 4, my - 4, mw + 8, mh + 8, 6); ctx.fill();
    ctx.strokeStyle = "#1e3932"; ctx.lineWidth = 3; ctx.stroke();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mini, mx, my, mw, mh);
    const sx = mw / (W * T), sy = mh / (H * T);
    if (C.MINIMAP_SHOW_COFFEES) for (const c of coffees) if (!c.got) {
      circle(mx + c.x * sx, my + c.y * sy, 3, "#ffffff"); circle(mx + c.x * sx, my + c.y * sy, 2, "#00704a");
    }
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
    ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, vw * sx, vh * sy);
    if (Math.floor(time * 3) % 2 === 0) circle(mx + player.x * sx, my + player.y * sy, 3, "#ff2d75");
  }
}

// ---------------------------------------------------------------
//  Ecrã de título
// ---------------------------------------------------------------
function drawTitle() {
  ctx.fillStyle = "rgba(10,30,25,0.55)"; ctx.fillRect(0, 0, vw, vh);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `28px ${FONT}`;
  outlinedText(C.GAME_TITLE, vw / 2, vh * 0.28 + Math.sin(time * 2) * 4, "#00c070", "#0b2a22", 8);
  drawCupShape(vw / 2, vh * 0.5, 70);
  ctx.font = `12px ${FONT}`;
  outlinedText(`Apanha ${C.TOTAL_COFFEES} cafés!`, vw / 2, vh * 0.58, "#ffffff", "#0b2a22", 5);
  if (Math.floor(time * 2) % 2 === 0) outlinedText("ENTER ou toca para começar", vw / 2, vh * 0.68, "#fff3a0", "#0b2a22", 5);
  ctx.font = `9px ${FONT}`;
  outlinedText("Setas / WASD = andar    Shift = correr", vw / 2, vh * 0.76, "#ffffff", "#0b2a22", 4);
  if (spritesMissing > 0) {
    outlinedText(`⚠ Sprites não encontrados em ${C.PLAYER_FOLDER}/ (a usar boneco temporário)`, vw / 2, vh * 0.86, "#ffb3b3", "#3a0b0b", 4);
  }
}

// ---------------------------------------------------------------
//  Cena de parabéns
// ---------------------------------------------------------------
const HEART_COLORS = ["#ff4d8d", "#ff77a9", "#ff2d75", "#ffb3d1", "#ff6b6b"];
function heart(x, y, s, color) {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(x, y + s * 0.6);
  ctx.bezierCurveTo(x - s * 1.0, y - s * 0.1, x - s * 0.55, y - s * 0.85, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 0.85, x + s * 1.0, y - s * 0.1, x, y + s * 0.6);
  ctx.fill();
}

function wrapLines(text, maxW) {
  const out = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) { out.push(line); line = word; } else line = test;
    }
    out.push(line);
  }
  return out;
}

function drawWin() {
  const S = winScene;
  ctx.fillStyle = "rgba(25,12,45,0.88)"; ctx.fillRect(0, 0, vw, vh);
  // confetti
  for (const c of S.confetti) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = c.c;
    ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2); ctx.restore();
  }
  // título
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const titleSize = clamp(vw / 18, 20, 42);
  ctx.font = `${titleSize}px ${FONT}`;
  const hue = (S.t * 120) % 360;
  outlinedText(C.WIN_TITLE, vw / 2, vh * 0.12 + Math.sin(S.t * 5) * 6, `hsl(${hue},90%,65%)`, "#1a0b2e", 8);

  // caixa de diálogo
  ctx.font = `12px ${FONT}`;
  const boxW = Math.min(vw - 32, 640), pad = 18, lh = 24;
  const lines = wrapLines(C.WIN_MESSAGE, boxW - pad * 2);
  const boxH = lines.length * lh + pad * 2;
  const bottomMargin = 78 / cssScale;
  const boxX = (vw - boxW) / 2, boxY = vh - bottomMargin - boxH;

  // jogador
  const size = Math.min(C.SPRITE_SIZE * C.WIN_SPRITE_SCALE, vh * 0.32);
  const feetY = Math.min(vh * 0.14 + size + 40, boxY - 14);
  const cx = vw / 2;
  ellipse(cx, feetY, size * 0.22, size * 0.06, "rgba(0,0,0,0.35)");
  const bounce = Math.abs(Math.sin(S.t * 6)) * 12;
  drawPlayerSprite(cx, feetY - bounce, "front", Math.floor(S.t * 6) % 4, size);

  // corações
  if (S.spawnHeart) {
    S.spawnHeart = false;
    S.hearts.push({
      x: cx + (Math.random() - 0.5) * size * 0.7, y: feetY - size * (0.6 + Math.random() * 0.3),
      vx: (Math.random() - 0.5) * 50, vy: -(50 + Math.random() * 60),
      size: 8 + Math.random() * 14, life: 2, max: 2, ph: Math.random() * 6,
      color: HEART_COLORS[(Math.random() * HEART_COLORS.length) | 0],
    });
  }
  for (const h of S.hearts) {
    ctx.globalAlpha = clamp(h.life / h.max * 1.5, 0, 1);
    heart(h.x + Math.sin(h.life * 5 + h.ph) * 8, h.y, h.size, h.color);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1e3932"; ctx.lineWidth = 4;
  rrect(boxX, boxY, boxW, boxH, 12); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#00a862"; ctx.lineWidth = 2; rrect(boxX + 5, boxY + 5, boxW - 10, boxH - 10, 8); ctx.stroke();

  // máquina de escrever
  let remaining = Math.floor(S.t * 28), total = lines.join("").length;
  ctx.font = `12px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillStyle = "#1e3932";
  lines.forEach((ln, i) => {
    const part = ln.slice(0, Math.max(0, remaining)); remaining -= ln.length;
    ctx.fillText(part, boxX + pad, boxY + pad + i * lh + 4);
  });
  if (S.t * 28 >= total && Math.floor(S.t * 2) % 2 === 0) {
    ctx.fillStyle = "#00a862"; ctx.beginPath();
    const tx = boxX + boxW - 26, ty = boxY + boxH - 22;
    ctx.moveTo(tx, ty); ctx.lineTo(tx + 12, ty); ctx.lineTo(tx + 6, ty + 9); ctx.fill();
  }
}

// ---------------------------------------------------------------
//  Loop
// ---------------------------------------------------------------
function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, vw, vh);
  drawWorld();
  if (state === "play") drawHUD();
  if (state === "title") drawTitle();
  if (state === "win") drawWin();
}

initGame();
updateTouchUI();
let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts; time += dt;
  update(dt); draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
})();
