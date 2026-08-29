// ------------------------------------------------------------------
// tests/unit/shared/lazy-detail.test.js - The lazy detail loader
// (docs/plan/80-LOAD-SPEED.md).
//
// Moving a row's prose off the first paint is easy. The four things
// that make it safe rather than merely fast are what these hold: an
// empty field is loaded, a fast fetch paints no placeholder, a
// placeholder that did appear stays long enough to read, and a stale
// response never paints into the surface that superseded it.
//
// The timer is injected so every one of those is a deterministic
// assertion rather than a sleep.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function load() {
  const sandbox = { window: null, setTimeout, clearTimeout, Date, Promise, Object, Math };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/pages/shared/lazy-detail.js"), sandbox,
    { filename: "lazy-detail.js" });
  return sandbox.App.lazyDetail;
}
const lazyDetail = load();

// A clock the test drives by hand: nothing fires until tick() says so.
function fakeTimer() {
  let now = 0;
  let seq = 0;
  const queued = new Map();
  return {
    now: () => now,
    set(fn, ms) { queued.set(++seq, { at: now + ms, fn }); return seq; },
    clear(id) { queued.delete(id); },
    tick(ms) {
      now += ms;
      for (const [id, t] of [...queued].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= now) { queued.delete(id); t.fn(); }
      }
    },
    pending: () => queued.size,
  };
}

function harness(opts) {
  const timer = fakeTimer();
  const painted = [];
  const open = lazyDetail(Object.assign({
    keys: ["details"],
    paint: (item, state) => painted.push(state),
    timer,
  }, opts));
  return { open, painted, timer };
}

test("the surface paints immediately from what is already in memory", () => {
  const h = harness({ load: () => new Promise(() => {}) });
  h.open({ id: "a", title: "One" });
  assert.deepEqual(h.painted, ["ready"],
    "the drawer is populated before any fetch resolves - that is the point");
});

test("a row already carrying the field issues no fetch at all", () => {
  let calls = 0;
  const h = harness({ load: () => { calls++; return Promise.resolve({}); } });
  h.open({ id: "a", details: "already here" });
  assert.equal(calls, 0);
  assert.deepEqual(h.painted, ["ready"]);
});

test("an empty field counts as loaded and never re-fetches", async () => {
  // The bug this prevents: guarding on truthiness means an item whose
  // details are genuinely empty fetches again on every single open,
  // forever, and nothing ever looks wrong.
  let calls = 0;
  const h = harness({ load: () => { calls++; return Promise.resolve({ details: "" }); } });
  await h.open({ id: "a", title: "One" });
  assert.equal(calls, 1);
  await h.open({ id: "a", title: "One", details: "" });
  assert.equal(calls, 1, "the second open must not fetch - '' is a loaded value");
});

test("a fast fetch paints no placeholder", async () => {
  const h = harness({ load: () => Promise.resolve({ details: "text" }) });
  const done = h.open({ id: "a" });
  await done;
  assert.deepEqual(h.painted, ["ready", "ready"],
    "resolved before the delay elapsed, so 'waiting' never appears");
  assert.equal(h.timer.pending(), 0, "and its timer is cleared, not left running");
});

test("a slow fetch shows the placeholder, but only after the delay", async () => {
  let settle;
  const h = harness({ load: () => new Promise((r) => { settle = r; }) });
  h.open({ id: "a" });
  h.timer.tick(39);
  assert.deepEqual(h.painted, ["ready"], "39ms is still the fast path");
  h.timer.tick(1);
  assert.deepEqual(h.painted, ["ready", "waiting"]);
  settle({ details: "text" });
});

test("a placeholder that appeared stays long enough to read", async () => {
  let settle;
  const h = harness({ load: () => new Promise((r) => { settle = r; }) });
  const done = h.open({ id: "a" });
  h.timer.tick(40);
  assert.deepEqual(h.painted, ["ready", "waiting"]);
  // Resolving 5ms after the placeholder appeared would otherwise
  // flicker: up for five milliseconds, then gone.
  settle({ details: "text" });
  await Promise.resolve();
  h.timer.tick(5);
  assert.deepEqual(h.painted, ["ready", "waiting"], "still held");
  h.timer.tick(145);
  await done;
  assert.deepEqual(h.painted, ["ready", "waiting", "ready"], "swapped once the hold expired");
});

test("a stale response does not paint into the surface that replaced it", async () => {
  // Open A, open B before A returns. A's answer must be cached onto A
  // and must not touch the surface, which is showing B.
  const settlers = {};
  const h = harness({
    load: (item) => new Promise((r) => { settlers[item.id] = r; }),
  });
  const a = { id: "a" };
  const b = { id: "b" };
  const first = h.open(a);
  h.open(b);
  h.painted.length = 0;
  settlers.a({ details: "A's text" });
  await first;
  assert.deepEqual(h.painted, [], "nothing painted - the open that asked is superseded");
  assert.equal(a.details, "A's text", "but the answer is still cached on the row");
});

test("reopening the same item also supersedes an in-flight response", async () => {
  // Guarding on the item rather than on the open would let a slow
  // first response repaint over a second, already-painted open.
  const settlers = [];
  const h = harness({ load: () => new Promise((r) => { settlers.push(r); }) });
  const item = { id: "a" };
  const first = h.open(item);
  h.open(item);
  h.painted.length = 0;
  settlers[0]({ details: "first" });
  await first;
  assert.deepEqual(h.painted, []);
});

test("a failed fetch leaves the surface up and says so", async () => {
  const h = harness({ load: () => Promise.reject(new Error("network")) });
  const item = { id: "a", title: "One" };
  await h.open(item);
  assert.deepEqual(h.painted, ["ready", "failed"],
    "the drawer stays rendered; only the detail region reports the failure");
  assert.ok(!Object.prototype.hasOwnProperty.call(item, "details"),
    "nothing is cached, so reopening retries rather than showing a permanent blank");
});

test("more than one key must all arrive before a row counts as loaded", async () => {
  let calls = 0;
  const h = harness({
    keys: ["details", "notes"],
    load: () => { calls++; return Promise.resolve({ details: "d", notes: [] }); },
  });
  const item = { id: "a", details: "d" };
  await h.open(item);
  assert.equal(calls, 1, "details alone is not loaded when notes is also expected");
  await h.open(item);
  assert.equal(calls, 1);
});

test("the two timings are stated once and readable from outside", () => {
  const h = harness({ load: () => Promise.resolve({}) });
  assert.equal(h.open.DELAY, 40);
  assert.equal(h.open.HOLD, 150);
});
