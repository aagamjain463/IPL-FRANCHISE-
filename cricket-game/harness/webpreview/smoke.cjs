// Node smoke test for the JS engine port (run: node smoke.cjs).
// Verifies engine.js against invariants from harness/batting_reference.py.
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "engine.js"), "utf8");
const sandbox = {};
new Function("s", src + "; s.BattingEngine=BattingEngine; s.makeDelivery=makeDelivery; s.Trajectory=Trajectory; s.windupTime=windupTime;")(sandbox);
const { BattingEngine, makeDelivery, Trajectory, windupTime } = sandbox;

const ok = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); };
const close = (a, b, eps, msg) => ok(Math.abs(a - b) <= eps, `${msg} got=${a} want≈${b}`);

// 1. Trajectory parity with the Python mirror (exact values pinned there).
const cases = [
  ["full", makeDelivery(118, 0, 0.12, 0), { tts: 0.6535551952837141, ttc: 0.6087873249815771, hits: true, xc: 0 }],
  ["good", makeDelivery(126, 0.15, 0.52, 0), { tts: 0.6212024844720497, ttc: 0.5792770186335404, hits: false, xc: 0.0675 }],
  ["short", makeDelivery(134, -0.1, 0.88, 0), { tts: 0.5918530824140169, ttc: 0.5524306294613888, hits: false, xc: -0.045 }],
];
for (const [name, d, want] of cases) {
  const t = new Trajectory(d);
  close(t.time_to_stumps, want.tts, 1e-9, `${name} tts`);
  close(t.time_to_contact, want.ttc, 1e-9, `${name} ttc`);
  ok(t.hitsStumps() === want.hits, `${name} hitsStumps want=${want.hits}`);
  close(t.x_at_contact, want.xc, 1e-9, `${name} x_at_contact`);
}

// 2. Perfectly-timed normal drive at a full delivery -> contact with real exit speed.
{
  const eng = new BattingEngine();
  let saw = null;
  eng.onSwing = (r) => { saw = r; };
  eng.beginDelivery(makeDelivery(118, 0, 0.12, 0));
  const ttc = eng.traj.time_to_contact;
  const windup = windupTime("normal");
  const dt = 1 / 240;
  let t = 0, swung = false;
  while (t < 3) {
    const due = !swung && t + windup >= ttc - 0.034; // enter perfect window
    eng.update(dt, { footX: 0, footY: 0, dirX: 0.3, dirY: 0.954, strength: 1, intent: "normal", swing: due });
    if (due) swung = true;
    t += dt;
    if (eng.passedReported || eng.contactWillHappen) break;
  }
  ok(saw, "swing event delivered");
  ok(saw.window === "perfect" || saw.window === "good", `timing window got=${saw.window}`);
  ok(saw.will_contact, "perfect drive should make contact");
  ok(saw.contact.outcome === "clean" || saw.contact.outcome === "edge", `outcome got=${saw.contact.outcome}`);
  ok(saw.contact.exit_kph > 25, `exit speed too low: ${saw.contact.exit_kph}`);
}

// 3. No swing at a full, on-stump delivery -> bowled.
{
  const eng = new BattingEngine();
  let passed = null;
  eng.onPassed = (r) => { passed = r; };
  eng.beginDelivery(makeDelivery(118, 0, 0.12, 0));
  const dt = 1 / 240;
  let t = 0;
  while (!passed && t < 5) {
    eng.update(dt, { footX: 0, footY: 0, dirX: 0, dirY: 1, strength: 0, intent: "normal", swing: false });
    t += dt;
  }
  ok(passed, "pass event fired");
  ok(!passed.swung && passed.hit_stumps, `expected unswung bowled, got ${JSON.stringify(passed)}`);
}

// 4. No swing at a wide ball -> dot (not bowled).
{
  const eng = new BattingEngine();
  let passed = null;
  eng.onPassed = (r) => { passed = r; };
  eng.beginDelivery(makeDelivery(126, 0.9, 0.52, 0));
  const dt = 1 / 240;
  let t = 0;
  while (!passed && t < 5) {
    eng.update(dt, { footX: 0, footY: 0, dirX: 0, dirY: 1, strength: 0, intent: "normal", swing: false });
    t += dt;
  }
  ok(passed && !passed.swung && !passed.hit_stumps, "wide no-swing should be a dot");
}

// 5. Way-too-early swing -> missed window, no contact.
{
  const eng = new BattingEngine();
  let saw = null;
  eng.onSwing = (r) => { saw = r; };
  eng.beginDelivery(makeDelivery(126, 0.15, 0.52, 0));
  const dt = 1 / 240;
  let t = 0, swung = false;
  while (t < 3) {
    const due = !swung && t >= 0.10;
    eng.update(dt, { footX: 0, footY: 0, dirX: 0, dirY: 1, strength: 1, intent: "normal", swing: due });
    if (due) swung = true;
    t += dt;
    if (eng.passedReported) break;
  }
  ok(saw && saw.window === "missed" && !saw.will_contact, `early swing should miss, got ${saw && saw.window}`);
}

console.log("SMOKE OK — engine.js port matches batting_reference.py invariants.");
