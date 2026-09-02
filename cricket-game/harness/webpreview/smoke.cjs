// Node smoke test for the Phase 2 JS engine port (run: node smoke.cjs).
// Verifies engine.js against invariants from harness/batting_reference.py
// and harness/bowling_reference.py.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
const sandbox = {};
new Function("s", src + "; Object.assign(s, { BattingEngine, makeDelivery, Trajectory, windupTime, buildDelivery, nextDeliveryType, resolveOutcome, DELIVERY_TYPES, DELIVERY_SPECS, DELIVERY_LABELS, predictCarry });")(sandbox);
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
