"use strict";
/* CricketGame.Core.Batting — JS port of the Unity batting engine.
 * 1:1 with harness/batting_reference.py (which mirrors the C# engine).
 * If the C# changes, all three must change together. */

const G = 9.81;
const RELEASE_HEIGHT = 2.05;
const RELEASE_Z = 20.1;
const CONTACT_Z = 0.35;
const STUMPS_Z = -1.0;
const STUMP_HW = 0.18;
const STUMP_TOP = 0.72;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeDelivery(speed_kph, line, length, swing) {
  return { speed_kph, line, length, swing };
}

class Trajectory {
  constructor(d) {
    this.delivery = d;
    const length = clamp(d.length, 0, 1);
    const line = clamp(d.line, -1.25, 1.25);
    const swing = clamp(d.swing, -1.5, 1.5);

    this.speed = Math.max(8, d.speed_kph / 3.6);
    this.post = this.speed * 0.92;
    const bz = 1.6 + 9.2 * length;
    this.bounce_x = line * 0.45;
    this.release_x = this.bounce_x - swing * 0.35;
    this.swing_amp = swing * 0.65;
    this.bounce_z = bz;

    this.t1 = (RELEASE_Z - bz) / this.speed;
    this.v0y = (0.5 * G * this.t1 * this.t1 - RELEASE_HEIGHT) / this.t1;

    const restitution = 0.78 - 0.20 * length;
    const vImpact = this.v0y - G * this.t1;
    this.vy_after = -vImpact * restitution;

    const t2 = (bz - CONTACT_Z) / this.post;
    this.height_at_contact = Math.max(0.05, this.vy_after * t2 - 0.5 * G * t2 * t2);
    this.vx_after = swing * 0.05;

    this.time_to_contact = this.t1 + t2;
    this.time_to_stumps = this.t1 + (bz - STUMPS_Z) / this.post;
    this.x_at_contact = this.bounce_x + this.vx_after * t2;
  }

  position(t) {
    t = Math.max(0, t);
    if (t <= this.t1) {
      const p = t / this.t1;
      const x = this.release_x + (this.bounce_x - this.release_x) * p +
        this.swing_amp * Math.sin(Math.PI * p);
      const z = RELEASE_Z - this.speed * t;
      const y = RELEASE_HEIGHT + this.v0y * t - 0.5 * G * t * t;
      return { x, y: Math.max(0, y), z };
    }
    const dt = t - this.t1;
    return {
      x: this.bounce_x + this.vx_after * dt,
      y: Math.max(0, this.vy_after * dt - 0.5 * G * dt * dt),
      z: this.bounce_z - this.post * dt,
    };
  }

  hitsStumps() {
    const dt = (this.bounce_z - STUMPS_Z) / this.post;
    const x = this.bounce_x + this.vx_after * dt;
    const y = this.vy_after * dt - 0.5 * G * dt * dt;
    return Math.abs(x) <= STUMP_HW && y >= 0 && y <= STUMP_TOP;
  }
}

/* ---------------- footwork ---------------- */
const FOOT = { accel: 26, damp: 18, maxSpeed: 3.6, xMin: -1.15, xMax: 1.15, zMin: -0.85, zMax: 1.35 };

function footAdvance(f, ix, iy, dt) {
  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  const approach = (cur, target, maxDelta) =>
    cur < target ? Math.min(cur + maxDelta, target) : Math.max(cur - maxDelta, target);
  f.vx = approach(f.vx, ix * FOOT.maxSpeed, (Math.abs(ix) > 0.02 ? FOOT.accel : FOOT.damp) * dt);
  f.vz = approach(f.vz, iy * FOOT.maxSpeed, (Math.abs(iy) > 0.02 ? FOOT.accel : FOOT.damp) * dt);
  f.x += f.vx * dt;
  f.z += f.vz * dt;
  if (f.x < FOOT.xMin) { f.x = FOOT.xMin; if (f.vx < 0) f.vx = 0; }
  if (f.x > FOOT.xMax) { f.x = FOOT.xMax; if (f.vx > 0) f.vx = 0; }
  if (f.z < FOOT.zMin) { f.z = FOOT.zMin; if (f.vz < 0) f.vz = 0; }
  if (f.z > FOOT.zMax) { f.z = FOOT.zMax; if (f.vz > 0) f.vz = 0; }
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

const sstep = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
function powerCurve(off) { return Math.abs(off) < MAX_W ? 1 - 0.85 * sstep(Math.abs(off) / MAX_W) : 0.10; }
function controlCurve(off) { return Math.abs(off) < MAX_W ? 1 - sstep(Math.abs(off) / MAX_W) : 0; }

function edgeProbability(absOff, reach, speedKph) {
  let p = 0.02;
  if (absOff > 0.045) p += (absOff - 0.045) * 2.4;
  p += (1 - reach) * 0.18;
  p += clamp((speedKph - 90) / 150, 0, 1) * 0.06;
  return clamp(p, 0.01, 0.55);
}

/* ---------------- direction resolver ---------------- */
const MIN_DIR_STRENGTH = 0.25, REACH_FALLOFF = 0.85;

function resolveDirection(dx, dy, swipeStrength, ballX, delivery, footX, timingOffset) {
  const mag = Math.hypot(dx, dy);
  const hasDirection = mag >= MIN_DIR_STRENGTH && swipeStrength > 0.05;
  let ux = 0, uy = 1;
  if (hasDirection) { ux = dx / mag; uy = dy / mag; }
  const angle = Math.atan2(ux, uy) + timingOffset * 1.6;
  const gap = ballX - (footX + 0.10);
  const reach = clamp(1 - Math.abs(gap) / REACH_FALLOFF, 0, 1);
  return {
    direction: { x: Math.sin(angle), y: Math.cos(angle) },
    angle, reach, gap, has_direction: hasDirection,
  };
}

/* ---------------- shot selector ---------------- */
function lengthZone(l) { return l < 0.35 ? "full" : l < 0.72 ? "good" : "short"; }

function sectorOf(angleRad) {
  const deg = angleRad * 57.29578, a = Math.abs(deg);
  if (a <= 20) return "straight";
  if (a <= 55) return deg > 0 ? "cover" : "mid_wicket";
  if (a <= 100) return deg > 0 ? "point" : "square_leg";
  return deg > 0 ? "third_man" : "fine_leg";
}

function sectorName(s) {
  return { straight: "STRAIGHT", cover: "COVER", mid_wicket: "MID-WICKET", point: "POINT",
           square_leg: "SQUARE LEG", third_man: "THIRD MAN", fine_leg: "FINE LEG" }[s];
}

function selectShot(intent, pose, delivery, direction) {
  const length = lengthZone(delivery.length);
  const sector = sectorOf(direction.angle);
  const squareOrBehind = ["point", "square_leg", "third_man", "fine_leg"].includes(sector);
  const sel = { kind: null, name: null, lofted: false, awkward: false, base_power: 0, base_loft: 0 };

  if (intent === "defensive") {
    if (length === "short") { sel.kind = "back_foot_defense"; sel.name = "Back-Foot Defence"; }
    else { sel.kind = "front_foot_defense"; sel.name = "Front-Foot Defence"; }
    sel.base_power = 0.30; sel.base_loft = 2;
    sel.awkward = direction.reach < 0.2;
    return sel;
  }

  if (intent === "lofted") {
    sel.lofted = true; sel.base_power = 0.90; sel.base_loft = 30;
    if (length === "short") {
      sel.kind = "pull"; sel.name = "Lofted Pull";
      sel.awkward = pose === "front";
      return sel;
    }
    if (["mid_wicket", "square_leg", "fine_leg"].includes(sector)) {
      sel.kind = "lofted_leg_side"; sel.name = "Lofted Leg-Side Shot";
    } else if (sector === "straight") {
      sel.kind = "lofted_straight"; sel.name = "Lofted Straight";
    } else {
      sel.kind = "lofted_drive"; sel.name = "Lofted Drive";
    }
    sel.awkward = pose === "back" && length === "full";
    return sel;
  }

  sel.base_power = intent === "aggressive" ? 1.0 : 0.68;
  sel.base_loft = intent === "aggressive" ? 12 : 6;

  if (length === "full") {
    if (pose === "back") sel.awkward = true;
    if (squareOrBehind) {
      sel.kind = "awkward_poke"; sel.name = "Awkward Stab"; sel.awkward = true;
      sel.base_power *= 0.5;
      return sel;
    }
    if (sector === "cover") { sel.kind = "cover_drive"; sel.name = "Cover Drive"; }
    else if (["mid_wicket", "square_leg", "fine_leg"].includes(sector)) { sel.kind = "flick"; sel.name = "Flick"; }
    else { sel.kind = "straight_drive"; sel.name = "Straight Drive"; }
    return sel;
  }

  if (length === "short") {
    if (pose === "front") sel.awkward = true;
    if (["cover", "point", "third_man"].includes(sector)) {
      sel.kind = "cut"; sel.name = intent === "aggressive" ? "Hard Cut" : "Cut";
    } else if (sector === "straight") {
      if (intent === "aggressive") { sel.kind = "pull"; sel.name = "Pull (straight)"; }
      else { sel.kind = "awkward_poke"; sel.name = "Awkward Poke"; sel.awkward = true; }
    } else {
      sel.kind = "pull"; sel.name = intent === "aggressive" ? "Pull" : "Pull Shot";
    }
    return sel;
  }

  // good length
  if (sector === "cover") { sel.kind = "cover_drive"; sel.name = "Cover Drive"; }
  else if (sector === "point") { sel.kind = "square_drive"; sel.name = "Square Drive"; }
  else if (sector === "third_man") { sel.kind = "cut"; sel.name = "Late Cut"; sel.awkward = pose === "front"; }
  else if (sector === "mid_wicket") { sel.kind = "flick"; sel.name = "Flick"; }
  else if (["square_leg", "fine_leg"].includes(sector)) { sel.kind = "leg_glance"; sel.name = "Leg Glance"; }
  else { sel.kind = "straight_drive"; sel.name = "Straight Drive"; }
  return sel;
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

  let quality = powerCurve(timingOffset) *
    (0.45 + 0.55 * direction.reach) *
    (0.78 + 0.22 * swipeStrength) *
    (shot.awkward ? 0.60 : 1.0);
  quality = clamp(quality, 0, 1);
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

/* ---------------- engine ---------------- */
class BattingEngine {
  constructor() {
    this.foot = { x: 0, z: 0, vx: 0, vz: 0 };
    this.traj = null;
    this.t = 0;
    this.swingTaken = false;
    this.contactWillHappen = false;
    this.passedReported = false;
    this.lastSwing = null;
    this.onSwing = null;
    this.onPassed = null;
  }

  beginDelivery(d) {
    this.traj = new Trajectory(d);
    this.t = 0;
    this.swingTaken = false;
    this.contactWillHappen = false;
    this.passedReported = false;
    this.lastSwing = null;
  }

  update(dt, input) {
    footAdvance(this.foot, input.footX || 0, input.footY || 0, dt);
    if (!this.traj) return;
    this.t += dt;

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
