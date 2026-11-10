// ------------------------------------------------------------------
// tools/ado/engine.js - Carries a push payload from LPio into Azure
// DevOps, and reads Azure DevOps back.
//
// DATA-FREE on purpose. It holds no organisation, project, id, field
// reference or story text: all of that arrives in the payload that
// ado_push_payload() renders (supabase/schema/39_ado_push.sql), whose
// profile names the target. The engine never builds field markup - it
// writes what it is given and compares what it reads.
//
// It runs in the browser console on a page of the target project, as
// the signed-in user, over same-origin cookie auth. Paste this file,
// then:
//
//   await LPioAdo.preflight(PAYLOAD)          read-only
//   await LPioAdo.push(PAYLOAD)               plan, one confirm, create
//   await LPioAdo.verify(PAYLOAD, RECEIPT)    read-only
//   await LPioAdo.cleanup(PLAN, PROFILE)      a signed-off reconciliation
//   await LPioAdo.update(CHANGES, PROFILE)    the one-off correction
//   await LPioAdo.sprint("26-25", PROFILE)    read-only sprint read-back
//
// Rules it holds to (docs/DEVOPS.md is their home): creates only, by
// JSON Patch "add"; every create validated first; nothing bypasses a
// rule; it stops at the first failure; a second run skips what exists,
// found by the link back to LPio.
//
// In Node it exports create(env) so tests/unit/ado-engine.test.js can
// drive it against a mocked Azure DevOps.
// ------------------------------------------------------------------
(function (root) {
  "use strict";

  var API = "api-version=7.1";
  var REL = {
    parent: "System.LinkTypes.Hierarchy-Reverse",
    predecessor: "System.LinkTypes.Dependency-Reverse",
    link: "Hyperlink",
    file: "AttachedFile",
  };
  var TAG = "LPio";
  var SCALE = [1, 2, 3, 5, 8];
  var KINDS = { epics: "epic", features: "feature" };

  // What a rich-text field SAYS, whatever markup carries it: tags and
  // entities dropped, whitespace collapsed, and a checklist's tick, its
  // {Done} marker and its "(@who - date)" attribution removed - so a
  // criterion someone has ticked is not a difference.
  function text(value) {
    return String(value == null ? "" : value)
      .replace(/<span>\s*\(<span>@[\s\S]*?<\/span>[^<]*\)<\/span>/g, " ")
      .replace(/\[(x| )\](\s*\{Done\})?/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  }

  function same(ref, want, got) {
    if (typeof want === "number") return Number(got) === want;
    if (/Date$/.test(ref)) return String(got || "").slice(0, 10) === String(want).slice(0, 10);
    return text(want) === text(got);
  }

  function count(html, pattern) {
    return (String(html || "").match(pattern) || []).length;
  }

  // Every object the payload would create, parents first.
  function objects(payload) {
    var out = [];
    ["epics", "features"].forEach(function (group) {
      (payload[group] || []).forEach(function (o) {
        out.push({ kind: KINDS[group], o: o });
      });
    });
    (payload.items || []).forEach(function (o) { out.push({ kind: o.type, o: o }); });
    return out;
  }

  // The payload against its own profile, with no network: the check a
  // session runs before it hands anything over.
  function validate(payload) {
    var p = payload.profile || {};
    var problems = [];
    var keys = {};
    function bad(key, why) { problems.push(key + ": " + why); }
    objects(payload).forEach(function (x) {
      var o = x.o, f = o.fields || {};
      var type = (p.types || {})[x.kind];
      keys[o.key] = true;
      if (!type) bad(o.key, "the profile maps no work item type for " + x.kind);
      else if ((p.forbidden_types || []).indexOf(type) > -1) bad(o.key, type + " is a forbidden type");
      Object.keys(f).forEach(function (name) {
        if (!(p.fields || {})[name]) bad(o.key, "the profile maps no field for " + name);
      });
      if (!text(f.title)) bad(o.key, "no title");
      if (!o.link || !o.link.url || o.link.comment !== TAG + " " + o.key) bad(o.key, "no link back to LPio");
      if (x.kind === "epic" || x.kind === "feature") return;
      if (!keys[o.feature_key]) bad(o.key, "its Feature is not in the payload");
      var boxes = count(f.criteria, /\[ \]/g);
      if (boxes < 2 || boxes > 5) bad(o.key, boxes + " acceptance criteria, where 2 to 5 are wanted");
      if (SCALE.indexOf(f.effort) === -1) bad(o.key, "effort " + f.effort + " is not on the scale");
      if (x.kind === "story") {
        if (count(f.description, /<br>/g) !== 2) bad(o.key, "the description is not three lines");
        if (!text(f.purpose)) bad(o.key, "no purpose");
        if (!text(f.scope)) bad(o.key, "no scope");
      } else if (!text(f.repro_steps)) bad(o.key, "no repro steps");
    });
    (payload.features || []).forEach(function (o) {
      if (!keys[o.epic_key]) bad(o.key, "its Epic is not in the payload");
    });
    return problems;
  }

  function create(env) {
    function base(p) {
      return "/" + encodeURIComponent(p.organisation) + "/" + encodeURIComponent(p.project);
    }
    function itemUrl(p, id) {
      return env.origin + base(p) + "/_apis/wit/workItems/" + id;
    }

    // One request. Retries a throttle or a brief outage; anything else
    // that is not a clean JSON answer is an error, including the sign-in
    // page a lapsed session is answered with.
    function call(method, url, body, type) {
      var attempt = 0;
      function once() {
        var headers = {
          "X-TFS-FedAuthRedirect": "Suppress",
          "X-VSS-ReauthenticationAction": "Suppress",
          Accept: "application/json",
        };
        if (body !== undefined) headers["Content-Type"] = type || "application/json";
        return env.fetch(url, {
          method: method, credentials: "same-origin", headers: headers,
          body: body === undefined || type === "application/octet-stream" ? body : JSON.stringify(body),
        }).then(function (res) {
          if ((res.status === 429 || res.status === 503) && attempt < 4) {
            attempt += 1;
            var wait = Number(res.headers && res.headers.get && res.headers.get("Retry-After")) * 1000;
            return env.sleep(wait || 1000 * Math.pow(2, attempt)).then(once);
          }
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
      return once();
    }
    function get(url) { return call("GET", url); }
    function patch(method, url, ops) { return call(method, url, ops, "application/json-patch+json"); }

    function readItems(p, ids) {
      var chunks = [];
      for (var i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
      return chunks.reduce(function (chain, chunk) {
        return chain.then(function (all) {
          return get(base(p) + "/_apis/wit/workitems?ids=" + chunk.join(",") +
            "&$expand=relations&" + API).then(function (r) { return all.concat(r.value || []); });
        });
      }, Promise.resolve([]));
    }
    function query(p, wiql) {
      return call("POST", base(p) + "/_apis/wit/wiql?" + API, { query: wiql })
        .then(function (r) { return (r.workItems || []).map(function (w) { return w.id; }); })
        .then(function (ids) { return readItems(p, ids); });
    }

    // Everything LPio has already created, keyed by the link back.
    function existing(p) {
      var fields = p.fields;
      return query(p, "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project" +
        " AND [" + fields.tags + "] CONTAINS '" + TAG + "'").then(function (items) {
        var map = {};
        items.forEach(function (item) {
          (item.relations || []).forEach(function (rel) {
            var note = rel.rel === REL.link && rel.attributes && rel.attributes.comment;
            if (note && note.indexOf(TAG + " ") === 0) map[note.slice(TAG.length + 1)] = item;
          });
        });
        return map;
      });
    }

    function parentOf(item) {
      var rel = (item.relations || []).filter(function (r) { return r.rel === REL.parent; })[0];
      return rel ? Number(rel.url.split("/").pop()) : null;
    }

    // The fields one object is created with, by field reference.
    function fieldSet(p, kind, o, ids) {
      var set = {};
      var defaults = (p.required_defaults || {})[kind] || {};
      Object.keys(defaults).forEach(function (ref) { set[ref] = defaults[ref]; });
      Object.keys(o.fields).forEach(function (name) {
        var value = o.fields[name];
        if (name === "dependencies") {
          value = String(value).replace(/\{\{ado:([^}]+)\}\}/g, function (m, key) {
            return ids[key] ? "#" + ids[key] : "not yet in Azure DevOps";
          });
        }
        set[p.fields[name]] = value;
      });
      set[p.fields.area] = p.area_path;
      set[p.fields.iteration] = o.iteration || p.iteration_root;
      set[p.fields.tags] = TAG;
      return set;
    }
    function createOps(p, set, o, parentId) {
      var ops = Object.keys(set).map(function (ref) {
        return { op: "add", path: "/fields/" + ref, value: set[ref] };
      });
      ops.push({ op: "add", path: "/relations/-",
        value: { rel: REL.link, url: o.link.url, attributes: { comment: o.link.comment } } });
      if (parentId) {
        ops.push({ op: "add", path: "/relations/-", value: { rel: REL.parent, url: itemUrl(p, parentId) } });
      }
      return ops;
    }
    function parentKey(x) {
      return x.kind === "epic" ? null : x.kind === "feature" ? x.o.epic_key : x.o.feature_key;
    }

    function differences(p, x, item, ids) {
      var out = [];
      var set = fieldSet(p, x.kind, x.o, ids);
      Object.keys(set).forEach(function (ref) {
        if (!same(ref, set[ref], (item.fields || {})[ref])) {
          out.push({ key: x.o.key, id: item.id, field: ref, expected: text(set[ref]).slice(0, 80),
            found: text((item.fields || {})[ref]).slice(0, 80) });
        }
      });
      var parent = parentKey(x);
      if (parent && parentOf(item) !== ids[parent]) {
        out.push({ key: x.o.key, id: item.id, field: "parent", expected: String(ids[parent]),
          found: String(parentOf(item)) });
      }
      return out;
    }

    function preflight(payload) {
      var p = payload.profile;
      var checks = [];
      function note(name, ok, detail, warn) {
        checks.push({ check: name, result: ok ? "ok" : warn ? "warn" : "FAIL", detail: detail || "" });
      }
      var offline = validate(payload);
      note("payload is well formed", offline.length === 0, offline.join("; "));
      var used = {};
      objects(payload).forEach(function (x) { used[x.kind] = true; });

      return get(base(p) + "/_apis/wit/workitemtypes?" + API).then(function (types) {
        var names = (types.value || []).map(function (t) { return t.name; });
        Object.keys(used).forEach(function (kind) {
          var type = p.types[kind];
          note("type " + type, names.indexOf(type) > -1, "for " + kind);
        });
        return Object.keys(used).reduce(function (chain, kind) {
          return chain.then(function () {
            return get(base(p) + "/_apis/wit/workitemtypes/" + encodeURIComponent(p.types[kind]) +
              "/fields?$expand=all&" + API).then(function (r) {
              var refs = {};
              (r.value || []).forEach(function (f) { refs[f.referenceName] = f; });
              var sample = objects(payload).filter(function (x) { return x.kind === kind; })[0];
              var set = fieldSet(p, kind, sample.o, {});
              var missing = Object.keys(set).filter(function (ref) { return !refs[ref]; });
              note("fields on " + p.types[kind], missing.length === 0, missing.join(", "));
              var unset = Object.keys(refs).filter(function (ref) {
                return refs[ref].alwaysRequired && !(ref in set) && !/^System\./.test(ref) &&
                  (refs[ref].defaultValue === null || refs[ref].defaultValue === undefined);
              });
              note("required fields on " + p.types[kind], unset.length === 0,
                unset.length ? "required with no default and not written: " + unset.join(", ") : "", true);
            });
          });
        }, Promise.resolve());
      }).then(function () {
        var team = base(p) + "/" + encodeURIComponent(p.team) + "/_apis/work/teamsettings/";
        return Promise.all([get(team + "iterations?" + API), get(team + "teamfieldvalues?" + API)]);
      }).then(function (r) {
        var paths = (r[0].value || []).map(function (i) { return i.path; });
        var wanted = {}, absent = {};
        (payload.items || []).forEach(function (o) {
          if (o.iteration && o.iteration !== p.iteration_root) wanted[o.iteration] = true;
          if (o.sprint_missing) absent[o.sprint_missing] = true;
        });
        var gone = Object.keys(wanted).filter(function (path) { return paths.indexOf(path) === -1; });
        note("target sprints exist and are selected for the team", gone.length === 0, gone.join(", "));
        note("sprints missing from the team", Object.keys(absent).length === 0,
          Object.keys(absent).length ? "Sprint " + Object.keys(absent).join(", Sprint ") +
            ": these items go to the root iteration" : "", true);
        var areas = (r[1].values || []).map(function (v) { return v.value; });
        note("area " + p.area_path, areas.indexOf(p.area_path) > -1, "the team's areas: " + areas.join(", "));
        return checklist(p).then(function (found) {
          note("criteria are drawn by the checklist control", found === true,
            found === true ? "" : String(found), true);
        });
      }).then(function () { return existing(p); }).then(function (map) {
        var ids = {};
        objects(payload).forEach(function (x) {
          if (map[x.o.key]) ids[x.o.key] = map[x.o.key].id;
          else if (x.o.ado_id) ids[x.o.key] = x.o.ado_id;
        });
        var known = objects(payload).filter(function (x) { return x.o.ado_id && !map[x.o.key]; });
        return readItems(p, known.map(function (x) { return x.o.ado_id; })).then(function (items) {
          known.forEach(function (x) {
            var item = items.filter(function (i) { return i.id === x.o.ado_id; })[0];
            var type = item && item.fields["System.WorkItemType"];
            note("parent #" + x.o.ado_id, type === p.types[x.kind],
              type ? "is a " + type + ", wanted " + p.types[x.kind] : "not found");
            if (item) map[x.o.key] = item;
          });
          var plan = objects(payload).map(function (x) {
            return { key: x.o.key, type: p.types[x.kind], title: text(x.o.fields.title),
              action: ids[x.o.key] ? "skip (exists #" + ids[x.o.key] + ")" : "create",
              iteration: x.o.iteration || p.iteration_root };
          });
          var ok = checks.every(function (c) { return c.result !== "FAIL"; });
          env.table(checks);
          return { ok: ok, checks: checks, plan: plan, ids: ids, found: map };
        });
      });
    }

    // Whether the acceptance criteria field is drawn by the checklist
    // control on the backlog item form. True, or the reason it could
    // not be shown - a warning either way, never a failure: reading a
    // process layout needs a permission a contributor may not hold.
    function checklist(p) {
      if (!p.checklist_control_id) return Promise.resolve("the profile names no checklist control");
      var org = "/" + encodeURIComponent(p.organisation);
      return get(org + "/_apis/projects/" + encodeURIComponent(p.project) +
        "?includeCapabilities=true&" + API).then(function (project) {
        var process = project.capabilities.processTemplate.templateTypeId;
        return get(base(p) + "/_apis/wit/workitemtypes/" + encodeURIComponent(p.types.story) + "?" + API)
          .then(function (type) {
            return get(org + "/_apis/work/processes/" + process + "/workItemTypes/" +
              type.referenceName + "/layout?" + API);
          });
      }).then(function (layout) {
        var raw = JSON.stringify(layout);
        return raw.indexOf(p.checklist_control_id) > -1 && raw.indexOf(p.fields.criteria) > -1
          ? true : "the control is not on the form";
      }).catch(function (e) { return "the form layout could not be read (" + e.message + ")"; });
    }

    function upload(p, file) {
      var bytes = Uint8Array.from(env.atob(file.data), function (c) { return c.charCodeAt(0); });
      return call("POST", base(p) + "/_apis/wit/attachments?fileName=" +
        encodeURIComponent(file.name) + "&" + API, bytes, "application/octet-stream");
    }

    function push(payload) {
      var p = payload.profile;
      var receipt = { payload_hash: payload.hash, pushed_at: new Date().toISOString(), entries: [] };
      return preflight(payload).then(function (pf) {
        env.table(pf.plan);
        var todo = objects(payload).filter(function (x) { return !pf.ids[x.o.key]; });
        if (!pf.ok) { env.log("Preflight failed. Nothing was created."); return null; }
        var ids = pf.ids;
        objects(payload).filter(function (x) { return pf.ids[x.o.key]; }).forEach(function (x) {
          var item = pf.found[x.o.key];
          receipt.entries.push({ key: x.o.key, id: item.id, type: p.types[x.kind], rev: item.rev,
            hash: differences(p, x, item, ids).length ? null : x.o.hash || null, outcome: "exists" });
        });
        if (!todo.length) { env.log("Everything in the payload already exists."); return finish(); }
        if (!env.confirm("Create " + todo.length + " work items in " + p.project + "?")) {
          env.log("Cancelled. Nothing was created."); return null;
        }
        function url(x, validate) {
          return base(p) + "/_apis/wit/workitems/$" + encodeURIComponent(p.types[x.kind]) + "?" +
            (validate ? "validateOnly=true&" : "") + API;
        }
        // Every create is validated before the first one is made.
        return todo.reduce(function (chain, x) {
          return chain.then(function () {
            return patch("POST", url(x, true), createOps(p, fieldSet(p, x.kind, x.o, ids), x.o, null));
          });
        }, Promise.resolve()).then(function () {
          return todo.reduce(function (chain, x) {
            return chain.then(function () {
              var parent = parentKey(x);
              var ops = createOps(p, fieldSet(p, x.kind, x.o, ids), x.o, parent ? ids[parent] : null);
              return (x.o.attachments || []).filter(function (f) { return f.data; })
                .reduce(function (c, file) {
                  return c.then(function () { return upload(p, file); }).then(function (up) {
                    ops.push({ op: "add", path: "/relations/-",
                      value: { rel: REL.file, url: up.url, attributes: { comment: file.caption || "" } } });
                  });
                }, Promise.resolve()).then(function () { return patch("POST", url(x, false), ops); })
                .then(function (made) {
                  ids[x.o.key] = made.id;
                  receipt.entries.push({ key: x.o.key, id: made.id, type: p.types[x.kind],
                    rev: made.rev, hash: x.o.hash || null, outcome: "created" });
                });
            });
          }, Promise.resolve());
        }).then(function () {
          // What must land first, as Predecessor links, once both ends exist.
          var links = [];
          todo.forEach(function (x) {
            (x.o.needs || []).forEach(function (key) {
              if (ids[key]) links.push({ from: ids[x.o.key], to: ids[key] });
            });
          });
          return links.reduce(function (chain, l) {
            return chain.then(function () {
              return patch("PATCH", base(p) + "/_apis/wit/workitems/" + l.from + "?" + API,
                [{ op: "add", path: "/relations/-", value: { rel: REL.predecessor, url: itemUrl(p, l.to) } }]);
            });
          }, Promise.resolve());
        }).then(finish, function (error) {
          receipt.stopped = error.message;
          env.log("Stopped at the first failure: " + error.message);
          return finish();
        });
      });
      function finish() {
        env.table(receipt.entries);
        env.save("ado-push-receipt-" + receipt.pushed_at.slice(0, 10) + ".json", receipt);
        return receipt;
      }
    }

    function verify(payload, receipt) {
      var p = payload.profile;
      return existing(p).then(function (map) {
        var ids = {};
        ((receipt && receipt.entries) || []).forEach(function (e) { ids[e.key] = e.id; });
        Object.keys(map).forEach(function (key) { ids[key] = map[key].id; });
        var known = objects(payload).filter(function (x) { return ids[x.o.key]; });
        return readItems(p, known.map(function (x) { return ids[x.o.key]; })).then(function (items) {
          var out = [];
          objects(payload).forEach(function (x) {
            var item = items.filter(function (i) { return i.id === ids[x.o.key]; })[0];
            if (!item) { out.push({ key: x.o.key, id: null, field: "work item", expected: "exists", found: "missing" }); return; }
            out = out.concat(differences(p, x, item, ids));
            if (!map[x.o.key]) out.push({ key: x.o.key, id: item.id, field: "link back", expected: x.o.link.comment, found: "missing" });
          });
          if (out.length) env.table(out);
          env.log(out.length ? out.length + " differences." : "Zero differences.");
          return out;
        });
      });
    }

    // Applies changes to existing items, each only if it is still at the
    // revision the change was written against. cleanup is the signed-off
    // reconciliation; update is the one-off correction, which also
    // requires the item to still be in its first state.
    function apply(changes, p, onlyNew, question) {
      return readItems(p, changes.map(function (c) { return c.id; })).then(function (items) {
        var rows = changes.map(function (c) {
          var item = items.filter(function (i) { return i.id === c.id; })[0];
          var why = !item ? "not found" : item.rev !== c.rev ? "moved since the plan (rev " + item.rev + ")"
            : onlyNew && item.fields["System.State"] !== "New" ? "no longer New" : null;
          return { id: c.id, action: why ? "skip: " + why : "apply", change: c };
        });
        env.table(rows.map(function (r) { return { id: r.id, action: r.action, set: Object.keys(r.change.set || {}).join(", ") }; }));
        var todo = rows.filter(function (r) { return r.action === "apply"; });
        if (!todo.length || !env.confirm(question + " " + todo.length + " work items?")) return rows;
        return todo.reduce(function (chain, r) {
          return chain.then(function () {
            var ops = [{ op: "test", path: "/rev", value: r.change.rev }];
            Object.keys(r.change.set || {}).forEach(function (ref) {
              ops.push({ op: "add", path: "/fields/" + ref, value: r.change.set[ref] });
            });
            if (r.change.comment) ops.push({ op: "add", path: "/fields/System.History", value: r.change.comment });
            return patch("PATCH", base(p) + "/_apis/wit/workitems/" + r.id + "?" + API, ops)
              .then(function () { r.action = "applied"; });
          });
        }, Promise.resolve()).then(function () {
          env.save("ado-changes-" + new Date().toISOString().slice(0, 10) + ".json",
            rows.map(function (r) { return { id: r.id, action: r.action }; }));
          return rows;
        });
      });
    }
    function cleanup(plan, p) { return apply(plan, p, false, "Apply the reconciliation to"); }
    function update(changes, p) { return apply(changes, p, true, "Correct"); }

    // What a sprint holds, for the sprint close: no names, no free text
    // beyond titles.
    function sprint(code, p) {
      var f = p.fields;
      return query(p, "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project" +
        " AND [" + f.iteration + "] = '" + p.iteration_root + "\\Sprint " + code + "'").then(function (items) {
        var rows = items.map(function (item) {
          var note = (item.relations || []).filter(function (r) {
            return r.rel === REL.link && r.attributes && String(r.attributes.comment).indexOf(TAG + " ") === 0;
          })[0];
          var criteria = item.fields[f.criteria];
          return {
            id: item.id, type: item.fields["System.WorkItemType"], title: item.fields[f.title],
            state: item.fields["System.State"], effort: item.fields[f.effort] || 0, rev: item.rev,
            key: note ? note.attributes.comment.slice(TAG.length + 1) : null, parent: parentOf(item),
            criteria: count(criteria, /\[(x| )\]/gi), ticked: count(criteria, /\[x\]/gi),
            pull_requests: (item.relations || []).filter(function (r) {
              return r.rel === "ArtifactLink" && /PullRequestId/.test(r.url);
            }).length,
            closed: item.fields["Microsoft.VSTS.Common.ClosedDate"] || null,
          };
        });
        var out = { sprint: code, read_at: new Date().toISOString(), items: rows };
        env.table(rows);
        env.save("ado-sprint-" + code + "-" + out.read_at.slice(0, 10) + ".json", out);
        return out;
      });
    }

    return { validate: validate, preflight: preflight, push: push, verify: verify,
      cleanup: cleanup, update: update, sprint: sprint };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { create: create, validate: validate, text: text };
    return;
  }
  root.LPioAdo = create({
    origin: root.location.origin,
    fetch: root.fetch.bind(root),
    atob: root.atob.bind(root),
    sleep: function (ms) { return new Promise(function (done) { root.setTimeout(done, ms); }); },
    confirm: function (question) { return root.confirm(question); },
    log: function (line) { root.console.log(line); },
    table: function (rows) { root.console.table(rows); },
    // The result as a downloaded file and, where the page allows it, on
    // the clipboard - so it can be handed back without retyping.
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
