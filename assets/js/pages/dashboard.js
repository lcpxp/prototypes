// ------------------------------------------------------------------
// dashboard.js - Renders module cards, counts and recent activity
// for dashboard.html. Cards come from App.registry.modules so the
// dashboard and navigation can never disagree about what exists.
// ------------------------------------------------------------------

(function () {
  "use strict";

  // All card counts arrive in one dashboard_counts() call (see
  // supabase/schema/90_dashboard.sql) instead of one request per
  // module. Counts
  // are capped server-side at 1001 so they stay cheap at any scale.
  async function loadCounts(modules) {
    var result = await App.db.rpc("dashboard_counts");
    modules.forEach(function (mod) {
      if (!mod.statTable) return;
      var el = document.getElementById("stat-" + mod.key);
      if (!el) return;
      var count = result.data ? result.data[mod.statTable] : null;
      if (result.error || count == null) el.textContent = "-";
      else el.textContent = count > 1000 ? "1000+" : count;
    });
    renderRoadmapMeter(result.data && result.data.work_items_breakdown);
  }

  // A slim roadmap delivery meter from the dashboard_counts() breakdown,
  // so no extra query is needed. Hidden when there is no work to show.
  function renderRoadmapMeter(bd) {
    var host = document.getElementById("roadmap-meter");
    if (!host) return;
    if (!bd || !bd.total) { host.innerHTML = ""; return; }
    var delivered = bd.delivered || 0, total = bd.total || 0;
    var pct = total ? Math.round((delivered / total) * 100) : 0;
    host.innerHTML =
      '<div class="meter-head"><span class="eyebrow">Roadmap progress</span>' +
      '<span class="meter-figure">' + delivered + " of " + total + " delivered</span></div>" +
      '<div class="meter" role="img" aria-label="' + pct + ' percent delivered">' +
      '<span class="meter-fill" style="width:' + pct + '%"></span></div>' +
      '<p class="meter-legend">' + (bd.active || 0) + " active &middot; " +
      (bd.parked || 0) + " parked</p>";
  }

  function cardHtml(mod) {
    var html =
      '<a class="card" href="' + App.escape(App.moduleHref(mod)) + '">' +
      '<span class="eyebrow">' + App.escape(mod.title) + "</span>";
    if (mod.statTable) {
      html +=
        '<p class="stat" id="stat-' + App.escape(mod.key) + '">-</p>' +
        '<p class="card-meta">' + App.escape(mod.statLabel) + "</p>";
    } else {
      html +=
        "<h2>" + App.escape(mod.heading || mod.title) + "</h2>" +
        '<p class="card-meta">' + App.escape(mod.description) + "</p>";
    }
    return html + "</a>";
  }

  function visibleModules() {
    return App.registry.modules.filter(function (mod) {
      return !App.canAccess || App.canAccess(mod.key);
    });
  }

  function renderCards() {
    var host = document.getElementById("module-cards");
    if (!host) return;

    var modules = visibleModules();
    host.innerHTML = modules.map(cardHtml).join("");
    loadCounts(modules);
  }

  function moduleByKey(key) {
    return App.registry.modules.find(function (m) { return m.key === key; });
  }

  // Cross-module recent activity. Each source names the table it reads,
  // its display-name column, and how to link a row. work_items is shared
  // by the roadmap and backlog grants; the rest map one-to-one.
  function activitySources() {
    var t = App.registry.tables;
    return [
      { keys: ["roadmap", "backlog"], mod: "roadmap", table: t.workItems, name: "title", type: "Work item",
        link: function (m) { return App.moduleHref(m); } },
      { keys: ["prototypes"], mod: "prototypes", table: t.prototypes, name: "title", type: "Prototype",
        link: function (m) { return App.moduleHref(m); } },
      { keys: ["reference"], mod: "reference", table: t.apiSpecs, name: "title", type: "API spec",
        link: function (m, r) { return App.moduleHref(m) + "index.html?spec=" + r.id; } },
      { keys: ["platform"], mod: "platform", table: t.productCapabilities, name: "title", type: "Capability",
        link: function (m) { return App.moduleHref(m); } },
      { keys: ["integrations"], mod: "integrations", table: t.integrations, name: "name", type: "Integration",
        link: function (m) { return App.moduleHref(m); } },
    ];
  }

  function canReach(keys) {
    if (!App.canAccess) return true;
    return keys.some(function (k) { return App.canAccess(k); });
  }

  async function loadActivity() {
    var host = document.getElementById("recent-activity");
    if (!host) return;

    var sources = activitySources().filter(function (s) { return canReach(s.keys); });
    var results = await Promise.all(sources.map(function (s) {
      return App.db.from(s.table)
        .select("id, " + s.name + ", updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
    }));

    var rows = [];
    results.forEach(function (res, i) {
      if (res.error || !res.data) return;
      var s = sources[i], mod = moduleByKey(s.mod);
      res.data.forEach(function (r) {
        rows.push({ title: r[s.name], type: s.type, updated_at: r.updated_at,
          href: mod ? s.link(mod, r) : "#" });
      });
    });
    rows.sort(function (a, b) { return (b.updated_at || "").localeCompare(a.updated_at || ""); });
    rows = rows.slice(0, 8);

    if (!rows.length) {
      host.innerHTML = '<p class="notice">No recent activity yet. Content changes ' +
        "across modules will appear here as they happen.</p>";
      return;
    }

    host.innerHTML = '<ul class="activity">' + rows.map(function (r) {
      var when = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "";
      return '<li class="activity-item"><a href="' + App.escape(r.href) + '">' +
        App.escape(r.title) + "</a>" +
        '<span class="activity-meta">' + App.escape(r.type) +
        (when ? " &middot; " + App.escape(when) : "") + "</span></li>";
    }).join("") + "</ul>";
  }

  // Explain a redirect from a module the user has no grant for.
  function showDeniedNotice() {
    var key = new URLSearchParams(window.location.search).get("denied");
    var el = document.getElementById("page-notice");
    if (!key || !el) return;
    var mod = App.registry.modules.find(function (m) { return m.key === key; });
    App.notice(el, "error",
      "You do not have access to " + (mod ? mod.title : key) +
      ". Ask an admin to enable it for you on the users page.");
  }

  App.onAuthed(function () {
    showDeniedNotice();
    renderCards();
    loadActivity();
  });
})();
