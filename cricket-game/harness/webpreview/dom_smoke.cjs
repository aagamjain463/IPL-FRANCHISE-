// Headless runtime smoke for preview.js (Phase 3): fake DOM + canvas, run a
// simulated full Super Over (player bats innings 1, AI chases in innings 2
// while the "player" bowls), press PLAY AGAIN, and verify the loop never
// throws, both innings progress and the match completes.
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
    style: {}, textContent: "", innerHTML: "", value: "0", className: "", dataset: {},
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
  querySelectorAll(selector) {
    if (selector === ".intent") {
      return ["defensive", "normal", "aggressive", "lofted"].map((intent) => {
        const b = fakeEl(); b.dataset = { intent }; return b;
      });
    }
    if (selector === ".btype") {
      return ["fast_straight", "fast_inswinger", "yorker", "short_ball"].map((bt) => {
        const b = fakeEl(); b.dataset = { bt }; return b;
      });
    }
    return [];
  },
  elementFromPoint() { return null; },
};

// ---- virtual time: setTimeout/clearTimeout driven by simTime ----
let simTime = 0;
const timers = [];
global.setTimeout = (fn, ms) => { timers.push({ at: simTime + (ms || 0), fn, dead: false }); return timers.length; };
global.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1].dead = true; };
function runTimers() {
  for (const t of timers) {
    if (!t.dead && t.at <= simTime) { t.dead = true; t.fn(); }
  }
}

let rafCb = null;
global.window = { innerWidth: 900, innerHeight: 450, devicePixelRatio: 1, addEventListener() {} };
global.requestAnimationFrame = (cb) => { rafCb = cb; };
global.performance = { now: () => simTime };

const canvas = els["view"] = fakeEl();

// One eval so both scripts share a scope (as they do in the browser).
eval(fs.readFileSync(path.join(__dirname, "engine.js"), "utf8") + "\n"
   + fs.readFileSync(path.join(__dirname, "preview.js"), "utf8"));

const fire = (el, name, ev) => {
  const ls = (el.listeners && el.listeners[name]) || [];
  for (const fn of ls) fn(ev);
};

(async () => {
  let frames = 0;
  let swipeStartedAt = -1;
  let resultShown = 0;
  let playAgainAt = -1;
  const maxFrames = 60 * 120;   // 2 simulated minutes: enough for a full match

  try {
    while (frames < maxFrames) {
      simTime += 1000 / 60;
      runTimers();
      const cb = rafCb; rafCb = null;
      if (!cb) break;
      cb(simTime);
      frames++;

      // Player swipes while batting (innings 1); ignored while the AI bats.
      if (frames % 240 === 60) {
        fire(canvas, "pointerdown", { pointerId: 9, clientX: 700, clientY: 200, preventDefault() {} });
        fire(canvas, "pointermove", { pointerId: 9, clientX: 680, clientY: 90 });
        swipeStartedAt = simTime;
      }
      if (swipeStartedAt > 0 && simTime - swipeStartedAt >= 120) {
        fire(canvas, "pointerup", { pointerId: 9 });
        swipeStartedAt = -1;
      }

      // Watch for the result overlay; press PLAY AGAIN shortly after.
      const overlay = els["overlay"];
      const title = els["overlayTitle"] ? els["overlayTitle"].textContent : "";
      if (overlay && overlay.style.display === "flex" && /YOU WIN|YOU LOSE|TIE/.test(title)) {
        if (playAgainAt < 0) { resultShown++; playAgainAt = frames + 45; }
        if (frames >= playAgainAt) {
          fire(els["playAgain"], "pointerdown", { stopPropagation() {} });
          playAgainAt = -1;
        }
      }

      // Let the async overlay chain (await sleep / promises) make progress.
      if (frames % 4 === 0) { await Promise.resolve(); await Promise.resolve(); }
    }
  } catch (e) {
    console.error("FRAME LOOP CRASH at frame", frames, ":", e.stack);
    process.exit(1);
  }

  console.log("RAN", frames, "frames without crashing.");
  const dbg = window.__matchDebug ? window.__matchDebug() : null;
  const score = els["scoreboard"] ? els["scoreboard"].textContent : "";
  const chase = els["chase"] ? els["chase"].textContent : "";
  console.log("FINAL SCOREBOARD:", JSON.stringify(score));
  console.log("FINAL CHASE LINE:", JSON.stringify(chase));

  if (!dbg || !dbg.match) {
    console.error("FAIL: match debug hook missing");
    process.exit(1);
  }
  const legalTotal = dbg.match.innings[0].legal_balls + dbg.match.innings[1].legal_balls;
  if (resultShown < 1) {
    console.error("FAIL: the match result screen never appeared (legal balls bowled:",
      legalTotal, ", phase:", dbg.match.phase, ")");
    process.exit(1);
  }
  if (!/of 6 balls/.test(score)) {
    console.error("FAIL: scoreboard format unexpected:", score);
    process.exit(1);
  }
  console.log("RESULT SCREENS SHOWN:", resultShown);
  console.log("PREVIEW RUNTIME OK (Phase 3 full match)");
})();
