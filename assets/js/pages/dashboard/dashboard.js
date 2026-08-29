// ------------------------------------------------------------------
// dashboard/dashboard.js - Fetches and orchestrates the landing page
// (docs/plan/50-DASHBOARD.md). The builders are pure and live in
// dashboard-strip.js and dashboard-cards.js; this file does the
// requests, the grant gating and the wiring.
//
// The page answers five questions without a click: what is being
// worked on now and next, what reference material exists and how
// complete it is, whether a review is running, what we know and where
// the holes are, and what each tool in the nav is for.
//
// Two round trips, not one per module: dashboard_summary() for every
// figure (supabase/schema/90_dashboard.sql), and the shared
// App.tools.load() the nav already makes. Coverage is a static asset.
// ------------------------------------------------------------------

(function () {
  "use strict";

  // Every section is gated by the viewer's grants, and a section with
  // no grant is left out rather than drawn empty. `keys` is any-of:
  // work_items is shared by the roadmap and backlog grants.
  var SECTIONS = [
    { id: "ds-now-next", keys: ["roadmap", "backlog"] },
    { id: "ds-reference", keys: ["reference"] },
    { id: "ds-reviews", keys: ["app-review", "portal-review"] },
    { id: "ds-knowledge", keys: ["platform"] },
    { id: "ds-tools", keys: null },
    { id: "ds-modules", keys: null },
    { id: "ds-activity", keys: null },
  ];

  function el(id) { return document.getElementById(id); }

  function canReach(keys) {
    if (!keys || !App.canAccess) return true;
    return keys.some(function (key) { return App.canAccess(key); });
  }

  function hide(id) {
    var section = el(id);
    if (section) section.hidden = true;
  }

  function fill(id, html) {
    var host = el(id + "-body");
    if (!host) return;
    if (!html) { hide(id); return; }
    host.innerHTML = html;
  }

  function moduleByKey(key) {
    return App.registry.modules.find(function (m) { return m.key === key; });
  }

  function hrefFor(key, row) {
    var mod = moduleByKey(key);
    return mod ? App.itemHref(mod, row) : "#";
  }

  // --- sections ----------------------------------------------------

  function renderNowNext(summary) {
    var head = el("ds-now-next-delivery");
    var line = App.dashboardStrip.deliveryLine(summary.delivery);
    if (head) head.innerHTML = line;
    var mod = moduleByKey("roadmap");
    fill("ds-now-next", App.dashboardStrip.html(summary.workstreams, {
      href: function (row) { return hrefFor("roadmap", row); },
      moreHref: mod ? App.moduleHref(mod) + "index.html?band=next" : "#",
    }));
  }

  function renderReference(summary, coverage) {
    var mod = moduleByKey("reference");
    fill("ds-reference", App.dashboardCards.specs(summary.specs, {
      coverage: coverage,
      href: function (spec) {
        return mod ? App.moduleHref(mod) + "index.html?spec=" +
          encodeURIComponent(spec.id) : "#";
      },
    }));
  }

  // A wave links into whichever review it belongs to. Both modules put
  // a wave on wave.html, so the only question is which module.
  function renderReviews(summary) {
    var waves = (summary.reviews || []).filter(function (wave) {
      return canReach([wave.kind === "application" ? "app-review" : "portal-review"]);
    });
    fill("ds-reviews", App.dashboardCards.reviews(waves, {
      href: function (wave) {
        var mod = moduleByKey(wave.kind === "application" ? "app-review" : "portal-review");
        return mod ? App.moduleHref(mod) + "wave.html?wave=" +
          encodeURIComponent(wave.id) : "#";
      },
    }));
  }

  function renderKnowledge(summary) {
    var mod = moduleByKey("platform");
    fill("ds-knowledge", App.dashboardCards.knowledge(summary.knowledge, {
      href: mod ? App.moduleHref(mod) : "#",
    }));
  }

  function renderTools() {
    App.tools.load().then(function (rows) {
      fill("ds-tools", App.dashboardCards.tools(rows));
    });
  }

  // --- modules grid ------------------------------------------------

  function cardHtml(mod, counts) {
    var count = counts && mod.statTable ? counts[mod.statTable] : null;
    var html =
      '<a class="card" href="' + App.escape(App.moduleHref(mod)) + '">' +
      '<span class="eyebrow">' + App.escape(mod.title) + "</span>";
    if (mod.statTable) {
      html += '<p class="stat">' +
        (count == null ? "-" : App.escape(count > 1000 ? "1000+" : count)) + "</p>" +
        '<p class="card-meta">' + App.escape(mod.statLabel) + "</p>";
    } else {
      html += "<h3>" + App.escape(mod.heading || mod.title) + "</h3>" +
        '<p class="card-meta">' + App.escape(mod.description) + "</p>";
    }
    return html + "</a>";
  }

  function renderModules(summary) {
    var modules = App.registry.modules.filter(function (mod) {
      return !App.canAccess || App.canAccess(mod.key);
    });
    fill("ds-modules", '<div class="card-grid dashboard-cards">' +
      modules.map(function (mod) { return cardHtml(mod, summary.counts); }).join("") +
      "</div>");
  }

  // --- recent activity ---------------------------------------------

  // Each source names the table it reads, its display column, the
  // column that says what KIND of change it was, and the module its
  // rows belong to. Every link goes through App.itemHref, so a result
  // lands on the row rather than on a module index.
  function activitySources() {
    var t = App.registry.tables;
    return [
      { keys: ["roadmap", "backlog"], mod: "roadmap", table: t.workItems,
        name: "title", state: "status", type: "Work item" },
      { keys: ["backlog"], mod: "backlog", table: t.workNotes,
        name: "body", state: "kind", type: "Note" },
      { keys: ["prototypes"], mod: "prototypes", table: t.prototypes,
        name: "title", state: "status", type: "Prototype" },
      { keys: ["reference"], mod: "reference", table: t.apiSpecs,
        name: "title", state: "status", type: "API spec" },
      { keys: ["platform"], mod: "platform", table: t.productCapabilities,
        name: "title", state: "maturity", type: "Capability" },
      { keys: ["integrations"], mod: "integrations", table: t.integrations,
        name: "name", state: "status", type: "Integration" },
    ];
  }

  async function loadActivity() {
    var host = el("ds-activity-body");
    if (!host) return;

    var sources = activitySources().filter(function (s) { return canReach(s.keys); });
    var results = await Promise.all(sources.map(function (s) {
      return App.db.from(s.table)
        .select("id, " + s.name + ", " + s.state + ", updated_at")
        .order("updated_at", { ascending: false })
        .limit(8);
    }));

    var rows = [];
    results.forEach(function (res, i) {
      if (res.error || !res.data) return;
      var s = sources[i];
      res.data.forEach(function (r) {
        rows.push({
          title: String(r[s.name] || "").slice(0, 120),
          type: s.type, state: r[s.state], updated_at: r.updated_at,
          href: hrefFor(s.mod, r),
        });
      });
    });
    rows.sort(function (a, b) {
      return String(b.updated_at || "").localeCompare(String(a.updated_at || ""));
    });
    rows = rows.slice(0, 8);

    if (!rows.length) {
      host.innerHTML = '<p class="notice">No recent activity yet. Content changes ' +
        "across modules will appear here as they happen.</p>";
      return;
    }

    host.innerHTML = '<ul class="activity">' + rows.map(function (r) {
      var when = r.updated_at ? new Date(r.updated_at).toLocaleDateString() : "";
      var meta = [r.type, r.state, when].filter(Boolean).map(App.escape).join(" &middot; ");
      return '<li class="activity-item"><a href="' + App.escape(r.href) + '">' +
        App.escape(r.title) + "</a>" +
        '<span class="activity-meta">' + meta + "</span></li>";
    }).join("") + "</ul>";
  }

  // --- boot --------------------------------------------------------

  // The coverage artefact is committed alongside the code, so this is
  // a static read with no credentials. A miss is not an error: the
  // spec cards simply carry no coverage line.
  async function loadCoverage() {
    try {
      var res = await fetch((App.root || ".") + "/supabase/reference-coverage.json");
      return res.ok ? await res.json() : null;
    } catch (e) {
      return null;
    }
  }

  // Explain a redirect from a module the user has no grant for.
  function showDeniedNotice() {
    var key = new URLSearchParams(window.location.search).get("denied");
    var host = el("page-notice");
    if (!key || !host) return;
    var mod = moduleByKey(key);
    App.notice(host, "error",
      "You do not have access to " + (mod ? mod.title : key) +
      ". Ask an admin to enable it for you on the users page.");
  }

  async function load() {
    SECTIONS.forEach(function (s) { if (!canReach(s.keys)) hide(s.id); });

    var results = await Promise.all([App.db.rpc("dashboard_summary"), loadCoverage()]);
    var rpc = results[0];
    if (rpc.error || !rpc.data) {
      App.notice(el("page-notice"), "error",
        "Could not load the dashboard: " + (rpc.error ? rpc.error.message : "no data") +
        ". The page below is what could still be read.");
      SECTIONS.forEach(function (s) { hide(s.id); });
      return;
    }
    var summary = rpc.data;

    if (canReach(["roadmap", "backlog"])) renderNowNext(summary);
    if (canReach(["reference"])) renderReference(summary, results[1]);
    if (canReach(["app-review", "portal-review"])) renderReviews(summary);
    if (canReach(["platform"])) renderKnowledge(summary);
    renderTools();
    renderModules(summary);
    loadActivity();
  }

  App.onAuthed(function () {
    showDeniedNotice();
    load();
  });
})();
