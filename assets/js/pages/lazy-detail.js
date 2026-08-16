// ------------------------------------------------------------------
// lazy-detail.js - Fetching a row's heavy fields when the detail
// surface opens, instead of carrying them for every row on page load.
//
// The roadmap board downloads the prose of 268 work items and 182
// notes to show one item's worth at a time. This moves that off the
// first paint. Used by the roadmap drawer and the backlog modal, which
// is why it lives beside them rather than in core/ - two pages, two
// includes, instead of a core file on twenty-three.
//
// It is a state machine, not a renderer. It owns four decisions and
// hands every one of them to a caller-supplied paint():
//
//   1. Is this row loaded? Decided on the PRESENCE of the key, never
//      its truthiness. An item with genuinely empty details is loaded,
//      and treating it as unloaded re-fetches on every open forever.
//   2. Should a placeholder appear at all? Not before `delay` ms.
//      Most of these land in 20-60ms and a spinner that flashes and
//      vanishes reads as a glitch, so the fast path never paints one.
//   3. If one did appear, how long must it stay? At least `hold` ms
//      from when it appeared. Otherwise a fetch resolving just after
//      the placeholder went up produces exactly the flicker the delay
//      was there to avoid.
//   4. Is this response still wanted? Open A, then B before A returns,
//      and A's answer must not paint into B's surface.
//
// The timer is injected so the benchmarks can drive it. Nothing here
// touches the DOM or the database.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // The two numbers, stated once. 40ms is under the threshold at which
  // a wait reads as a wait; 150ms is long enough that a placeholder
  // registers as intentional rather than as a flash.
  var DELAY = 40;
  var HOLD = 150;

  // opts.keys    property names the load fills in; presence means loaded
  // opts.load    (item) -> Promise of an object to merge onto the item
  // opts.paint   (item, state) -> void, state is "ready" | "waiting" | "failed"
  // opts.timer   optional {set, clear, now} - injected by the benchmarks
  App.lazyDetail = function (opts) {
    var keys = opts.keys || [];
    var timer = opts.timer || {
      set: function (fn, ms) { return setTimeout(fn, ms); },
      clear: function (id) { clearTimeout(id); },
      now: function () { return Date.now(); },
    };
    // Monotonic, so a response can be checked against the open that is
    // current rather than against the item it was asked for - reopening
    // the SAME item after a slow response must also discard it.
    var token = 0;

    function loaded(item) {
      return keys.every(function (k) {
        return Object.prototype.hasOwnProperty.call(item, k);
      });
    }

    function open(item) {
      var mine = ++token;
      opts.paint(item, "ready");
      if (loaded(item)) return Promise.resolve(item);

      var shownAt = 0;
      var placeholder = timer.set(function () {
        if (mine !== token) return;
        shownAt = timer.now();
        opts.paint(item, "waiting");
      }, DELAY);

      // A settled response is written onto the item whatever happened
      // to the surface, so a reopen finds it cached; only the PAINT is
      // conditional on the open still being current.
      function settle(state, extra) {
        timer.clear(placeholder);
        if (extra) {
          Object.keys(extra).forEach(function (k) { item[k] = extra[k]; });
        }
        if (mine !== token) return item;
        var wait = shownAt ? Math.max(0, HOLD - (timer.now() - shownAt)) : 0;
        if (!wait) { opts.paint(item, state); return item; }
        return new Promise(function (resolve) {
          timer.set(function () {
            if (mine === token) opts.paint(item, state);
            resolve(item);
          }, wait);
        });
      }

      return opts.load(item).then(function (extra) {
        return settle("ready", extra || {});
      }, function () {
        // A failed detail fetch must not blank a drawer that is already
        // rendered and correct, so nothing is merged and the surface is
        // told to show its own inline message.
        return settle("failed", null);
      });
    }

    open.DELAY = DELAY;
    open.HOLD = HOLD;
    open.isLoaded = loaded;
    return open;
  };
})();
