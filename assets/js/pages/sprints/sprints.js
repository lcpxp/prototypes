// ------------------------------------------------------------------
// sprints/sprints.js - The Sprint Roadmap page shell.
//
// Its own page rather than a tab on the roadmap, because it answers a
// different question for a different audience: the roadmap says WHAT is
// being done and in what order, this says WHEN, across sprints. The two
// stay intrinsically linked - every bar here opens that item's drawer on
// the roadmap, and the roadmap links back - so there is one detail
// surface rather than a second copy to keep in step.
//
// The rendering is App.roadmapView.sprintStreams / sprintItems, the same
// builders the roadmap used, over the same .rmv-tl coordinate model the
// horizon board draws with. Only the column width and the colour are
// this page's own (assets/css/sprints.css).
//
// Read-only, like every board here. Allocation is a database write;
// docs/SPRINT-DELIVERY.md carries the rules.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var VIEWS = [
    { key: "plan", label: "Workstreams" },
    { key: "delivery", label: "Work items" },
  ];

  var data = { sprintItems: [], sprintStreams: [], metrics: [],
    sprintCodes: {}, currentCode: null };
  var current = "plan";
  var wide = false;

  function known(key) { return VIEWS.some(function (v) { return v.key === key; }); }

  function readState() {
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (known(hash)) return hash;
    var stored = App.store && App.store.get("sprints.view");
    return known(stored) ? stored : "plan";
  }

  // App.linkHref is the one home for "where does a work item live"
  // (registry.js), so this page and the drawer's own links cannot drift
  // apart on it. It takes the entity TYPE, not a module - passing a
  // module key here built no URL at all and every bar led to /undefined.
  function itemHref(id) {
    return (App.linkHref && App.linkHref("work_item", id, App.root)) || "";
  }

  function tabs() {
    return VIEWS.map(function (v) {
      var on = v.key === current;
      return '<button type="button" class="rmv-switch-btn" data-key="' +
        App.escape(v.key) + '" role="tab" aria-selected="' + on + '"' +
        (on ? ' aria-current="true"' : "") + ">" + App.escape(v.label) + "</button>";
    }).join("");
  }

  function render(host) {
    var opts = { wide: wide };
    host.innerHTML = App.roadmapView.sprintLegend() +
      (current === "delivery"
        ? App.roadmapView.sprintItems(data, opts)
        : App.roadmapView.sprintStreams(data, opts));
  }

  function setView(key, nav, host) {
    if (!known(key) || key === current) return;
    current = key;
    if (App.store) App.store.set("sprints.view", key);
    if (window.location.hash.replace(/^#/, "") !== key) window.location.hash = key;
    nav.innerHTML = tabs();
    wireTabs(nav, host);
    render(host);
  }

  function wireTabs(nav, host) {
    nav.querySelectorAll("button[data-key]").forEach(function (b) {
      b.addEventListener("click", function () {
        setView(b.getAttribute("data-key"), nav, host);
      });
    });
  }

  App.onAuthed(async function () {
    var host = document.getElementById("sprints-content");
    var nav = document.getElementById("sprints-switch");
    var stateLine = document.getElementById("sprints-state");
    var wideBtn = document.getElementById("sprints-wide");
    if (!host || !nav) return;

    current = readState();
    nav.innerHTML = tabs();
    wireTabs(nav, host);

    if (wideBtn) {
      wide = !!(App.store && App.store.get("sprints.wide") === "1");
      wideBtn.setAttribute("aria-pressed", String(wide));
      wideBtn.addEventListener("click", function () {
        wide = !wide;
        if (App.store) App.store.set("sprints.wide", wide ? "1" : "0");
        wideBtn.setAttribute("aria-pressed", String(wide));
        render(host);
      });
    }

    // A bar opens the roadmap drawer for that item. The bars carry
    // data-item-id rather than an href, so the click is delegated here.
    host.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("[data-item-id]");
      if (!el) return;
      // No address is better than a wrong one: a bar whose row cannot be
      // resolved stays put rather than navigating somewhere that is not
      // there.
      var href = itemHref(el.getAttribute("data-item-id"));
      if (href) window.location.href = href;
    });

    var results = await Promise.all([
      App.db.from(App.registry.tables.sprintPlanItems).select("*")
        .order("slot", { ascending: true }),
      App.db.from(App.registry.tables.sprintPlanStreams).select("*"),
      App.db.from(App.registry.tables.workItemMetricRollup).select("*"),
      App.db.from(App.registry.tables.sprints).select("idx, code")
        .order("idx", { ascending: true }),
    ]);

    if (results[0].error) {
      App.notice(host, "error",
        "Could not load the sprint plan: " + results[0].error.message);
      return;
    }
    data.sprintItems = results[0].data || [];
    data.sprintStreams = results[1].error ? [] : results[1].data || [];
    data.metrics = results[2].error ? [] : results[2].data || [];

    // Resolve the anchor from any allocated row already carrying a real
    // code, then label every column from it. Unanchored, this stays
    // empty and the board reads Sprint +N, which is the truth.
    var sprints = results[3].error ? [] : results[3].data || [];
    var byCode = {};
    sprints.forEach(function (s) { byCode[s.code] = s.idx; });
    var anchorIdx = null;
    data.sprintItems.forEach(function (r) {
      if (anchorIdx === null && r.start_code && byCode[r.start_code] != null) {
        anchorIdx = byCode[r.start_code] - (Number(r.effective_slot) || 0);
      }
    });
    if (anchorIdx !== null) {
      sprints.forEach(function (s) {
        if (s.idx >= anchorIdx) data.sprintCodes[s.idx - anchorIdx] = s.code;
      });
    }

    if (stateLine) {
      var n = data.sprintItems.length;
      var streams = data.sprintStreams.length;
      stateLine.textContent = n === 0
        ? "Nothing is allocated yet."
        : n + (n === 1 ? " item" : " items") + " across " + streams +
          (streams === 1 ? " workstream" : " workstreams") +
          (anchorIdx !== null
            ? ", anchored to real sprints."
            : ". Not yet anchored to a start date.");
    }

    render(host);
    window.addEventListener("hashchange", function () {
      var next = readState();
      if (next !== current) setView(next, nav, host);
    });
  });
})();
