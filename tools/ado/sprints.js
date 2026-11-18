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

    // What exists, and what each sprint in the list needs.
    function plan(sprints, p) {
      var problems = validate(sprints, p);
      if (problems.length) {
        problems.forEach(env.log);
        return Promise.reject(new Error("The sprint list or profile is not valid: " + problems.length + " problem(s) above."));
      }
      return Promise.all([
        call("GET", nodes(p) + "?$depth=1&" + API),
        call("GET", teamIterations(p) + "?" + API),
      ]).then(function (r) {
        var children = (r[0] && r[0].children) || [];
        var byName = {};
        children.forEach(function (n) { byName[n.name] = n; });
        var selected = {};
        ((r[1] && r[1].value) || []).forEach(function (t) { selected[t.id] = true; });
        // What Azure DevOps already holds, and which sprint it counts today
        // in, so the calendar is checked against the project before
        // anything is added beside it.
        var today = env.today();
        var current = [];
        var existing = children.map(function (n) {
          var a = n.attributes || {};
          var start = day(a.startDate), end = day(a.finishDate);
          var now = start && end && start <= today && today <= end;
          if (now) current.push(n.name);
          return { sprint: n.name, start: start || "-", end: end || "-",
            team: selected[n.identifier] ? "selected" : "", today: now ? "today" : "" };
        });
        env.log("Already in Azure DevOps under " + p.iteration_root + ": " + existing.length + " sprint(s).");
        if (existing.length) env.table(existing);
        env.log("Today, " + today + ", Azure DevOps is in: " + (current.join(", ") || "no sprint") +
          ". LPio's calendar puts today in " + (sprints.filter(function (s) {
            return s.start <= today && today <= s.end; }).map(function (s) { return name(s.code); })[0] || "none of the listed sprints") + ".");
        var rows = sprints.map(function (s) {
          var node = byName[name(s.code)];
          var row = { sprint: name(s.code), start: s.start, end: s.end, action: "", node: node || null };
          var clash = children.filter(function (n) {
            var a = n.attributes || {};
            return n.name !== row.sprint && day(a.startDate) && day(a.finishDate) &&
              day(a.startDate) <= s.end && s.start <= day(a.finishDate);
          })[0];
          if (!node && clash) {
            row.action = "leave: its dates overlap " + clash.name + " (" + day(clash.attributes.startDate) +
              " to " + day(clash.attributes.finishDate) + "); settle which naming the team uses first";
          } else if (!node) row.action = "create and select";
          else {
            var a = node.attributes || {};
            if (day(a.startDate) !== s.start || day(a.finishDate) !== s.end) {
              row.action = "leave: Azure DevOps has " + (day(a.startDate) || "no start") +
                " to " + (day(a.finishDate) || "no end") + "; correct it there, then run again";
            } else if (!selected[node.identifier]) row.action = "select for the team";
            else row.action = "skip (exists and selected)";
          }
          return row;
        });
        env.table(rows.map(function (x) { return { sprint: x.sprint, start: x.start, end: x.end, action: x.action }; }));
        return rows;
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

    return { plan: plan, apply: apply };
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
