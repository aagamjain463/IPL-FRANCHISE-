"use strict";
/* Interactive preview of the Phase 1 batting engine.
 * Same math as the Unity prototype (engine.js mirrors Core/Batting).
 * Controls: left half = joystick footwork, right half = swipe (release = timed shot),
 * DEF/NOR/POW/LOFT buttons = intent. Mouse works too (desktop testing). */

/* ================= canvas & projection ================= */
const canvas = document.getElementById("view");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, DPR = 1, FOCAL = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * DPR; canvas.height = H * DPR;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  FOCAL = (H / 2) / Math.tan((55 * Math.PI / 180) / 2);
}
window.addEventListener("resize", resize);
resize();

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const norm = (a) => { const m = Math.hypot(a.x, a.y, a.z) || 1; return { x: a.x / m, y: a.y / m, z: a.z / m }; };
const lerp3 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });

function makeCamera(pos, look) {
  const f = norm(sub(look, pos));
  const r = norm(cross(f, { x: 0, y: 1, z: 0 }));
  const u = cross(r, f);
  return { pos, f, r, u };
}

function toCamSpace(cam, p) {
  const d = sub(p, cam.pos);
  return { xc: dot(d, cam.r), yc: dot(d, cam.u), zc: dot(d, cam.f) };
}
function projectCS(c) {
  return { x: W / 2 + FOCAL * c.xc / c.zc, y: H / 2 - FOCAL * c.yc / c.zc, z: c.zc, s: FOCAL / c.zc };
}
function project(cam, p) {
  const c = toCamSpace(cam, p);
  if (c.zc < 0.15) return null;
  return projectCS(c);
}
// Sutherland-Hodgman clip of a camera-space polygon against zc >= near.
function clipNear(points, near) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const aIn = a.zc >= near, bIn = b.zc >= near;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (near - a.zc) / (b.zc - a.zc);
      out.push({ xc: a.xc + (b.xc - a.xc) * t, yc: a.yc + (b.yc - a.yc) * t, zc: near });
    }
  }
  return out;
}
function fillPoly(cam, worldPts, color) {
  const cs = clipNear(worldPts.map((p) => toCamSpace(cam, p)), 0.2);
  if (cs.length < 3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  cs.forEach((c, i) => { const p = projectCS(c); i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
  ctx.closePath();
  ctx.fill();
}
function line3(cam, a, b, color, width) {
  const pa = project(cam, a), pb = project(cam, b);
  if (!pa || !pb) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, width * ((pa.s + pb.s) / 2));
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
}
function circle3(cam, p, radiusWorld, color) {
  const pr = project(cam, p);
  if (!pr) return null;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(pr.x, pr.y, Math.max(1.2, radiusWorld * pr.s), 0, Math.PI * 2); ctx.fill();
  return pr;
}

/* ================= game state ================= */
const engine = new BattingEngine();
const bowlerCfg = { speed: 126, line: 0.15, length: 0.52, swing: 0 };

let phase = "pre", phaseT = 0;
let runs = 0, wickets = 0, balls = 0;
let bowlerZ = 26, bowlerArmT = 0;
let resolvedThisBall = false;
let struckApplied = false;
let stumpKnock = 0; // 0..1 animation

const flight = { mode: "hidden", t: 0, pos: { x: 0, y: 1, z: 20 }, vel: { x: 0, y: 0, z: 0 }, grounded: false, restTimer: 0 };
const swingAnim = { active: false, t: 0, dur: 0.4, contactFrac: 0.4, yawDeg: 0 };

const SETUP_POS = { x: 11.5, y: 4.6, z: 10 }, SETUP_LOOK = { x: 0, y: 1.0, z: 10 };
const GAME_POS = { x: 0.42, y: 2.75, z: -5.4 }, GAME_LOOK = { x: 0, y: 1.05, z: 9 };
let camMode = "setup";
const cam = { pos: { ...SETUP_POS }, look: { ...SETUP_LOOK } };

const KEEPER_POS = { x: 0, y: 0, z: -2.6 };
const FIELDERS = [
  { x: -20, z: 14 }, { x: 20, z: 14 }, { x: -31, z: 30 }, { x: 31, z: 30 },
  { x: -13, z: 44 }, { x: 13, z: 44 }, { x: 0, z: 52 }, { x: -40, z: 6 },
];

/* ================= input (touch + mouse via Pointer Events) ================= */
const inputState = {
  intent: "normal",
  joy: null,      // { id, ax, ay, vx, vy }
  swipe: null,    // { id, ax, ay, cx, cy }
  swingQueue: null,
};

const intentBtns = [...document.querySelectorAll(".intent")];
intentBtns.forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    inputState.intent = btn.dataset.intent;
    intentBtns.forEach((b) => b.classList.toggle("on", b === btn));
  });
});
intentBtns[1].classList.add("on");

function isOverUI(x, y) {
  const el = document.elementFromPoint(x, y);
  return !!(el && el.closest(".ui"));
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  if (isOverUI(e.clientX, e.clientY)) return;
  if (e.clientX < W / 2) {
    if (!inputState.joy) inputState.joy = { id: e.pointerId, ax: e.clientX, ay: e.clientY, vx: 0, vy: 0 };
  } else if (!inputState.swipe) {
    inputState.swipe = { id: e.pointerId, ax: e.clientX, ay: e.clientY, cx: e.clientX, cy: e.clientY };
  }
});
canvas.addEventListener("pointermove", (e) => {
  const j = inputState.joy, s = inputState.swipe;
  if (j && e.pointerId === j.id) {
    const radius = Math.max(60, H * 0.11);
    let dx = e.clientX - j.ax, dy = e.clientY - j.ay;
    const m = Math.hypot(dx, dy);
    if (m > radius) { dx *= radius / m; dy *= radius / m; }
    j.vx = dx / radius; j.vy = -dy / radius;
  }
  if (s && e.pointerId === s.id) { s.cx = e.clientX; s.cy = e.clientY; }
});
function endPointer(e) {
  const j = inputState.joy, s = inputState.swipe;
  if (j && e.pointerId === j.id) { inputState.joy = null; }
  if (s && e.pointerId === s.id) {
    const dx = s.cx - s.ax, dyUp = -(s.cy - s.ay);
    const mag = Math.hypot(dx, dyUp);
    let dirX = 0, dirY = 1, strength = 0.35;
    if (mag >= 18) {
      dirX = dx / mag; dirY = dyUp / mag;
      strength = clamp(mag / (H * 0.35), 0, 1);
    }
    inputState.swingQueue = { dirX, dirY, strength };
    inputState.swipe = null;
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);

function sampleInputFrame() {
  const j = inputState.joy;
  const frame = {
    footX: j ? j.vx : 0,
    footY: j ? j.vy : 0,
    intent: inputState.intent,
    swing: false, dirX: 0, dirY: 1, strength: 0,
  };
  if (inputState.swingQueue) {
    const q = inputState.swingQueue;
    inputState.swingQueue = null;
    frame.swing = true; frame.dirX = q.dirX; frame.dirY = q.dirY; frame.strength = q.strength;
  }
  return frame;
}

/* ================= engine events ================= */
engine.onSwing = (report) => {
  const timeUntilContact = Math.max(0.05, engine.traj.time_to_contact - engine.t);
  swingAnim.active = true;
  swingAnim.t = 0;
  swingAnim.dur = timeUntilContact + 0.30;
  swingAnim.contactFrac = timeUntilContact / swingAnim.dur;
  swingAnim.yawDeg = report.direction.angle * 57.29578;
};

engine.onPassed = (r) => {
  if (r.hit_stumps) {
    wickets++;
    stumpKnock = 0.0001;
    showPopup("BOWLED!", "#ff4a3c", 1.4);
  } else if (r.swung) {
    showPopup("BEATEN!", "#ffbf5e", 0.9);
  } else {
    showPopup("LEFT ALONE", "#cfe2ff", 0.8);
  }
  camMode = "game";
};

/* ================= delivery flow ================= */
function nextDeliveryData() {
  return makeDelivery(bowlerCfg.speed, bowlerCfg.line, bowlerCfg.length, bowlerCfg.swing);
}

function startBall() {
  phase = "pre"; phaseT = 0;
  bowlerZ = 26; bowlerArmT = 0;
  stumpKnock = 0;
  resolvedThisBall = false;
  flight.mode = "hidden";
  updateScoreboard();
}

function releaseBall() {
  engine.beginDelivery(nextDeliveryData());
  struckApplied = false;
  flight.mode = "traj";
  flight.t = 0;
  flight.pos = engine.traj.position(0);
  flight.grounded = false;
  flight.restTimer = 0;
  camMode = "game";
  phase = "delivery";
}

function applyContact() {
  const swing = engine.lastSwing;
  if (!swing || !swing.will_contact) return;
  struckApplied = true;
  const c = swing.contact;
  flight.mode = "free";
  flight.pos = { ...engine.traj.position(engine.traj.time_to_contact) };
  const speed = c.exit_kph / 3.6;
  flight.vel = { x: c.direction.x * speed, y: c.direction.y * speed, z: c.direction.z * speed };
  flight.grounded = false;
  flight.restTimer = 0;
  camMode = "follow";
  const winTxt = swing.window.replace("_", " ").toUpperCase();
  const col = swing.window === "perfect" ? "#ffd23f" : swing.window === "good" ? "#5eff8a"
    : (swing.window === "early" || swing.window === "late") ? "#ffb14a" : "#ff6a5e";
  showPopup(swing.selection.name.toUpperCase() + "  -  " + winTxt, col, 1.0);
}

function settleBall(runsScored, boundary, six) {
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  runs += runsScored;
  balls++;
  if (six) showPopup("SIX!", "#ffd23f", 1.3);
  else if (boundary) showPopup("FOUR!", "#5ecfff", 1.3);
  else if (runsScored > 0) showPopup("+" + runsScored, "#ffffff", 0.9);
  else showPopup("DOT", "#b9c2cc", 0.7);
  camMode = "game";
  flight.mode = "hidden";
  phase = "between"; phaseT = 0;
  updateScoreboard();
}

function ballPassedCollected() {
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  balls++;
  flight.mode = "keeper";
  flight.pos = { x: KEEPER_POS.x + 0.25, y: 1.0, z: KEEPER_POS.z };
  phase = "between"; phaseT = 0;
  updateScoreboard();
}

function stepFreeFlight(dt) {
  const v = flight.vel, p = flight.pos;
  v.y -= G * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
  if (p.y <= 0.055 && v.y < 0) {
    p.y = 0.055;
    v.y = -v.y * 0.45;
    v.x *= 0.78; v.z *= 0.78;
    if (Math.abs(v.y) < 1.1) v.y = 0;
    flight.grounded = true;
  }
  if (flight.grounded) {
    const f = Math.max(0, 1 - 1.15 * dt);
    v.x *= f; v.z *= f;
  }
  const dist = Math.hypot(p.x, p.z);
  if (dist >= 62) {
    const six = !flight.grounded && p.y > 0.4;
    settleBall(six ? 6 : 4, true, six);
    return;
  }
  if (flight.grounded && Math.hypot(v.x, v.z) < 0.5 && p.y < 0.12) {
    flight.restTimer += dt;
    if (flight.restTimer > 0.25) {
      const r = dist >= 45 ? 3 : dist >= 25 ? 2 : dist >= 9 ? 1 : 0;
      settleBall(r, false, false);
    }
  } else {
    flight.restTimer = 0;
  }
}

/* ================= camera ================= */
function updateCamera(dt) {
  let desiredPos, desiredLook;
  if (camMode === "setup") {
    desiredPos = SETUP_POS; desiredLook = SETUP_LOOK;
  } else if (camMode === "follow" && (flight.mode === "free")) {
    desiredLook = flight.pos;
    desiredPos = { x: GAME_POS.x + clamp(flight.pos.x * 0.06, -1.2, 1.2), y: GAME_POS.y + 0.3, z: GAME_POS.z };
  } else {
    desiredPos = GAME_POS;
    desiredLook = (flight.mode === "traj" || flight.mode === "free")
      ? lerp3(GAME_LOOK, flight.pos, 0.35) : GAME_LOOK;
  }
  const k = 1 - Math.exp(-5.5 * dt);
  cam.pos = lerp3(cam.pos, desiredPos, k);
  cam.look = lerp3(cam.look, desiredLook, k);
}

/* ================= drawing ================= */
function drawWorld(cam) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#10233f"); sky.addColorStop(1, "#2a4a6b");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  // ground
  fillPoly(cam, [
    { x: -140, y: 0, z: -40 }, { x: 140, y: 0, z: -40 },
    { x: 140, y: 0, z: 150 }, { x: -140, y: 0, z: 150 },
  ], "#1d5c26");

  // boundary rope
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = Math.max(1.5, FOCAL * 0.06 / 40);
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i <= 72; i++) {
    const a = (i % 72) * Math.PI * 2 / 72;
    const p = project(cam, { x: Math.sin(a) * 62, y: 0.1, z: Math.cos(a) * 62 });
    if (!p) { pen = false; continue; }
    pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    pen = true;
  }
  ctx.stroke();

  // pitch strip + creases
  fillPoly(cam, [
    { x: -1.5, y: 0.005, z: -1.3 }, { x: 1.5, y: 0.005, z: -1.3 },
    { x: 1.5, y: 0.005, z: 21.4 }, { x: -1.5, y: 0.005, z: 21.4 },
  ], "#b99e6b");
  fillPoly(cam, [
    { x: -1.3, y: 0.01, z: 1.19 }, { x: 1.3, y: 0.01, z: 1.19 },
    { x: 1.3, y: 0.01, z: 1.25 }, { x: -1.3, y: 0.01, z: 1.25 },
  ], "#e8e8e8");

  // bowler-end stumps
  drawStumps(cam, 20.9, 0);

  // fielders
  for (const f of FIELDERS) {
    line3(cam, { x: f.x, y: 0.15, z: f.z }, { x: f.x, y: 1.45, z: f.z }, "#3d5f9e", 0.42);
    circle3(cam, { x: f.x, y: 1.62, z: f.z }, 0.16, "#d9b08c");
  }

  // keeper
  line3(cam, { x: KEEPER_POS.x, y: 0.1, z: KEEPER_POS.z }, { x: KEEPER_POS.x, y: 1.35, z: KEEPER_POS.z }, "#43435c", 0.5);
  circle3(cam, { x: KEEPER_POS.x, y: 1.55, z: KEEPER_POS.z }, 0.17, "#d9b08c");

  // bowler
  drawBowler(cam);

  // batting-end stumps (between camera and batsman)
  drawStumps(cam, STUMPS_Z, stumpKnock);

  // ball shadow + ball
  if (flight.mode !== "hidden") {
    const sh = project(cam, { x: flight.pos.x, y: 0.02, z: flight.pos.z });
    if (sh) {
      const s = clamp(1.2 - flight.pos.y * 0.12, 0.4, 1.2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, 0.16 * sh.s * s, 0.07 * sh.s * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    circle3(cam, flight.pos, 0.065, "#e03131");
  }

  drawBatsman(cam);
}

function drawStumps(cam, z, knock) {
  const col = "#efe3c3";
  for (const dx of [-0.11, 0, 0.11]) {
    let top = { x: dx, y: 0.72, z };
    if (knock > 0 && dx === 0) {
      const a = knock * 1.5;
      top = { x: dx - Math.sin(a) * 0.72, y: Math.cos(a) * 0.72, z: z - (1 - Math.cos(a)) * 0.2 };
    }
    line3(cam, { x: dx, y: 0, z }, top, col, 0.05);
  }
  if (knock <= 0) line3(cam, { x: -0.15, y: 0.735, z }, { x: 0.15, y: 0.735, z }, col, 0.025);
}

function drawBowler(cam) {
  const bz = bowlerZ;
  line3(cam, { x: 0.2, y: 0.15, z: bz }, { x: 0.2, y: 1.5, z: bz }, "#c0392b", 0.5);
  circle3(cam, { x: 0.2, y: 1.72, z: bz }, 0.17, "#d9b08c");
  const armA = bowlerArmT * Math.PI * 2;
  const ax = 0.2 + 0.1, ay = 1.45;
  line3(cam, { x: ax, y: ay, z: bz },
    { x: ax + Math.sin(armA) * 0.15, y: ay + Math.cos(armA) * 0.55, z: bz }, "#c0392b", 0.16);
}

function batScreenAngle() {
  if (!swingAnim.active) return 2.35; // idle backlift (screen radians)
  const t = swingAnim.t / swingAnim.dur;
  const windupTop = 3.05;
  const follow = -Math.PI / 2 + (swingAnim.yawDeg * 0.9) * Math.PI / 180;
  if (t < swingAnim.contactFrac) {
    const p = clamp(t / Math.max(0.001, swingAnim.contactFrac), 0, 1);
    return 2.35 + (windupTop - 2.35) * p;
  }
  const p = Math.pow((t - swingAnim.contactFrac) / (1 - swingAnim.contactFrac), 0.8);
  return windupTop + (follow - windupTop) * p;
}

function drawBatsman(cam) {
  const fx = engine.foot.x, fz = engine.foot.z;
  const bx = -0.35 + fx, bz = -0.2 + fz;
  const pose = footPose(engine.foot);
  const lean = pose === "front" ? 0.16 : pose === "back" ? -0.14 : 0;

  const hips = { x: bx, y: 0.92, z: bz + lean };
  const sh = { x: bx, y: 1.48, z: bz + lean * 1.4 };
  // legs
  line3(cam, { x: bx - 0.12, y: 0.02, z: bz }, hips, "#e8e8ee", 0.17);
  line3(cam, { x: bx + 0.12, y: 0.02, z: bz }, hips, "#e8e8ee", 0.17);
  // torso + head
  line3(cam, hips, sh, "#2456b3", 0.4);
  circle3(cam, { x: bx, y: 1.7, z: bz + lean * 1.6 }, 0.16, "#d9b08c");

  // bat (screen-space around the projected shoulder)
  const psh = project(cam, { x: bx + 0.22, y: 1.45, z: bz });
  if (psh) {
    const ang = batScreenAngle();
    const len = 1.05 * psh.s;
    ctx.strokeStyle = "#d8b56c";
    ctx.lineWidth = Math.max(3, 0.11 * psh.s);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(psh.x, psh.y);
    ctx.lineTo(psh.x + Math.cos(ang) * len, psh.y + Math.sin(ang) * len);
    ctx.stroke();
  }
}

function drawTouchVisuals() {
  const j = inputState.joy;
  if (j) {
    const r = Math.max(60, H * 0.11);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(j.ax, j.ay, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath(); ctx.arc(j.ax + j.vx * r, j.ay - j.vy * r, r * 0.38, 0, Math.PI * 2); ctx.fill();
  }
  const s = inputState.swipe;
  if (s) {
    const dx = s.cx - s.ax, dy = s.cy - s.ay;
    if (Math.hypot(dx, dy) > 14) {
      ctx.strokeStyle = "rgba(255,225,90,0.9)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.cx, s.cy); ctx.stroke();
      const a = Math.atan2(dy, dx);
      ctx.beginPath();
      ctx.moveTo(s.cx, s.cy);
      ctx.lineTo(s.cx - 18 * Math.cos(a - 0.4), s.cy - 18 * Math.sin(a - 0.4));
      ctx.lineTo(s.cx - 18 * Math.cos(a + 0.4), s.cy - 18 * Math.sin(a + 0.4));
      ctx.closePath();
      ctx.fillStyle = "rgba(255,225,90,0.9)";
      ctx.fill();
    }
  }
}

/* ================= HUD (DOM) ================= */
const scoreEl = document.getElementById("scoreboard");
const popupEl = document.getElementById("popup");
let popupTimer = null;

function updateScoreboard() {
  scoreEl.textContent = `SCORE ${runs}   WKTS ${wickets}   BALLS ${balls}      TARGET —   REQ —`;
}
function showPopup(text, color, secs) {
  popupEl.textContent = text;
  popupEl.style.color = color;
  popupEl.style.opacity = 1;
  if (popupTimer) clearTimeout(popupTimer);
  popupTimer = setTimeout(() => { popupEl.style.opacity = 0; }, secs * 1000);
}

const debugEl = document.getElementById("debug");
const debugBody = document.getElementById("debugBody");
const debugPanel = document.getElementById("debugPanel");
let debugVisible = true;
debugEl.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  debugVisible = !debugVisible;
  debugPanel.style.display = debugVisible ? "block" : "none";
});

const sliders = {
  speed: document.getElementById("sSpeed"),
  line: document.getElementById("sLine"),
  length: document.getElementById("sLength"),
  swing: document.getElementById("sSwing"),
};
sliders.speed.addEventListener("input", (e) => bowlerCfg.speed = +e.target.value);
sliders.line.addEventListener("input", (e) => bowlerCfg.line = +e.target.value);
sliders.length.addEventListener("input", (e) => bowlerCfg.length = +e.target.value);
sliders.swing.addEventListener("input", (e) => bowlerCfg.swing = +e.target.value);
function applyPreset(p) {
  if (p === "full") Object.assign(bowlerCfg, { speed: 118, line: 0, length: 0.12, swing: 0 });
  if (p === "good") Object.assign(bowlerCfg, { speed: 126, line: 0.15, length: 0.52, swing: 0 });
  if (p === "short") Object.assign(bowlerCfg, { speed: 134, line: -0.1, length: 0.88, swing: 0 });
  sliders.speed.value = bowlerCfg.speed;
  sliders.line.value = bowlerCfg.line;
  sliders.length.value = bowlerCfg.length;
  sliders.swing.value = bowlerCfg.swing;
}
document.getElementById("bFull").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("full"); });
document.getElementById("bGood").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("good"); });
document.getElementById("bShort").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("short"); });
document.getElementById("bReset").addEventListener("pointerdown", (e) => {
  e.stopPropagation(); engine.foot = { x: 0, z: 0, vx: 0, vz: 0 };
});

let debugTimer = 0;
function updateDebug(dt) {
  debugTimer += dt;
  if (debugTimer < 0.08 || !debugVisible) return;
  debugTimer = 0;
  const d = engine.traj ? engine.traj.delivery : null;
  const f = engine.foot;
  const s = engine.lastSwing;
  const j = inputState.joy;
  let txt = "";
  if (d) {
    txt += `BALL   ${d.speed_kph.toFixed(0)} kph   line ${d.line >= 0 ? "+" : ""}${d.line.toFixed(2)} (${d.line < -0.25 ? "leg" : d.line > 0.25 ? "off" : "mid"})   len ${d.length.toFixed(2)} (${lengthZone(d.length)})   swing ${d.swing >= 0 ? "+" : ""}${d.swing.toFixed(2)}\n`;
  }
  txt += `BATTER x ${f.x >= 0 ? "+" : ""}${f.x.toFixed(2)}  z ${f.z >= 0 ? "+" : ""}${f.z.toFixed(2)} (${footPose(f)})\n`;
  txt += `FOOTWORK INPUT ${j ? (j.vx >= 0 ? "+" : "") + j.vx.toFixed(2) + "," + (j.vy >= 0 ? "+" : "") + j.vy.toFixed(2) + " (stick held)" : "0.00,0.00"}\n`;
  if (s) {
    txt += `SWIPE  dir ${s.direction.direction.x >= 0 ? "+" : ""}${s.direction.direction.x.toFixed(2)},${s.direction.direction.y >= 0 ? "+" : ""}${s.direction.direction.y.toFixed(2)}  sector ${sectorName(sectorOf(s.direction.angle))}\n`;
    txt += `INTENT ${s.intent}   FOOT ${footPose(engine.foot)}\n`;
    txt += `TIMING ${s.window.replace("_", " ").toUpperCase()} (${(s.offset * 1000) >= 0 ? "+" : ""}${(s.offset * 1000).toFixed(0)} ms)  reach ${s.direction.reach.toFixed(2)}\n`;
    txt += `SHOT   ${s.selection.name}${s.selection.awkward ? "  [AWKWARD]" : ""}\n`;
    txt += s.will_contact
      ? `CONTACT ${s.contact.outcome.replace("_", " ").toUpperCase()}  q=${s.contact.quality.toFixed(2)}  exit ${s.contact.exit_kph.toFixed(0)} kph`
      : `CONTACT MISS`;
  }
  debugBody.textContent = txt;
}

/* ================= main loop ================= */
let lastT = performance.now();

function frame(now) {
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  phaseT += dt;

  // Advance footwork + delivery clock in all live phases; block swings once
  // the ball is struck or the delivery is over.
  const inputFrame = sampleInputFrame();
  if (struckApplied || resolvedThisBall) inputFrame.swing = false;
  if (phase === "delivery" || phase === "struck" || phase === "between") {
    engine.update(dt, inputFrame);
  }

  switch (phase) {
    case "pre":
      if (phaseT >= 0.9) { phase = "runup"; phaseT = 0; camMode = "game"; }
      break;
    case "runup": {
      const t = clamp(phaseT / 0.9, 0, 1);
      bowlerZ = 26 + (20.2 - 26) * t;
      bowlerArmT = t;
      if (t >= 1) releaseBall();
      break;
    }
    case "delivery": {
      if (flight.mode === "traj") {
        flight.t += dt;
        flight.pos = engine.traj.position(flight.t);
        if (engine.contactWillHappen && engine.t >= engine.traj.time_to_contact) applyContact();
        else if (!engine.contactWillHappen && engine.t >= engine.traj.time_to_stumps + 0.20) ballPassedCollected();
      }
      break;
    }
    case "struck":
      break;
    case "between":
      if (phaseT >= 1.15) startBall();
      break;
  }

  if (flight.mode === "free") {
    stepFreeFlight(dt);
    if (phase === "delivery") phase = "struck";
  }

  if (swingAnim.active) {
    swingAnim.t += dt;
    if (swingAnim.t >= swingAnim.dur) swingAnim.active = false;
  }
  if (stumpKnock > 0 && stumpKnock < 1) stumpKnock = Math.min(1, stumpKnock + dt * 3.5);

  updateCamera(dt);

  const camObj = makeCamera(cam.pos, cam.look);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawWorld(camObj);
  drawTouchVisuals();
  updateDebug(dt);

  requestAnimationFrame(frame);
}

updateScoreboard();
startBall();
requestAnimationFrame(frame);
