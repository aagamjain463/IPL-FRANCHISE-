// Node smoke test for the Phase 2 JS engine port (run: node smoke.cjs).
// Verifies engine.js against invariants from harness/batting_reference.py
// and harness/bowling_reference.py.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
const sandbox = {};
new Function("s", src + "; Object.assign(s, { BattingEngine, makeDelivery, Trajectory, windupTime, buildDelivery, nextDeliveryType, resolveOutcome, resolveContact, DELIVERY_TYPES, DELIVERY_SPECS, DELIVERY_LABELS, predictCarry, simulateFielding, defaultField, FIELD_SETUP, aiBattingPlan, aggressionState, aiSwingFrameTime, AI_DIFFICULTY, SuperOverMatchJS, timingFeedback, TIMING_TIERS, validateShotRequest, ALLOWED_SECTORS, BOWLER_PROFILES, releaseQuality, applyRelease, bowlWithRelease, deliveryLegality, sprayProbability, aiBowlingPlan, catchGrade, diveDecision, throwReturn, RELEASE_MAX_ERROR, lateralMovement, edgeSide, movementEdgeBias });")(sandbox);
const S = sandbox;

const ok = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
const close = (a, b, eps, msg) => ok(Math.abs(a - b) <= eps, `${msg} got=${a} want≈${b}`);

// 1. Trajectory parity with the Python mirror (Phase 1 pins).
const cases = [
  ["full", S.makeDelivery(118, 0, 0.12, 0), { tts: 0.6535551952837141, ttc: 0.6087873249815771, hits: true, xc: 0 }],
  ["good", S.makeDelivery(126, 0.15, 0.52, 0), { tts: 0.6212024844720497, ttc: 0.5792770186335404, hits: false, xc: 0.0675 }],
  ["short", S.makeDelivery(134, -0.1, 0.88, 0), { tts: 0.5918530824140169, ttc: 0.5524306294613888, hits: false, xc: -0.045 }],
];
for (const [name, d, want] of cases) {
  const t = new S.Trajectory(d);
  close(t.time_to_stumps, want.tts, 1e-9, `${name} tts`);
  close(t.time_to_contact, want.ttc, 1e-9, `${name} ttc`);
  ok(t.hitsStumps() === want.hits, `${name} hitsStumps want=${want.hits}`);
  close(t.x_at_contact, want.xc, 1e-9, `${name} x_at_contact`);
}

// 2. Seam & bounce extensions behave like the mirror.
{
  const flat = new S.Trajectory(S.makeDelivery(126, 0, 0.52, 0));
  const seamed = new S.Trajectory(S.makeDelivery(126, 0, 0.52, 0, { seam: 0.6 }));
  ok(Math.abs(flat.x_at_contact) < 1e-6, "flat stays straight");
  const drift = seamed.x_at_contact - flat.x_at_contact;
  ok(drift > 0.05 && drift < 0.30, `seam drift got=${drift}`);

  const low = new S.Trajectory(S.makeDelivery(130, 0, 0.8, 0, { bounce: 0.85 }));
  const high = new S.Trajectory(S.makeDelivery(130, 0, 0.8, 0, { bounce: 1.25 }));
  ok(low.height_at_contact < high.height_at_contact, "bounce multiplier lifts");
  close(low.time_to_contact, high.time_to_contact, 1e-3, "bounce does not change timing");
}

// 3. Delivery factory: ranges + labels + type pick.
{
  for (const type of S.DELIVERY_TYPES) {
    ok(S.DELIVERY_SPECS[type], `spec for ${type}`);
    ok(S.DELIVERY_LABELS[type], `label for ${type}`);
    const d = S.buildDelivery(type, Math.random, 0.75);
    ok(d.dtype === type, "dtype tagged");
    const t = new S.Trajectory(d);
    ok(t.height_at_contact > 0 && t.time_to_contact < 1.6, `valid trajectory for ${type}`);
  }
  const yorker = S.buildDelivery("yorker", Math.random, 1.0);
  ok(yorker.length < 0.09, "yorker is very full");
  const bouncer = S.buildDelivery("bouncer", Math.random, 1.0);
  ok(new S.Trajectory(bouncer).height_at_contact > 1.05, "bouncer rears up");
}

// 4. Bounce event fires exactly once.
{
  const eng = new S.BattingEngine();
  let bounces = 0;
  eng.onBounce = () => bounces++;
  eng.beginDelivery(S.makeDelivery(126, 0.15, 0.52, 0));
  for (let t = 0; t < 2; t += 1 / 120) eng.update(1 / 120, { footX: 0, footY: 0 });
  ok(bounces === 1, `bounce events got=${bounces}`);
}

// 5. Outcome resolver: bowled, LBW, leave, six, force.
{
  const fullAtStumps = new S.Trajectory(S.makeDelivery(120, 0, 0.10, 0));
  ok(fullAtStumps.hitsStumps(), "full ball hits stumps");
  const lbw = S.resolveOutcome(Math.random, fullAtStumps, null, 0, 0, null);
  ok(lbw.kind === "lbw" && lbw.wicket, `expected lbw, got ${lbw.kind}`);
  const bowled = S.resolveOutcome(Math.random, fullAtStumps, null, 0.8, 0, null);
  ok(bowled.kind === "bowled" && bowled.wicket, `expected bowled, got ${bowled.kind}`);

  const wide = new S.Trajectory(S.makeDelivery(126, 0.9, 0.52, 0));
  ok(S.resolveOutcome(Math.random, wide, null, 0, 0, null).kind === "leave", "wide = leave");

  const loftedContact = {
    outcome: "lofted_clean", exit_kph: 102, elevation: 38, quality: 0.95,
    direction: { x: 0, y: 0.62, z: 0.79 }, lofted: true,
  };
  const six = S.resolveOutcome(Math.random, wide, { will_contact: true, contact: loftedContact }, 0, 0, null);
  ok(six.kind === "six" && six.runs === 6, `expected six, got ${six.kind}`);

  const forced = S.resolveOutcome(Math.random, wide, null, 0, 0, "four");
  ok(forced.kind === "four" && forced.runs === 4 && forced.forced, "forced four");
}

// 6. Perfectly-timed normal drive contacts with real exit speed.
{
  const eng = new S.BattingEngine();
  let saw = null;
  eng.onSwing = (r) => { saw = r; };
  eng.beginDelivery(S.makeDelivery(118, 0, 0.12, 0));
  const ttc = eng.traj.time_to_contact;
  const windup = S.windupTime("normal");
  const dt = 1 / 240;
  let t = 0, swung = false;
  while (t < 3) {
    const due = !swung && t + windup >= ttc - 0.034;
    eng.update(dt, { footX: 0, footY: 0, dirX: 0.3, dirY: 0.954, strength: 1, intent: "normal", swing: due });
    if (due) swung = true;
    t += dt;
    if (eng.passedReported || eng.contactWillHappen) break;
  }
  ok(saw && (saw.window === "perfect" || saw.window === "good"), `window got=${saw && saw.window}`);
  ok(saw.will_contact, "perfect drive contacts");
  ok(saw.contact.exit_kph > 25, `exit speed too low: ${saw.contact.exit_kph}`);
}

// 7. Carry physics sanity.
close(S.predictCarry(100, 38, 0.9).carry > 60, true, 0, "100kph@38 flies past 60m");
ok(S.predictCarry(40, 8, 0.9).carry < 13, "40kph dapper dies short");

console.log("SMOKE OK — engine.js (Phase 2) matches the Python reference invariants.");


// ================= Phase 3: fielding / AI / match flow =================
function shoot(exitKph, elevDeg, angleDeg, seed, scale = 1.0) {
  const e = elevDeg * Math.PI / 180, a = angleDeg * Math.PI / 180, v = exitKph / 3.6;
  const vel = { x: Math.sin(a) * Math.cos(e) * v, y: Math.sin(e) * v, z: Math.cos(a) * Math.cos(e) * v };
  // deterministic-ish rand from a seed
  let st = seed >>> 0 || 1;
  const rand = () => { st ^= st << 13; st ^= st >>> 17; st ^= st << 5; return ((st >>> 0) % 100000) / 100000; };
  return S.simulateFielding({ x: 0.1, y: 0.9, z: 0.35 }, vel, S.defaultField(scale), rand);
}

// hard drive through the gap -> boundary; at a fielder -> contained
{
  let gap = 0, atFielder = 0;
  for (let s = 1; s <= 60; s++) {
    if (["four", "six"].includes(shoot(104, 7, 30, s).kind)) gap++;
    if (shoot(104, 7, 43, s).kind === "stopped") atFielder++;
  }
  ok(gap > 40, `hard gap shot boundaries got=${gap}`);
  ok(atFielder > 30, `hard shot at fielder stopped got=${atFielder}`);
}
// lofted chip: caught sometimes, survives sometimes
{
  let caught = 0, escaped = 0;
  for (let s = 1; s <= 200; s++) {
    const r = shoot(70, 42, -30, s * 7 + 1);
    if (r.kind === "caught") caught++; else escaped++;
  }
  ok(caught > 25, `lofted catches got=${caught}`);
  ok(escaped > 50, `lofted escapes got=${escaped}`);
}
// runs bounded
for (let s = 1; s <= 100; s++) {
  const r = shoot(95, 14, 23, s);
  ok(r.runs >= 0 && r.runs <= 6, "runs within 0..6");
}

// AI aggression scales with required rate
ok(S.aggressionState(2, 5, 2) === "safe", "agg safe");
ok(S.aggressionState(8, 5, 2) === "balanced", "agg balanced");
ok(S.aggressionState(16, 5, 2) === "aggressive", "agg aggressive");
ok(S.aggressionState(26, 4, 2) === "desperate", "agg desperate");
{
  const delivery = S.buildDelivery("good_length", Math.random, 0.8);
  const lofts = (ctx) => {
    let c = 0;
    for (let i = 0; i < 500; i++) {
      const p = S.aiBattingPlan(Math.random, delivery, ctx, "medium", null);
      if (p.swing && (p.intent === "lofted" || p.intent === "aggressive")) c++;
    }
    return c;
  };
  const calm = lofts({ target: 10, score: 4, balls_remaining: 5, wickets_remaining: 2 });
  const panic = lofts({ target: 40, score: 5, balls_remaining: 2, wickets_remaining: 2 });
  ok(panic > calm * 2, `aggression lifts intent mix calm=${calm} panic=${panic}`);
}

// scripted match scenarios (spec section 28)
{
  const L = (r) => ({ kind: "legal", runs: r });
  const W = (d) => ({ kind: "wicket", runs: 0, dismissal: d });
  let m = new S.SuperOverMatchJS(); m.start();
  for (let i = 0; i < 6; i++) m.recordDelivery(L(0));
  ok(m.phase === "break" && m.innings[0].legal_balls === 6, "six dots end innings");

  m = new S.SuperOverMatchJS(); m.start();
  [L(1), L(1), L(1), L(1), L(0), L(0)].forEach((o) => m.recordDelivery(o));
  m.startSecondInnings();
  m.recordDelivery(L(4)); m.recordDelivery(L(4));
  ok(m.result.outcome === "second_win" && m.innings[1].legal_balls === 2, "early chase win");

  m = new S.SuperOverMatchJS(); m.start();
  m.recordDelivery(W("bowled")); m.recordDelivery(W("caught"));
  ok(m.phase === "break" && m.innings[0].wickets === 2, "two wickets end innings");

  m = new S.SuperOverMatchJS(); m.start();
  [L(6), L(0), L(0), L(0), L(0), L(0)].forEach((o) => m.recordDelivery(o));
  m.startSecondInnings();
  m.recordDelivery(L(6)); m.recordDelivery(L(1));
  ok(m.result.outcome === "second_win" && m.result.margin_balls === 4, "instant chase end + margin balls");

  m = new S.SuperOverMatchJS(); m.start();
  [L(4), L(0), L(0), L(0), L(0), L(0)].forEach((o) => m.recordDelivery(o));
  m.startSecondInnings();
  [L(4), L(0), L(0), L(0), L(0), L(0)].forEach((o) => m.recordDelivery(o));
  ok(m.result.outcome === "tie", "tie stays tie");

  // striker swaps
  m = new S.SuperOverMatchJS(); m.start();
  m.recordDelivery(L(1)); ok(m.innings[0].striker === 1, "odd run swaps");
  m.recordDelivery(L(2)); ok(m.innings[0].striker === 1, "two keeps strike");
  m.recordDelivery(L(4)); ok(m.innings[0].striker === 1, "boundary keeps strike");
}

// full AI-vs-AI soak through the real engine pipeline
{
  function playDeliveryAI(match) {
    const tune = S.AI_DIFFICULTY.medium;
    const type = S.nextDeliveryType(Math.random);
    const d = S.buildDelivery(type, Math.random, tune.ai_bowling_acc);
    const eng = new S.BattingEngine();
    eng.beginDelivery(d);
    const innIdx = match.phase === "second" ? 1 : 0;
    const ctx = {
      target: innIdx === 1 ? match.innings[0].runs + 1 : null,
      score: match.innings[innIdx].runs,
      balls_remaining: match.ballsRemaining(),
      wickets_remaining: match.wicketsRemaining(),
    };
    const plan = S.aiBattingPlan(Math.random, d, ctx, "medium", eng.traj.hitsStumps());
    const swingT = plan.swing ? S.aiSwingFrameTime(eng.traj.time_to_contact, plan.intent, plan.offset) : null;
    let fired = false, t = 0;
    const dt = 1 / 120;
    while (t < 4) {
      const frame = {
        footX: Math.max(-1, Math.min(1, plan.foot_target.x - eng.foot.x)) * 2,
        footY: Math.max(-1, Math.min(1, plan.foot_target.z - eng.foot.z)) * 2,
        intent: plan.intent,
        swing: plan.swing && !fired && swingT != null && t >= swingT,
        dirX: Math.sin(plan.angle), dirY: Math.cos(plan.angle), strength: plan.strength,
      };
      if (frame.swing) fired = true;
      eng.update(dt, frame);
      t += dt;
      if (eng.passedReported || eng.contactWillHappen) break;
    }
    if (!eng.contactWillHappen) {
      const o = S.resolveOutcome(Math.random, eng.traj, eng.lastSwing, eng.foot.x, eng.foot.z, null);
      match.recordDelivery(o.wicket
        ? { kind: "wicket", runs: 0, dismissal: o.kind === "lbw" ? "lbw" : "bowled" }
        : { kind: "legal", runs: o.runs });
      return o.kind;
    }
    const c = eng.lastSwing.contact;
    const speed = c.exit_kph / 3.6;
    const res = S.simulateFielding(
      { x: eng.traj.x_at_contact, y: Math.max(eng.traj.height_at_contact, 0.35), z: 0.35 },
      { x: c.direction.x * speed, y: c.direction.y * speed, z: c.direction.z * speed },
      S.defaultField(innIdx === 0 ? tune.field_vs_player : tune.field_for_player),
      Math.random);
    if (res.kind === "caught") match.recordDelivery({ kind: "wicket", runs: 0, dismissal: "caught" });
    else match.recordDelivery({ kind: "legal", runs: res.runs });
    return res.kind;
  }

  const kinds = new Set();
  let firstWins = 0, secondWins = 0;
  for (let seed = 0; seed < 40; seed++) {
    const m = new S.SuperOverMatchJS(); m.start();
    while (m.phase !== "completed") {
      if (m.phase === "break") { m.startSecondInnings(); continue; }
      kinds.add(playDeliveryAI(m));
    }
    ok(m.innings[0].legal_balls <= 6 && m.innings[1].legal_balls <= 6, "balls cap");
    ok(m.innings[0].wickets <= 2 && m.innings[1].wickets <= 2, "wickets cap");
    if (m.result.outcome === "second_win") {
      secondWins++;
      ok(m.innings[1].runs >= m.innings[0].runs + 1, "chase reached target");
    } else if (m.result.outcome === "first_win") {
      firstWins++;
      ok(m.innings[1].runs < m.innings[0].runs + 1, "chase fell short");
    }
  }
  ok(firstWins > 0, "AI chase can fail");
  ok(secondWins > 0, "AI chase can succeed");
  ok(kinds.has("caught") && kinds.has("four"), "catches and boundaries occur live");
  ok(kinds.has("bowled") || kinds.has("lbw"), "stump wickets occur live");
}

// ================= Phase 4: feel, bowling depth, smarter AI =================
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 10. Timing feedback ladder + defensive cap.
{
  const ladder = ["perfect", "good", "early", "very_early"].map(
    (w) => S.timingFeedback(w, "aggressive").power_mult);
  for (let i = 1; i < ladder.length; i++) ok(ladder[i - 1] > ladder[i], "timing power ladder");
  ok(S.timingFeedback("perfect", "aggressive").attack_boost > 1, "perfect aggression boosts");
  ok(S.timingFeedback("perfect", "defensive").attack_boost <= 1, "perfect block stays a block");
  ok(S.timingFeedback("missed").haptic === 0, "missed has no haptic");
}
// 11. Shot context: yorker snaps square shots to a believable leg-side dig.
{
  const res = S.validateShotRequest(-80 * Math.PI / 180, 0.05);
  ok(res.snapped, "yorker pull request snaps");
  ok(res.sector === "mid_wicket" && res.family === "flick", "snaps to leg-side flick");
  const cut = S.validateShotRequest(80 * Math.PI / 180, 0.85);
  ok(!cut.snapped && cut.family === "cut", "short ball cut is believable");
}
// 12. Release control: perfect exact, early fuller, late shorter.
{
  const rng = mulberry32(31);
  const d = S.buildDelivery("good_length", rng, 1.0);
  const same = S.applyRelease(d, 0.01, 0.75);
  ok(same.line === d.line && same.length === d.length, "perfect release exact");
  ok(S.releaseQuality(0.01) === "perfect", "release quality perfect");
  const early = S.applyRelease(d, -0.12, 0.7);
  ok(early.length < d.length, "early release over-pitches");
  const late = S.applyRelease(d, 0.12, 0.7);
  ok(late.length > d.length, "late release drags short");
}
// 13. Wide legality + spray gradient.
{
  ok(S.deliveryLegality(0.4) === "legal" && S.deliveryLegality(1.05) === "wide", "wide thresholds");
  const spray = (diff) => S.sprayProbability(0.55, diff);
  ok(spray("easy") > spray("hard"), "easy sprays more than hard");
}
// 14. Batter archetypes attack differently.
{
  const attackRate = (arch) => {
    const rng = mulberry32(7);
    let aggr = 0;
    const n = 800;
    for (let i = 0; i < n; i++) {
      const d = S.buildDelivery("good_length", rng, 1.0);
      const ctx = { target: null, score: 5, balls_remaining: 5, wickets_remaining: 2 };
      const plan = S.aiBattingPlan(rng, d, ctx, "medium", true, arch);
      if (plan.intent === "aggressive" || plan.intent === "lofted") aggr++;
    }
    return aggr / n;
  };
  ok(attackRate("aggressive") > attackRate("balanced") + 0.04, "aggressive attacks more");
  ok(attackRate("balanced") > attackRate("defensive") + 0.04, "balanced > defensive");
}
// 15. AI bowling strategy adapts to repeated scoring.
{
  const rng = mulberry32(1);
  const hist = [
    { sector: "cover", runs: 4, intent: "aggressive" },
    { sector: "cover", runs: 4, intent: "aggressive" },
    { sector: "cover", runs: 1, intent: "normal" },
  ];
  const plan = S.aiBowlingPlan(rng, hist, { balls_remaining: 3, wickets_remaining: 2 }, "medium");
  ok(plan.type === "leg_cutter" && plan.line_hint < 0, "attacks away from cover");
  const death = S.aiBowlingPlan(rng, [], { balls_remaining: 2, wickets_remaining: 2 }, "medium");
  ok(death.type === "yorker", "yorker at the death");
}
// 16. Catch grades + dives + throws.
{
  ok(S.catchGrade(60, 1.2, 6, false) === "easy", "easy catch");
  ok(S.catchGrade(112, 0.8, 2, false) === "difficult", "difficult catch");
  ok(S.catchGrade(95, 1, 1.5, true) === "edge", "edge catch");
  const f = S.defaultField(1.0)[2]; // cover
  ok(S.diveDecision(f, 0.8, 18, true, false) === "none", "no dive in reach");
  ok(S.diveDecision(f, 2.2, 22, true, false) === "boundary_save", "boundary save dive");
  const cannon = { throwSpeed: 26, throwAcc: 0.85 };
  const noodle = { throwSpeed: 16, throwAcc: 0.85 };
  ok(S.throwReturn(cannon, 45).travel_time < S.throwReturn(noodle, 45).travel_time,
     "strong arm returns faster");
}
// 17. Wides in a live match never consume legal balls and matches complete.
{
  let widesSeen = 0;
  for (let seed = 0; seed < 25; seed++) {
    const rng = mulberry32(1000 + seed);
    const m = new S.SuperOverMatchJS(); m.start();
    let guard = 0;
    while (m.phase !== "completed" && ++guard < 200) {
      if (m.phase === "break") { m.startSecondInnings(); continue; }
      const ctx = { score: m.innings[0].runs, balls_remaining: m.ballsRemaining(),
                    wickets_remaining: m.wicketsRemaining() };
      const strat = S.aiBowlingPlan(rng, [], ctx, "easy");
      const sampled = S.buildDelivery(strat.type, rng, 0.6,
        { lineHint: strat.line_hint, lengthHint: strat.length_hint });
      const off = (rng() + rng() - 1) * 0.062 * 3;
      const bowled = S.bowlWithRelease(rng, sampled, off, 0.6, "easy");
      if (bowled.wide) { m.recordDelivery({ kind: "wide", runs: 1 }); widesSeen++; continue; }
      m.recordDelivery({ kind: "legal", runs: 0 });
    }
    ok(m.phase === "completed", "match completes with wides");
    ok(m.innings[0].legal_balls <= 6 && m.innings[1].legal_balls <= 6, "legal ball cap holds");
  }
  ok(widesSeen > 0, "wides occur in live play");
}

console.log("SMOKE PASS (phase 1+2+3+4)");

// ================= Phase 2 feel: movement-steered edges + catch grading =================
// 18. Movement steers edges; catch grade shapes sim probability.
{
  ok(S.edgeSide(0.8, 0) === 1, "outswing edges fly off");
  ok(S.edgeSide(-0.8, 0) === -1, "inswing edges fly leg");
  ok(S.edgeSide(0.05, 0) === 0, "no movement -> no steer");
  ok(S.movementEdgeBias(0.12, 0.8, 0) > 0, "bat caught by movement edges more");
  ok(S.movementEdgeBias(-0.12, 0.8, 0) < 0, "bat with movement edges less");
  ok(S.movementEdgeBias(0, 0.8, 0) === 0, "perfect timing -> no bias");

  function edgeOffFraction(swing, n) {
    let off = 0, total = 0;
    for (let s = 0; s < n; s++) {
      const rng = mulberry32(9000 + s);
      const delivery = S.makeDelivery(132, 0.2, 0.5, swing);
      const shot = { kind: "cover_drive", name: "Cover Drive", lofted: false,
                     awkward: false, base_power: 0.68, base_loft: 6 };
      const direction = { reach: 0.85, angle: 0 };
      const c = S.resolveContact(rng, delivery, shot, direction, 0.12, "late", 1.0);
      if (c.outcome === "edge") {
        total++;
        if (c.direction.x > 0) off++;
      }
    }
    return total ? off / total : 0;
  }
  ok(edgeOffFraction(0.8, 1500) > 0.9, "outswinger's edges go to the off side");
  ok(edgeOffFraction(-0.8, 1500) < 0.1, "inswinger's edges go to the leg side");

  function caughtFraction(vel, n) {
    let caught = 0;
    for (let s = 0; s < n; s++) {
      const rng = mulberry32(7000 + s);
      const r = S.simulateFielding({ x: 0.1, y: 0.9, z: 0.35 }, vel, S.defaultField(1.0), rng);
      if (r.kind === "caught") caught++;
    }
    return caught / n;
  }
  const soft = caughtFraction({ x: 8.45, y: 9.9, z: 8.8 }, 400);
  const hard = caughtFraction({ x: 14, y: 4, z: 15 }, 400);
  ok(soft > 0.4, `gentle loft should be caught regularly, got=${soft}`);
  ok(hard < 0.15, `hard flat drive should rarely be caught, got=${hard}`);
  ok(soft > hard + 0.2, "catch grade shapes the simulated catch probability");
}

console.log("SMOKE PASS (phase 2 feel: edges + catch grading)");
