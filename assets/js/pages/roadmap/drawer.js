// ------------------------------------------------------------------
// roadmap/drawer.js - The item detail drawer surface for the roadmap
// home: open/close, the ?item=<id> deep-link URL sync, and in-drawer
// navigation (a related-item link or a nested step row swaps the drawer to
// that item). Split out of roadmap.js per the size budget; the board's own
// click/change handlers (band toggles, custom-view picks) stay in
// roadmap.js. The pure HTML builder is App.roadmapDetail.drawerHtml.
//
// App.roadmapDrawer(deps) wires the drawer and returns its open function.
// deps: lookup(id) -> item, getCtx() -> render context, download(item) ->
// trigger that item's JSON export.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  App.roadmapDrawer = function (deps) {
    var drawer = document.getElementById("roadmap-drawer");
    var scrim = document.getElementById("roadmap-scrim");
    var drawerBody = document.getElementById("rmd-body");
    var closeBtn = document.getElementById("rmd-close");
    var lastFocus = null;

    // Reflect the open item in the URL (?item=<id>) so a drawer is
    // shareable and deep-linkable, without disturbing the view-state
    // hash (#level/layout).
    function setItemParam(id) {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (id) url.searchParams.set("item", id);
      else url.searchParams.delete("item");
      window.history.replaceState(null, "", url.href);
    }

    // The heavy fields arrive when the drawer opens, not on page load.
    // App.lazyDetail owns the timing and the stale-response guard; this
    // only says what to paint. deps.load(item) does the fetch.
    var inFlight = Promise.resolve();
    var paint = App.lazyDetail({
      keys: deps.lazyKeys || [],
      load: deps.load || function () { return Promise.resolve({}); },
      paint: function (item, state) {
        if (!drawerBody) return;
        drawerBody.innerHTML = App.roadmapDetail.drawerHtml(item, deps.getCtx(), state);
        var itemExport = document.getElementById("rmd-export");
        // Rebound on every paint because the markup is replaced, and it
        // waits on the fetch: exporting a drawer opened a moment ago
        // must not write a file with the notes missing.
        if (itemExport) {
          itemExport.addEventListener("click", function () {
            inFlight.then(function () { deps.download(item); });
          });
        }
      },
    });

    function openDrawer(item) {
      if (!drawer || !drawerBody) return;
      inFlight = paint(item);
      lastFocus = document.activeElement;
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      document.body.classList.add("rmd-open");
      setItemParam(item.id);
      if (closeBtn) closeBtn.focus();
      return inFlight;
    }
    function closeDrawer() {
      if (drawer) drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      document.body.classList.remove("rmd-open");
      setItemParam(null);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    if (scrim) scrim.addEventListener("click", closeDrawer);
    // In-drawer navigation: a related-item link or a nested step row swaps
    // the drawer to that item rather than following its href.
    if (drawerBody) drawerBody.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("#rmd-export")) return;
      var link = e.target.closest ? e.target.closest("[data-item-id]") : null;
      if (!link) return;
      e.preventDefault();
      var it = deps.lookup(link.getAttribute("data-item-id"));
      if (it) openDrawer(it);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer && !drawer.hidden) closeDrawer();
    });

    return openDrawer;
  };
})();
