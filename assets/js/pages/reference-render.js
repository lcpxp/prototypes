// ------------------------------------------------------------------
// reference-render.js - Pure HTML builders for the reference viewer.
// No DOM access: every function takes data and returns a string, so
// the rendering is benchmarked in tests/unit/reference-render.test.js.
// reference.js loads data and wires events; this file only renders.
//
// All content comes from Supabase (api_specs, api_endpoints). The
// optional jsonb shapes these builders understand are documented on
// the columns in supabase/schema.sql; every field is optional so
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

  function endpointBlock(ep) {
    var html = '<details class="endpoint" id="ep-' + App.escape(ep.id) + '">';
    html +=
      "<summary>" +
      App.methodBadge(ep.method) +
      '<span class="path">' + App.escape(ep.path) + "</span>" +
      (ep.deprecated ? App.statusBadge("deprecated") : "") +
      (ep.auth_required === false ? '<span class="badge public">public</span>' : "") +
      '<span class="summary-text">' + App.escape(ep.summary || "") + "</span>" +
      "</summary>";
    html += '<div class="endpoint-body">';
    if (ep.description) html += "<p>" + App.escape(ep.description) + "</p>";
    if (ep.notes) html += "<h3>Notes</h3><p>" + App.escape(ep.notes) + "</p>";
    html += headersTable(ep.request_headers);
    html += paramsTable(ep.params);
    if (ep.request_example) {
      html += "<h3>Request example</h3>" + codeblock(ep.request_example);
    }
    html += responsesBlock(ep.responses, ep.response_example);
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

  App.refRender = {
    codeblock: codeblock,
    specOverview: specOverview,
    paramsTable: paramsTable,
    headersTable: headersTable,
    responsesBlock: responsesBlock,
    endpointBlock: endpointBlock,
    groupByTag: groupByTag,
    matches: matches,
    endpointsFromOpenApi: endpointsFromOpenApi,
  };
})();
