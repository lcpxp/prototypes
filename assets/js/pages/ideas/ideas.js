// ------------------------------------------------------------------
// ideas.js - modules/prototypes/ideas.html. Fetch and wiring; every
// builder is pure and lives in ideas-render.js.
//
// Reads only. An idea is captured, prioritised, planned and promoted
// in a Claude session (/prototype-idea); this page is where you read
// the list and decide what to say next.
// ------------------------------------------------------------------

(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  function prototypeHref(id, byId) {
    var mod = App.registry.modules.find(function (m) { return m.key === "prototypes"; });
    var row = byId[id];
    return mod ? App.itemHref(mod, row || { id: id }) : "#";
  }

  async function load() {
    var results = await Promise.all([
      // The board renders everything on the row (App.detail.facts), so
      // the fetch has no reason to be narrower than the table.
      App.db.from(App.registry.tables.futurePrototypes)
        .select("*")
        .order("priority", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.workAreas).select("id, title"),
      App.db.from(App.registry.tables.prototypes).select("id, title, path"),
    ]);

    var failed = results.find(function (r) { return r.error; });
    if (failed) {
      App.notice(el("page-notice"), "error",
        "Could not load prototype ideas: " + failed.error.message);
      return;
    }

    var rows = results[0].data || [];
    var areaTitle = {};
    (results[1].data || []).forEach(function (a) { areaTitle[a.id] = a.title; });
    var protoById = {};
    var prototypeTitle = {};
    (results[2].data || []).forEach(function (p) {
      protoById[p.id] = p;
      prototypeTitle[p.id] = p.title;
    });

    var ctx = {
      areaTitle: areaTitle,
      prototypeTitle: prototypeTitle,
      prototypeHref: function (id) { return prototypeHref(id, protoById); },
    };

    var open = rows.filter(function (r) {
      return ["promoted", "dropped"].indexOf(r.status || "idea") === -1;
    }).length;
    var count = el("idea-count");
    if (count) {
      count.textContent = open + (open === 1 ? " open idea" : " open ideas") +
        " of " + rows.length + " recorded";
    }

    el("idea-board").innerHTML = App.ideasView.boardHtml(rows, ctx);
    App.deepLinkScroll();
  }

  App.onAuthed(function () { load(); });
})();
