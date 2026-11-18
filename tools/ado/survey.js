// ------------------------------------------------------------------
// tools/ado/survey.js - Reads how a project's existing work is written,
// so what LPio pushes matches it: which fields each type uses and how
// often, the values its picklists hold, the headings its long fields
// are organised under, how titles read, what items are parented to,
// and a few examples.
//
// READ-ONLY and DATA-FREE, like tools/ado/engine.js: it writes nothing
// to Azure DevOps and holds no organisation, project or id. It never
// keeps a person: identity fields (assigned to, created by and the
// like) are dropped before anything is counted or sampled.
//
//   await LPioSurvey.run(PROFILE)             the last 40 of each type
//   await LPioSurvey.run(PROFILE, { per: 80 })
//
// PROFILE is ado_profile's organisation, project, team, area_path and
// types. The result downloads as ado-survey-<date>.json (and goes to the
// clipboard) to hand back to the session.
// ------------------------------------------------------------------
(function (root) {
  "use strict";

  var API = "api-version=7.1";
  var SKIP = /^(System\.(Id|Rev|Watermark|TeamProject|CommentCount|AuthorizedDate|RevisedDate|PersonId|NodeName|AreaId|IterationId|AreaLevel\d|IterationLevel\d|ExternalLinkCount|HyperLinkCount|AttachedFileCount|RelatedLinkCount|BoardColumnDone)|WEF_)/;

  function isPerson(value) {
    return value && typeof value === "object" && ("uniqueName" in value || "displayName" in value);
  }
  function plain(html) {
    return String(html == null ? "" : html).replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">").replace(/[ \t]+/g, " ").replace(/\n\s*/g, "\n").trim();
  }
  // The section headings a long field is organised under: bold or
  // heading markup, and short lines ending with a colon.
  function headings(html) {
    var out = [];
    String(html || "").replace(/<(b|strong|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, function (m, tag, inner) {
      var t = plain(inner); if (t && t.length <= 60) out.push(t.replace(/:$/, ""));
      return m;
    });
    plain(html).split("\n").forEach(function (line) {
      if (line.length <= 60 && /:$/.test(line)) out.push(line.replace(/:$/, ""));
    });
    return out;
  }
  function top(counts, n) {
    return Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, n)
      .map(function (k) { return { value: k, items: counts[k] }; });
  }
  function median(xs) {
    if (!xs.length) return 0;
    var s = xs.slice().sort(function (a, b) { return a - b; });
    return s[Math.floor(s.length / 2)];
  }

  // Everything one type's items say about how that type is written.
  function summarise(items, typesById) {
    var fields = {};
    var titles = [];
    var firstWords = {};
    var parents = {};
    var sprinted = 0;
    items.forEach(function (item) {
      var f = item.fields || {};
      Object.keys(f).forEach(function (ref) {
        var v = f[ref];
        if (SKIP.test(ref) || isPerson(v) || v === null || v === "" || ref === "System.Title") return;
        var s = fields[ref] || (fields[ref] = { items: 0, values: {}, lengths: [], headings: {} });
        s.items += 1;
        var text = typeof v === "string" ? v : JSON.stringify(v);
        if (/<[a-z][\s\S]*>/i.test(text) || text.length > 80) {
          s.lengths.push(plain(text).length);
          headings(text).forEach(function (h) { s.headings[h] = (s.headings[h] || 0) + 1; });
        } else if (ref === "System.Tags") {
          text.split(";").map(function (t) { return t.trim(); }).filter(Boolean)
            .forEach(function (t) { s.values[t] = (s.values[t] || 0) + 1; });
        } else if (!/Date$/.test(ref)) {
          s.values[text] = (s.values[text] || 0) + 1;
        }
      });
      var title = String(f["System.Title"] || "");
      titles.push(title.length);
      var w = (title.match(/^(\[[^\]]+\]|[^\s:]+:?)/) || [""])[0];
      firstWords[w] = (firstWords[w] || 0) + 1;
      if (/\\/.test(String(f["System.IterationPath"] || ""))) sprinted += 1;
      (item.relations || []).forEach(function (r) {
        if (r.rel !== "System.LinkTypes.Hierarchy-Reverse") return;
        var id = Number(String(r.url).split("/").pop());
        var type = typesById[id] || "unknown";
        parents[type] = (parents[type] || 0) + 1;
      });
    });
    var out = { items: items.length, in_a_sprint: sprinted, title_length_median: median(titles),
      title_starts: top(firstWords, 8), parent_types: parents, fields: {} };
    Object.keys(fields).sort().forEach(function (ref) {
      var s = fields[ref];
      out.fields[ref] = { filled_on: s.items };
      if (s.lengths.length) {
        out.fields[ref].text_length_median = median(s.lengths);
        out.fields[ref].headings = top(s.headings, 12);
      } else {
        out.fields[ref].values = top(s.values, 10);
      }
    });
    return out;
  }

  // A few recent items as they read, long fields cut short, no people.
  function samples(items, n) {
    return items.slice(0, n).map(function (item) {
      var out = { id: item.id };
      Object.keys(item.fields || {}).forEach(function (ref) {
        var v = item.fields[ref];
        if (SKIP.test(ref) || isPerson(v) || v === null || v === "" || /Date$/.test(ref)) return;
        var t = typeof v === "string" ? plain(v) : v;
        out[ref] = typeof t === "string" && t.length > 700 ? t.slice(0, 700) + " ..." : t;
      });
      return out;
    });
  }

  function create(env) {
    function base(p) { return "/" + encodeURIComponent(p.organisation) + "/" + encodeURIComponent(p.project); }
    function get(url) { return call("GET", url); }
    function call(method, url, body) {
      return env.fetch(env.origin + url, {
        method: method, credentials: "same-origin",
        headers: { "X-TFS-FedAuthRedirect": "Suppress", Accept: "application/json",
          "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(function (res) {
        return res.text().then(function (raw) {
          var data = null;
          try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
          if (!res.ok || res.status === 203 || (raw && data === null)) {
            throw new Error(method + " " + url.split("?")[0] + " answered " + res.status +
              (data && data.message ? ": " + data.message : ""));
          }
          return data;
        });
      });
    }
    function read(p, ids) {
      var chunks = [];
      for (var i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
      return chunks.reduce(function (all, chunk) {
        return all.then(function (acc) {
          return get(base(p) + "/_apis/wit/workitems?ids=" + chunk.join(",") + "&$expand=relations&" + API)
            .then(function (r) { return acc.concat(r.value || []); });
        });
      }, Promise.resolve([]));
    }

    function run(p, options) {
      var per = (options && options.per) || 40;
      var types = ["epic", "feature", "story", "bug"].map(function (k) { return p.types[k]; });
      var out = { generated_on: env.today(), project: p.project, per_type: per, types: {} };
      var team = base(p) + "/" + encodeURIComponent(p.team) + "/_apis/work/teamsettings";
      return get(team + "?" + API).then(function (s) {
        out.team = { bugs: s && s.bugsBehavior, backlogs: s && s.backlogVisibilities };
        return types.reduce(function (chain, type) {
          return chain.then(function () {
            var wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project" +
              " AND [System.WorkItemType] = '" + type.replace(/'/g, "''") + "'" +
              " AND [System.Tags] NOT CONTAINS 'LPio' ORDER BY [System.ChangedDate] DESC";
            return Promise.all([
              call("POST", base(p) + "/_apis/wit/wiql?$top=" + per + "&" + API, { query: wiql }),
              get(base(p) + "/_apis/wit/workitemtypes/" + encodeURIComponent(type) + "/fields?$expand=all&" + API),
            ]).then(function (r) {
              var ids = (r[0].workItems || []).map(function (w) { return w.id; }).slice(0, per);
              var form = (r[1].value || []).filter(function (f) { return /^Custom\./.test(f.referenceName) || f.alwaysRequired; })
                .map(function (f) { return { field: f.referenceName, name: f.name, required: !!f.alwaysRequired }; });
              return read(p, ids).then(function (items) {
                var parentIds = [];
                items.forEach(function (item) {
                  (item.relations || []).forEach(function (rel) {
                    if (rel.rel === "System.LinkTypes.Hierarchy-Reverse") parentIds.push(Number(String(rel.url).split("/").pop()));
                  });
                });
                return read(p, parentIds.filter(function (id, i) { return parentIds.indexOf(id) === i; }))
                  .then(function (parentItems) {
                    var typesById = {};
                    parentItems.forEach(function (x) { typesById[x.id] = x.fields["System.WorkItemType"]; });
                    out.types[type] = { custom_and_required_fields: form, summary: summarise(items, typesById),
                      samples: samples(items, 3) };
                    env.log(type + ": read " + items.length + " item(s).");
                  });
              });
            });
          });
        }, Promise.resolve());
      }).then(function () {
        env.save("ado-survey-" + out.generated_on + ".json", out);
        env.log("Done. The file ado-survey-" + out.generated_on + ".json has downloaded and is on the clipboard: hand it back.");
        return out;
      });
    }
    return { run: run };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { create: create, summarise: summarise, headings: headings };
    return;
  }
  root.LPioSurvey = create({
    origin: root.location.origin,
    fetch: root.fetch.bind(root),
    log: function (line) { root.console.log(line); },
    today: function () { return new Date().toISOString().slice(0, 10); },
    save: function (name, value) {
      var body = JSON.stringify(value, null, 2);
      var a = root.document.createElement("a");
      a.href = root.URL.createObjectURL(new root.Blob([body], { type: "application/json" }));
      a.download = name;
      a.click();
      if (root.navigator.clipboard) root.navigator.clipboard.writeText(body).catch(function () {});
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
