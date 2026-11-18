// ------------------------------------------------------------------
// tools/ado/sprints.js - Creates the sprints the Sprint Roadmap uses in
// Azure DevOps and selects them for the team, so the push can file each
// backlog item in its sprint (docs/DEVOPS.md, Before the first push).
//
// DATA-FREE on purpose, like tools/ado/engine.js: no organisation,
// project, team or id lives here. The profile names the target and the
// sprint list names the codes and dates (docs/SPRINTS.md is their home).
// It runs in the browser console on a page of the target project, as the
// signed-in user. Paste this file, then:
//
//   await LPioSprints.plan(SPRINTS, PROFILE)     read-only
//   await LPioSprints.fix(SPRINTS, PROFILE, "25-30", "26-24")
//                                                one existing iteration
//                                                becomes a listed sprint
//   await LPioSprints.apply(SPRINTS, PROFILE)    plan, one confirm, create
//
//   SPRINTS  [{ code: "26-25", start: "2026-11-23", end: "2026-12-04" }]
//   PROFILE  { organisation, project, team, iteration_root } - the
//            ado_profile row's own values
//
// Each sprint is "Sprint <code>" directly under iteration_root, the path
// the push files items in (iteration_root + "\Sprint " + code). Rules:
// adds only; a sprint that already exists with other dates is reported
// and left alone; it stops at the first failure; a second run creates
// nothing. The result names the codes to list in ado_profile.team_sprints.
// ------------------------------------------------------------------
(function (root) {
  "use strict";

  var API = "api-version=7.1";
  var CODE = /^\d{2}-\d{2}$/;
  var DAY = /^\d{4}-\d{2}-\d{2}$/;

  function name(code) { return "Sprint " + code; }
  function day(value) { return String(value || "").slice(0, 10); }

  // The sprint list on its own terms, with no network: what would make
  // a create wrong before anything is sent.
  function validate(sprints, profile) {
    var problems = [];
    ["organisation", "project", "team", "iteration_root"].forEach(function (k) {
      if (!profile || !profile[k]) problems.push("the profile has no " + k);
    });
    if (!Array.isArray(sprints) || !sprints.length) problems.push("no sprints were given");
    var seen = {};
    (sprints || []).forEach(function (s) {
      if (!CODE.test(s.code || "")) problems.push("\"" + s.code + "\" is not a sprint code like 26-25");
      else if (seen[s.code]) problems.push("Sprint " + s.code + " is listed twice");
      seen[s.code] = true;
      if (!DAY.test(s.start || "") || !DAY.test(s.end || "")) problems.push("Sprint " + s.code + " needs start and end as YYYY-MM-DD");
      else if (s.end < s.start) problems.push("Sprint " + s.code + " ends before it starts");
    });
    var sorted = (sprints || []).slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i].start <= sorted[i - 1].end) {
        problems.push("Sprint " + sorted[i].code + " overlaps Sprint " + sorted[i - 1].code);
      }
    }
    return problems;
  }

  function create(env) {
    function base(p) {
      return "/" + encodeURIComponent(p.organisation) + "/" + encodeURIComponent(p.project);
    }
    // The iteration folder the sprints sit in: iteration_root below the
    // project, which is the tree's root.
    function folder(p) {
      return String(p.iteration_root).split("\\").slice(1).map(encodeURIComponent).join("/");
    }
    function nodes(p) {
      var sub = folder(p);
      return base(p) + "/_apis/wit/classificationnodes/iterations" + (sub ? "/" + sub : "");
    }
    function teamIterations(p) {
      return base(p) + "/" + encodeURIComponent(p.team) + "/_apis/work/teamsettings/iterations";
    }

    // One request, as the engine makes it: a throttle or brief outage is
    // retried, and anything that is not a clean JSON answer is an error,
    // including the sign-in page a lapsed session is answered with.
    function call(method, url, body) {
      var attempt = 0;
      function once() {
        var headers = {
          "X-TFS-FedAuthRedirect": "Suppress",
          "X-VSS-ReauthenticationAction": "Suppress",
          Accept: "application/json",
        };
        if (body !== undefined) headers["Content-Type"] = "application/json";
        return env.fetch(env.origin + url, {
          method: method, credentials: "same-origin", headers: headers,
          body: body === undefined ? undefined : JSON.stringify(body),
        }).then(function (res) {
          if ((res.status === 429 || res.status === 503) && attempt < 4) {
            attempt += 1;
            return env.sleep(1000 * Math.pow(2, attempt)).then(once);
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

    // The whole iteration tree, flattened: every node with the folders
    // above it, so a sprint filed in the wrong folder is still found.
    function flatten(rootNode, p) {
      var out = [];
      (function walk(node, rel) {
        (node.children || []).forEach(function (n) {
          var path = rel.concat(n.name);
          out.push({ node: n, rel: path, shown: [p.project].concat(path).join("\\") });
          walk(n, path);
        });
      })(rootNode || {}, []);
      return out;
    }
    function folderRel(p) { return String(p.iteration_root).split("\\").slice(1); }
    function same(a, b) { return a.join("/") === b.join("/"); }

    function read(p) {
      return Promise.all([
        call("GET", base(p) + "/_apis/wit/classificationnodes/iterations?$depth=10&" + API),
        call("GET", teamIterations(p) + "?" + API),
      ]).then(function (r) {
        var all = flatten(r[0], p);
        var selected = {};
        ((r[1] && r[1].value) || []).forEach(function (t) { selected[t.id] = true; });
        return { all: all, selected: selected, folder: folderRel(p) };
      });
    }

    // What exists, and what each sprint in the list needs.
    function plan(sprints, p) {
      var problems = validate(sprints, p);
      if (problems.length) {
        problems.forEach(env.log);
        return Promise.reject(new Error("The sprint list or profile is not valid: " + problems.length + " problem(s) above."));
      }
      return read(p).then(function (t) {
        if (t.folder.length && !t.all.some(function (x) { return same(x.rel, t.folder); })) {
          throw new Error("The folder " + p.iteration_root + " does not exist: create it, or set iteration_root to the project.");
        }
        var inFolder = t.all.filter(function (x) { return same(x.rel.slice(0, -1), t.folder); });
        var byName = {};
        inFolder.forEach(function (x) { byName[x.node.name] = x.node; });
        // What Azure DevOps already holds, and which sprint it counts today
        // in, so the calendar is checked against the project before
        // anything is added beside it.
        var today = env.today();
        var current = [];
        var existing = t.all.map(function (x) {
          var a = x.node.attributes || {};
          var start = day(a.startDate), end = day(a.finishDate);
          var now = start && end && start <= today && today <= end;
          if (now) current.push(x.shown);
          return { path: x.shown, start: start || "-", end: end || "-",
            team: t.selected[x.node.identifier] ? "selected" : "", today: now ? "today" : "" };
        });
        env.log("Already in Azure DevOps: " + existing.length + " iteration(s).");
        if (existing.length) env.table(existing);
        env.log("Today, " + today + ", Azure DevOps is in: " + (current.join(", ") || "no sprint") +
          ". LPio's calendar puts today in " + (sprints.filter(function (s) {
            return s.start <= today && today <= s.end; }).map(function (s) { return name(s.code); })[0] || "none of the listed sprints") + ".");
        var rows = sprints.map(function (s) {
          var node = byName[name(s.code)];
          var row = { sprint: name(s.code), start: s.start, end: s.end, action: "", node: node || null };
          var clash = t.all.filter(function (x) {
            var a = x.node.attributes || {};
            return x.node !== node && day(a.startDate) && day(a.finishDate) &&
              day(a.startDate) <= s.end && s.start <= day(a.finishDate);
          })[0];
          if (!node && clash) {
            row.action = "leave: its dates overlap " + clash.shown + " (" + day(clash.node.attributes.startDate) +
              " to " + day(clash.node.attributes.finishDate) + "); fix or settle that one first";
          } else if (!node) row.action = "create and select";
          else {
            var a = node.attributes || {};
            if (day(a.startDate) !== s.start || day(a.finishDate) !== s.end) {
              row.action = "leave: Azure DevOps has " + (day(a.startDate) || "no start") +
                " to " + (day(a.finishDate) || "no end") + "; correct it there, then run again";
            } else if (!t.selected[node.identifier]) row.action = "select for the team";
            else row.action = "skip (exists and selected)";
          }
          return row;
        });
        env.table(rows.map(function (x) { return { sprint: x.sprint, start: x.start, end: x.end, action: x.action }; }));
        return rows;
      });
    }

    // Turns one existing iteration - a sprint created by mistake, in the
    // wrong folder or under the wrong name - into the listed sprint:
    // moved into iteration_root, renamed "Sprint <code>" and given that
    // sprint's dates. Work items already in it move with it. "from" is a
    // path as plan prints it, or a part of the name that matches one
    // iteration only. Asks once; changes nothing else.
    function fix(sprints, p, from, code) {
      var s = (sprints || []).filter(function (x) { return x.code === code; })[0];
      if (!s) return Promise.reject(new Error("Sprint " + code + " is not in the sprint list."));
      return read(p).then(function (t) {
        var hits = t.all.filter(function (x) { return x.shown === from; });
        if (!hits.length) hits = t.all.filter(function (x) { return x.node.name.indexOf(from) > -1; });
        if (hits.length !== 1) {
          throw new Error((hits.length ? hits.length + " iterations match" : "No iteration matches") +
            " \"" + from + "\": give the path exactly as plan prints it.");
        }
        var hit = hits[0];
        var target = t.all.filter(function (x) {
          return same(x.rel.slice(0, -1), t.folder) && x.node.name === name(code);
        })[0];
        if (target && target.node !== hit.node) {
          throw new Error(target.shown + " already exists: nothing was changed.");
        }
        var move = !same(hit.rel.slice(0, -1), t.folder);
        var line = hit.shown + " becomes " + [p.iteration_root, name(code)].join("\\") +
          ", " + s.start + " to " + s.end + (move ? ", moved into " + p.iteration_root : "");
        env.log(line);
        if (!env.confirm(line + "?")) { env.log("Nothing was changed."); return null; }
        var moved = move ? call("POST", nodes(p) + "?" + API, { id: hit.node.id }) : Promise.resolve(hit.node);
        return moved.then(function () {
          return call("PATCH", nodes(p) + "/" + encodeURIComponent(hit.node.name) + "?" + API, {
            name: name(code),
            attributes: { startDate: s.start + "T00:00:00Z", finishDate: s.end + "T00:00:00Z" },
          });
        }).then(function (n) {
          env.log("Done. Run plan again: " + name(code) + " should now show as existing.");
          return { from: hit.shown, to: [p.iteration_root, name(code)].join("\\"), moved: move, identifier: n && n.identifier };
        });
      });
    }

    function apply(sprints, p) {
      return plan(sprints, p).then(function (rows) {
        var todo = rows.filter(function (x) { return x.action === "create and select" || x.action === "select for the team"; });
        var done = rows.filter(function (x) { return x.action === "skip (exists and selected)"; })
          .map(function (x) { return x.sprint.slice(7); });
        function result(made) {
          var codes = done.concat(made).sort();
          var out = {
            created: todo.filter(function (x) { return x.action === "create and select"; }).map(function (x) { return x.sprint; }),
            selected: made.map(name),
            team_sprints: codes,
            left: rows.filter(function (x) { return x.action.indexOf("leave") === 0; }).map(function (x) { return x.sprint; }),
          };
          env.log("Hand this back so the push can use them: team_sprints = " + JSON.stringify(codes));
          return out;
        }
        if (!todo.length) { env.log("Nothing to create or select."); return result([]); }
        var creates = todo.filter(function (x) { return x.action === "create and select"; }).length;
        if (!env.confirm("Create " + creates + " sprint(s) and select " + todo.length +
            " for the team " + p.team + "?")) {
          env.log("Nothing was changed.");
          return { created: [], selected: [], team_sprints: done.sort(), left: [] };
        }
        var made = [];
        return todo.reduce(function (chain, x) {
          return chain.then(function () {
            var node = x.node ? Promise.resolve(x.node) : call("POST", nodes(p) + "?" + API, {
              name: x.sprint,
              attributes: { startDate: x.start + "T00:00:00Z", finishDate: x.end + "T00:00:00Z" },
            });
            return node.then(function (n) {
              return call("POST", teamIterations(p) + "?" + API, { id: n.identifier });
            }).then(function () {
              made.push(x.sprint.slice(7));
              env.log(x.sprint + ": " + (x.node ? "selected" : "created and selected"));
            });
          });
        }, Promise.resolve()).then(function () { return result(made); }, function (e) {
          env.log("Stopped: " + e.message + ". Done before it: " + (made.join(", ") || "nothing") + ".");
          throw e;
        });
      });
    }

    return { plan: plan, apply: apply, fix: fix };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { create: create, validate: validate };
    return;
  }
  root.LPioSprints = create({
    origin: root.location.origin,
    fetch: root.fetch.bind(root),
    sleep: function (ms) { return new Promise(function (done) { root.setTimeout(done, ms); }); },
    confirm: function (question) { return root.confirm(question); },
    log: function (line) { root.console.log(line); },
    table: function (rows) { root.console.table(rows); },
    today: function () { return new Date().toISOString().slice(0, 10); },
  });
})(typeof window !== "undefined" ? window : globalThis);
