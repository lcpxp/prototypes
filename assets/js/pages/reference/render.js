// ------------------------------------------------------------------
// reference-render.js - Pure HTML builders for the reference viewer.
// No DOM access: every function takes data and returns a string, so
// the rendering is benchmarked in tests/unit/reference/render.test.js.
// reference.js loads data and wires events; this file only renders.
//
// All content comes from Supabase (api_specs, api_endpoints). The
// optional jsonb shapes these builders understand are documented on
// the columns in supabase/schema/10_reference.sql; every field is
// optional so
// sparse rows render cleanly.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

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

  // Spec-level overview: environments, auth scheme and contact.
  // auth is a flat label/value object rendered verbatim, so new
  // facts are a database edit, never a code change.
  function specOverview(spec) {
    var html = "";
    var servers = spec.servers || [];
    if (servers.length > 0) {
      html += "<h3>Environments</h3><div class=\"table-wrap\"><table><thead><tr>" +
        "<th>Environment</th><th>Base URL</th><th>Notes</th>" +
        "</tr></thead><tbody>";
      servers.forEach(function (server) {
        html +=
          "<tr><td>" + App.escape(server.name || "") + "</td>" +
          '<td class="mono">' + App.escape(server.base_url || "") + "</td>" +
          "<td>" + App.escape(server.note || "") + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }
    var auth = spec.auth || {};
    var authKeys = Object.keys(auth);
    if (authKeys.length > 0) {
      html += "<h3>Authentication</h3><div class=\"table-wrap\"><table><tbody>";
      authKeys.forEach(function (key) {
        html += "<tr><th>" + App.escape(key) + "</th><td>" +
          App.escape(auth[key]) + "</td></tr>";
      });
      html += "</tbody></table></div>";
    }
    if (spec.contact) {
      html += '<h3>Contact</h3><p>' + App.escape(spec.contact) + "</p>";
    }
    if (!html) return "";
    return (
      '<details class="endpoint spec-overview" open><summary>' +
      '<span class="summary-text">About this API: environments, ' +
      "authentication and ownership</span></summary>" +
      '<div class="endpoint-body">' + html + "</div></details>"
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

  function headersTable(headers) {
    if (!headers || headers.length === 0) return "";
    var html =
      '<h3>Request headers</h3><div class="table-wrap"><table><thead><tr>' +
      "<th>Header</th><th>Required</th><th>Description</th><th>Example</th>" +
      "</tr></thead><tbody>";
    headers.forEach(function (h) {
      html +=
        "<tr>" +
        '<td class="mono">' + App.escape(h.name) + "</td>" +
        "<td>" + (h.required ? "yes" : "no") + "</td>" +
        "<td>" + App.escape(h.description || "") + "</td>" +
        '<td class="mono">' + App.escape(h.example || "") + "</td>" +
        "</tr>";
    });
    return html + "</tbody></table></div>";
  }

  function statusClass(status) {
    var family = String(status).charAt(0);
    return "status-" + (["2", "3", "4", "5"].indexOf(family) === -1
      ? "other" : family);
  }

  // The response catalogue. Falls back to the single response_example
  // column so pre-existing sparse rows keep rendering.
  function responsesBlock(responses, fallbackExample) {
    if (!responses || responses.length === 0) {
      return fallbackExample
        ? "<h3>Response example</h3>" + codeblock(fallbackExample)
        : "";
    }
    var html = "<h3>Responses</h3>";
    responses.forEach(function (r) {
      html +=
        '<div class="response"><p>' +
        '<span class="badge ' + statusClass(r.status) + '">' +
        App.escape(r.status) + "</span> " +
        App.escape(r.description || "") + "</p>" +
        (r.example ? codeblock(r.example) : "") +
        "</div>";
    });
    return html;
  }

  // Small typed flags on the summary row: [{"label","tone"}].
  function badgeList(badges) {
    var html = "";
    (badges || []).forEach(function (b) {
      if (!b || !b.label) return;
      var tone = ["neutral", "info", "ok", "warn", "danger"]
        .indexOf(b.tone) === -1 ? "neutral" : b.tone;
      html += '<span class="badge tone-' + tone + '">' +
        App.escape(b.label) + "</span>";
    });
    return html;
  }

  // Ready-to-run curl for the endpoint, built from the first
  // environment. Query-style operations (GraphQL) have no usable
  // path, so they render no curl.
  function curlExample(ep, servers) {
    var base = servers && servers[0] && servers[0].base_url;
    if (!base || ep.method === "query") return "";
    var lines = ["curl -X " + String(ep.method).toUpperCase() + " \\",
      "  '" + base + ep.path + "' \\"];
    if (ep.auth_required !== false) {
      lines.push("  -H 'Authorization: Bearer <token>' \\");
    }
    if (ep.request_example) {
      lines.push("  -H 'Content-Type: application/json' \\");
      lines.push("  -d '" + JSON.stringify(ep.request_example) + "'");
    } else {
      var last = lines.pop();
      lines.push(last.replace(/ \\$/, ""));
    }
    return "<h3>Try it (curl)</h3>" + codeblock(lines.join("\n"));
  }

  // The collapsible detail of an endpoint. Exported separately so
  // the page can inject it after lazily fetching the heavy columns;
  // a lean row (marked _lean by the loader) renders a placeholder.
  function endpointBody(ep, context) {
    if (ep._lean) return '<p class="notice">Loading detail</p>';
    var html = "";
    if (ep.description) html += "<p>" + App.escape(ep.description) + "</p>";
    if (ep.notes) html += "<h3>Notes</h3><p>" + App.escape(ep.notes) + "</p>";
    html += headersTable(ep.request_headers);
    html += paramsTable(ep.params);
    if (ep.request_example) {
      html += "<h3>Request example</h3>" + codeblock(ep.request_example);
    }
    html += responsesBlock(ep.responses, ep.response_example);
    html += curlExample(ep, context && context.servers);
    return html;
  }

  function endpointBlock(ep, context) {
    var html = '<details class="endpoint" id="ep-' + App.escape(ep.id) + '">';
    html +=
      "<summary>" +
      App.methodBadge(ep.method) +
      '<span class="path">' + App.escape(ep.path) + "</span>" +
      (ep.deprecated ? App.statusBadge("deprecated") : "") +
      (ep.auth_required === false ? '<span class="badge public">public</span>' : "") +
      badgeList(ep.badges) +
      '<span class="summary-text">' + App.escape(ep.summary || "") + "</span>" +
      "</summary>";
    html += '<div class="endpoint-body">' + endpointBody(ep, context);
    html += "</div></details>";
    return html;
  }

  // Group endpoints by tag. An optional api_tags catalogue supplies
  // per-tag descriptions and an explicit order (so areas can mirror
  // a runbook); uncatalogued tags keep first-seen order after it.
  function groupByTag(endpoints, catalogue) {
    var groups = {};
    var order = [];
    var descriptions = {};
    (catalogue || []).forEach(function (tag) {
      if (tag.description) descriptions[tag.name] = tag.description;
    });
    endpoints.forEach(function (ep) {
      var tag = ep.tag || "General";
      if (!groups[tag]) {
        groups[tag] = [];
        order.push(tag);
      }
      groups[tag].push(ep);
    });
    if (catalogue && catalogue.length > 0) {
      var ranks = {};
      catalogue.forEach(function (tag, i) { ranks[tag.name] = i; });
      var seen = {};
      order.forEach(function (tag, i) { seen[tag] = i; });
      order.sort(function (a, b) {
        var ra = ranks[a] !== undefined ? ranks[a] : 1000 + seen[a];
        var rb = ranks[b] !== undefined ? ranks[b] : 1000 + seen[b];
        return ra - rb;
      });
    }
    return { groups: groups, order: order, descriptions: descriptions };
  }

  // Search predicate for the filter box.
  function matches(ep, term) {
    if (!term) return true;
    var haystack = [ep.method, ep.path, ep.tag, ep.summary, ep.description]
      .join(" ").toLowerCase();
    return haystack.indexOf(term.toLowerCase()) !== -1;
  }

  // Fallback: derive endpoint objects from an OpenAPI 3 document
  // stored in api_specs.spec, so whole specs can be pasted into a
  // single jsonb column as a starting point.
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
          deprecated: !!op.deprecated,
          params: op.parameters || [],
          request_example: null,
          response_example: firstResponse,
        });
      });
    });
    return endpoints;
  }

  App.referenceRender = {
    codeblock: codeblock,
    specOverview: specOverview,
    paramsTable: paramsTable,
    headersTable: headersTable,
    responsesBlock: responsesBlock,
    badgeList: badgeList,
    curlExample: curlExample,
    endpointBody: endpointBody,
    endpointBlock: endpointBlock,
    groupByTag: groupByTag,
    matches: matches,
    endpointsFromOpenApi: endpointsFromOpenApi,
  };
})();
