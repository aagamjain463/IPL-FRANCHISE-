// Headless runtime smoke for preview.js: fake DOM + canvas, run ~14 simulated
// seconds of frames and verify the loop never throws and deliveries resolve.
const fs = require("fs");
const path = require("path");

const ctxStub = new Proxy({}, {
  get(t, prop) {
    if (prop === "createLinearGradient") return () => ({ addColorStop() {} });
    return () => {};
  },
  set() { return true; },
});

function fakeEl(extra) {
  const el = {
    style: {}, textContent: "", value: "0", className: "", dataset: {},
    listeners: {},
    addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
    setPointerCapture() {},
    classList: { add() {}, remove() {}, toggle() {} },
    getContext() { return ctxStub; },
    width: 0, height: 0,
  };
  return Object.assign(el, extra || {});
}

const els = {};
global.document = {
  getElementById(id) { return els[id] || (els[id] = fakeEl()); },
  querySelectorAll() {
    return ["defensive", "normal", "aggressive", "lofted"].map((intent) => {
      const b = fakeEl();
      b.dataset = { intent };
      return b;
    });
  },
  elementFromPoint() { return null; },
};
let rafCb = null;
global.window = { innerWidth: 900, innerHeight: 450, devicePixelRatio: 1, addEventListener() {} };
global.requestAnimationFrame = (cb) => { rafCb = cb; };
let simTime = 0;
global.performance = { now: () => simTime };

const canvas = els["view"] = fakeEl();

// One eval so both scripts share a scope (as they do in the browser).
eval(fs.readFileSync(path.join(__dirname, "engine.js"), "utf8") + "\n"
   + fs.readFileSync(path.join(__dirname, "preview.js"), "utf8"));

const fire = (name, ev) => {
  const ls = canvas.listeners[name] || [];
  for (const fn of ls) fn(ev);
};

let frames = 0;
let swipeStartedAt = -1;
try {
  while (frames < 60 * 14) {
    simTime += 1000 / 60;
    const cb = rafCb; rafCb = null;
    if (!cb) break;
    cb(simTime);
    frames++;

    // Every 4 s, start a swipe on the right side and release it 120 ms later.
    if (frames % 240 === 60) {
      fire("pointerdown", { pointerId: 9, clientX: 700, clientY: 200, preventDefault() {} });
      fire("pointermove", { pointerId: 9, clientX: 680, clientY: 90 });
      swipeStartedAt = simTime;
    }
    if (swipeStartedAt > 0 && simTime - swipeStartedAt >= 120) {
      fire("pointerup", { pointerId: 9 });
      swipeStartedAt = -1;
    }
  }
} catch (e) {
  console.error("FRAME LOOP CRASH at frame", frames, ":", e.stack);
  process.exit(1);
}

console.log("RAN", frames, "frames without crashing.");
const score = els["scoreboard"] ? els["scoreboard"].textContent : "";
console.log("FINAL SCOREBOARD:", JSON.stringify(score));
if (!/BALLS [2-9]/.test(score)) {
  console.error("FAIL: deliveries did not progress:", score);
  process.exit(1);
}
console.log("PREVIEW RUNTIME OK");
