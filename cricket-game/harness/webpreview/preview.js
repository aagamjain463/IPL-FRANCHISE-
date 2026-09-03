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
  const f = FOCAL * (1 + camPunch * 0.10);
  return { x: W / 2 + f * c.xc / c.zc, y: H / 2 - f * c.yc / c.zc, z: c.zc, s: f / c.zc };
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
let bowlerZ = 26, bowlerArmT = 0;
let resolvedThisBall = false;
let struckApplied = false;
let stumpKnock = 0; // 0..1 animation
const dusts = [];   // pitch-dust puffs {x, z, t}
const vfxRings = []; // Phase 5: expanding contact/boundary rings {x,y,z,t,life,r0,grow,color}
const KIT_NAMES = {
  you: ["A. Vale", "J. Mercer", "K. Brand"],
  ai: ["S. Nair", "T. Okafor", "M. Ito"],
};

/* ---- Phase 3 match state ---- */
let match = new SuperOverMatchJS(); match.start();
let matchFlow = "innings1";        // innings1 | innings2 | result
let difficulty = "medium";
let forcedField = null;            // null | "catch" | "miss" | "stop" | "boundary"
let aiPlan = null, aiSwingT = null, aiFired = false;
let fieldingResult = null, fieldingLive = false, fieldClock = 0;
let playAgainResolver = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const playerIsBatting = () => matchFlow === "innings1";
const bowlCfg = { type: "fast_straight", line: 0, length: 0.5 };

/* ---- Phase 4 state ---- */
// Release-timing skill bar for player bowling (spec section 7).
const releaseWindow = { active: false, t: 0, captured: false, offset: 0, window: 0.9 };
let pendingWide = false;               // sprayed delivery -> extra run, no ball
let playerBatHistory = [];             // for the AI bowler to read (spec 10)
let aiArchetype = "balanced";          // AI batter personality (spec 8)

// Lightweight replay (spec 18): re-integrates stored flight info after a
// boundary / wicket / catch. Skippable with any tap, never blocks long.
const replay = { active: false, kind: null, t: 0, max: 1.6,
                 pos: null, vel: null, grounded: false };
let replaySeed = null;

function queueReplay(kind) {
  if (!replaySeed) return;
  replay.active = true;
  replay.kind = kind;
  replay.t = 0;
  replay.grounded = false;
  if (kind === "struck") {
    replay.pos = { ...replaySeed.pos };
    replay.vel = { ...replaySeed.vel };
    replay.max = 1.5;
  } else {
    replay.max = Math.min(1.4, (engine.traj ? engine.traj.time_to_stumps : 0.6) + 0.35);
  }
}

const flight = { mode: "hidden", t: 0, pos: { x: 0, y: 1, z: 20 }, vel: { x: 0, y: 0, z: 0 }, grounded: false, restTimer: 0 };
const swingAnim = { active: false, t: 0, dur: 0.4, contactFrac: 0.4, yawDeg: 0 };

const SETUP_POS = { x: 11.5, y: 4.6, z: 10 }, SETUP_LOOK = { x: 0, y: 1.0, z: 10 };
const GAME_POS = { x: 0.42, y: 2.75, z: -5.4 }, GAME_LOOK = { x: 0, y: 1.05, z: 9 };
let camMode = "setup";
const cam = { pos: { ...SETUP_POS }, look: { ...SETUP_LOOK } };
// Phase 4: subtle timing-quality camera breath (decays in the frame loop).
let camPunch = 0;

const KEEPER_POS = { x: 0, y: 0, z: -2.6 };
/* Fielders come from the Phase 3 field setup (the bowler is drawn separately
 * because he runs in to bowl). Each view moves to present the fielding sim. */
let fieldSim = defaultField(1.0);
const fieldViews = FIELD_SETUP
  .filter((r) => r[0] !== "bowler")
  .map((r) => ({ name: r[0], home: { x: r[1], z: r[2] }, x: r[1], z: r[2],
                 chaseTarget: null, resolving: false }));

function rebuildFieldSim() {
  const tune = AI_DIFFICULTY[difficulty];
  fieldSim = defaultField(playerIsBatting() ? tune.field_vs_player : tune.field_for_player);
}
function resetFielders() {
  for (const v of fieldViews) { v.x = v.home.x; v.z = v.home.z; v.chaseTarget = null; v.resolving = false; }
}

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

function captureRelease() {
  // Phase 4: marker sweeps -1..+1 across the window; centre = perfect.
  if (!releaseWindow.active || releaseWindow.captured) return;
  releaseWindow.captured = true;
  const phase = clamp(releaseWindow.t / releaseWindow.window, 0, 1) * 2 - 1;
  releaseWindow.offset = phase * RELEASE_MAX_ERROR;
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  if (replay.active) { replay.active = false; return; }     // tap skips replay
  if (releaseWindow.active) { captureRelease(); return; }   // any tap releases
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
      // Phase 4 shot context: if the requested shot is unbelievable for this
      // ball's length, snap to the NEAREST believable one (no broken anims).
      if (engine.traj) {
        const reqAngle = Math.atan2(dirX, dirY);
        const ctx = validateShotRequest(reqAngle, engine.traj.delivery.length);
        if (ctx.snapped) {
          dirX = Math.sin(ctx.angle); dirY = Math.cos(ctx.angle);
          showPopup("ADJUSTED: " + ctx.family.toUpperCase(), "#9fd0ff", 0.5);
        }
      }
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
  pendingWide = false;
  if (manualActive) {
    return makeDelivery(bowlerCfg.speed, bowlerCfg.line, bowlerCfg.length, bowlerCfg.swing,
      { dtype: manualType, seam: 0, bounce: 1 });
  }
  if (!playerIsBatting()) {
    // The PLAYER bowls the chase: type/line/length + a release-timing skill
    // check (spec 7). A bad release drifts; loss of control sprays WIDE.
    const sampled = buildDelivery(bowlCfg.type, Math.random, 0.9);
    sampled.line = bowlCfg.line;
    sampled.length = bowlCfg.length;
    const off = releaseWindow.captured ? releaseWindow.offset : RELEASE_MAX_ERROR * 1.1;
    const bowled = bowlWithRelease(Math.random, sampled, off, 0.9, "medium");
    pendingWide = bowled.wide;
    showReleaseQuality(bowled.quality);
    return bowled.delivery;
  }
  // AI bowls to the player: adaptive strategy reads the player's shots.
  const acc = AI_DIFFICULTY[difficulty].ai_bowling_acc;
  const ctx = { score: match.innings[0].runs, wickets_remaining: match.wicketsRemaining(),
                balls_remaining: match.ballsRemaining() };
  const strat = forcedType ? null : aiBowlingPlan(Math.random, playerBatHistory, ctx, difficulty);
  const type = forcedType || strat.type;
  const sampled = buildDelivery(type, Math.random, acc, strat
    ? { lineHint: strat.line_hint, lengthHint: strat.length_hint } : null);
  // Release scatter + control check -> possible wide.
  const sd = RELEASE_SD[difficulty] || RELEASE_SD.medium;
  const releaseOffset = (Math.random() + Math.random() - 1) * sd * 3;
  const bowled = bowlWithRelease(Math.random, sampled, releaseOffset, acc, difficulty);
  pendingWide = bowled.wide;
  if (strat) lastBowlReason = strat.reason;
  return bowled.delivery;
}

let lastBowlReason = "stock_good_length";
function showReleaseQuality(quality) {
  const label = { perfect: "PERFECT RELEASE", good: "GOOD RELEASE", early: "EARLY RELEASE",
                  late: "LATE RELEASE", very_early: "VERY EARLY", very_late: "VERY LATE" }[quality];
  const col = quality === "perfect" ? "#5eff8a" : quality === "good" ? "#cfe2ff" : "#ffb14a";
  if (label) showPopup(label, col, 0.7);
}

async function startBall() {
  // ---- match flow gate: innings result -> break -> chase; result -> replay
  if (match.phase === "break") {
    const inn = match.innings[0];
    await showOverlay("INNINGS COMPLETE",
      `YOU  ${inn.runs}/${inn.wickets}  (${inn.legal_balls} balls)`,
      `TARGET SET:  ${inn.runs + 1}`, false);
    await sleep(2200);
    await showOverlay("THE CHASE BEGINS",
      `AI NEEDS  ${inn.runs + 1}  RUNS FROM 6 BALLS`,
      "YOU BOWL  ·  PICK LINE, LENGTH AND TYPE", false);
    await sleep(2000);
    hideOverlay();
    match.startSecondInnings();
    matchFlow = "innings2";
  }
  if (match.phase === "completed") {
    await showResultOverlay();           // resolves when PLAY AGAIN is pressed
    resetMatchAll();
  }

  stumpKnock = 0;
  resolvedThisBall = false;
  fieldingLive = false;
  fieldingResult = null;
  pendingWide = false;
  releaseWindow.active = false;
  releaseWindow.captured = false;
  flight.mode = "hidden";
  rebuildFieldSim();
  resetFielders();
  updateBowlPanelVisibility();

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

function resetMatchAll() {
  match = new SuperOverMatchJS();
  match.start();
  matchFlow = "innings1";
  aiPlan = null;
  fieldingLive = false;
  fieldingResult = null;
  pendingOutcome = null;
  playerBatHistory = [];          // Phase 4: fresh bowler memory
  pendingWide = false;
  releaseWindow.active = false;
  releaseWindow.captured = false;
  Object.assign(replay, { active: false, kind: null, t: 0 });
  replaySeed = null;
  if (typeof resetPresentationStats === "function") resetPresentationStats();
}

function releaseBall() {
  const d = (redeliverNext && lastDeliveryData) ? lastDeliveryData : nextDeliveryData();
  redeliverNext = false;
  lastDeliveryData = d;
  camMode = "game";   // Phase 5: bowling cam hands back at release
  engine.beginDelivery(d);
  struckApplied = false;
  pendingOutcome = null;
  fieldingLive = false;
  fieldingResult = null;
  flight.mode = "traj";
  flight.t = 0;
  flight.pos = engine.traj.position(0);
  flight.grounded = false;
  flight.restTimer = 0;
  camMode = "game";
  phase = "delivery";
  lastBowlSpeedKph = d.speed_kph;   // Phase 5 spell analysis
  let toastTxt = DELIVERY_LABELS[d.dtype] + "  —  " + Math.round(d.speed_kph) + " KPH";
  if (playerIsBatting() && lastBowlReason && lastBowlReason !== "stock_good_length") {
    toastTxt += "   (" + lastBowlReason.replace(/_/g, " ") + ")";
  }
  showToast(toastTxt);

  // AI batter plans the chase delivery against the live match context.
  if (!playerIsBatting()) {
    const ctx = {
      target: match.target(), score: match.innings[1].runs,
      balls_remaining: match.ballsRemaining(), wickets_remaining: match.wicketsRemaining(),
    };
    aiPlan = aiBattingPlan(Math.random, d, ctx, difficulty, engine.traj.hitsStumps(), aiArchetype);
    aiFired = false;
    aiSwingT = aiPlan.swing
      ? aiSwingFrameTime(engine.traj.time_to_contact, aiPlan.intent, aiPlan.offset) : null;
  } else {
    aiPlan = null;
  }
}

function applyForcedField(res) {
  if (forcedField === "catch" && res.kind !== "caught") {
    res.kind = "caught"; res.runs = 0;
    if (res.fielder == null) { res.fielder = 2; res.name = "cover"; }
    if (res.t < 0.5) res.t = 0.9;
  } else if (forcedField === "miss" && (res.kind === "caught" || res.kind === "stopped")) {
    res.kind = "four"; res.runs = 4; res.fielder = null; res.name = null;
  } else if (forcedField === "stop") {
    res.kind = "stopped"; res.runs = 1;
    if (res.t < 0.4) res.t = 0.6;
  } else if (forcedField === "boundary") {
    res.kind = "four"; res.runs = 4; res.fielder = null; res.name = null;
  }
  return res;
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

  // Phase 3: the FIELD decides runs/wickets for struck balls.
  const contactPos = {
    x: engine.traj.x_at_contact,
    y: Math.max(engine.traj.height_at_contact, 0.35),
    z: CONTACT_Z,
  };
  let res = simulateFielding(contactPos, { ...flight.vel }, fieldSim, Math.random);
  res = applyForcedField(res);

  // Phase 4 fielding polish: grade the catch and flag spectacular dives for
  // the presentation layer (animation + toast), without changing the sim.
  if (res.kind === "caught" && res.fielder != null) {
    const f = fieldSim[res.fielder];
    const dist = Math.hypot(contactPos.x - f.home.x, contactPos.z - f.home.z);
    res.catch_grade = catchGrade(c.exit_kph, contactPos.y, dist, swing.contact.outcome === "edge");
  } else if ((res.kind === "stopped" || res.kind === "four") && res.fielder != null) {
    const f = fieldSim[res.fielder];
    const dist = Math.hypot(res.pos[0] - f.home.x, res.pos[2] - f.home.z);
    const speedH = Math.hypot(flight.vel.x, flight.vel.z);
    res.dive = diveDecision(f, Math.max(1.2, dist * 0.4), speedH, res.kind === "four", false);
  }
  fieldingResult = res;
  fieldingLive = true;
  fieldClock = 0;
  scheduleFielderChases(res);
  // Phase 4 replay seed: the exact contact conditions, re-integrated later.
  replaySeed = { pos: { ...contactPos }, vel: { ...flight.vel } };

  const boundary = res.kind === "four" || res.kind === "six";
  camMode = boundary ? "followBoundary" : "follow";
  if (boundary) {
    showBanner(res.kind === "six" ? "SIX!" : "FOUR!",
      res.kind === "six" ? "#ffd23f" : "#5ecfff");
    vfxRings.push({ x: flight.pos.x, y: 0.2, z: flight.pos.z, t: 0, life: 0.55,
                    r0: 1.2, grow: 9, color: res.kind === "six" ? "#ffd23f" : "#5ecfff" });
  }

  // Phase 4 timing FEEL: tier label, camera punch, bat flash intensity.
  const feel = timingFeedback(swing.window, swing.intent);
  const col = swing.window === "perfect" ? "#ffd23f" : swing.window === "good" ? "#5eff8a"
    : (swing.window === "early" || swing.window === "late") ? "#ffb14a" : "#ff6a5e";
  showPopup(swing.selection.name.toUpperCase() + "  -  " + feel.label, col, 1.0);
  setTimingChip(feel.label, col);                  // Phase 5 bottom timing chip
  vfxRings.push({ x: contactPos.x, y: 1.1, z: contactPos.z, t: 0, life: 0.5,
                  r0: 0.4, grow: 5, color: col });  // Phase 5 contact ring
  if (swing.window === "perfect") showTimingFlash("#ffd23f");
  camPunch = feel.camera;                       // subtle zoom breath
  if (navigator.vibrate && feel.haptic > 0.05) navigator.vibrate(Math.round(30 + feel.haptic * 60));
}

/* ---- fielding presentation ---- */
function scheduleFielderChases(res) {
  for (const v of fieldViews) { v.chaseTarget = null; v.resolving = false; }
  for (const [idx, startT, target] of res.chased) {
    const view = fieldViews.find((v) => v.name === FIELD_SETUP[idx][0]);
    if (!view) continue;
    view.chaseTarget = (res.fielder === idx)
      ? { x: res.pos.x, z: res.pos.z } : { x: target.x, z: target.z };
    view.resolving = res.fielder === idx;
  }
}

function updateFieldingPresentation(dt) {
  // fielder movement
  for (const v of fieldViews) {
    let target = v.chaseTarget || v.home;
    let speed = v.chaseTarget ? 6.4 : 4.2;
    if (v.resolving && fieldingLive && fieldingResult && fieldingResult.t > 0.05) {
      // arrive exactly when the sim says the play happens
      const remaining = fieldingResult.t - fieldClock;
      if (remaining > 0) {
        const dist = Math.hypot(target.x - v.x, target.z - v.z);
        speed = Math.min(dist / remaining, 9.5);
      }
    }
    const dx = target.x - v.x, dz = target.z - v.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const step = Math.min(speed * dt, d);
      v.x += dx / d * step; v.z += dz / d * step;
    }
  }

  if (!fieldingLive || !fieldingResult || resolvedThisBall) return;
  fieldClock += dt;
  const res = fieldingResult;
  const boundary = res.kind === "four" || res.kind === "six";

  if (!boundary) {
    if (fieldClock >= res.t) {
      flight.pos = { x: res.pos.x, y: Math.max(0.12, res.pos.y), z: res.pos.z };
      flight.vel = { x: 0, y: 0, z: 0 };
      if (res.kind === "caught") {
        // Phase 4: the catch grade flavours the call.
        const grade = res.catch_grade ? "  (" + res.catch_grade.toUpperCase() + ")" : "";
        showBanner("CAUGHT" + (res.name ? "  -  " + res.name.toUpperCase() : "") + grade + "!", "#ff4a3c");
        camMode = "wicket";
        stumpKnock = 0; // stumps intact; camera does the emphasis
      } else if (res.runs > 0) {
        const diveTxt = res.dive && res.dive !== "none"
          ? "DIVING STOP!  +" : "+";
        showPopup(diveTxt + res.runs + (res.runs === 1 ? " RUN" : " RUNS"), "#ffffff", 0.9);
      } else {
        const diveTxt = res.dive === "boundary_save" ? "GREAT DIVE - DOT BALL"
          : res.dive && res.dive !== "none" ? "DIVING STOP" : "DOT BALL";
        showPopup(diveTxt, "#b9c2cc", 0.7);
      }
      finalizeStruckDelivery();
    }
  } else if (fieldClock > res.t + 1.5 || Math.hypot(flight.pos.x, flight.pos.z) >= 62) {
    finalizeStruckDelivery();
  }
}

function recordBall(outcome) {
  match.recordDelivery(outcome);
  trackBallForPresentation(outcome);
  updateScoreboard();
}

function finalizeStruckDelivery() {
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  const res = fieldingResult;

  // Phase 4: let the AI bowler read what the player just did (spec 10).
  if (playerIsBatting() && engine.lastSwing) {
    playerBatHistory.push({
      sector: sectorOf(engine.lastSwing.direction.angle),
      runs: res.kind === "caught" ? 0 : res.runs,
      intent: engine.lastSwing.intent,
    });
    if (playerBatHistory.length > 6) playerBatHistory.shift();
  }

  if (res.kind === "caught") recordBall({ kind: "wicket", runs: 0, dismissal: "caught" });
  else recordBall({ kind: "legal", runs: res.runs });
  fieldingLive = false;
  camMode = res.kind === "caught" ? "wicket" : "game";
  flight.mode = res.kind === "caught" || res.kind === "stopped" ? "held" : "hidden";
  // Phase 4: replay the big moments (boundary / catch). Skippable.
  if (res.kind === "four" || res.kind === "six" || res.kind === "caught") queueReplay("struck");
  replaySeed = null;
  phase = "between"; phaseT = 0;
}

function resolveWide() {
  // Phase 4: a sprayed delivery. One extra run, NO legal ball consumed.
  if (resolvedThisBall) return;
  resolvedThisBall = true;
  pendingWide = false;
  showBanner("WIDE!", "#ff9d4a");
  recordBall({ kind: "wide", runs: 1 });
  flight.mode = "keeper";
  flight.pos = { x: KEEPER_POS.x + 0.25, y: 1.0, z: KEEPER_POS.z };
  phase = "between"; phaseT = 0;
  updateScoreboard();
}

function ballPassedCollected() {
  if (resolvedThisBall) return;
  resolvedThisBall = true;

  // Unstruck ball: bowled / LBW / beaten / left alone.
  const o = resolveOutcome(Math.random, engine.traj, engine.lastSwing,
    engine.foot.x, engine.foot.z, forcedOutcome);
  pendingOutcome = o;
  if (o.wicket) {
    stumpKnock = 0.0001;
    showBanner(o.kind === "lbw" ? "LBW!" : "BOWLED!", "#ff4a3c");
    camMode = "wicket";
    recordBall({ kind: "wicket", runs: 0, dismissal: o.kind === "lbw" ? "lbw" : "bowled" });
    replaySeed = { traj: true };   // Phase 4: replay the delivery into the stumps
    queueReplay("traj");
  } else {
    if (o.kind === "beaten") showPopup("BEATEN!", "#ffbf5e", 0.9);
    else showPopup("LEFT ALONE", "#cfe2ff", 0.8);
    recordBall({ kind: "legal", runs: o.runs || 0 });
  }

  flight.mode = "keeper";
  flight.pos = { x: KEEPER_POS.x + 0.25, y: 1.0, z: KEEPER_POS.z };
  phase = "between"; phaseT = 0;
  updateScoreboard();
}

/* Visual flight of the struck ball. The SIM owns the outcome; this only
 * moves the ball (and must never settle the delivery on its own). */
function stepFreeFlight(dt) {
  if (flight.mode !== "free") return;
  const grounded = stepBallStruck(flight.pos, flight.vel, flight.grounded, dt);
  flight.grounded = grounded;
}

/* ================= camera ================= */
const WICKET_POS = { x: 1.9, y: 1.5, z: -3.4 }, WICKET_LOOK = { x: 0, y: 0.5, z: -1 };

function updateCamera(dt) {
  let desiredPos, desiredLook;
  if (camMode === "setup") {
    desiredPos = SETUP_POS; desiredLook = SETUP_LOOK;
  } else if (camMode === "wicket") {
    desiredPos = WICKET_POS; desiredLook = WICKET_LOOK;
  } else if (camMode === "bowl") {
    // Phase 5 (spec 16): over-the-shoulder bowler view during the run-up;
    // the damping blend hands back to gameplay before release settles.
    desiredPos = { x: 0.7, y: 2.35, z: bowlerZ + 3.4 };
    desiredLook = { x: -0.35, y: 1.1, z: -0.2 };
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

  // fielders (9 + keeper from the Phase 3 field setup; positions animated)
  // Phase 5: team kits + caps; the fielding side wears its own colours.
  const fieldShirt = playerIsBatting() ? "#e8a50a" : "#1a73e8";
  const fieldCap = playerIsBatting() ? "#8a5a06" : "#0d3f8f";
  for (const f of fieldViews) {
    const body = f.name === "keeper" ? "#43435c" : fieldShirt;
    const h = f.chaseTarget ? 1.35 : 1.45;   // slight crouch while chasing
    line3(cam, { x: f.x, y: 0.15, z: f.z }, { x: f.x, y: h, z: f.z }, body, 0.42);
    circle3(cam, { x: f.x, y: h + 0.17, z: f.z }, 0.16, "#d9b08c");
    circle3(cam, { x: f.x, y: h + 0.28, z: f.z }, 0.11, f.name === "keeper" ? "#2c2c40" : fieldCap);
  }

  // Phase 5 umpires: bowler's end + square leg, white coats.
  for (const u of [{ x: 0.4, z: 22.8 }, { x: -16, z: 4 }]) {
    line3(cam, { x: u.x, y: 0.1, z: u.z }, { x: u.x, y: 0.85, z: u.z }, "#14141c", 0.3);
    line3(cam, { x: u.x, y: 0.85, z: u.z }, { x: u.x, y: 1.6, z: u.z }, "#e9ecf2", 0.42);
    circle3(cam, { x: u.x, y: 1.78, z: u.z }, 0.15, "#d9b08c");
    circle3(cam, { x: u.x, y: 1.9, z: u.z }, 0.11, "#14141c");
  }

  // Phase 5 VFX rings (contact / boundary)
  for (const r of vfxRings) {
    const k = r.t / r.life;
    if (k >= 1) continue;
    const pr = project(cam, { x: r.x, y: r.y, z: r.z });
    if (!pr) continue;
    const rad = (r.r0 + r.grow * k) * pr.s;
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = 0.75 * (1 - k);
    ctx.lineWidth = Math.max(1.5, 0.06 * pr.s);
    ctx.beginPath();
    ctx.ellipse(pr.x, pr.y, rad, rad * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // bowler
  drawBowler(cam);

  // batting-end stumps (between camera and batsman)
  drawStumps(cam, STUMPS_Z, stumpKnock);

  // ball shadow + ball
  if (flight.mode !== "hidden" && !replay.active) {
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

  // Phase 4 replay ghost ball (spec 18): re-integrated stored flight info.
  if (replay.active) {
    const rp = replay.kind === "struck"
      ? replay.pos
      : engine.traj.position(Math.min(replay.t * 1.25, engine.traj.time_to_stumps + 0.1));
    circle3(cam, rp, 0.075, "#ffd23f");
    ctx.fillStyle = "rgba(255,210,63,0.9)";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("REPLAY \u25B8\u25B8  (tap to skip)", 16, 30);
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
  else {
    // Phase 5: the bail pops and tumbles on a wicket.
    const k = Math.min(1, knock);
    const by = 0.735 + Math.sin(k * Math.PI) * 0.65;
    line3(cam, { x: -0.13, y: by, z: z - k * 0.55 },
          { x: 0.13, y: by + k * 0.18, z: z - k * 0.55 }, col, 0.025);
  }
}

function drawBowler(cam) {
  const bz = bowlerZ;
  const shirt = playerIsBatting() ? "#e8a50a" : "#1a73e8";   // fielding kit
  const cap = playerIsBatting() ? "#8a5a06" : "#0d3f8f";
  line3(cam, { x: 0.2, y: 0.15, z: bz }, { x: 0.2, y: 1.5, z: bz }, shirt, 0.5);
  circle3(cam, { x: 0.2, y: 1.72, z: bz }, 0.17, "#d9b08c");
  circle3(cam, { x: 0.2, y: 1.84, z: bz }, 0.11, cap);
  const armA = bowlerArmT * Math.PI * 2;
  const ax = 0.2 + 0.1, ay = 1.45;
  line3(cam, { x: ax, y: ay, z: bz },
    { x: ax + Math.sin(armA) * 0.15, y: ay + Math.cos(armA) * 0.55, z: bz }, shirt, 0.16);
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
  const batKit = playerIsBatting() ? "#1a73e8" : "#e8a50a";   // batting kit
  const batHelmet = playerIsBatting() ? "#0d3f8f" : "#8a5a06";
  // legs (pads read white)
  line3(cam, { x: bx - 0.12, y: 0.02, z: bz }, hips, "#e8e8ee", 0.17);
  line3(cam, { x: bx + 0.12, y: 0.02, z: bz }, hips, "#e8e8ee", 0.17);
  // torso + head + helmet
  line3(cam, hips, sh, batKit, 0.4);
  circle3(cam, { x: bx, y: 1.7, z: bz + lean * 1.6 }, 0.16, "#d9b08c");
  circle3(cam, { x: bx, y: 1.78, z: bz + lean * 1.6 }, 0.15, batHelmet);

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

function drawReleaseWindow() {
  // Phase 4 release-timing bar (player bowling). Tap anywhere to release.
  if (!releaseWindow.active) return;
  const bw = Math.min(W * 0.62, 520), bh = 26;
  const x = W / 2 - bw / 2, y = H * 0.72;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, bw, bh);
  // sweet spot
  ctx.fillStyle = "rgba(94,255,138,0.35)";
  const sweetW = bw * (RELEASE_PERFECT_WINDOW / RELEASE_MAX_ERROR) * 2;
  ctx.fillRect(W / 2 - sweetW / 2, y, sweetW, bh);
  // marker
  const phase = clamp(releaseWindow.t / releaseWindow.window, 0, 1) * 2 - 1;
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(W / 2 + phase * (bw / 2 - 4) - 3, y - 4, 6, bh + 8);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TAP TO RELEASE", W / 2, y - 10);
  ctx.textAlign = "left";
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
const chaseEl = document.getElementById("chase");
const popupEl = document.getElementById("popup");
let popupTimer = null;

/* ---- Phase 3 overlays ---- */
const overlayEl = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayDetail = document.getElementById("overlayDetail");
const overlaySub = document.getElementById("overlaySub");
const playAgainBtn = document.getElementById("playAgain");

async function showOverlay(title, detail, sub, withPlayAgain) {
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
  overlaySub.textContent = sub;
  playAgainBtn.style.display = withPlayAgain ? "inline-block" : "none";
  if (!withPlayAgain) {
    document.getElementById("resultCols").style.display = "none";
    document.getElementById("continueBtn").style.display = "none";
  }
  overlayEl.style.display = "flex";
}
function hideOverlay() { overlayEl.style.display = "none"; }

function showResultOverlay() {
  const r = match.result;
  let title, detail;
  if (r.outcome === "second_win") {
    title = "YOU LOSE";
    detail = `Target chased with ${r.margin_balls} ball${r.margin_balls === 1 ? "" : "s"} remaining`;
  } else if (r.outcome === "first_win") {
    title = "YOU WIN";
    detail = r.second.wickets >= 2
      ? `All out — fell short by ${r.margin_runs} run${r.margin_runs === 1 ? "" : "s"}`
      : `Won by ${r.margin_runs} run${r.margin_runs === 1 ? "" : "s"}`;
  } else {
    title = "TIE";
    detail = "Scores level after the Super Over";
  }
  const sub = `YOU  ${r.first.runs}/${r.first.wickets} (${r.first.legal_balls} balls)`
    + `    ·    AI  ${r.second.runs}/${r.second.wickets} (${r.second.legal_balls} balls)`;
  matchFlow = "result";

  // Phase 5: Figma three-column result layout.
  const cols = document.getElementById("resultCols");
  cols.style.display = "flex";
  document.getElementById("rcInnings").innerHTML =
    `<span class="hl">YOU</span>  ${r.first.runs}/${r.first.wickets} (${r.first.legal_balls}b)\n`
    + `<span class="am">AI</span>  ${r.second.runs}/${r.second.wickets} (${r.second.legal_balls}b)`;
  const winner = r.outcome === "first_win" ? "YOU" : r.outcome === "second_win" ? "AI" : "SHARED";
  document.getElementById("rcPotm").innerHTML =
    `<span class="${winner === "YOU" ? "hl" : "am"}">${winner}</span>\nSuper Over performer`;
  document.getElementById("rcDetails").innerHTML =
    `Format  SUPER OVER\nTarget  ${r.first.runs + 1}\nMargin  ${detail}`;
  document.getElementById("continueBtn").style.display = "inline-block";
  return showOverlay(title, detail, sub, true);
}

playAgainBtn.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  hideOverlay();
  resetPresentationStats();
  if (playAgainResolver) { playAgainResolver(); playAgainResolver = null; }
});
document.getElementById("continueBtn").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  showPopup("FRANCHISE BRIDGE  —  COMING IN A LATER PHASE", "#8A93A6", 1.6);
  hideOverlay();
  resetPresentationStats();
  if (playAgainResolver) { playAgainResolver(); playAgainResolver = null; }
});

/* ---- Phase 5: pre-match presentation + pause menu ---- */
const preMatchEl = document.getElementById("preMatch");
const pauseMenuEl = document.getElementById("pauseMenu");

document.getElementById("pmStart").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  preMatchEl.style.display = "none";
  preMatchActive = false;
  startBall();
});

function openPause() {
  if (preMatchActive || matchFlow === "result") return;
  paused = true;
  const inn = match.currentInnings() || match.innings[1];
  const t = match.target();
  document.getElementById("pmScore").textContent =
    `YOU ${match.innings[0].runs}/${match.innings[0].wickets}  VS  AI ${match.innings[1].runs}/${match.innings[1].wickets}`;
  document.getElementById("pmSub").textContent = t != null
    ? `Need ${match.runsRequired()} runs from ${match.ballsRemaining()} balls`
    : `${match.ballsRemaining()} balls left in the innings`;
  pauseMenuEl.style.display = "flex";
}
function closePause() {
  paused = false;
  pauseMenuEl.style.display = "none";
}
document.getElementById("pauseBtn").addEventListener("pointerdown", (e) => { e.stopPropagation(); openPause(); });
document.getElementById("pmResume").addEventListener("pointerdown", (e) => { e.stopPropagation(); closePause(); });
document.getElementById("pmControlsBtn").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  const c = document.getElementById("pauseControls");
  c.style.display = c.style.display === "block" ? "none" : "block";
  document.getElementById("pauseSettings").style.display = "none";
});
document.getElementById("pmSettingsBtn").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  const s = document.getElementById("pauseSettings");
  s.style.display = s.style.display === "block" ? "none" : "block";
  document.getElementById("pauseControls").style.display = "none";
});
document.getElementById("pmQuit").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  closePause();
  hideOverlay();
  resetMatchAll();
  resetPresentationStats();
  updateScoreboard();
  preMatchEl.style.display = "flex";
  preMatchActive = true;
});
const QUALITY_ORDER = ["LOW", "MEDIUM", "HIGH"];
let qualityIdx = 1;
document.getElementById("setQuality").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  qualityIdx = (qualityIdx + 1) % 3;
  e.target.textContent = QUALITY_ORDER[qualityIdx];
});
document.getElementById("setHaptics").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  e.target.textContent = e.target.textContent === "ON" ? "OFF" : "ON";
});
document.getElementById("setAudio").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  e.target.textContent = e.target.textContent === "ON" ? "OFF" : "ON";
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "p" || e.key === "P") {
    if (pauseMenuEl.style.display === "flex") closePause(); else openPause();
  }
});
// showResultOverlay resolves only after PLAY AGAIN: wrap it.
const _showResultOverlay = showResultOverlay;
showResultOverlay = function () {
  return new Promise((resolve) => {
    playAgainResolver = resolve;
    _showResultOverlay();
  });
};

/* ---- Phase 3 bowling panel ---- */
const bowlPanelEl = document.getElementById("bowlPanel");
const bowlReadout = document.getElementById("bowlReadout");

function updateBowlReadout() {
  const line = bowlCfg.line < -0.25 ? "LINE: LEG STUMP" : bowlCfg.line > 0.25 ? "LINE: OFF STUMP" : "LINE: STUMPS";
  const len = bowlCfg.length < 0.22 ? "LENGTH: FULL" : bowlCfg.length > 0.7 ? "LENGTH: SHORT" : "LENGTH: GOOD";
  bowlReadout.innerHTML = line + "<br>" + len;
}
function updateBowlPanelVisibility() {
  bowlPanelEl.style.display = playerIsBatting() ? "none" : "flex";
  document.getElementById("intentBar").style.display = playerIsBatting() ? "flex" : "none";
  document.getElementById("spellCard").style.display = playerIsBatting() ? "none" : "flex";
}
function bindBowlButton(id, fn) {
  document.getElementById(id).addEventListener("pointerdown", (e) => { e.stopPropagation(); fn(); updateBowlReadout(); });
}
bindBowlButton("bpLeft", () => { bowlCfg.line = clamp(bowlCfg.line - 0.15, -0.9, 0.9); });
bindBowlButton("bpRight", () => { bowlCfg.line = clamp(bowlCfg.line + 0.15, -0.9, 0.9); });
bindBowlButton("bpUp", () => { bowlCfg.length = clamp(bowlCfg.length - 0.12, 0.04, 0.95); });
bindBowlButton("bpDown", () => { bowlCfg.length = clamp(bowlCfg.length + 0.12, 0.04, 0.95); });
document.querySelectorAll(".btype").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    bowlCfg.type = btn.dataset.bt;
    document.querySelectorAll(".btype").forEach((b) => b.classList.toggle("sel", b === btn));
  });
});
updateBowlReadout();
window.addEventListener("keydown", (e) => {
  if (playerIsBatting()) return;
  if (e.key === " " || e.key === "Enter") { captureRelease(); return; }   // Phase 4 release
  if (e.key === "ArrowLeft") bowlCfg.line = clamp(bowlCfg.line - 0.15, -0.9, 0.9);
  if (e.key === "ArrowRight") bowlCfg.line = clamp(bowlCfg.line + 0.15, -0.9, 0.9);
  if (e.key === "ArrowUp") bowlCfg.length = clamp(bowlCfg.length - 0.12, 0.04, 0.95);
  if (e.key === "ArrowDown") bowlCfg.length = clamp(bowlCfg.length + 0.12, 0.04, 0.95);
  updateBowlReadout();
});

const toastEl = document.getElementById("toast");
const bannerEl = document.getElementById("banner");
const flashEl = document.getElementById("flash");
let toastTimer = null, bannerTimer = null, flashTimer = null;

function updateScoreboard() {
  const inn = match.currentInnings() || match.innings[1];
  const side = playerIsBatting() ? "YOU" : "AI";
  // Phase 5 (spec 7/9): striker / non-striker + bowler names from the rules state.
  const batNames = playerIsBatting() ? KIT_NAMES.you : KIT_NAMES.ai;
  const bowlName = playerIsBatting() ? KIT_NAMES.ai[0] : KIT_NAMES.you[0];
  const s = clamp(inn.striker || 0, 0, 2), n = clamp(inn.non_striker || 1, 0, 2);
  scoreEl.textContent = `${side}  ${inn.runs}/${inn.wickets}  (${inn.legal_balls}/6)`
    + `  ·  ${batNames[s]}* / ${batNames[n]}  ·  b. ${bowlName}`;
  const rr = inn.legal_balls > 0 ? (inn.runs / (inn.legal_balls / 6)).toFixed(1) : "0.0";
  const t = match.target();
  if (t != null) {
    chaseEl.innerHTML = `<b>NEED ${match.runsRequired()} &nbsp;·&nbsp; TARGET ${t}</b>`
      + `<span>${match.ballsRemaining()} BALLS · ${match.wicketsRemaining()} WKTS · RR ${rr}</span>`;
  } else {
    chaseEl.innerHTML = `<b>SET A TARGET</b><span>${match.ballsRemaining()} BALLS LEFT · RR ${rr}</span>`;
  }
}

/* ---- Phase 5 presentation state ---- */
let paused = false;
let preMatchActive = true;
const overChipEls = [...document.querySelectorAll(".ochip")];
const overChipQueue = [];
let partnershipRuns = 0, partnershipBalls = 0;
let spellDots = 0, spellBounds = 0, spellSpeedSum = 0, spellSpeedN = 0;
let lastBowlSpeedKph = 0;

function resetPresentationStats() {
  overChipQueue.length = 0;
  partnershipRuns = 0; partnershipBalls = 0;
  spellDots = 0; spellBounds = 0; spellSpeedSum = 0; spellSpeedN = 0;
  for (const el of overChipEls) { el.textContent = "·"; el.className = "ochip"; }
  document.getElementById("overPartnership").textContent = "0 RUNS (0b)";
  document.getElementById("spDots").textContent = "0";
  document.getElementById("spBounds").textContent = "0";
  document.getElementById("spSpeed").textContent = "-";
}

function trackBallForPresentation(outcome) {
  // over chips
  let token, cls;
  if (outcome.kind === "wicket") { token = "W"; cls = "ochip w"; }
  else if (outcome.kind === "wide") { token = "wd"; cls = "ochip wd"; }
  else if (outcome.runs >= 6) { token = "6"; cls = "ochip six"; }
  else if (outcome.runs >= 4) { token = "4"; cls = "ochip four"; }
  else if (outcome.runs === 0) { token = "·"; cls = "ochip"; }
  else { token = String(outcome.runs); cls = "ochip runs"; }
  overChipQueue.push([token, cls]);
  while (overChipQueue.length > overChipEls.length) overChipQueue.shift();
  overChipEls.forEach((el, i) => {
    const e = overChipQueue[i];
    el.textContent = e ? e[0] : "·";
    el.className = e ? e[1] : "ochip";
  });
  // partnership strip
  if (outcome.kind === "wicket") { partnershipRuns = 0; partnershipBalls = 0; }
  else {
    partnershipRuns += outcome.runs;
    if (outcome.kind === "legal") partnershipBalls++;
  }
  document.getElementById("overPartnership").textContent =
    `${partnershipRuns} RUNS (${partnershipBalls}b)`;
  // spell analysis (player's bowling innings)
  if (!playerIsBatting() && outcome.kind === "legal") {
    if (outcome.runs === 0) spellDots++;
    if (outcome.runs >= 4) spellBounds++;
    if (lastBowlSpeedKph > 1) { spellSpeedSum += lastBowlSpeedKph; spellSpeedN++; }
    document.getElementById("spDots").textContent = String(spellDots);
    document.getElementById("spBounds").textContent = String(spellBounds);
    document.getElementById("spSpeed").textContent =
      spellSpeedN ? Math.round(spellSpeedSum / spellSpeedN) + " KPH" : "-";
  }
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
  bannerEl.style.borderColor = color;              // Phase 5 themed moment card
  bannerEl.style.borderLeftColor = color;
  bannerEl.style.opacity = 1;
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { bannerEl.style.opacity = 0; }, 1600);
}
function setTimingChip(label, color) {
  const el = document.getElementById("timingChip");
  el.textContent = label + " TIMING";
  el.style.color = color;
  el.style.borderColor = color;
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
  if (!lastDeliveryData || resolvedThisBall) return;
  redeliverNext = true;
  resolvedThisBall = true;
  struckApplied = true;
  fieldingLive = false;
  flight.mode = "hidden";
  phase = "between"; phaseT = 0.6;    // short pause, then same ball again
});
updateTypeBtn(); updateOutcomeBtn();

/* ---- Phase 3 debug controls ---- */
const bDiff = document.getElementById("bDiff");
const bField = document.getElementById("bField");
const FIELD_CYCLE = [null, "catch", "miss", "stop", "boundary"];
let fieldIdx = 0;
bDiff.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  difficulty = difficulty === "easy" ? "medium" : difficulty === "medium" ? "hard" : "easy";
  bDiff.textContent = "DIFF: " + difficulty.toUpperCase();
});
bField.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  fieldIdx = (fieldIdx + 1) % FIELD_CYCLE.length;
  forcedField = FIELD_CYCLE[fieldIdx];
  bField.textContent = "FIELD: " + (forcedField ? forcedField.toUpperCase() : "NONE");
});
document.getElementById("bSimBall").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  // Fast-forward: force the current delivery to resolve as a single.
  if (resolvedThisBall) return;
  if (phase === "delivery" || phase === "struck") {
    forcedOutcome = forcedOutcome || "one";
    if (flight.mode === "traj" && !engine.contactWillHappen) ballPassedCollected();
    forcedOutcome = null;
  }
});
document.getElementById("bResetMatch").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  hideOverlay();
  if (playAgainResolver) { playAgainResolver(); playAgainResolver = null; }
  resetMatchAll();
  resolvedThisBall = true;
  fieldingLive = false;
  flight.mode = "hidden";
  phase = "between"; phaseT = 0.8;
  updateScoreboard();
});

/* Debug score nudges: during the break they set the TARGET (target = 1st
 * innings score + 1); END INNINGS jumps to the break/chase/result flow. */
function debugNudge(runs, wickets, balls) {
  const inn = match.currentInnings() || match.innings[0];
  if (!inn) return;
  inn.runs = Math.max(0, inn.runs + runs);
  inn.wickets = clamp(inn.wickets + wickets, 0, match.maxWickets);
  inn.legal_balls = clamp(inn.legal_balls + balls, 0, match.ballsPerInnings);
  debugReevaluate();
  updateScoreboard();
}
function debugReevaluate() {
  if (match.phase === "first") {
    const inn = match.innings[0];
    if (inn.legal_balls >= match.ballsPerInnings || inn.wickets >= match.maxWickets)
      match.phase = "break";
  } else if (match.phase === "second") {
    const inn = match.innings[1];
    const complete = inn.legal_balls >= match.ballsPerInnings || inn.wickets >= match.maxWickets;
    if (inn.runs >= match.innings[0].runs + 1) match._complete("second_win");
    else if (complete && inn.runs === match.innings[0].runs) match._complete("tie");
    else if (complete) match._complete("first_win");
  }
}
document.getElementById("bRuns2").addEventListener("pointerdown", (e) => {
  e.stopPropagation(); debugNudge(2, 0, 0);
});
document.getElementById("bWkts1").addEventListener("pointerdown", (e) => {
  e.stopPropagation(); debugNudge(0, 1, 0);
});
document.getElementById("bEndInn").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  const inn = match.currentInnings();
  if (!inn) return;
  inn.legal_balls = match.ballsPerInnings;
  debugReevaluate();
  resolvedThisBall = true;
  fieldingLive = false;
  flight.mode = "hidden";
  phase = "between"; phaseT = 0.8;
  updateScoreboard();
});

// Phase 4: cycle the AI batter's personality (spec section 8).
document.getElementById("bArchetype").addEventListener("pointerdown", (e) => {
  e.stopPropagation();
  const order = ["balanced", "aggressive", "defensive"];
  aiArchetype = order[(order.indexOf(aiArchetype) + 1) % order.length];
  document.getElementById("bArchetype").textContent = "AI BAT: " + aiArchetype.toUpperCase();
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

/* ================= AI batter input (Phase 3) ================= */
function aiInputFrame() {
  if (!aiPlan) return { footX: 0, footY: 0, intent: "normal", swing: false, dirX: 0, dirY: 1, strength: 0 };
  const ft = aiPlan.foot_target;
  const frame = {
    footX: clamp(ft.x - engine.foot.x, -1, 1) * 2,
    footY: clamp(ft.z - engine.foot.z, -1, 1) * 2,
    intent: aiPlan.intent,
    swing: false,
    dirX: Math.sin(aiPlan.angle), dirY: Math.cos(aiPlan.angle),
    strength: aiPlan.strength,
  };
  if (aiPlan.swing && !aiFired && aiSwingT != null && engine.t >= aiSwingT) {
    frame.swing = true;
    aiFired = true;
  }
  return frame;
}

/* ================= main loop ================= */
let lastT = performance.now();
let ballStarting = false;

function frame(now) {
  let dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;
  if (slowMo) dt *= 0.35;   // debug slow motion
  if (paused || preMatchActive) dt = 0;   // Phase 5: presentation holds the sim
  phaseT += dt;

  // Advance footwork + delivery clock in all live phases; block swings once
  // the ball is struck or the delivery is over.
  const inputFrame = playerIsBatting() ? sampleInputFrame() : aiInputFrame();
  if (struckApplied || resolvedThisBall) inputFrame.swing = false;

  // Debug: force a PERFECT swing at the exact ideal frame (player only).
  if (forcePerfect && playerIsBatting() && phase === "delivery" && !inputFrame.swing
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
      if (phaseT >= 0.9) { phase = "runup"; phaseT = 0; camMode = "bowl"; }  // Phase 5 bowling cam
      break;
    case "runup": {
      const t = clamp(phaseT / 0.9, 0, 1);
      bowlerZ = 26 + (20.2 - 26) * t;
      bowlerArmT = t;
      if (t >= 1) {
        if (!playerIsBatting() && !releaseWindow.active && !releaseWindow.captured) {
          // Phase 4: player bowling -> open the release-timing window.
          releaseWindow.active = true; releaseWindow.t = 0;
          releaseWindow.captured = false; releaseWindow.offset = 0;
        } else if (!playerIsBatting()) {
          // Advance the release bar; auto-release at the end of the sweep.
          releaseWindow.t += dt;
          if (releaseWindow.captured || releaseWindow.t >= releaseWindow.window) {
            if (!releaseWindow.captured) {
              releaseWindow.captured = true;
              releaseWindow.offset = RELEASE_MAX_ERROR * 1.1;
            }
            releaseWindow.active = false;
            releaseBall();
          }
        } else {
          releaseBall();
        }
      }
      break;
    }
    case "delivery": {
      if (flight.mode === "traj") {
        flight.t += dt;
        flight.pos = engine.traj.position(flight.t);
        if (engine.contactWillHappen && engine.t >= engine.traj.time_to_contact) {
          pendingWide = false;   // struck balls are never called wide
          applyContact();
        } else if (!engine.contactWillHappen && engine.t >= engine.traj.time_to_stumps + 0.20) {
          if (pendingWide) resolveWide(); else ballPassedCollected();
        }
      }
      break;
    }
    case "struck":
      break;
    case "between":
      // Phase 4: hold the next ball while a skippable replay runs.
      if (!replay.active && phaseT >= 1.15 && !ballStarting) {
        ballStarting = true;
        startBall().then(() => { ballStarting = false; });
      }
      break;
  }

  if (replay.active) {
    replay.t += dt;
    if (replay.kind === "struck") {
      stepBallStruck(replay.pos, replay.vel, replay.grounded, dt * 1.25);
      replay.grounded = replay.pos.y <= 0.06;
    }
    if (replay.t >= replay.max || (replay.kind === "struck"
        && Math.hypot(replay.pos.x, replay.pos.z) >= 61.6)) {
      replay.active = false;   // replay over: hand back to the flow
    }
  }

  if (flight.mode === "free") {
    stepFreeFlight(dt);
    if (phase === "delivery") phase = "struck";
  }
  updateFieldingPresentation(dt);

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
  for (let i = vfxRings.length - 1; i >= 0; i--) {
    vfxRings[i].t += dt;
    if (vfxRings[i].t > vfxRings[i].life) vfxRings.splice(i, 1);
  }

  // wicket reaction camera hands back to gameplay once the moment has landed
  if (camMode === "wicket" && phase === "between" && phaseT > 1.0) camMode = "game";

  updateCamera(dt);

  const camObj = makeCamera(cam.pos, cam.look);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawWorld(camObj);
  drawReleaseWindow();
  drawTouchVisuals();
  if (camPunch > 0.001) camPunch = Math.max(0, camPunch - dt * 1.4);
  updateDebug(dt);

  requestAnimationFrame(frame);
}

updateScoreboard();
resetPresentationStats();
requestAnimationFrame(frame);   // Phase 5: the pre-match screen gates play
window.__matchDebug = () => ({ match, matchFlow, difficulty, forcedField, phase, fieldingResult });
// Headless/test hook: skip the pre-match presentation and begin play.
window.__startPreview = () => {
  preMatchActive = false;
  preMatchEl.style.display = "none";
  startBall();
};
