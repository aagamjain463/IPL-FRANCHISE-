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
// Manual bowler sliders (debug); autoMode = plan-driven Phase 2 bowling.
const bowlerCfg = { speed: 126, line: 0.15, length: 0.52, swing: 0 };
let manualActive = false;
let manualType = "good_length";
let forcedType = null;            // null = AUTO (plan)
let forcedOutcome = null;         // null = physics
let forcePerfect = false;
let slowMo = false;
let redeliverNext = false;
let lastDeliveryData = null;
let pendingOutcome = null;

let phase = "pre", phaseT = 0;
let runs = 0, wickets = 0, balls = 0;
let bowlerZ = 26, bowlerArmT = 0;
let resolvedThisBall = false;
let struckApplied = false;
let stumpKnock = 0; // 0..1 animation
const dusts = [];   // pitch-dust puffs {x, z, t}

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

// Note: wicket/beaten/leave handling happens in ballPassedCollected() where
// the outcome resolver runs; onPassed only marks the ball as past the bat.

engine.onBounce = (pos) => {
  dusts.push({ x: pos.x, z: pos.z, t: 0 });
};

/* ================= delivery flow ================= */
function nextDeliveryData() {
  if (manualActive) {
    return makeDelivery(bowlerCfg.speed, bowlerCfg.line, bowlerCfg.length, bowlerCfg.swing,
      { dtype: manualType, seam: 0, bounce: 1 });
  }
  const type = forcedType || nextDeliveryType(Math.random);
  return buildDelivery(type, Math.random, 0.75);
}

function startBall() {
  stumpKnock = 0;
  resolvedThisBall = false;
  flight.mode = "hidden";

  if (redeliverNext) {
    // Debug re-bowl: same ball again, no run-up ceremony.
    bowlerZ = 20.2; bowlerArmT = 1;
    releaseBall();
    updateScoreboard();
    return;
  }

  phase = "pre"; phaseT = 0;
  bowlerZ = 26; bowlerArmT = 0;
  updateScoreboard();
}

function releaseBall() {
  const d = (redeliverNext && lastDeliveryData) ? lastDeliveryData : nextDeliveryData();
  redeliverNext = false;
  lastDeliveryData = d;
  engine.beginDelivery(d);
  struckApplied = false;
  pendingOutcome = null;
  flight.mode = "traj";
  flight.t = 0;
  flight.pos = engine.traj.position(0);
  flight.grounded = false;
  flight.restTimer = 0;
  camMode = "game";
  phase = "delivery";
  showToast(DELIVERY_LABELS[d.dtype] + "  —  " + Math.round(d.speed_kph) + " KPH");
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

  // Resolve the cricket outcome NOW (deterministic); runs apply on settle.
  pendingOutcome = resolveOutcome(Math.random, engine.traj, swing,
    engine.foot.x, engine.foot.z, forcedOutcome);
  const boundary = pendingOutcome.kind === "four" || pendingOutcome.kind === "six";
  camMode = boundary ? "followBoundary" : "follow";

  const winTxt = swing.window.replace("_", " ").toUpperCase();
  const col = swing.window === "perfect" ? "#ffd23f" : swing.window === "good" ? "#5eff8a"
    : (swing.window === "early" || swing.window === "late") ? "#ffb14a" : "#ff6a5e";
  const isEdge = pendingOutcome.kind === "top_edge" || pendingOutcome.kind === "inside_edge"
    || pendingOutcome.kind === "outside_edge";
  showPopup(isEdge ? pendingOutcome.label : swing.selection.name.toUpperCase() + "  -  " + winTxt,
    isEdge ? "#ffa15e" : col, 1.0);
  if (swing.window === "perfect" && !isEdge) showTimingFlash("#ffd23f");
}

function settleFromOutcome() {
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  const o = pendingOutcome || { kind: "dot", label: "DOT BALL", runs: 0 };
  runs += o.runs;
  balls++;
  if (o.kind === "six") showBanner("SIX!", "#ffd23f");
  else if (o.kind === "four") showBanner("FOUR!", "#5ecfff");
  else if (o.kind === "top_edge" || o.kind === "inside_edge" || o.kind === "outside_edge")
    showPopup(o.label + (o.runs > 0 ? "  +" + o.runs : ""), "#ffa15e", 1.0);
  else if (o.runs > 0) showPopup("+" + o.runs, "#ffffff", 0.9);
  else if (o.kind === "defensive") showPopup(o.runs > 0 ? "BLOCKED  +1" : "BLOCKED", "#bcd2ff", 0.7);
  else showPopup(o.label, "#b9c2cc", 0.7);
  camMode = "game";
  flight.mode = "hidden";
  phase = "between"; phaseT = 0;
  updateScoreboard();
}

function ballPassedCollected() {
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  balls++;

  // Unstruck ball: bowled / LBW / beaten / left alone.
  const o = resolveOutcome(Math.random, engine.traj, engine.lastSwing,
    engine.foot.x, engine.foot.z, forcedOutcome);
  pendingOutcome = o;
  if (o.wicket) {
    wickets++;
    stumpKnock = 0.0001;
    showBanner(o.kind === "lbw" ? "LBW!" : "BOWLED!", "#ff4a3c");
    camMode = "wicket";
  } else if (o.kind === "beaten") {
    showPopup("BEATEN!", "#ffbf5e", 0.9);
  } else {
    showPopup("LEFT ALONE", "#cfe2ff", 0.8);
  }

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
    settleFromOutcome();
    return;
  }
  if (flight.grounded && Math.hypot(v.x, v.z) < 0.5 && p.y < 0.12) {
    flight.restTimer += dt;
    if (flight.restTimer > 0.25) settleFromOutcome();
  } else {
    flight.restTimer = 0;
  }
}

/* ================= camera ================= */
const WICKET_POS = { x: 1.9, y: 1.5, z: -3.4 }, WICKET_LOOK = { x: 0, y: 0.5, z: -1 };

function updateCamera(dt) {
  let desiredPos, desiredLook;
  if (camMode === "setup") {
    desiredPos = SETUP_POS; desiredLook = SETUP_LOOK;
  } else if (camMode === "wicket") {
    desiredPos = WICKET_POS; desiredLook = WICKET_LOOK;
  } else if (camMode === "followBoundary" && flight.mode === "free") {
    // Boundary chase: drift back and up so the flight stays framed to the rope.
    desiredLook = flight.pos;
    const depth = clamp(flight.pos.z * 0.10, 0, 5.5);
    desiredPos = {
      x: GAME_POS.x + clamp(flight.pos.x * 0.10, -3.5, 3.5),
      y: GAME_POS.y + 0.4 + depth * 0.55,
      z: GAME_POS.z - depth * 0.35,
    };
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

  // pitch-dust puffs at bounce points
  for (const puff of dusts) {
    const a = 0.5 * (1 - puff.t / 0.32);
    if (a <= 0) continue;
    const r = 0.25 + 0.85 * (puff.t / 0.32);
    const pr = project(cam, { x: puff.x, y: 0.03, z: puff.z });
    if (!pr) continue;
    ctx.fillStyle = `rgba(200,180,135,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y, r * pr.s, r * pr.s * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
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

const toastEl = document.getElementById("toast");
const bannerEl = document.getElementById("banner");
const flashEl = document.getElementById("flash");
let toastTimer = null, bannerTimer = null, flashTimer = null;

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
function showToast(text) {
  toastEl.textContent = text;
  toastEl.style.opacity = 1;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = 0; }, 1700);
}
function showBanner(text, color) {
  bannerEl.textContent = text;
  bannerEl.style.color = color;
  bannerEl.style.opacity = 1;
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { bannerEl.style.opacity = 0; }, 1400);
}
function showTimingFlash(color) {
  flashEl.style.background = color;
  flashEl.style.opacity = 0.20;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { flashEl.style.opacity = 0; }, 220);
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
function markManual() { manualActive = true; updateTypeBtn(); }
sliders.speed.addEventListener("input", (e) => { bowlerCfg.speed = +e.target.value; markManual(); });
sliders.line.addEventListener("input", (e) => { bowlerCfg.line = +e.target.value; markManual(); });
sliders.length.addEventListener("input", (e) => { bowlerCfg.length = +e.target.value; markManual(); });
sliders.swing.addEventListener("input", (e) => { bowlerCfg.swing = +e.target.value; markManual(); });
function syncSliders() {
  sliders.speed.value = bowlerCfg.speed;
  sliders.line.value = bowlerCfg.line;
  sliders.length.value = bowlerCfg.length;
  sliders.swing.value = bowlerCfg.swing;
}
function applyPreset(p) {
  if (p === "full") { Object.assign(bowlerCfg, { speed: 118, line: 0, length: 0.12, swing: 0 }); manualType = "full_ball"; }
  if (p === "good") { Object.assign(bowlerCfg, { speed: 126, line: 0.15, length: 0.52, swing: 0 }); manualType = "good_length"; }
  if (p === "short") { Object.assign(bowlerCfg, { speed: 134, line: -0.1, length: 0.88, swing: 0 }); manualType = "short_ball"; }
  syncSliders();
  markManual();
}
document.getElementById("bFull").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("full"); });
document.getElementById("bGood").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("good"); });
document.getElementById("bShort").addEventListener("pointerdown", (e) => { e.stopPropagation(); applyPreset("short"); });
document.getElementById("bReset").addEventListener("pointerdown", (e) => {
  e.stopPropagation(); engine.foot = { x: 0, z: 0, vx: 0, vz: 0 };
});

/* ---- Phase 2 debug toggles ---- */
const bPerfect = document.getElementById("bPerfect");
const bType = document.getElementById("bType");
const bOutcome = document.getElementById("bOutcome");
const bSlow = document.getElementById("bSlow");
const OUTCOME_CYCLE = [null, "dot", "defensive", "one", "two", "four", "six", "edge", "bowled", "lbw"];

function updateTypeBtn() {
  bType.textContent = manualActive ? "TYPE: MANUAL"
    : forcedType ? "TYPE: " + DELIVERY_LABELS[forcedType] : "TYPE: AUTO";
}
function updateOutcomeBtn() {
  bOutcome.textContent = "OUTCOME: " + (forcedOutcome ? forcedOutcome.toUpperCase() : "NONE");
}
bPerfect.addEventListener("pointerdown", (e) => {
  e.stopPropagation(); forcePerfect = !forcePerfect;
  bPerfect.textContent = "PERFECT: " + (forcePerfect ? "ON" : "OFF");
});
let typeIdx = -1;
bType.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  manualActive = false;               // leaving manual mode
  typeIdx++;
  if (typeIdx >= DELIVERY_TYPES.length) { typeIdx = -1; forcedType = null; }
  else forcedType = DELIVERY_TYPES[typeIdx];
  updateTypeBtn();
});
let outcomeIdx = 0;
bOutcome.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  outcomeIdx = (outcomeIdx + 1) % OUTCOME_CYCLE.length;
  forcedOutcome = OUTCOME_CYCLE[outcomeIdx];
  updateOutcomeBtn();
});
bSlow.addEventListener("pointerdown", (e) => {
  e.stopPropagation(); slowMo = !slowMo;
  bSlow.textContent = "SLOW-MO: " + (slowMo ? "ON" : "OFF");
});
document.getElementById("bRebowl").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  if (!lastDeliveryData) return;
  redeliverNext = true;
  resolvedThisBall = true;
  struckApplied = true;
  flight.mode = "hidden";
  phase = "between"; phaseT = 0.6;    // short pause, then same ball again
});
updateTypeBtn(); updateOutcomeBtn();

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
    txt += `BALL   ${DELIVERY_LABELS[d.dtype]}  ${d.speed_kph.toFixed(0)} kph\n`;
    txt += `  line ${d.line >= 0 ? "+" : ""}${d.line.toFixed(2)}  len ${d.length.toFixed(2)}  swing ${d.swing >= 0 ? "+" : ""}${d.swing.toFixed(2)}  seam ${d.seam >= 0 ? "+" : ""}${d.seam.toFixed(2)}  bounce ${d.bounce.toFixed(2)}\n`;
  }
  txt += `BATTER x ${f.x >= 0 ? "+" : ""}${f.x.toFixed(2)}  z ${f.z >= 0 ? "+" : ""}${f.z.toFixed(2)} (${footPose(f)})\n`;
  txt += `FOOTWORK INPUT ${j ? (j.vx >= 0 ? "+" : "") + j.vx.toFixed(2) + "," + (j.vy >= 0 ? "+" : "") + j.vy.toFixed(2) + " (stick held)" : "0.00,0.00"}\n`;
  if (s) {
    const dirX = Math.sin(s.direction.angle), dirY = Math.cos(s.direction.angle);
    txt += `SWIPE  dir ${dirX >= 0 ? "+" : ""}${dirX.toFixed(2)},${dirY >= 0 ? "+" : ""}${dirY.toFixed(2)}  sector ${sectorName(sectorOf(s.direction.angle))}\n`;
    txt += `INTENT ${s.intent}   FOOT ${footPose(engine.foot)}\n`;
    txt += `TIMING ${s.window.replace("_", " ").toUpperCase()} (${(s.offset * 1000) >= 0 ? "+" : ""}${(s.offset * 1000).toFixed(0)} ms)  reach ${s.direction.reach.toFixed(2)}\n`;
    txt += `SHOT   ${s.selection.name}${s.selection.awkward ? "  [AWKWARD]" : ""}\n`;
    if (s.will_contact) {
      txt += `CONTACT ${s.contact.outcome.replace("_", " ").toUpperCase()}  q=${s.contact.quality.toFixed(2)}  exit ${s.contact.exit_kph.toFixed(0)} kph  elev ${s.contact.elevation.toFixed(0)}°\n`;
    } else {
      txt += `CONTACT MISS\n`;
    }
  }
  if (pendingOutcome) {
    txt += `OUTCOME ${pendingOutcome.label}${pendingOutcome.runs > 0 ? "  +" + pendingOutcome.runs : ""}`
      + `${pendingOutcome.wicket ? "  [WICKET]" : ""}${pendingOutcome.forced ? "  [FORCED]" : ""}`;
  }
  debugBody.textContent = txt;
}

/* ================= main loop ================= */
let lastT = performance.now();

function frame(now) {
  let dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  if (slowMo) dt *= 0.35;   // debug slow motion
  phaseT += dt;

  // Advance footwork + delivery clock in all live phases; block swings once
  // the ball is struck or the delivery is over.
  const inputFrame = sampleInputFrame();
  if (struckApplied || resolvedThisBall) inputFrame.swing = false;

  // Debug: force a PERFECT swing at the exact ideal frame.
  if (forcePerfect && phase === "delivery" && !inputFrame.swing
      && !engine.swingTaken && !engine.contactWillHappen && engine.traj) {
    const windup = windupTime(inputFrame.intent);
    const ideal = engine.traj.time_to_contact - windup;
    if (engine.t + dt >= ideal && engine.t <= ideal + 0.02) {
      inputFrame.swing = true; inputFrame.dirX = 0; inputFrame.dirY = 1; inputFrame.strength = 1;
    }
  }

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

  // dust puff lifetimes
  for (let i = dusts.length - 1; i >= 0; i--) {
    dusts[i].t += dt;
    if (dusts[i].t > 0.32) dusts.splice(i, 1);
  }

  // wicket reaction camera hands back to gameplay once the moment has landed
  if (camMode === "wicket" && phase === "between" && phaseT > 1.0) camMode = "game";

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
