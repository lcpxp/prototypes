// ------------------------------------------------------------------
// roadmap/prefs.js - The roadmap board's remembered view state
// (App.roadmapPrefs): which level and layout, and the eight view-only
// preferences that are NOT part of the shareable hash.
//
// Split out of roadmap.js, which held ten storage keys and eighteen
// hand-rolled try/catch blocks around them - one per read and write,
// each subtly different in what it returned when storage was
// unavailable. They all go through App.store (core/ui.js) now, so the
// guard is written once and every fallback is stated here beside the
// key it belongs to.
//
// What belongs here: a value the board remembers between visits. What
// does not: the level and layout SELECTION, which lives in the URL hash
// so a board can be linked; these keys are only the fallback for a
// visit with no hash.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var KEYS = {
    level: "roadmap-level",
    layout: "roadmap-layout",
    delivered: "roadmap-delivered",
    expanded: "roadmap-expanded",
    wide: "roadmap-wide",
    department: "roadmap-department",
    custom: "roadmap-custom",
    unpicked: "roadmap-unpicked",
    hideFixes: "roadmap-hidefixes",
    hiddenBands: "roadmap-hidden-bands",
  };

  // A stored choice is honoured only if it is still one of the offered
  // keys, so a level or layout that is retired cannot strand a visitor
  // on a view that no longer exists.
  function readChoice(key, options, fallback) {
    var value = App.store.get(KEYS[key]);
    var known = (options || []).some(function (o) { return o.key === value; });
    return known ? value : fallback;
  }

  function readFlag(key, onValue, fallbackOn) {
    var value = App.store.get(KEYS[key]);
    if (value === null) return !!fallbackOn;
    return value === onValue;
  }

  App.roadmapPrefs = {
    KEYS: KEYS,

    readLevel: function (options, fallback) { return readChoice("level", options, fallback); },
    readLayout: function (options, fallback) { return readChoice("layout", options, fallback); },
    writeChoice: function (storeKey, value) { App.store.set(storeKey, value); },

    // Delivered work shows by default: hiding it is the deliberate act,
    // so an unset key means shown.
    readDelivered: function () { return App.store.get(KEYS.delivered) !== "hidden"; },
    writeDelivered: function (shown) {
      App.store.set(KEYS.delivered, shown ? "shown" : "hidden");
    },

    // Compact is the default; Detailed expands the Executive rollup.
    readExpanded: function () { return readFlag("expanded", "expanded", false); },
    writeExpanded: function (on) { App.store.set(KEYS.expanded, on ? "expanded" : "compact"); },

    // Wide widens the Timeline grid so the board scrolls sideways
    // rather than compressing every column to fit.
    readWide: function () { return readFlag("wide", "on", false); },
    writeWide: function (on) { App.store.set(KEYS.wide, on ? "on" : "off"); },

    // "" means all departments. An unknown stored key falls back to all,
    // so a retired department never sticks.
    readDepartment: function () {
      var value = App.store.get(KEYS.department, "") || "";
      var known = (App.registry.departments || []).some(function (d) { return d.key === value; });
      return known ? value : "";
    },
    writeDepartment: function (key) { App.store.set(KEYS.department, key); },

    // Custom view turns on the per-row picker; unpicked holds its
    // deselections as an id -> true map.
    readCustom: function () { return readFlag("custom", "on", false); },
    writeCustom: function (on) { App.store.set(KEYS.custom, on ? "on" : "off"); },
    readUnpicked: function () { return App.store.getJSON(KEYS.unpicked, {}) || {}; },
    writeUnpicked: function (map) { App.store.setJSON(KEYS.unpicked, map); },

    readHideFixes: function () { return readFlag("hideFixes", "on", false); },
    writeHideFixes: function (on) { App.store.set(KEYS.hideFixes, on ? "on" : "off"); },

    // Collapsed board columns, as a band key -> true map. Only the band
    // keys the caller offers are honoured, so a stale or hand-edited
    // value can never hide a column that is not collapsible.
    readHiddenBands: function (hideable) {
      var raw = App.store.getJSON(KEYS.hiddenBands, {}) || {};
      var out = {};
      (hideable || []).forEach(function (k) { if (raw[k]) out[k] = true; });
      return out;
    },
    writeHiddenBands: function (map) { App.store.setJSON(KEYS.hiddenBands, map); },
  };
})();
