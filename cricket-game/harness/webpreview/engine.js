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

function lateralMovement(swing, seam) {
  return clamp(swing + seam, -1.5, 1.5);
}

function edgeSide(swing, seam) {
  const move = lateralMovement(swing, seam);
  if (move >= 0.15) return 1;
  if (move <= -0.15) return -1;
  return 0;
}

function movementEdgeBias(timingOffset, swing, seam) {
  const move = lateralMovement(swing, seam);
  const frac = Math.abs(move) / 1.5;
  if (frac <= 0) return 0;
  const mistime = Math.max(0, Math.abs(timingOffset) - 0.045);
  const s = Math.min(1, mistime / 0.12);
  const product = timingOffset * move;
  if (product > 0) return 0.10 * frac * s;
  return -0.04 * frac * s;
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

  let pEdge = edgeProbability(absOff, direction.reach, delivery.speed_kph)
            + movementEdgeBias(timingOffset, delivery.swing, delivery.seam);
  if (shot.awkward) pEdge = Math.min(0.7, pEdge * 1.6);
  pEdge = clamp(pEdge, 0.01, 0.55);
  if (rand() < pEdge) {
    r.outcome = "edge";
    r.quality = 0.2;
    const move = lateralMovement(delivery.swing, delivery.seam);
    const product = timingOffset * move;
    const thick = clamp(0.25 + (1 - direction.reach) * 0.55 + (product > 0 ? 0.20 : 0), 0, 1);
    r.exit_kph = delivery.speed_kph * (0.34 + 0.38 * thick + 0.16 * rand());
    r.elevation = thick < 0.5 ? 20 + 22 * rand() : 4 + 14 * rand();
    r.lofted = r.elevation > 22;
    const sideRand = rand() < 0.5 ? -1 : 1;
    const side = edgeSide(delivery.swing, delivery.seam);
    const sideSign = side !== 0 ? side : sideRand;
    const angle = thick < 0.5 ? sideSign * (1.85 + 0.45 * rand())
                              : sideSign * (1.20 + 0.70 * rand());
    r.direction = directionFromAngle(angle, r.elevation);
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
                        "full_ball", "good_length", "short_ball", "bouncer",
                        "off_cutter", "leg_cutter", "slower_ball"];

const DELIVERY_SPECS = {
  fast_straight:   { speed: [132, 142], line: [-0.18, 0.18], length: [0.45, 0.65], swing: [-0.15, 0.15], seam: [-0.25, 0.25], bounce: [0.95, 1.05] },
  fast_inswinger:  { speed: [127, 137], line: [0.15, 0.50], length: [0.30, 0.55], swing: [-0.95, -0.55], seam: [-0.55, -0.10], bounce: [0.95, 1.05] },
  fast_outswinger: { speed: [127, 137], line: [-0.10, 0.30], length: [0.30, 0.55], swing: [0.55, 0.95], seam: [0.05, 0.40], bounce: [0.95, 1.05] },
  yorker:          { speed: [135, 146], line: [-0.15, 0.20], length: [0.00, 0.07], swing: [-0.30, 0.30], seam: [-0.15, 0.15], bounce: [0.85, 0.95] },
  full_ball:       { speed: [114, 126], line: [-0.25, 0.35], length: [0.08, 0.24], swing: [-0.40, 0.40], seam: [-0.30, 0.30], bounce: [0.90, 1.00] },
  good_length:     { speed: [121, 133], line: [-0.20, 0.40], length: [0.45, 0.62], swing: [-0.35, 0.35], seam: [-0.40, 0.40], bounce: [0.95, 1.05] },
  short_ball:      { speed: [129, 140], line: [-0.50, 0.10], length: [0.72, 0.86], swing: [-0.20, 0.20], seam: [-0.25, 0.25], bounce: [1.00, 1.15] },
  bouncer:         { speed: [133, 145], line: [-0.55, 0.05], length: [0.88, 0.97], swing: [-0.15, 0.15], seam: [-0.15, 0.15], bounce: [1.10, 1.30] },
  off_cutter:      { speed: [112, 122], line: [-0.10, 0.35], length: [0.40, 0.60], swing: [-0.20, 0.20], seam: [0.30, 0.75], bounce: [0.90, 1.00] },
  leg_cutter:      { speed: [112, 122], line: [-0.35, 0.10], length: [0.40, 0.60], swing: [-0.20, 0.20], seam: [-0.75, -0.30], bounce: [0.90, 1.00] },
  slower_ball:     { speed: [102, 114], line: [-0.20, 0.30], length: [0.15, 0.45], swing: [-0.25, 0.25], seam: [-0.20, 0.20], bounce: [0.88, 0.98] },
};

const DEFAULT_PLAN = {
  good_length: 0.20, fast_straight: 0.15, full_ball: 0.12, short_ball: 0.13,
  fast_inswinger: 0.12, fast_outswinger: 0.10, yorker: 0.10, bouncer: 0.08,
  off_cutter: 0.05, leg_cutter: 0.05, slower_ball: 0.05,
};

const DELIVERY_LABELS = {
  fast_straight: "FAST STRAIGHT", fast_inswinger: "INSWINGER", fast_outswinger: "OUTSWINGER",
  yorker: "YORKER", full_ball: "FULL", good_length: "GOOD LENGTH",
  short_ball: "SHORT", bouncer: "BOUNCER",
  off_cutter: "OFF-CUTTER", leg_cutter: "LEG-CUTTER", slower_ball: "SLOWER BALL",
};

function randRange(rand, lohi) { return lohi[0] + (lohi[1] - lohi[0]) * rand(); }

function buildDelivery(dtype, rand, accuracy, opts) {
  // Phase 4 opts: { lineHint, lengthHint, profile } - all optional.
  opts = opts || {};
  const spec = DELIVERY_SPECS[dtype];
  let line = randRange(rand, spec.line);
  let length = randRange(rand, spec.length);
  if (opts.lineHint != null) line = clamp(line * 0.4 + opts.lineHint * 0.6, -1.2, 1.2);
  if (opts.lengthHint != null) length = clamp01(length * 0.4 + opts.lengthHint * 0.6);
  const disp = 1 - clamp01(accuracy);
  line = clamp(line + (rand() * 2 - 1) * 0.45 * disp, -1.2, 1.2);
  length = clamp01(length + (rand() * 2 - 1) * 0.30 * disp);
  let speed = randRange(rand, spec.speed);
  let swing = randRange(rand, spec.swing);
  let seam = randRange(rand, spec.seam);
  const prof = opts.profile && BOWLER_PROFILES[opts.profile];
  if (prof) {
    speed *= prof.speed_mult;
    swing = clamp(swing * prof.swing_mult, -1.5, 1.5);
    seam = clamp(seam * prof.seam_mult, -1.5, 1.5);
  }
  return makeDelivery(
    Math.round(speed * 10) / 10,
    line, length, swing,
    { dtype, seam, bounce: randRange(rand, spec.bounce) });
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

/* ================= Phase 3: fielding simulation =================
 * Mirrors harness/fielding_reference.py constant-for-constant. */

const ROPE = BOUNDARY_RADIUS - 0.4;
const FIELD_SIM_DT = 1 / 60;
const RUN_DELAY = 0.25;
const TIME_PER_RUN = 2.4;
const CATCH_RADIUS = 0.95;
const CATCH_MAX_HEIGHT = 2.4;
const STOP_RADIUS = 0.80;
const KEEPER_POS_SIM = { x: 0, z: -2.6 };

// name, x, z, speed, reaction, catching, ground, throw_speed, throw_acc
const FIELD_SETUP = [
  ["slip",        1.0,  -2.2, 5.6, 0.16, 0.80, 0.55, 20.0, 0.70],
  ["point",      24.0,   6.0, 6.6, 0.24, 0.68, 0.80, 23.0, 0.80],
  ["cover",      17.0,  18.0, 6.8, 0.22, 0.70, 0.85, 24.0, 0.85],
  ["mid_off",     8.0,  26.0, 6.5, 0.24, 0.62, 0.80, 23.0, 0.80],
  ["mid_on",     -8.0,  26.0, 6.5, 0.24, 0.62, 0.80, 23.0, 0.80],
  ["mid_wicket",-17.0,  18.0, 6.8, 0.22, 0.66, 0.84, 23.5, 0.82],
  ["square_leg",-24.0,   6.0, 6.6, 0.24, 0.66, 0.80, 23.0, 0.80],
  ["fine_leg",  -20.0, -20.0, 6.9, 0.28, 0.60, 0.78, 24.0, 0.78],
  ["third_man",  20.0, -20.0, 6.9, 0.28, 0.60, 0.78, 24.0, 0.78],
  ["bowler",      0.6,  16.0, 6.2, 0.20, 0.55, 0.75, 22.0, 0.75],
  ["keeper",      0.0,  -2.6, 5.4, 0.12, 0.90, 0.60, 20.0, 0.75],
];

function makeFielder(row, scale) {
  const [name, x, z, speed, reaction, catching, ground, throwSpeed, throwAcc] = row;
  return {
    name, home: { x, z }, speed, reaction, catching, ground, throwSpeed, throwAcc, scale,
    get eff_speed() { return this.speed * (0.75 + 0.25 * this.scale); },
    get eff_reaction() { return this.reaction * (1.35 - 0.35 * this.scale); },
    get eff_catching() { return Math.min(0.97, this.catching * (0.8 + 0.2 * this.scale)); },
  };
}

function defaultField(scale) { return FIELD_SETUP.map((r) => makeFielder(r, scale)); }

// Same integration as the presentation flight (keep them in sync).
function stepBallStruck(pos, vel, grounded, dt) {
  vel.y -= G * dt;
  pos.x += vel.x * dt; pos.y += vel.y * dt; pos.z += vel.z * dt;
  if (pos.y <= 0.055) {
    pos.y = 0.055;
    if (vel.y < -0.6) {           // a real bounce
      vel.y = -vel.y * 0.48;
      vel.x *= 0.86; vel.z *= 0.86;
      if (vel.y < 1.1) vel.y = 0;
    } else {
      vel.y = 0;                  // rolling: no micro-bounce loop
    }
    grounded = true;
  }
  if (grounded) {
    const f = Math.max(0, 1 - 0.35 * dt);
    vel.x *= f; vel.z *= f;
    if (Math.hypot(vel.x, vel.z) < 0.6) { vel.x = 0; vel.z = 0; }
  }
  return grounded;
}

function catchProbability(f, ballSpeedKph, height) {
  let p = f.eff_catching;
  p *= Math.max(0.25, 1.18 - ballSpeedKph / 130);
  p *= Math.max(0.4, 1.12 - height / 9);
  return clamp(p, 0.05, 0.97);
}

function runsFromTime(available, rand) {
  const raw = (available - RUN_DELAY) / TIME_PER_RUN;
  let runs = clamp(Math.floor(raw), 0, 3);
  if (runs > 0 && rand() < 0.07 * runs) runs -= 1;
  return runs;
}

function simulateFielding(contactPos, velocity, fielders, rand, maxSeconds = 12) {
  const pos = { x: contactPos.x, y: Math.max(contactPos.y, 0.1), z: contactPos.z };
  const vel = { ...velocity };
  let grounded = false, everBounced = false;

  const n = fielders.length;
  const fx = fielders.map((f) => f.home.x);
  const fz = fielders.map((f) => f.home.z);
  const reactAt = fielders.map((f) => f.eff_reaction + rand() * 0.12);
  const stopReadyAt = fielders.map(() => 0);
  const chasing = fielders.map(() => false);
  const toLanding = fielders.map(() => false);
  const chased = [];

  // Closed-form first-landing estimate so fielders read the flight at once.
  const vy0 = vel.y;
  const tLand = (vy0 + Math.sqrt(Math.max(0, vy0 * vy0 + 2 * G * pos.y))) / G;
  const landX = pos.x + vel.x * tLand;
  const landZ = pos.z + vel.z * tLand;
  const landingRelevant = Math.hypot(landX, landZ) < ROPE + 4;

  let t = 0;
  while (t < maxSeconds) {
    t += FIELD_SIM_DT;
    grounded = stepBallStruck(pos, vel, grounded, FIELD_SIM_DT);
    if (grounded) everBounced = true;

    if (Math.hypot(pos.x, pos.z) >= ROPE) {
      const six = !everBounced && pos.y > 0.05;
      return { kind: six ? "six" : "four", runs: six ? 6 : 4, fielder: null,
               name: null, pos: { ...pos }, t, collect_time: null, throw_time: null,
               chased, catch_prob: null };
    }

    const speedH = Math.hypot(vel.x, vel.z);
    for (let i = 0; i < n; i++) {
      const f = fielders[i];
      if (t < reactAt[i]) continue;
      let d = Math.hypot(pos.x - fx[i], pos.z - fz[i]);

      if (!chasing[i]) {
        const worth = d < 34 || ((f.name === "keeper" || f.name === "slip") && pos.z < 2 && d < 12);
        if (worth) { chasing[i] = true; chased.push([i, t, { x: pos.x, z: pos.z }]); }
      }
      if (!chasing[i]) continue;

      if (toLanding[i] && everBounced) toLanding[i] = false;
      if (!everBounced && landingRelevant && !toLanding[i]) {
        const arrive = t + Math.hypot(landX - fx[i], landZ - fz[i]) / f.eff_speed;
        if (arrive <= tLand + 0.10 && Math.hypot(landX, landZ) < 46) toLanding[i] = true;
      }
      const tx = toLanding[i] ? landX : (grounded ? pos.x + vel.x * 0.12 : pos.x);
      const tz = toLanding[i] ? landZ : (grounded ? pos.z + vel.z * 0.12 : pos.z);
      const md = Math.hypot(tx - fx[i], tz - fz[i]);
      if (md > 1e-4) {
        const step = Math.min(f.eff_speed * FIELD_SIM_DT, md);
        fx[i] += (tx - fx[i]) / md * step;
        fz[i] += (tz - fz[i]) / md * step;
      }
      d = Math.hypot(pos.x - fx[i], pos.z - fz[i]);

      // catch attempt on a reachable high ball (hard rising drives excluded)
      if (!grounded && pos.y >= 0.25 && pos.y <= CATCH_MAX_HEIGHT && d < CATCH_RADIUS) {
        const ballSpeed = Math.hypot(vel.x, vel.y, vel.z) * 3.6;
        const rising = vel.y > 0;
        if (rising && !(pos.y <= 1.6 && ballSpeed < 90)) continue;
        let p = catchProbability(f, ballSpeed, pos.y)
              * GRADE_SUCCESS_BIAS[catchGrade(ballSpeed, pos.y, d, false)];
        p = clamp(p, 0.05, 0.97);
        if (rand() < p) {
          return { kind: "caught", runs: 0, fielder: i, name: f.name, pos: { ...pos },
                   t, collect_time: null, throw_time: null, chased, catch_prob: p };
        }
        // dropped: squirts away
        const deflect = (rand() * 2 - 1) * 0.9;
        const sp = Math.hypot(vel.x, vel.z) * 0.35 + 1.5;
        const ang = Math.atan2(vel.z, vel.x) + deflect;
        vel.x = Math.cos(ang) * sp; vel.y = 0; vel.z = Math.sin(ang) * sp;
        grounded = true;
        reactAt[i] = t + 0.7;
      } else if (grounded && d < STOP_RADIUS && speedH < 34 && t >= stopReadyAt[i]) {
        stopReadyAt[i] = t + 0.5;
        const pStop = f.ground * clamp(1.25 - speedH / 34, 0.05, 0.97);
        if (rand() > pStop) {
          const deflect = (rand() * 2 - 1) * 0.35;
          const ang = Math.atan2(vel.z, vel.x) + deflect;
          const sp = speedH * 0.55;
          vel.x = Math.cos(ang) * sp; vel.y = 0; vel.z = Math.sin(ang) * sp;
          reactAt[i] = t + 0.45;
          continue;
        }
        const distHome = Math.hypot(pos.x - KEEPER_POS_SIM.x, pos.z - KEEPER_POS_SIM.z);
        const throwTime = distHome / Math.max(12, f.throwSpeed)
          * (1 + (1 - f.throwAcc) * rand() * 0.6);
        return { kind: "stopped", runs: runsFromTime(t + throwTime, rand), fielder: i,
                 name: f.name, pos: { ...pos }, t, collect_time: t, throw_time: throwTime,
                 chased, catch_prob: null };
      }
    }

    if (grounded && speedH < 0.4) {
      const distHome = Math.hypot(pos.x - KEEPER_POS_SIM.x, pos.z - KEEPER_POS_SIM.z);
      const retrieve = 1.4 + distHome / 6.5;
      return { kind: "stopped", runs: runsFromTime(t + retrieve, rand), fielder: null,
               name: null, pos: { ...pos }, t, collect_time: t, throw_time: retrieve,
               chased, catch_prob: null };
    }
  }
  return { kind: "stopped", runs: 3, fielder: null, name: null, pos: { ...pos },
           t: maxSeconds, collect_time: maxSeconds, throw_time: 1, chased, catch_prob: null };
}

/* ================= Phase 3: AI batting =================
 * Mirrors harness/ai_reference.py. */

const AI_DIFFICULTY = {
  easy:   { timing_sd: 1.45, mistake: 0.10, field_vs_player: 0.80, field_for_player: 1.10, ai_bowling_acc: 0.60 },
  medium: { timing_sd: 1.00, mistake: 0.05, field_vs_player: 1.00, field_for_player: 1.00, ai_bowling_acc: 0.75 },
  hard:   { timing_sd: 0.78, mistake: 0.02, field_vs_player: 1.15, field_for_player: 0.90, ai_bowling_acc: 0.85 },
};

function aggressionState(requiredRuns, ballsRemaining, wicketsRemaining) {
  if (ballsRemaining <= 0) return "desperate";
  if (requiredRuns <= 0) return "safe";
  const rrr = requiredRuns / ballsRemaining;
  if (requiredRuns <= ballsRemaining && wicketsRemaining >= 2) return "safe";
  if (rrr <= 2.2) return "balanced";
  if (rrr <= 4.2) return "aggressive";
  return "desperate";
}

const STATE_INTENTS = {
  safe:       { defensive: 0.35, normal: 0.65, aggressive: 0, lofted: 0 },
  balanced:   { defensive: 0.05, normal: 0.65, aggressive: 0.25, lofted: 0.05 },
  aggressive: { defensive: 0, normal: 0.30, aggressive: 0.45, lofted: 0.25 },
  desperate:  { defensive: 0, normal: 0.10, aggressive: 0.35, lofted: 0.55 },
};
const STATE_SKILL = {
  safe:       { swing: 0.84, sd: 0.050, leave_wide: 0.25 },
  balanced:   { swing: 0.92, sd: 0.045, leave_wide: 0.12 },
  aggressive: { swing: 0.97, sd: 0.055, leave_wide: 0.05 },
  desperate:  { swing: 1.00, sd: 0.075, leave_wide: 0.00 },
};

function aiTimingOffset(rand, sd, mistake) {
  if (rand() < mistake) {
    const side = rand() < 0.45 ? -1 : 1;
    return side * (0.12 + rand() * 0.20);
  }
  const g = (rand() + rand() + rand() - 1.5) / 1.5;
  return g * sd * 2;
}

// Phase 4 (spec section 8): batter personality. Deterministic weight shaping;
// 'balanced' reproduces Phase 3 behaviour exactly.
const ARCHETYPES = ["aggressive", "balanced", "defensive"];
const ARCHETYPE_TUNING = {
  aggressive: { intents: { defensive: 0.45, normal: 0.90, aggressive: 1.35, lofted: 1.45 },
                swing_delta: 0.03, leave_delta: -0.10, sd_mult: 1.06 },
  balanced:   { intents: { defensive: 1.00, normal: 1.00, aggressive: 1.00, lofted: 1.00 },
                swing_delta: 0.00, leave_delta: 0.00, sd_mult: 1.00 },
  defensive:  { intents: { defensive: 1.80, normal: 1.10, aggressive: 0.55, lofted: 0.30 },
                swing_delta: -0.05, leave_delta: 0.12, sd_mult: 0.92 },
};

function aiBattingPlan(rand, delivery, ctx, difficulty, hitsStumpsHint, archetype) {
  const tune = AI_DIFFICULTY[difficulty];
  const arch = ARCHETYPE_TUNING[archetype || "balanced"];
  let state, required = null;
  if (ctx.target == null) {
    state = "balanced";
  } else {
    required = ctx.target - ctx.score;
    state = aggressionState(required, ctx.balls_remaining, ctx.wickets_remaining);
    if (required <= 2 && ctx.balls_remaining >= 1 && state === "safe") state = "balanced";
  }
  const skill = STATE_SKILL[state];
  const swingChance = clamp(skill.swing + arch.swing_delta, 0, 1);
  const leaveWide = clamp(skill.leave_wide + arch.leave_delta, 0, 0.9);
  const sd = skill.sd * tune.timing_sd * arch.sd_mult;
  const mistake = tune.mistake + (state === "desperate" ? 0.14 : 0);

  const plan = { state, swing: false, intent: "normal", angle: 0, strength: 0.8,
                 offset: 0, foot_target: { x: 0, z: 0 }, leave_reason: null };

  plan.foot_target = {
    x: clamp(delivery.line * 0.45 - 0.10, -1.15, 1.15),
    z: delivery.length < 0.30 ? 0.75 : delivery.length < 0.72 ? 0.10 : -0.55,
  };

  const wideBall = Math.abs(delivery.line) > 0.55;
  const hitsStumps = hitsStumpsHint != null ? hitsStumpsHint
    : Math.abs(delivery.line * 0.45) <= 0.18;
  if (state === "safe" && wideBall && !hitsStumps && rand() < leaveWide) {
    plan.leave_reason = "wide_outside_off";
    return plan;
  }
  if (rand() > swingChance) { plan.leave_reason = "held_back"; return plan; }

  plan.swing = true;
  // Situation base weights rescaled by archetype personality.
  const weights = {};
  let wTotal = 0;
  for (const k of ["defensive", "normal", "aggressive", "lofted"]) {
    weights[k] = STATE_INTENTS[state][k] * arch.intents[k];
    wTotal += weights[k];
  }
  let roll = rand() * (wTotal > 0 ? wTotal : 1), acc = 0;
  for (const k of ["defensive", "normal", "aggressive", "lofted"]) {
    acc += weights[k];
    if (roll < acc) { plan.intent = k; break; }
  }
  plan.angle = state === "desperate"
    ? (rand() * 2 - 1) * 0.35
    : clamp(delivery.line * 1.05 + (rand() * 2 - 1) * 0.48, -1.35, 1.35);
  plan.strength = 0.55 + 0.45 * rand();
  plan.offset = aiTimingOffset(rand, sd, mistake);
  return plan;
}

function aiSwingFrameTime(trajTimeToContact, intent, offset) {
  return trajTimeToContact + offset - windupTime(intent);
}

/* ================= Phase 3: Super Over match mirror ================= */

class SuperOverMatchJS {
  constructor(ballsPerInnings = 6, maxWickets = 2) {
    this.ballsPerInnings = ballsPerInnings;
    this.maxWickets = maxWickets;
    this.innings = [
      { runs: 0, wickets: 0, legal_balls: 0, striker: 0, non_striker: 1 },
      { runs: 0, wickets: 0, legal_balls: 0, striker: 0, non_striker: 1 },
    ];
    this.phase = "not_started";   // not_started|first|break|second|completed
    this.result = null;
  }
  currentInningsIndex() { return this.phase === "second" ? 1 : 0; }
  currentInnings() {
    return this.phase === "first" ? this.innings[0]
         : this.phase === "second" ? this.innings[1] : null;
  }
  target() { return (this.phase === "break" || this.phase === "second" || this.phase === "completed")
    ? this.innings[0].runs + 1 : null; }
  runsRequired() { const t = this.target(); return t == null ? null : Math.max(0, t - this.innings[1].runs); }
  ballsRemaining() { const i = this.currentInnings(); return i ? Math.max(0, this.ballsPerInnings - i.legal_balls) : 0; }
  wicketsRemaining() { const i = this.currentInnings(); return i ? Math.max(0, this.maxWickets - i.wickets) : 0; }

  start() { this.phase = "first"; }
  startSecondInnings() { this.phase = "second"; }

  recordDelivery(outcome) {
    // outcome: { kind: "legal" | "wicket" | "wide", runs, dismissal }
    const inn = this.currentInnings();
    inn.runs += outcome.runs || 0;
    if (outcome.kind === "legal") inn.legal_balls += 1;
    if (outcome.kind === "wicket") {
      inn.wickets = Math.min(this.maxWickets, inn.wickets + 1);
      // replacement batter guards the striker's end (no swap)
    } else if (outcome.kind === "legal" && (outcome.runs || 0) % 2 === 1) {
      [inn.striker, inn.non_striker] = [inn.non_striker, inn.striker];
    }
    // Phase 4: "wide" adds a run but consumes NO legal ball and never swaps
    // strike - mirrors superover_reference.py exactly.

    if (this.phase === "second") {
      const target = this.innings[0].runs + 1;
      if (inn.runs >= target) { this._complete("second_win"); return; }
    }
    const complete = inn.legal_balls >= this.ballsPerInnings || inn.wickets >= this.maxWickets;
    if (complete) {
      if (this.phase === "first") this.phase = "break";
      else if (inn.runs === this.innings[0].runs) this._complete("tie");
      else this._complete("first_win");
    }
  }

  _complete(outcome) {
    const [a, b] = this.innings;
    this.result = {
      outcome,
      target: a.runs + 1,
      margin_runs: outcome === "first_win" ? a.runs - b.runs : 0,
      margin_wickets: outcome === "second_win" ? this.maxWickets - b.wickets : 0,
      margin_balls: outcome === "second_win" ? this.ballsPerInnings - b.legal_balls : 0,
      first: { runs: a.runs, wickets: a.wickets, legal_balls: a.legal_balls },
      second: { runs: b.runs, wickets: b.wickets, legal_balls: b.legal_balls },
    };
    this.phase = "completed";
  }
}

/* ================= Phase 4: polish & advanced gameplay ================= */

// --- timing FEEL (spec section 3) -------------------------------------------
const TIMING_TIERS = {
  perfect:    { power: 1.12, control: 1.00, label: "PERFECT",    haptic: 0.35, bat_shake: 0.30, camera: 0.25 },
  good:       { power: 0.95, control: 0.90, label: "GOOD",       haptic: 0.18, bat_shake: 0.15, camera: 0.10 },
  early:      { power: 0.72, control: 0.62, label: "EARLY",      haptic: 0.08, bat_shake: 0.08, camera: 0.04 },
  late:       { power: 0.72, control: 0.62, label: "LATE",       haptic: 0.08, bat_shake: 0.08, camera: 0.04 },
  very_early: { power: 0.45, control: 0.30, label: "VERY EARLY", haptic: 0.03, bat_shake: 0.04, camera: 0.02 },
  very_late:  { power: 0.45, control: 0.30, label: "VERY LATE",  haptic: 0.03, bat_shake: 0.04, camera: 0.02 },
  missed:     { power: 0.00, control: 0.00, label: "MISSED",     haptic: 0.00, bat_shake: 0.00, camera: 0.00 },
};

function timingFeedback(window, intent) {
  const tier = TIMING_TIERS[window] || TIMING_TIERS.missed;
  const attacking = intent === "aggressive" || intent === "lofted";
  return {
    window,
    power_mult: tier.power,
    control_mult: tier.control,
    label: tier.label,
    haptic: tier.haptic,
    bat_shake: tier.bat_shake,
    camera: tier.camera,
    attack_boost: attacking ? tier.power : Math.min(tier.power, 1.0),
  };
}

// --- shot context (spec section 4) -------------------------------------------
const ALLOWED_SECTORS = {
  yorker: ["straight", "cover", "mid_wicket"],
  full:   ["straight", "cover", "mid_wicket", "square_leg", "fine_leg"],
  good:   ["straight", "cover", "point", "mid_wicket", "square_leg"],
  short:  ["straight", "point", "square_leg", "mid_wicket", "cover", "third_man", "fine_leg"],
};
const SECTOR_ANGLES = {
  straight: 0, cover: 38 * Math.PI / 180, point: 80 * Math.PI / 180,
  third_man: 128 * Math.PI / 180, mid_wicket: -38 * Math.PI / 180,
  square_leg: -80 * Math.PI / 180, fine_leg: -128 * Math.PI / 180,
};
const SECTOR_SHOT_FAMILY = {
  straight: "drive", cover: "drive", point: "cut", third_man: "cut",
  mid_wicket: "flick", square_leg: "flick", fine_leg: "glance",
};

function lengthBucket(length) {
  if (length < 0.12) return "yorker";
  if (length < 0.35) return "full";
  if (length < 0.72) return "good";
  return "short";
}

function angleDiff(a, b) {
  return ((a - b + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
}

function validateShotRequest(angleRad, length) {
  const bucket = lengthBucket(length);
  const allowed = ALLOWED_SECTORS[bucket];
  const sector = sectorOf(angleRad);
  if (allowed.indexOf(sector) >= 0) {
    return { sector, angle: angleRad, snapped: false,
             family: SECTOR_SHOT_FAMILY[sector], bucket };
  }
  let best = allowed[0], bestD = Infinity;
  for (const s of allowed) {
    const d = Math.abs(angleDiff(angleRad, SECTOR_ANGLES[s]));
    if (d < bestD) { bestD = d; best = s; }
  }
  return { sector: best, angle: SECTOR_ANGLES[best], snapped: true,
           family: SECTOR_SHOT_FAMILY[best], bucket };
}

// --- advanced bowling (spec sections 5-7) ------------------------------------
const BOWLER_PROFILES = {
  fast:      { name: "FAST BOWLER", speed_mult: 1.06, swing_mult: 0.70, seam_mult: 0.80, accuracy: 0.78 },
  swing:     { name: "SWING BOWLER", speed_mult: 0.96, swing_mult: 1.35, seam_mult: 0.70, accuracy: 0.74 },
  variation: { name: "PACE VARIATION BOWLER", speed_mult: 0.92, swing_mult: 0.80, seam_mult: 1.25, accuracy: 0.80 },
};

const WIDE_LINE_THRESHOLD = 0.95;
function deliveryLegality(line) { return Math.abs(line) > WIDE_LINE_THRESHOLD ? "wide" : "legal"; }

const RELEASE_PERFECT_WINDOW = 0.03;
const RELEASE_MAX_ERROR = 0.14;

function releaseQuality(offset) {
  const a = Math.abs(offset);
  if (a <= RELEASE_PERFECT_WINDOW) return "perfect";
  if (a <= 0.07) return "good";
  if (a <= RELEASE_MAX_ERROR) return offset < 0 ? "early" : "late";
  return offset < 0 ? "very_early" : "very_late";
}

function applyRelease(delivery, releaseOffset, accuracy) {
  const q = releaseQuality(releaseOffset);
  if (q === "perfect") return delivery;
  const err = Math.min(1.6, Math.abs(releaseOffset) / RELEASE_MAX_ERROR);
  const blur = 1.25 - clamp01(accuracy);
  const sign = delivery.line >= 0 ? 1 : -1;
  const d = Object.assign({}, delivery);
  if (releaseOffset < 0) {
    d.length = clamp01(d.length - 0.34 * err * blur);
    d.line = clamp(d.line + 0.40 * err * blur * sign, -1.2, 1.2);
  } else {
    d.length = clamp01(d.length + 0.30 * err * blur);
    d.line = clamp(d.line - 0.30 * err * blur * sign, -1.2, 1.2);
  }
  return d;
}

const SPRAY_RATE = { easy: 0.100, medium: 0.080, hard: 0.060 };
function sprayProbability(accuracy, difficulty) {
  return Math.min(0.12, (1 - clamp01(accuracy)) * (SPRAY_RATE[difficulty] || SPRAY_RATE.medium));
}

function bowlWithRelease(rand, delivery, releaseOffset, accuracy, difficulty) {
  let d = applyRelease(delivery, releaseOffset, accuracy);
  const quality = releaseQuality(releaseOffset);
  let wide = false;
  if (rand() < sprayProbability(accuracy, difficulty)) {
    const sign = d.line >= 0 ? 1 : -1;
    d = Object.assign({}, d, { line: clamp(sign * (0.98 + rand() * 0.22), -1.2, 1.2) });
    wide = true;
  } else {
    wide = deliveryLegality(d.line) === "wide";
  }
  return { delivery: d, quality, wide };
}

// --- AI bowling strategy (spec section 10) ------------------------------------
const RELEASE_SD = { easy: 0.062, medium: 0.055, hard: 0.051 };

function aiBowlingPlan(rand, history, ctx, difficulty) {
  const plan = { type: "good_length", line_hint: 0.10, length_hint: 0.52, reason: "stock_good_length" };
  const recent = (history || []).slice(-3);
  const sectors = recent.map(h => h.sector).filter(Boolean);
  const recentRuns = recent.reduce((s, h) => s + (h.runs || 0), 0);

  if (sectors.length >= 2 && new Set(sectors).size === 1) {
    const s = sectors[0];
    if (["cover", "point", "third_man"].indexOf(s) >= 0) {
      return Object.assign(plan, { type: "leg_cutter", line_hint: -0.25, length_hint: 0.55,
                                   reason: "attack_stumps_away_from_" + s });
    }
    if (["mid_wicket", "square_leg", "fine_leg"].indexOf(s) >= 0) {
      return Object.assign(plan, { type: "off_cutter", line_hint: 0.30, length_hint: 0.50,
                                   reason: "take_leg_side_out_" + s });
    }
    if (s === "straight") {
      return Object.assign(plan, { type: "slower_ball", line_hint: 0.05, length_hint: 0.28,
                                   reason: "deception_down_the_ground" });
    }
  }
  if (recentRuns >= 8) {
    if (rand() < 0.55) {
      return Object.assign(plan, { type: "slower_ball", line_hint: 0.10, length_hint: 0.30,
                                   reason: "pace_off_vs_aggression" });
    }
    return Object.assign(plan, { type: "yorker", line_hint: 0.05, length_hint: 0.03,
                                 reason: "yorker_vs_aggression" });
  }
  if ((ctx.balls_remaining || 6) <= 2 && (ctx.wickets_remaining || 2) >= 1) {
    return Object.assign(plan, { type: "yorker", line_hint: 0.02, length_hint: 0.03,
                                 reason: "yorker_at_the_death" });
  }
  const shortContest = recent.some(h => h.intent === "lofted");
  if (shortContest && rand() < 0.5) {
    return Object.assign(plan, { type: "full_ball", line_hint: 0.15, length_hint: 0.16,
                                 reason: "full_after_short_contest" });
  }
  if (difficulty === "hard" && rand() < 0.35) {
    if (rand() < 0.5) {
      return Object.assign(plan, { type: "fast_inswinger", line_hint: 0.30, length_hint: 0.45,
                                   reason: "hard_mode_inswing" });
    }
    return Object.assign(plan, { type: "fast_outswinger", line_hint: 0.05, length_hint: 0.45,
                                 reason: "hard_mode_outswing" });
  }
  return plan;
}

// --- fielding polish (spec sections 12-15) -------------------------------------
function catchGrade(ballSpeedKph, height, distanceToFielder, isEdge) {
  if (isEdge) return "edge";
  const pressure = ballSpeedKph / 130 + Math.max(0, 1.6 - height) * 0.25;
  if (distanceToFielder < 3 && ballSpeedKph > 95) return "difficult";
  if (pressure > 1.05 || height > 6) return "difficult";
  if (pressure > 0.72 || height > 3.2) return "medium";
  return "easy";
}
const GRADE_SUCCESS_BIAS = { easy: 1.15, medium: 1.00, difficult: 0.72, edge: 0.55 };

const DIVE_REACH = 2.6;
function diveDecision(fielder, distToBall, ballSpeedH, headingForRope, lofted) {
  if (distToBall <= 1.1) return "none";
  if (distToBall > DIVE_REACH + 0.9) return "none";
  if (headingForRope && ballSpeedH > 16) return "boundary_save";
  if (lofted) return "catch";
  return "ground";
}
function diveSuccessProbability(fielder, diveKind, ballSpeedH) {
  let base = 0.55;
  if (diveKind === "boundary_save") base *= Math.max(0.35, 1.15 - ballSpeedH / 40);
  else if (diveKind === "catch") base *= 0.8;
  const ability = diveKind === "catch" ? fielder.catching
    : fielder.ground * 0.6 + fielder.catching * 0.4;
  return clamp(base * (0.55 + 0.75 * ability * (fielder.scale || 1)), 0.05, 0.92);
}

function throwReturn(fielder, distance) {
  const arm = Math.max(12, fielder.throwSpeed != null ? fielder.throwSpeed : fielder.throw_speed);
  const acc = fielder.throwAcc != null ? fielder.throwAcc : fielder.throw_acc;
  const flat = arm >= 23;
  let travel = distance / arm * (flat ? 1.12 : 1.30);
  const errant = acc < 0.72;
  if (errant) travel *= 1.25;
  return { travel_time: travel, flat, errant };
}
