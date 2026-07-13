// ------------------------------------------------------------------
// reference.js - The reference viewer ("swagger") for modules/reference/.
//
// Reads from two Supabase tables:
//   api_specs      one row per spec (title, version, status, spec jsonb)
//   api_endpoints  one row per endpoint, linked by spec_id
//
// Endpoint rows are the primary source. If a spec has no endpoint
// rows but its spec column holds an OpenAPI 3 document, the paths in
// that document are rendered instead, so whole specs can be pasted
// into a single JSONB column as a starting point.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var picker, sidebar, content, meta;

  function codeblock(value) {
    var text =
      typeof value === "string" ? value : JSON.stringify(value, null, 2);
    return (
      '<div class="codeblock">' +
      '<button class="button quiet copy" type="button">Copy</button>' +
      "<pre><code>" + App.escape(text) + "</code></pre>" +
      "</div>"
    );
  }

  function paramsTable(params) {
    if (!params || params.length === 0) return "";
    var html =
      '<h3>Parameters</h3><div class="table-wrap"><table><thead><tr>' +
      "<th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th>" +
      "</tr></thead><tbody>";
    params.forEach(function (p) {
      html +=
        "<tr>" +
        '<td class="mono">' + App.escape(p.name) + "</td>" +
        "<td>" + App.escape(p.in || "body") + "</td>" +
        '<td class="mono">' + App.escape(p.type || (p.schema && p.schema.type) || "") + "</td>" +
        "<td>" + (p.required ? "yes" : "no") + "</td>" +
        "<td>" + App.escape(p.description || "") + "</td>" +
        "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  function endpointBlock(ep) {
    var anchor = "ep-" + ep.id;
    var html = '<details class="endpoint" id="' + anchor + '">';
    html +=
      "<summary>" +
      App.methodBadge(ep.method) +
      '<span class="path">' + App.escape(ep.path) + "</span>" +
      '<span class="summary-text">' + App.escape(ep.summary || "") + "</span>" +
      "</summary>";
    html += '<div class="endpoint-body">';
    if (ep.description) {
      html += "<p>" + App.escape(ep.description) + "</p>";
    }
    html += paramsTable(ep.params);
    if (ep.request_example) {
      html += "<h3>Request example</h3>" + codeblock(ep.request_example);
    }
    if (ep.response_example) {
      html += "<h3>Response example</h3>" + codeblock(ep.response_example);
    }
    html += "</div></details>";
    return html;
  }

  function groupByTag(endpoints) {
    var groups = {};
    var order = [];
    endpoints.forEach(function (ep) {
      var tag = ep.tag || "General";
      if (!groups[tag]) {
        groups[tag] = [];
        order.push(tag);
      }
      groups[tag].push(ep);
    });
    return { groups: groups, order: order };
  }

  function render(endpoints) {
    if (!endpoints || endpoints.length === 0) {
      sidebar.innerHTML = "";
      content.innerHTML =
        '<p class="notice">This spec has no endpoints yet. Add rows to ' +
        "the api_endpoints table, or store an OpenAPI 3 document in the " +
        "spec column of api_specs.</p>";
      return;
    }

    var grouped = groupByTag(endpoints);
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
          '<li><a href="#ep-' + ep.id + '">' +
          App.methodBadge(ep.method) +
          "<span>" + App.escape(ep.path) + "</span></a></li>";
        mainHtml += endpointBlock(ep);
      });
      sideHtml += "</ul></div>";
    });

    sidebar.innerHTML = sideHtml;
    content.innerHTML = mainHtml;

    // Copy buttons and open-on-anchor behaviour.
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

  // Fallback: derive endpoint objects from an OpenAPI 3 document.
  function endpointsFromOpenApi(doc) {
    var endpoints = [];
    var paths = (doc && doc.paths) || {};
    var counter = 0;
    Object.keys(paths).forEach(function (path) {
      Object.keys(paths[path]).forEach(function (method) {
        var op = paths[path][method];
        if (!op || typeof op !== "object") return;
        counter += 1;
        var responses = op.responses || {};
        var firstResponse = responses["200"] || responses["201"] || null;
        endpoints.push({
          id: "oas-" + counter,
          method: method,
          path: path,
          tag: (op.tags && op.tags[0]) || "General",
          summary: op.summary || "",
          description: op.description || "",
          params: op.parameters || [],
          request_example: null,
          response_example: firstResponse,
        });
      });
    });
    return endpoints;
  }

  function familyOf(spec) {
    var key = spec.family || "other";
    return (App.registry.specFamilies || []).find(function (f) {
      return f.key === key;
    });
  }

  async function loadSpec(specId, specs) {
    var spec = specs.find(function (s) { return s.id === specId; });
    if (!spec) return;

    var family = familyOf(spec);
    meta.innerHTML =
      App.statusBadge(spec.status) +
      (family ? ' <span class="badge">' + App.escape(family.label) + "</span>" : "") +
      ' <span class="card-meta">' +
      App.escape(spec.description || "") + "</span>";

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
    if ((!endpoints || endpoints.length === 0) && spec.spec) {
      endpoints = endpointsFromOpenApi(spec.spec);
    }
    render(endpoints);
  }

  App.onAuthed(async function () {
    picker = document.getElementById("spec-picker");
    sidebar = document.getElementById("ref-sidebar");
    content = document.getElementById("ref-content");
    meta = document.getElementById("spec-meta");

    var result = await App.db
      .from(App.registry.tables.apiSpecs)
      .select("id, title, version, status, family, description, spec")
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

    var requested = new URLSearchParams(window.location.search).get("spec");
    var initial = specs.some(function (s) { return s.id === requested; })
      ? requested
      : specs[0].id;
    picker.value = initial;

    picker.addEventListener("change", function () {
      loadSpec(picker.value, specs);
    });

    loadSpec(initial, specs);
  });
})();
