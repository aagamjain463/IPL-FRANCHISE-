/* Phase 2 engine port for the browser preview.
 * 1:1 mirror of harness/batting_reference.py + harness/bowling_reference.py
 * (which mirror Assets/_Project/Core). Keep all three in sync. */
"use strict";

/* ---------------- constants ---------------- */
const G = 9.81;
const RELEASE_HEIGHT = 20.1 * 0 + 2.05;
const RELEASE_Z = 20.1;
const CONTACT_Z = 0.35;
const STUMPS_Z = -1.0;
const STUMP_HW = 0.18;
const STUMP_TOP = 0.72;
const SEAM_RATE = 0.9;
const BOUNDARY_RADIUS = 62;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v) => clamp(v, 0, 1);

/* ---------------- deliveries & pitch ---------------- */
function makeDelivery(speed_kph, line, length, swing, opts) {
  const o = opts || {};
  return {
    speed_kph, line, length, swing,
    dtype: o.dtype || "fast_straight",
    seam: o.seam || 0,
    bounce: o.bounce || 0,          // <=0 means 1.0
    release_height: o.release_height || 0, // <=0 means 2.05
  };
}

const NORMAL_PITCH = { bounce_energy: 1, pace_factor: 1, turn: 0, name: "normal" };

class Trajectory {
  constructor(d, pitch) {
    pitch = pitch || NORMAL_PITCH;
    this.delivery = d;
    const length = clamp01(d.length);
    const line = clamp(d.line, -1.25, 1.25);
    const swing = clamp(d.swing, -1.5, 1.5);
    const seam = clamp(d.seam, -1.5, 1.5);
    const bounce_scale = d.bounce > 0 ? d.bounce : 1;
    const release_height = d.release_height > 0 ? d.release_height : RELEASE_HEIGHT;

    this.release_height = release_height;
    this.speed = Math.max(8, d.speed_kph / 3.6);
    this.post_speed = this.speed * 0.92 * pitch.pace_factor;
    const bounce_z = 1.6 + 9.2 * length;
    this.bounce_x = line * 0.45;
    this.release_x = this.bounce_x - swing * 0.35;
    this.swing_amp = swing * 0.65;
    this.bounce_z = bounce_z;

    this.t1 = (RELEASE_Z - bounce_z) / this.speed;
    this.v0y = (0.5 * G * this.t1 * this.t1 - release_height) / this.t1;

    const v_impact = this.v0y - G * this.t1;
    const restitution = 0.78 - 0.20 * length;
    this.vy_after = -v_impact * restitution * bounce_scale * pitch.bounce_energy;

    const t2 = (bounce_z - CONTACT_Z) / this.post_speed;
    this.height_at_contact = Math.max(0.05, this.vy_after * t2 - 0.5 * G * t2 * t2);
    this.vx_after = swing * 0.05 + seam * SEAM_RATE + pitch.turn;

    this.time_to_contact = this.t1 + t2;
    this.time_to_stumps = this.t1 + (bounce_z - STUMPS_Z) / this.post_speed;
    this.x_at_contact = this.bounce_x + this.vx_after * t2;
    this.bounce_time = this.t1;
  }

  position(t) {
    t = Math.max(0, t);
    if (t <= this.t1) {
      const p = t / this.t1;
      const x = this.release_x + (this.bounce_x - this.release_x) * p
        + this.swing_amp * Math.sin(Math.PI * p);
      const z = RELEASE_Z - this.speed * t;
      const y = this.release_height + this.v0y * t - 0.5 * G * t * t;
      return { x, y: Math.max(0, y), z };
    }
    const dt = t - this.t1;
    return {
      x: this.bounce_x + this.vx_after * dt,
      y: Math.max(0, this.vy_after * dt - 0.5 * G * dt * dt),
      z: this.bounce_z - this.post_speed * dt,
    };
  }

  atStumps() {
    const dt = (this.bounce_z - STUMPS_Z) / this.post_speed;
    return {
      x: this.bounce_x + this.vx_after * dt,
      y: this.vy_after * dt - 0.5 * G * dt * dt,
    };
  }

  hitsStumps() {
    const s = this.atStumps();
    return Math.abs(s.x) <= STUMP_HW && s.y >= 0 && s.y <= STUMP_TOP;
  }
}

/* ---------------- footwork ---------------- */
const FOOT = { accel: 26, damp: 18, maxSpeed: 3.6, xMin: -1.15, xMax: 1.15, zMin: -0.85, zMax: 1.35 };

function footAdvance(f, ix, iy, dt) {
  const approach = (cur, target, maxD) => cur < target ? Math.min(cur + maxD, target) : Math.max(cur - maxD, target);
  f.vx = approach(f.vx, ix * FOOT.maxSpeed, (Math.abs(ix) > 0.02 ? FOOT.accel : FOOT.damp) * dt);
  f.vz = approach(f.vz, iy * FOOT.maxSpeed, (Math.abs(iy) > 0.02 ? FOOT.accel : FOOT.damp) * dt);
  f.x += f.vx * dt; f.z += f.vz * dt;
  if (f.x < FOOT.xMin) { f.x = FOOT.xMin; f.vx = Math.max(0, f.vx); }
  if (f.x > FOOT.xMax) { f.x = FOOT.xMax; f.vx = Math.min(0, f.vx); }
  if (f.z < FOOT.zMin) { f.z = FOOT.zMin; f.vz = Math.max(0, f.vz); }
  if (f.z > FOOT.zMax) { f.z = FOOT.zMax; f.vz = Math.min(0, f.vz); }
}

function footPose(f) {
  if (f.z >= 0.22) return "front";
  if (f.z <= -0.20) return "back";
  return "neutral";
}

/* ---------------- timing ---------------- */
const PERFECT_W = 0.035, GOOD_W = 0.085, OK_W = 0.160, MAX_W = 0.260;

function windupTime(intent) {
  return { defensive: 0.10, normal: 0.14, aggressive: 0.17, lofted: 0.19 }[intent];
}

function classifyTiming(offset) {
  const a = Math.abs(offset);
  if (a > MAX_W) return "missed";
  if (a <= PERFECT_W) return "perfect";
  if (a <= GOOD_W) return "good";
  if (offset < 0) return a <= OK_W ? "early" : "very_early";
  return a <= OK_W ? "late" : "very_late";
}

const sstep = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
function powerCurve(off) { return Math.abs(off) < MAX_W ? 1 - 0.85 * sstep(Math.abs(off) / MAX_W) : 0.10; }
function controlCurve(off) { return Math.abs(off) < MAX_W ? 1 - sstep(Math.abs(off) / MAX_W) : 0; }

function edgeProbability(absOff, reach, speedKph) {
  let p = 0.02;
  if (absOff > 0.045) p += (absOff - 0.045) * 2.4;
  p += (1 - reach) * 0.18;
  p += clamp01((speedKph - 90) / 150) * 0.06;
  return clamp(p, 0.01, 0.55);
}

/* ---------------- direction resolver ---------------- */
const MIN_DIR_STRENGTH = 0.25, REACH_FALLOFF = 0.85;

function resolveDirection(dx, dy, swipeStrength, ballX, delivery, footX, timingOffset) {
  const mag = Math.hypot(dx, dy);
  const hasDir = mag >= MIN_DIR_STRENGTH && swipeStrength > 0.05;
  let nx = 0, ny = 1;
  if (hasDir) { nx = dx / mag; ny = dy / mag; }
  let angle = Math.atan2(nx, ny) + timingOffset * 1.6;
  const gap = ballX - (footX + 0.10);
  const reach = clamp01(1 - Math.abs(gap) / REACH_FALLOFF);
  return { angle, reach, gap, has_direction: hasDir };
}

/* ---------------- shot selector ---------------- */
function lengthZone(l) { return l < 0.35 ? "full" : l < 0.72 ? "good" : "short"; }
function isYorker(l) { return l < 0.12; }

function sectorOf(angleRad) {
  const deg = angleRad * 57.29578, abs = Math.abs(deg);
  if (abs <= 20) return "straight";
  if (abs <= 55) return deg > 0 ? "cover" : "mid_wicket";
  if (abs <= 100) return deg > 0 ? "point" : "square_leg";
  return deg > 0 ? "third_man" : "fine_leg";
}

function sectorName(s) {
  return { fine_leg: "FINE LEG", square_leg: "SQUARE LEG", mid_wicket: "MID-WICKET",
           straight: "STRAIGHT", cover: "COVER", point: "POINT", third_man: "THIRD MAN" }[s];
}

function selectShot(intent, pose, delivery, direction) {
  const length = lengthZone(delivery.length);
  const sector = sectorOf(direction.angle);
  const squareOrBehind = sector === "point" || sector === "square_leg" ||
                         sector === "third_man" || sector === "fine_leg";
  const s = { kind: null, name: null, lofted: false, awkward: false, base_power: 0, base_loft: 0 };

  if (intent === "defensive") {
    if (length === "short") { s.kind = "back_foot_defense"; s.name = "Back-Foot Defence"; }
    else { s.kind = "front_foot_defense"; s.name = "Front-Foot Defence"; }
    s.base_power = 0.30; s.base_loft = 2;
    s.awkward = direction.reach < 0.2;
    return s;
  }

  if (intent === "lofted") {
    s.lofted = true; s.base_power = 0.90; s.base_loft = 30;
    if (length === "short") {
      s.kind = "pull"; s.name = "Lofted Pull"; s.awkward = pose === "front";
      return s;
    }
    if (sector === "mid_wicket" || sector === "square_leg" || sector === "fine_leg") {
      s.kind = "lofted_leg_side"; s.name = "Lofted Leg-Side Shot";
    } else if (sector === "straight") {
      s.kind = "lofted_straight"; s.name = "Lofted Straight";
    } else {
      s.kind = "lofted_drive"; s.name = "Lofted Drive";
    }
    s.awkward = (pose === "back" && length === "full") || isYorker(delivery.length);
    return s;
  }

  s.base_power = intent === "aggressive" ? 1.0 : 0.68;
  s.base_loft = intent === "aggressive" ? 12 : 6;

  if (length === "full") {
    if (pose === "back") s.awkward = true;
    if (isYorker(delivery.length) && pose !== "front") s.awkward = true;
    if (squareOrBehind) {
      s.kind = "awkward_poke"; s.name = "Awkward Stab"; s.awkward = true; s.base_power *= 0.5;
      return s;
    }
    if (sector === "cover") { s.kind = "cover_drive"; s.name = "Cover Drive"; }
    else if (sector === "mid_wicket" || sector === "square_leg" || sector === "fine_leg") {
      s.kind = "flick"; s.name = "Flick";
    } else { s.kind = "straight_drive"; s.name = "Straight Drive"; }
    return s;
  }

  if (length === "short") {
    if (pose === "front") s.awkward = true;
    if (sector === "cover" || sector === "point" || sector === "third_man") {
      s.kind = "cut"; s.name = intent === "aggressive" ? "Hard Cut" : "Cut";
    } else if (sector === "straight") {
      if (intent === "aggressive") { s.kind = "pull"; s.name = "Pull (straight)"; }
      else { s.kind = "awkward_poke"; s.name = "Awkward Poke"; s.awkward = true; }
    } else {
      s.kind = "pull"; s.name = intent === "aggressive" ? "Pull" : "Pull Shot";
    }
    return s;
  }

  // good length
  if (sector === "cover") { s.kind = "cover_drive"; s.name = "Cover Drive"; }
  else if (sector === "point") { s.kind = "square_drive"; s.name = "Square Drive"; }
  else if (sector === "third_man") { s.kind = "cut"; s.name = "Late Cut"; s.awkward = pose === "front"; }
  else if (sector === "mid_wicket") { s.kind = "flick"; s.name = "Flick"; }
  else if (sector === "square_leg" || sector === "fine_leg") { s.kind = "leg_glance"; s.name = "Leg Glance"; }
  else { s.kind = "straight_drive"; s.name = "Straight Drive"; }
  return s;
}

/* ---------------- contact ---------------- */
function directionFromAngle(angle, elevDeg) {
  const e = elevDeg * Math.PI / 180;
  return { x: Math.sin(angle) * Math.cos(e), y: Math.sin(e), z: Math.cos(angle) * Math.cos(e) };
}

function resolveContact(rand, delivery, shot, direction, timingOffset, windowKind, swipeStrength) {
  const r = { outcome: null, exit_kph: 0, direction: { x: 0, y: 0, z: 1 }, elevation: 0, quality: 0, lofted: false };
  const absOff = Math.abs(timingOffset);

  if (windowKind === "missed" || direction.reach < 0.15) { r.outcome = "miss"; return r; }

  if (shot.kind === "front_foot_defense" || shot.kind === "back_foot_defense") {
    const power = powerCurve(timingOffset);
    r.outcome = "defensive_solid";
    r.quality = power * (0.45 + 0.55 * direction.reach);
    r.exit_kph = 14 + 24 * power * shot.base_power;
    r.elevation = 2 + 4 * rand();
    r.direction = directionFromAngle(-delivery.line * 0.15, r.elevation);
    return r;
  }

  let pEdge = edgeProbability(absOff, direction.reach, delivery.speed_kph);
  if (shot.awkward) pEdge = Math.min(0.7, pEdge * 1.6);
  if (rand() < pEdge) {
    r.outcome = "edge";
    r.quality = 0.2;
    r.exit_kph = delivery.speed_kph * (0.42 + 0.25 * rand());
    r.elevation = 6 + 34 * rand();
    r.lofted = r.elevation > 22;
    const side = rand() < 0.5 ? -1 : 1;
    r.direction = directionFromAngle(side * (1.66 + 0.9 * rand()), r.elevation);
    return r;
  }

  let quality = powerCurve(timingOffset)
    * (0.45 + 0.55 * direction.reach)
    * (0.78 + 0.22 * swipeStrength)
    * (shot.awkward ? 0.60 : 1.0);
  quality = clamp01(quality);
  r.quality = quality;

  if (shot.lofted && quality >= 0.70) r.outcome = "lofted_clean";
  else if (quality >= 0.80) r.outcome = "clean";
  else if (quality >= 0.55) r.outcome = "mistimed";
  else r.outcome = "weak";

  const baseExit = 26 + 62 * shot.base_power;
  r.exit_kph = 8 + quality * baseExit + 0.08 * delivery.speed_kph;
  r.lofted = shot.lofted;

  if (shot.lofted) r.elevation = 16 + 22 * quality + (rand() - 0.5) * 8;
  else if (r.outcome === "weak" || r.outcome === "mistimed") r.elevation = 3 + 12 * rand();
  else r.elevation = shot.base_loft * 0.4 + 6 * quality + rand() * 3;

  const control = controlCurve(timingOffset);
  let noise = (1 - control) * 0.35 * (rand() * 2 - 1);
  if (shot.awkward) noise += (rand() * 2 - 1) * 0.20;
  r.direction = directionFromAngle(direction.angle + noise, r.elevation);
  return r;
}

/* ---------------- bowling factory ---------------- */
const DELIVERY_TYPES = ["fast_straight", "fast_inswinger", "fast_outswinger", "yorker",
                        "full_ball", "good_length", "short_ball", "bouncer"];

const DELIVERY_SPECS = {
  fast_straight:   { speed: [132, 142], line: [-0.18, 0.18], length: [0.45, 0.65], swing: [-0.15, 0.15], seam: [-0.25, 0.25], bounce: [0.95, 1.05] },
  fast_inswinger:  { speed: [127, 137], line: [0.15, 0.50], length: [0.30, 0.55], swing: [-0.95, -0.55], seam: [-0.55, -0.10], bounce: [0.95, 1.05] },
  fast_outswinger: { speed: [127, 137], line: [-0.10, 0.30], length: [0.30, 0.55], swing: [0.55, 0.95], seam: [0.05, 0.40], bounce: [0.95, 1.05] },
  yorker:          { speed: [135, 146], line: [-0.15, 0.20], length: [0.00, 0.07], swing: [-0.30, 0.30], seam: [-0.15, 0.15], bounce: [0.85, 0.95] },
  full_ball:       { speed: [114, 126], line: [-0.25, 0.35], length: [0.08, 0.24], swing: [-0.40, 0.40], seam: [-0.30, 0.30], bounce: [0.90, 1.00] },
  good_length:     { speed: [121, 133], line: [-0.20, 0.40], length: [0.45, 0.62], swing: [-0.35, 0.35], seam: [-0.40, 0.40], bounce: [0.95, 1.05] },
  short_ball:      { speed: [129, 140], line: [-0.50, 0.10], length: [0.72, 0.86], swing: [-0.20, 0.20], seam: [-0.25, 0.25], bounce: [1.00, 1.15] },
  bouncer:         { speed: [133, 145], line: [-0.55, 0.05], length: [0.88, 0.97], swing: [-0.15, 0.15], seam: [-0.15, 0.15], bounce: [1.10, 1.30] },
};

const DEFAULT_PLAN = {
  good_length: 0.20, fast_straight: 0.15, full_ball: 0.12, short_ball: 0.13,
  fast_inswinger: 0.12, fast_outswinger: 0.10, yorker: 0.10, bouncer: 0.08,
};

const DELIVERY_LABELS = {
  fast_straight: "FAST STRAIGHT", fast_inswinger: "INSWINGER", fast_outswinger: "OUTSWINGER",
  yorker: "YORKER", full_ball: "FULL", good_length: "GOOD LENGTH",
  short_ball: "SHORT", bouncer: "BOUNCER",
};

function randRange(rand, lohi) { return lohi[0] + (lohi[1] - lohi[0]) * rand(); }

function buildDelivery(dtype, rand, accuracy) {
  const spec = DELIVERY_SPECS[dtype];
  let line = randRange(rand, spec.line);
  let length = randRange(rand, spec.length);
  const disp = 1 - clamp01(accuracy);
  line = clamp(line + (rand() * 2 - 1) * 0.45 * disp, -1.2, 1.2);
  length = clamp01(length + (rand() * 2 - 1) * 0.30 * disp);
  return makeDelivery(
    Math.round(randRange(rand, spec.speed) * 10) / 10,
    line, length, randRange(rand, spec.swing),
    { dtype, seam: randRange(rand, spec.seam), bounce: randRange(rand, spec.bounce) });
}

function nextDeliveryType(rand, plan) {
  plan = plan || DEFAULT_PLAN;
  let total = 0;
  for (const t of DELIVERY_TYPES) total += plan[t] || 0;
  let roll = rand() * total, acc = 0;
  for (const t of DELIVERY_TYPES) {
    acc += plan[t] || 0;
    if (roll < acc) return t;
  }
  return "good_length";
}

/* ---------------- shot outcome resolver ---------------- */
const LBW_HALF_WIDTH = 0.22, LBW_MAX_HEIGHT = 0.85, LBW_MIN_FOOT_Z = -0.60;

const OUTCOME_LABELS = {
  leave: "LEFT ALONE", beaten: "BEATEN", bowled: "BOWLED!", lbw: "LBW!",
  defensive: "BLOCKED", dot: "DOT BALL", single: "SINGLE", two: "TWO RUNS",
  three: "THREE RUNS", four: "FOUR!", six: "SIX!",
  top_edge: "TOP EDGE", inside_edge: "INSIDE EDGE", outside_edge: "OUTSIDE EDGE",
};

function predictCarry(exitKph, elevationDeg, startHeight) {
  const e = clamp(elevationDeg, 0, 70) * Math.PI / 180;
  const v = exitKph / 3.6;
  const vx = v * Math.cos(e), vy = v * Math.sin(e);
  const carry = vx * ((vy + Math.sqrt(Math.max(0, vy * vy + 2 * G * startHeight))) / G);
  return { carry, vx, vy };
}

function resolveOutcome(rand, traj, swing, footX, footZ, force) {
  const r = { kind: null, label: null, runs: 0, wicket: false, forced: !!force };

  if (force) {
    const table = {
      dot: ["dot", 0], defensive: ["defensive", 0], one: ["single", 1], two: ["two", 2],
      four: ["four", 4], six: ["six", 6], edge: ["outside_edge", 0],
      bowled: ["bowled", 0], lbw: ["lbw", 0],
    };
    const [kind, runs] = table[force] || ["dot", 0];
    r.kind = kind; r.runs = runs;
    r.label = OUTCOME_LABELS[kind] || "DOT BALL";
    r.wicket = kind === "bowled" || kind === "lbw";
    return r;
  }

  const struck = swing && swing.will_contact;

  if (!struck) {
    if (traj.hitsStumps()) {
      const s = traj.atStumps();
      const bodyOnLine = Math.abs(s.x - footX) <= LBW_HALF_WIDTH;
      const lowEnough = s.y >= 0 && s.y <= LBW_MAX_HEIGHT;
      const inFront = footZ > LBW_MIN_FOOT_Z;
      if (bodyOnLine && lowEnough && inFront) {
        r.kind = "lbw"; r.label = OUTCOME_LABELS.lbw; r.wicket = true;
      } else {
        r.kind = "bowled"; r.label = OUTCOME_LABELS.bowled; r.wicket = true;
      }
      return r;
    }
    r.kind = swing ? "beaten" : "leave";
    r.label = swing ? OUTCOME_LABELS.beaten : OUTCOME_LABELS.leave;
    return r;
  }

  const c = swing.contact;
  const angle = Math.atan2(c.direction.x, c.direction.z);

  if (c.outcome === "edge") {
    let kind;
    if (c.elevation > 26) kind = "top_edge";
    else if (angle < 0) kind = "inside_edge";
    else kind = "outside_edge";
    let runs = 0;
    if (kind === "outside_edge" && c.exit_kph > 70 && rand() < 0.35) runs = 1;
    r.kind = kind; r.label = OUTCOME_LABELS[kind]; r.runs = runs;
    return r;
  }

  if (c.outcome === "defensive_solid") {
    const forward = Math.abs(angle) < 1.2;
    const runs = (forward && c.exit_kph > 26 && rand() < 0.35) ? 1 : 0;
    r.kind = "defensive"; r.label = OUTCOME_LABELS.defensive; r.runs = runs;
    return r;
  }

  const startHeight = Math.max(0.35, traj.height_at_contact);
  const pc = predictCarry(c.exit_kph, c.elevation, startHeight);
  const distToRope = BOUNDARY_RADIUS - 0.4;
  const elev = clamp(c.elevation, 0, 70);

  if (pc.carry >= distToRope) {
    const tRope = distToRope / Math.max(pc.vx, 0.5);
    const yAtRope = startHeight + pc.vy * tRope - 0.5 * G * tRope * tRope;
    if (yAtRope > 0.05) { r.kind = "six"; r.label = OUTCOME_LABELS.six; r.runs = 6; return r; }
  }

  const rollTime = 2.0 * (1 - 0.8 * clamp01(elev / 35));
  const rest = pc.carry + pc.vx * rollTime * 0.75;

  if (rest >= distToRope) { r.kind = "four"; r.label = OUTCOME_LABELS.four; r.runs = 4; return r; }
  if (rest >= 45) { r.kind = "three"; r.label = OUTCOME_LABELS.three; r.runs = 3; return r; }
  if (rest >= 25) { r.kind = "two"; r.label = OUTCOME_LABELS.two; r.runs = 2; return r; }
  if (rest >= 9) { r.kind = "single"; r.label = OUTCOME_LABELS.single; r.runs = 1; return r; }

  r.kind = "dot";
  r.label = (c.outcome === "weak" || c.outcome === "mistimed") ? "MISTIMED" : OUTCOME_LABELS.dot;
  return r;
}

/* ---------------- engine ---------------- */
class BattingEngine {
  constructor(pitch) {
    this.pitch = pitch || NORMAL_PITCH;
    this.foot = { x: 0, z: 0, vx: 0, vz: 0 };
    this.traj = null;
    this.t = 0;
    this.swingTaken = false;
    this.contactWillHappen = false;
    this.passedReported = false;
    this.bounceReported = false;
    this.lastSwing = null;
    this.onSwing = null;
    this.onPassed = null;
    this.onBounce = null;
  }

  beginDelivery(d) {
    this.traj = new Trajectory(d, this.pitch);
    this.t = 0;
    this.swingTaken = false;
    this.contactWillHappen = false;
    this.passedReported = false;
    this.bounceReported = false;
    this.lastSwing = null;
  }

  update(dt, input) {
    footAdvance(this.foot, input.footX || 0, input.footY || 0, dt);
    if (!this.traj) return;
    this.t += dt;

    if (!this.bounceReported && this.t >= this.traj.bounce_time) {
      this.bounceReported = true;
      if (this.onBounce) this.onBounce(this.traj.position(this.traj.bounce_time));
    }

    if (!this.swingTaken && !this.passedReported && input.swing) {
      const windup = windupTime(input.intent);
      const offset = (this.t + windup) - this.traj.time_to_contact;
      if (offset <= MAX_W) {
        this.swingTaken = true;
        const direction = resolveDirection(input.dirX || 0, input.dirY || 1, input.strength || 0,
          this.traj.x_at_contact, this.traj.delivery, this.foot.x, offset);
        const windowKind = classifyTiming(offset);
        const shot = selectShot(input.intent, footPose(this.foot), this.traj.delivery, direction);
        const report = {
          intent: input.intent, selection: shot, direction, window: windowKind,
          offset, delivery: this.traj.delivery, will_contact: false, contact: null,
        };
        if (windowKind !== "missed" && direction.reach >= 0.15) {
          const contact = resolveContact(Math.random, this.traj.delivery, shot, direction,
            offset, windowKind, input.strength || 0);
          if (contact.outcome !== "miss") {
            report.will_contact = true;
            report.contact = contact;
            this.contactWillHappen = true;
          }
        }
        this.lastSwing = report;
        if (this.onSwing) this.onSwing(report);
      }
    }

    if (!this.contactWillHappen && !this.passedReported && this.t >= this.traj.time_to_stumps) {
      this.passedReported = true;
      if (this.onPassed) this.onPassed({ swung: this.swingTaken, hit_stumps: this.traj.hitsStumps() });
    }
  }
}
