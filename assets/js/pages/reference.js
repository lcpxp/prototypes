// ------------------------------------------------------------------
// reference.js - The reference viewer ("swagger") for modules/reference/.
// Loads data and wires events; all HTML building lives in
// reference-render.js (App.refRender) and reference-topics.js
// (App.refTopics).
//
// Reads from four Supabase tables:
//   api_specs      one row per spec, plus environments/auth/contact
//   api_tags       per-spec tag catalogue: descriptions and order
//   api_topics     narrative sections rendered above the endpoints
//   api_endpoints  one row per endpoint, linked by spec_id
//
// Endpoints load in two phases so large specs stay fast: a lean
// list (paths, summaries, badges) renders the whole page, then the
// heavy columns (params, examples, responses) are fetched per
// endpoint on first expand - or in one batch for "Expand all".
// Specs with no endpoint rows fall back to an OpenAPI 3 document in
// api_specs.spec, fetched only when needed.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var LEAN_COLUMNS = "id, method, path, tag, summary, description, " +
    "deprecated, auth_required, badges, sort_order";
  var DETAIL_COLUMNS = "id, request_headers, params, request_example, " +
    "response_example, responses, notes";

  var picker, sidebar, content, meta, overview, search;
  var current = { endpoints: null, tags: [], topics: [], servers: [] };

  function context() {
    return { servers: current.servers };
  }

  function render(endpoints, term) {
    var R = App.refRender;
    var sideHtml = "";
    var mainHtml = "";

    if (!term && current.topics.length > 0) {
      sideHtml += '<div class="group"><span class="eyebrow">Guides</span><ul>';
      current.topics.forEach(function (topic) {
        sideHtml += '<li><a href="#topic-' + App.escape(topic.id) + '">' +
          "<span>" + App.escape(topic.title) + "</span></a></li>";
        mainHtml += App.refTopics.topicBlock(topic);
      });
      sideHtml += "</ul></div>";
    }

    if (!endpoints || endpoints.length === 0) {
      sidebar.innerHTML = sideHtml;
      content.innerHTML = mainHtml +
        (current.endpoints && current.endpoints.length
          ? '<p class="notice">No endpoints match the filter.</p>'
          : '<p class="notice">This spec has no endpoints yet. Add rows to ' +
            "the api_endpoints table, or store an OpenAPI 3 document in the " +
            "spec column of api_specs.</p>");
      return;
    }

    var grouped = R.groupByTag(endpoints, current.tags);
    grouped.order.forEach(function (tag) {
      sideHtml +=
        '<div class="group"><span class="eyebrow">' + App.escape(tag) +
        "</span><ul>";
      mainHtml +=
        '<h2 class="eyebrow" style="margin: var(--s-5) 0 var(--s-3)">' +
        App.escape(tag) + "</h2>";
      if (grouped.descriptions[tag]) {
        mainHtml += '<p class="tag-description">' +
          App.escape(grouped.descriptions[tag]) + "</p>";
      }
      grouped.groups[tag].forEach(function (ep) {
        sideHtml +=
          '<li><a href="#ep-' + App.escape(ep.id) + '">' +
          App.methodBadge(ep.method) +
          "<span>" + App.escape(ep.path) + "</span></a></li>";
        mainHtml += R.endpointBlock(ep, context());
      });
      sideHtml += "</ul></div>";
    });

    sidebar.innerHTML = sideHtml;
    content.innerHTML = mainHtml;
  }

  // Fetch the heavy columns for the given lean endpoints (one batch,
  // one round trip) and fill any rendered bodies.
  async function hydrate(eps) {
    var pending = eps.filter(function (ep) { return ep._lean && !ep._loading; });
    if (pending.length === 0) return;
    pending.forEach(function (ep) { ep._loading = true; });

    var result = await App.db
      .from(App.registry.tables.apiEndpoints)
      .select(DETAIL_COLUMNS)
      .in("id", pending.map(function (ep) { return ep.id; }));

    pending.forEach(function (ep) { ep._loading = false; });
    if (result.error) return;

    result.data.forEach(function (row) {
      var ep = pending.find(function (p) { return p.id === row.id; });
      if (!ep) return;
      Object.assign(ep, row);
      delete ep._lean;
      var element = document.getElementById("ep-" + ep.id);
      if (element) {
        element.querySelector(".endpoint-body").innerHTML =
          App.refRender.endpointBody(ep, context());
      }
    });
  }

  function applyFilter() {
    var term = search.value.trim();
    render((current.endpoints || []).filter(function (ep) {
      return App.refRender.matches(ep, term);
    }), term);
  }

  async function setAllOpen(open) {
    if (open) await hydrate(current.endpoints || []);
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
    current.servers = spec.servers || [];

    var results = await Promise.all([
      App.db.from(App.registry.tables.apiEndpoints)
        .select(LEAN_COLUMNS)
        .eq("spec_id", specId)
        .order("tag", { ascending: true })
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.apiTags)
        .select("name, description, sort_order")
        .eq("spec_id", specId)
        .order("sort_order", { ascending: true }),
      App.db.from(App.registry.tables.apiTopics)
        .select("id, title, intro, blocks, sort_order")
        .eq("spec_id", specId)
        .order("sort_order", { ascending: true }),
    ]);

    if (results[0].error) {
      content.innerHTML =
        '<p class="notice error">Could not load endpoints: ' +
        App.escape(results[0].error.message) + "</p>";
      return;
    }
    current.tags = results[1].error ? [] : results[1].data;
    current.topics = results[2].error ? [] : results[2].data;

    var endpoints = results[0].data;
    if (endpoints && endpoints.length > 0) {
      endpoints.forEach(function (ep) { ep._lean = true; });
    } else {
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
    render(current.endpoints, "");
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

  function wireContent() {
    // Copy buttons and lazy detail loads are delegated, so bodies
    // injected after hydration need no re-wiring.
    content.addEventListener("click", function (event) {
      var button = event.target.closest(".codeblock .copy");
      if (button) {
        App.copyText(button.parentElement.querySelector("code").textContent, button);
      }
    });
    content.addEventListener("toggle", function (event) {
      var element = event.target;
      if (!element.classList || !element.classList.contains("endpoint")) return;
      if (!element.open || element.id.indexOf("ep-") !== 0) return;
      var ep = (current.endpoints || []).find(function (e) {
        return "ep-" + e.id === element.id;
      });
      if (ep && ep._lean) hydrate([ep]);
    }, true);
    sidebar.addEventListener("click", function (event) {
      var link = event.target.closest("a");
      if (!link) return;
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (target) target.open = true;
    });
  }

  // Honour a #ep-<id> deep link once the initial spec has rendered:
  // open that endpoint and scroll to it. Endpoints render with
  // id="ep-<id>"; other fragments the browser resolves natively.
  function openHashTarget() {
    var hash = window.location.hash || "";
    if (hash.indexOf("#ep-") !== 0) return;
    var element = document.getElementById(hash.slice(1));
    if (!element) return;
    if (element.tagName === "DETAILS") element.open = true;
    var ep = (current.endpoints || []).find(function (e) {
      return "ep-" + e.id === element.id;
    });
    if (ep && ep._lean) hydrate([ep]);
    element.scrollIntoView({ block: "start" });
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
    wireContent();

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

    await loadSpec(initial, specs);
    openHashTarget();
  });
})();
