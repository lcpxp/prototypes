// ------------------------------------------------------------------
// reference.js - The reference viewer ("swagger") for modules/reference/.
// Loads data and wires events; all HTML building lives in
// reference-render.js (App.refRender).
//
// Reads from two Supabase tables:
//   api_specs      one row per spec, plus environments/auth/contact
//   api_endpoints  one row per endpoint, linked by spec_id
//
// Endpoint rows are the primary source. If a spec has no endpoint
// rows but its spec column holds an OpenAPI 3 document, the paths in
// that document are rendered instead. The heavy spec jsonb is only
// fetched when that fallback is needed.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var picker, sidebar, content, meta, overview, search;
  var current = { endpoints: null };

  function render(endpoints) {
    var R = App.refRender;
    if (!endpoints || endpoints.length === 0) {
      sidebar.innerHTML = "";
      content.innerHTML = current.endpoints && current.endpoints.length
        ? '<p class="notice">No endpoints match the filter.</p>'
        : '<p class="notice">This spec has no endpoints yet. Add rows to ' +
          "the api_endpoints table, or store an OpenAPI 3 document in the " +
          "spec column of api_specs.</p>";
      return;
    }

    var grouped = R.groupByTag(endpoints);
    var sideHtml = "";
    var mainHtml = "";
    grouped.order.forEach(function (tag) {
      sideHtml +=
        '<div class="group"><span class="eyebrow">' + App.escape(tag) +
        "</span><ul>";
      mainHtml +=
        '<h2 class="eyebrow" style="margin: var(--s-5) 0 var(--s-3)">' +
        App.escape(tag) + "</h2>";
      grouped.groups[tag].forEach(function (ep) {
        sideHtml +=
          '<li><a href="#ep-' + App.escape(ep.id) + '">' +
          App.methodBadge(ep.method) +
          "<span>" + App.escape(ep.path) + "</span></a></li>";
        mainHtml += R.endpointBlock(ep);
      });
      sideHtml += "</ul></div>";
    });

    sidebar.innerHTML = sideHtml;
    content.innerHTML = mainHtml;

    content.querySelectorAll(".codeblock .copy").forEach(function (button) {
      button.addEventListener("click", function () {
        App.copyText(button.parentElement.querySelector("code").textContent, button);
      });
    });
    sidebar.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        var target = document.getElementById(link.getAttribute("href").slice(1));
        if (target) target.open = true;
      });
    });
  }

  function applyFilter() {
    var term = search.value.trim();
    render((current.endpoints || []).filter(function (ep) {
      return App.refRender.matches(ep, term);
    }));
  }

  function setAllOpen(open) {
    content.querySelectorAll("details.endpoint").forEach(function (d) {
      d.open = open;
    });
  }

  async function loadSpec(specId, specs) {
    var spec = specs.find(function (s) { return s.id === specId; });
    if (!spec) return;

    var family = (App.registry.specFamilies || []).find(function (f) {
      return f.key === (spec.family || "other");
    });
    meta.innerHTML =
      App.statusBadge(spec.status) +
      (family ? ' <span class="badge">' + App.escape(family.label) + "</span>" : "") +
      ' <span class="card-meta">' +
      App.escape(spec.description || "") + "</span>";
    overview.innerHTML = App.refRender.specOverview(spec);

    var result = await App.db
      .from(App.registry.tables.apiEndpoints)
      .select("*")
      .eq("spec_id", specId)
      .order("tag", { ascending: true })
      .order("sort_order", { ascending: true });

    if (result.error) {
      content.innerHTML =
        '<p class="notice error">Could not load endpoints: ' +
        App.escape(result.error.message) + "</p>";
      return;
    }

    var endpoints = result.data;
    if (!endpoints || endpoints.length === 0) {
      // Fallback to the spec's raw OpenAPI document, fetched on
      // demand the first time this spec needs it.
      if (spec.spec === undefined) {
        var docResult = await App.db
          .from(App.registry.tables.apiSpecs)
          .select("spec")
          .eq("id", spec.id)
          .single();
        spec.spec = docResult.error ? null : docResult.data.spec;
      }
      if (spec.spec) endpoints = App.refRender.endpointsFromOpenApi(spec.spec);
    }
    current.endpoints = endpoints || [];
    search.value = "";
    render(current.endpoints);
  }

  function fillPicker(specs) {
    // One optgroup per spec family, in registry order, so the picker
    // reads as distinct reference sites (Launchpad, Unity, ...).
    var families = App.registry.specFamilies || [];
    var byFamily = {};
    specs.forEach(function (spec) {
      var key = spec.family || "other";
      if (!byFamily[key]) byFamily[key] = [];
      byFamily[key].push(spec);
    });
    var familyKeys = families.map(function (f) { return f.key; });
    Object.keys(byFamily).forEach(function (key) {
      if (familyKeys.indexOf(key) === -1) familyKeys.push(key);
    });
    familyKeys.forEach(function (key) {
      if (!byFamily[key]) return;
      var group = document.createElement("optgroup");
      var family = families.find(function (f) { return f.key === key; });
      group.label = family ? family.label : key;
      byFamily[key].forEach(function (spec) {
        var option = document.createElement("option");
        option.value = spec.id;
        option.textContent = spec.title + " (" + spec.version + ")";
        group.appendChild(option);
      });
      picker.appendChild(group);
    });
  }

  App.onAuthed(async function () {
    picker = document.getElementById("spec-picker");
    sidebar = document.getElementById("ref-sidebar");
    content = document.getElementById("ref-content");
    meta = document.getElementById("spec-meta");
    overview = document.getElementById("spec-overview");
    search = document.getElementById("ref-search");

    var result = await App.db
      .from(App.registry.tables.apiSpecs)
      .select("id, title, version, status, family, description, servers, auth, contact")
      .order("title", { ascending: true });

    if (result.error) {
      content.innerHTML =
        '<p class="notice error">Could not load specs: ' +
        App.escape(result.error.message) + "</p>";
      return;
    }

    var specs = result.data || [];
    if (specs.length === 0) {
      content.innerHTML =
        '<p class="notice">No specs found. Insert a row into the ' +
        "api_specs table in Supabase to begin. supabase/seed.sql contains " +
        "a worked sample.</p>";
      return;
    }

    fillPicker(specs);

    var requested = new URLSearchParams(window.location.search).get("spec");
    var initial = specs.some(function (s) { return s.id === requested; })
      ? requested
      : specs[0].id;
    picker.value = initial;

    picker.addEventListener("change", function () {
      loadSpec(picker.value, specs);
    });
    search.addEventListener("input", applyFilter);
    document.getElementById("ref-expand")
      .addEventListener("click", function () { setAllOpen(true); });
    document.getElementById("ref-collapse")
      .addEventListener("click", function () { setAllOpen(false); });

    loadSpec(initial, specs);
  });
})();
