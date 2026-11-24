// ------------------------------------------------------------------
// tools/ado/check.js - Reads how the project and the sprints around
// today are set up, and checks them against how we run a sprint
// (docs/DEVOPS.md, Every sprint, and its board rules).
//
// READ-ONLY and DATA-FREE, like tools/ado/survey.js: it writes nothing
// to Azure DevOps and holds no organisation, project or id. It never
// keeps a person: an assignee is kept only as whether it is the
// developer named in the run, and every other identity is dropped.
//
//   await LPioCheck.run(PROFILE, { developer: "<email>", capacity: 24 })
//
// PROFILE is ado_profile's organisation, project, team and fields. It
// reads the process's states, the team's settings and sprints, the
// board's columns, the sprint burndown setting of whoever runs it, the
// dashboards' widgets, the current sprint's capacity, every item in the
// sprints either side of today and the Effort burndown from Analytics,
// then prints a verdict: OK, NOTE or CHECK per line. The result
// downloads as ado-check-<date>.json to hand back to the session.
// ------------------------------------------------------------------
(function (root) {
  "use strict";

  var API = "api-version=7.1";
  var DASHBOARDS = "api-version=7.1-preview.3";
  var REQUIREMENTS = "Microsoft.RequirementCategory";
  var TIDY = ["Not Completed", "Deferred", "Rejected", "Removed"];
  var TIMEFRAME = { 0: "past", 1: "current", 2: "future" };

  function isPerson(v) {
    return !!v && typeof v === "object" && ("uniqueName" in v || "displayName" in v);
  }
  // Identities dropped wherever they sit; an email in free text masked.
  function anon(v) {
    if (Array.isArray(v)) return v.map(anon);
    if (isPerson(v)) return "a person";
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).forEach(function (k) { if (!/^(_links|url|imageUrl|avatar|descriptor)$/.test(k)) o[k] = anon(v[k]); });
      return o;
    }
    if (typeof v === "string") return v.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "a person");
    return v;
  }
  // A criteria checklist's ticks: "[ ]" open, "[x]" done.
  function ticks(html) {
    var s = String(html || "");
    return { open: (s.match(/\[ \]/g) || []).length, done: (s.match(/\[x\]/gi) || []).length };
  }
  function day(iso) { return iso ? String(iso).slice(0, 10) : null; }
  function dateSK(d) { return String(d).slice(0, 10).replace(/-/g, ""); }
  function chunks(list, size) {
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }
  function list(items) { return items.map(function (i) { return "#" + i.id; }).join(", "); }
  function points(items) { return items.reduce(function (s, i) { return s + Number(i.effort || 0); }, 0); }
  function bugsWithRequirements(b) { return b === 1 || b === "asRequirements"; }

  // One work item as the check keeps it: no text beyond the title, no person.
  function summarise(w, sprint, dev, effortRef) {
    var f = w.fields || {};
    var rel = w.relations || [];
    var a = f["System.AssignedTo"];
    var t = ticks(f["Microsoft.VSTS.Common.AcceptanceCriteria"]);
    function links(re) {
      return rel.filter(function (r) { return r.rel === "ArtifactLink" && re.test((r.attributes || {}).name || ""); }).length;
    }
    return {
      id: w.id, type: f["System.WorkItemType"], title: String(f["System.Title"] || "").slice(0, 80), sprint: sprint,
      state: f["System.State"], reason: f["System.Reason"], effort: f[effortRef],
      hours: { original: f["Microsoft.VSTS.Scheduling.OriginalEstimate"], remaining: f["Microsoft.VSTS.Scheduling.RemainingWork"] },
      developer: !!(dev && isPerson(a) && String(a.uniqueName || "").toLowerCase() === dev), assigned: !!a,
      tags: String(f["System.Tags"] || "").split(";").map(function (x) { return x.trim(); }).filter(Boolean),
      rank: f["Microsoft.VSTS.Common.BacklogPriority"], column: f["System.BoardColumn"], parent: f["System.Parent"] || null,
      state_changed: day(f["Microsoft.VSTS.Common.StateChangeDate"]), closed: day(f["Microsoft.VSTS.Common.ClosedDate"]),
      criteria_open: t.open, criteria_done: t.done,
      pull_requests: links(/pull request/i), commits: links(/commit/i),
      children: rel.filter(function (r) { return r.rel === "System.LinkTypes.Hierarchy-Forward"; }).length,
    };
  }

  // The verdict on what was read, against docs/DEVOPS.md. Pure, so the
  // tests can hold each rule to it.
  function verdict(d, options) {
    var o = options || {};
    var v = [];
    var checks = 0;
    function say(kind, text) { v.push((kind + "      ").slice(0, 7) + text); if (kind === "CHECK") checks++; }
    var effortRef = o.effortRef || "Microsoft.VSTS.Scheduling.Effort";
    var effortName = effortRef.split(".").pop();
    function category(i) { return ((d.states || {})[i.type] || {})[i.state]; }
    function backlogItem(i) { return (d.requirement_types || []).indexOf(i.type) >= 0; }
    Object.keys(d.errors || {}).forEach(function (name) {
      say(name === "analytics" ? "NOTE" : "CHECK", "Could not read " + name + ": " + d.errors[name] + ".");
    });
    if (d.team) {
      if (bugsWithRequirements(d.team.bugs)) say("OK", "Bugs are managed with requirements, so they count in the backlog and the burndown.");
      else say("CHECK", "Bugs are not managed with requirements, so they drop out of the backlog and the burndown: Team configuration, Working with bugs.");
    }
    var s = d.sprints || {};
    var current = s.current;
    if (d.team && !current) say("CHECK", "No sprint is current for the team today.");
    if (current) say("NOTE", "Current sprint: " + current.name + ", " + current.start + " to " + current.finish + ".");
    if (current && (s.future || []).length < 2) say("CHECK", "Only " + (s.future || []).length + " sprint(s) after this one are selected for the team; keep two ahead (sprints.js).");
    var today = o.today || new Date().toISOString().slice(0, 10);
    var selected = (s.all || []).map(function (x) { return x.path; });
    var unselected = (d.project_sprints || []).filter(function (x) { return x.start && x.start >= today && selected.indexOf(x.path) < 0; });
    if (unselected.length) say("CHECK", "Sprints that exist but are not selected for the team: " + unselected.map(function (x) { return x.name; }).join(", ") + ".");
    if (d.members && o.developer && !d.members.developer_member) say("NOTE", "The developer is not a member of the team; assignment by email still works.");
    var items = d.items || [];
    if (current) {
      var here = items.filter(function (i) { return i.sprint === current.name; });
      var backlog = here.filter(backlogItem);
      if (!here.length) say("NOTE", "The current sprint holds no items.");
      if (o.developer && backlog.length) {
        var notDev = backlog.filter(function (i) { return !i.developer; });
        say(notDev.length ? "CHECK" : "OK", notDev.length ? "Not assigned to the developer: " + list(notDev) + "." : "Every item in the sprint is assigned to the developer.");
      }
      var noEffort = backlog.filter(function (i) { return i.effort === undefined || i.effort === null || i.effort === ""; });
      say(noEffort.length ? "CHECK" : "OK", noEffort.length ? "No Effort: " + list(noEffort) + "." : "Every item in the sprint has its Effort.");
      var tidy = here.filter(function (i) { return TIDY.indexOf(i.state) >= 0; });
      if (tidy.length) say("CHECK", "Tidy-up states in the sprint (never used): " + tidy.map(function (i) { return "#" + i.id + " " + i.state; }).join(", ") + ".");
      var committed = backlog.filter(function (i) { return i.state === (o.committed || "Committed"); });
      var done = backlog.filter(function (i) { return category(i) === "Completed"; });
      var waiting = backlog.filter(function (i) { return category(i) === "Proposed"; });
      say("NOTE", "Committed: " + committed.length + " items, " + points(committed) + " points" + (o.capacity ? " (capacity " + o.capacity + ")" : "") + ".");
      say("NOTE", done.length ? "Done: " + done.length + " items, " + points(done) + " points." : "Nothing Done yet.");
      if (waiting.length) say("NOTE", "In the sprint, not committed: " + list(waiting) + ".");
      var blocked = here.filter(function (i) { return i.state === "Blocked"; });
      if (blocked.length) say("NOTE", "Blocked: " + list(blocked) + ".");
      var testing = here.filter(function (i) { return i.tags.some(function (t) { return /^ready for test$/i.test(t); }); });
      if (testing.length) say("NOTE", "Ready for test: " + list(testing) + ".");
      var unticked = done.filter(function (i) { return i.criteria_open > 0; });
      if (unticked.length) say("CHECK", "Done with criteria not ticked: " + list(unticked) + ".");
      var noPr = done.filter(function (i) { return i.pull_requests === 0; });
      if (noPr.length) say("CHECK", "Done without a linked pull request: " + list(noPr) + ".");
    }
    var last = (s.past || []).slice(-1)[0];
    if (last) {
      var left = items.filter(function (i) { return i.sprint === last.name && ["Completed", "Removed"].indexOf(category(i)) < 0; });
      say(left.length ? "CHECK" : "OK", left.length ? "Left open in " + last.name + ": " + list(left) + "; move them on (Every sprint, step 8)." : "Nothing left open in " + last.name + ".");
    }
    (s.future || []).slice(0, 2).forEach(function (f) {
      var next = items.filter(function (i) { return i.sprint === f.name && backlogItem(i); });
      say("NOTE", f.name + ": " + next.length + " items, " + points(next) + " points.");
    });
    var board = (d.board || []).filter(function (b) {
      return b.columns.some(function (c) { return Object.keys(c.states || {}).some(function (t) { return (d.requirement_types || []).indexOf(t) >= 0; }); });
    })[0];
    if (board) say("NOTE", "Board columns: " + board.columns.map(function (c) { return c.name; }).join(", ") + ".");
    var b = d.burndown;
    if (!b || !b.AggregationSettings) say("NOTE", "Your sprint burndown has no saved setting: check it shows Backlog items and Sum of " + effortName + ".");
    else if ((b.WorkItemTypeFilter || {}).settings === REQUIREMENTS && b.AggregationSettings.settings === effortRef) say("OK", "Your sprint burndown sums " + effortName + " over backlog items.");
    else say("CHECK", "Your sprint burndown sums " + String(b.AggregationSettings.settings || "a count").split(".").pop() + " over " +
      String((b.WorkItemTypeFilter || {}).settings || "?").replace(/^Microsoft\./, "").replace(/Category$/, "s") +
      ": open its full report and set Backlog items and Sum of " + effortName + ". It is saved per person.");
    var widgets = [];
    (d.dashboards || []).forEach(function (x) { (x.widgets || []).forEach(function (w) { widgets.push(w); }); });
    var burn = widgets.filter(function (w) { return /burn(down|up)/i.test(w.contribution || ""); });
    var onEffort = burn.filter(function (w) { return String(w.settings || "").indexOf(effortName) >= 0; });
    if (!burn.length) say("NOTE", "No burndown widget on the team's dashboards; one on " + effortName + " gives everyone the same view.");
    else say(onEffort.length ? "OK" : "CHECK", burn.length + " burndown widget(s) on the dashboards, " + onEffort.length + " on " + effortName + ".");
    var a = (d.analytics || []).slice(-1)[0];
    if (a) say("NOTE", "Analytics burndown, " + a.date + ": " + a.remaining + " points remaining, " + a.completed + " completed.");
    v.push(checks ? "Something needs a look: see the CHECK lines." : "ALL GOOD: the setup matches how we run a sprint.");
    return v;
  }

  function create(env) {
    function call(method, url, body, cross) {
      return env.fetch(url, { method: method, credentials: cross ? "include" : "same-origin",
        headers: { "X-TFS-FedAuthRedirect": "Suppress", Accept: "application/json", "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined })
        .then(function (r) {
          return r.text().then(function (t) {
            var d = null;
            try { d = t ? JSON.parse(t) : null; } catch (e) { d = undefined; }
            if (!r.ok || d === undefined) {
              var m = (d && d.message) || ("answered " + r.status);
              if (d === undefined || /TF400813|not authorized/i.test(m)) m += " (signed out? refresh the page, sign in and run again)";
              throw new Error(m);
            }
            return d || {};
          });
        });
    }

    function run(p, options) {
      var o = options || {};
      var dev = o.developer ? String(o.developer).toLowerCase() : null;
      var effortRef = (p.fields && p.fields.effort) || "Microsoft.VSTS.Scheduling.Effort";
      var base = env.origin + "/" + encodeURIComponent(p.organisation);
      var proj = base + "/" + encodeURIComponent(p.project);
      var team = proj + "/" + encodeURIComponent(p.team);
      var out = { read_on: new Date().toISOString(), team: null, members: null, states: {}, requirement_types: [],
        sprints: { all: [], past: [], current: null, future: [] }, project_sprints: [], board: [], burndown: null,
        dashboards: [], capacity: null, items: [], analytics: null, errors: {} };
      var teamId = null;
      function step(name, fn) {
        return function () { return Promise.resolve().then(fn).catch(function (e) { out.errors[name] = String((e && e.message) || e); }); };
      }
      env.log("Reading the setup...");
      return Promise.resolve()
        .then(step("team", function () {
          return call("GET", base + "/_apis/projects/" + encodeURIComponent(p.project) + "/teams/" + encodeURIComponent(p.team) + "?" + API)
            .then(function (t) { teamId = t.id; });
        }))
        .then(step("team settings", function () {
          return call("GET", team + "/_apis/work/teamsettings?" + API).then(function (s) {
            out.team = { bugs: s.bugsBehavior, working_days: s.workingDays, backlogs: s.backlogVisibilities,
              default_sprint: (s.defaultIteration || {}).name || null, default_macro: s.defaultIterationMacro || null };
          });
        }))
        .then(step("members", function () {
          return call("GET", base + "/_apis/projects/" + encodeURIComponent(p.project) + "/teams/" + encodeURIComponent(p.team) + "/members?$top=500&" + API)
            .then(function (r) {
              var people = (r.value || []).map(function (m) { return m.identity || m; });
              out.members = { count: people.length, developer_member: !!dev && people.some(function (x) { return String(x.uniqueName || "").toLowerCase() === dev; }) };
            });
        }))
        .then(step("backlog configuration", function () {
          return call("GET", team + "/_apis/work/backlogconfiguration?" + API).then(function (c) {
            (c.workItemTypeMappedStates || []).forEach(function (m) { out.states[m.workItemTypeName] = m.states; });
            var req = ((c.requirementBacklog || {}).workItemTypes || []).map(function (t) { return t.name; });
            var bugs = ((c.bugWorkItems || {}).workItemTypes || []).map(function (t) { return t.name; });
            out.requirement_types = req.concat(out.team && bugsWithRequirements(out.team.bugs) ? bugs.filter(function (x) { return req.indexOf(x) < 0; }) : []);
          });
        }))
        .then(step("sprints", function () {
          return call("GET", team + "/_apis/work/teamsettings/iterations?" + API).then(function (r) {
            var all = (r.value || []).map(function (i) {
              var a = i.attributes || {};
              return { id: i.id, name: i.name, path: i.path, start: day(a.startDate), finish: day(a.finishDate), timeframe: TIMEFRAME[a.timeFrame] || a.timeFrame };
            });
            out.sprints = { all: all, past: all.filter(function (x) { return x.timeframe === "past"; }),
              current: all.filter(function (x) { return x.timeframe === "current"; })[0] || null,
              future: all.filter(function (x) { return x.timeframe === "future"; }) };
          });
        }))
        .then(step("project sprints", function () {
          return call("GET", proj + "/_apis/wit/classificationnodes/iterations?$depth=3&" + API).then(function (n) {
            (function walk(node, path) {
              (node.children || []).forEach(function (c) {
                var a = c.attributes || {};
                out.project_sprints.push({ name: c.name, path: path + "\\" + c.name, start: day(a.startDate), finish: day(a.finishDate) });
                walk(c, path + "\\" + c.name);
              });
            })(n, p.project);
          });
        }))
        .then(step("board", function () {
          return call("GET", team + "/_apis/work/boards?" + API).then(function (r) {
            return Promise.all((r.value || []).map(function (bd) {
              return call("GET", team + "/_apis/work/boards/" + encodeURIComponent(bd.id) + "/columns?" + API).then(function (c) {
                return { board: bd.name, columns: (c.value || []).map(function (x) {
                  return { name: x.name, type: x.columnType, states: x.stateMappings, limit: x.itemLimit, split: x.isSplit }; }) };
              });
            })).then(function (boards) { out.board = boards; });
          });
        }))
        .then(step("burndown setting", function () {
          if (!teamId) throw new Error("the team was not read");
          return call("GET", base + "/_apis/Settings/team/" + teamId + "/Entries/me/BurndownReport")
            .then(function (s) { out.burndown = s && s.AggregationSettings ? anon(s) : null; });
        }))
        .then(step("dashboards", function () {
          return call("GET", team + "/_apis/dashboard/dashboards?" + DASHBOARDS).then(function (r) {
            return Promise.all((r.value || r.dashboardEntries || []).map(function (x) {
              return call("GET", team + "/_apis/dashboard/dashboards/" + encodeURIComponent(x.id) + "?" + DASHBOARDS).then(function (full) {
                return { name: x.name, widgets: (full.widgets || []).map(function (w) {
                  return { name: w.name, contribution: w.contributionId, settings: anon(String(w.settings || "")).slice(0, 1500) }; }) };
              });
            })).then(function (ds) { out.dashboards = ds; });
          });
        }))
        .then(step("capacity", function () {
          var cur = out.sprints.current;
          if (!cur) return null;
          var it = team + "/_apis/work/teamsettings/iterations/" + encodeURIComponent(cur.id);
          return Promise.all([call("GET", it + "/capacities?" + API), call("GET", it + "/teamdaysoff?" + API)]).then(function (x) {
            var people = x[0].teamMembers || x[0].value || [];
            out.capacity = { members: people.map(function (m) {
              var who = m.teamMember || {};
              return { developer: !!dev && String(who.uniqueName || "").toLowerCase() === dev,
                per_day: (m.activities || []).reduce(function (s, a) { return s + Number(a.capacityPerDay || 0); }, 0),
                days_off: (m.daysOff || []).length };
            }), team_days_off: (x[1].daysOff || []).map(function (d) { return { start: day(d.start), end: day(d.end) }; }) };
          });
        }))
        .then(step("items", function () {
          var s = out.sprints;
          var around = s.past.slice(-1).concat(s.current ? [s.current] : [], s.future.slice(0, 2));
          return around.reduce(function (chain, it) {
            return chain.then(function () {
              var q = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.IterationPath] = '" + it.path.replace(/'/g, "''") + "'";
              return call("POST", proj + "/_apis/wit/wiql?" + API, { query: q }).then(function (r) {
                var ids = (r.workItems || []).map(function (w) { return w.id; });
                return chunks(ids, 200).reduce(function (c, part) {
                  return c.then(function () {
                    return call("GET", proj + "/_apis/wit/workitems?ids=" + part.join(",") + "&$expand=relations&errorPolicy=omit&" + API).then(function (b) {
                      (b.value || []).filter(Boolean).forEach(function (w) { out.items.push(summarise(w, it.name, dev, effortRef)); });
                    });
                  });
                }, Promise.resolve());
              });
            });
          }, Promise.resolve());
        }))
        .then(step("analytics", function () {
          var cur = out.sprints.current;
          if (!cur) return null;
          if (!/\/\/dev\.azure\.com$/.test(env.origin)) throw new Error("it is read only from dev.azure.com");
          var types = out.requirement_types.length ? out.requirement_types : ["Product Backlog Item", "Bug"];
          var today = new Date().toISOString().slice(0, 10);
          var to = cur.finish && cur.finish < today ? cur.finish : today;
          var apply = "filter(Iteration/IterationPath eq '" + cur.path.replace(/'/g, "''") + "' and (" +
            types.map(function (t) { return "WorkItemType eq '" + t.replace(/'/g, "''") + "'"; }).join(" or ") +
            ") and DateSK ge " + dateSK(cur.start) + " and DateSK le " + dateSK(to) + ")/groupby((DateSK,StateCategory),aggregate(" +
            effortRef.split(".").pop() + " with sum as Points,$count as Items))";
          var url = env.origin.replace("//dev.azure.com", "//analytics.dev.azure.com") + "/" + encodeURIComponent(p.organisation) + "/" +
            encodeURIComponent(p.project) + "/_odata/v4.0-preview/WorkItemSnapshot?$apply=" + encodeURIComponent(apply);
          return call("GET", url, null, true).then(function (r) {
            var byDay = {};
            (r.value || []).forEach(function (row) {
              var k = String(row.DateSK);
              var x = byDay[k] = byDay[k] || { date: k.slice(0, 4) + "-" + k.slice(4, 6) + "-" + k.slice(6), remaining: 0, completed: 0, items: 0 };
              x.items += Number(row.Items || 0);
              if (row.StateCategory === "Completed") x.completed += Number(row.Points || 0);
              else if (row.StateCategory !== "Removed") x.remaining += Number(row.Points || 0);
            });
            out.analytics = Object.keys(byDay).sort().map(function (k) { return byDay[k]; });
          });
        }))
        .then(function () {
          out.verdict = verdict(out, { developer: dev, capacity: o.capacity, effortRef: effortRef });
          var cur = out.sprints.current;
          env.table(out.items.filter(function (i) { return cur && i.sprint === cur.name; }).map(function (i) {
            return { id: i.id, type: i.type, state: i.state, effort: i.effort, developer: i.developer ? "yes" : "NO",
              tags: i.tags.join(", "), criteria: i.criteria_done + "/" + (i.criteria_done + i.criteria_open), "pull requests": i.pull_requests };
          }));
          env.log(out.verdict.join("\n"));
          env.save("ado-check-" + out.read_on.slice(0, 10) + ".json", out);
          return out;
        });
    }

    return { run: run };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { create: create, verdict: verdict, summarise: summarise, anon: anon, ticks: ticks };
    return;
  }
  root.LPioCheck = create({
    origin: root.location.origin,
    fetch: root.fetch.bind(root),
    log: function (line) { root.console.log(line); },
    table: function (rows) { root.console.table(rows); },
    save: function (name, value) {
      var body = JSON.stringify(value, null, 2);
      root.saveCheck = function () {
        var a = root.document.createElement("a");
        a.href = root.URL.createObjectURL(new root.Blob([body], { type: "application/json" }));
        a.download = name;
        root.document.body.appendChild(a);
        a.click();
        a.remove();
        return name;
      };
      root.saveCheck();
      root.console.log(name + " should be in Downloads: send it to the session. If not, type saveCheck() and press Enter.");
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
