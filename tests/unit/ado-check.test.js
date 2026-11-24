// ------------------------------------------------------------------
// tests/unit/ado-check.test.js - Benchmarks for tools/ado/check.js,
// driven against a mocked Azure DevOps.
//
// The check reads a live project the owner signs in to, so the claims
// that matter are:
//   1. It writes nothing: GETs, and POSTs only to the WIQL query.
//   2. It keeps no person: no name or email reaches the result.
//   3. Each board rule in docs/DEVOPS.md has its own CHECK line.
//   4. A section that fails is reported and the rest still runs; a
//      signed-out page is named as such.
// The fixture is invented: no organisation, project or id here is real.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const check = require("../../tools/ado/check.js");

const PROFILE = { organisation: "demo-org", project: "Demo", team: "Team A",
  fields: { effort: "Microsoft.VSTS.Scheduling.Effort" } };
const DEV = { uniqueName: "dev@example.com", displayName: "Dev Example" };
const OWNER = { uniqueName: "owner@example.com", displayName: "Owner Example" };
const STATES = { New: "Proposed", Approved: "Proposed", Committed: "InProgress", Blocked: "InProgress",
  Done: "Completed", "Not Completed": "Removed", Removed: "Removed" };
function sprint(id, n, start, finish, timeFrame) {
  return { id, name: "Sprint " + n, path: "Demo\\Sprint " + n, attributes: { startDate: start + "T00:00:00Z", finishDate: finish + "T00:00:00Z", timeFrame } };
}
function item(id, type, state, extra) {
  return Object.assign({ id, fields: Object.assign({ "System.WorkItemType": type, "System.State": state, "System.Title": "Item " + id,
    "System.AssignedTo": DEV, "Microsoft.VSTS.Scheduling.Effort": 2, "System.CreatedBy": OWNER }, (extra || {}).fields),
    relations: (extra || {}).relations || [] });
}
const ITEMS = {
  11: item(11, "Product Backlog Item", "Committed"),
  21: item(21, "Product Backlog Item", "Committed", { fields: { "System.Tags": "Ready for test" },
    relations: [{ rel: "ArtifactLink", attributes: { name: "Pull Request" } }] }),
  22: item(22, "Bug", "Done", { fields: { "Microsoft.VSTS.Scheduling.Effort": 1,
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<div>[x] {Done} one</div><div>[ ] two</div>" } }),
  23: item(23, "Product Backlog Item", "New", { fields: { "System.AssignedTo": OWNER, "Microsoft.VSTS.Scheduling.Effort": undefined } }),
  24: item(24, "Task", "To Do", { fields: { "System.AssignedTo": undefined, "Microsoft.VSTS.Scheduling.Effort": undefined } }),
  31: item(31, "Product Backlog Item", "New"),
};
const SPRINT_ITEMS = { "Sprint 1": [11], "Sprint 2": [21, 22, 23, 24], "Sprint 3": [31], "Sprint 4": [] };

function ado(fail) {
  const calls = [];
  const saved = [];
  const env = {
    origin: "https://dev.azure.com", log: () => {}, table: () => {},
    save: (name, value) => saved.push({ name, value }),
    fetch(url, opts) {
      calls.push({ method: opts.method, url });
      const reply = (body, status) => Promise.resolve({ ok: !status, status: status || 200,
        text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)) });
      const failed = fail && fail(url);
      if (failed) return failed;
      if (/analytics\.dev\.azure\.com/.test(url)) return reply({ value: [
        { DateSK: 20261123, StateCategory: "InProgress", Points: 4, Items: 2 },
        { DateSK: 20261124, StateCategory: "InProgress", Points: 3, Items: 1 },
        { DateSK: 20261124, StateCategory: "Completed", Points: 1, Items: 1 }] });
      if (/\/teams\/Team%20A\/members\?/.test(url)) return reply({ value: [{ identity: DEV }, { identity: OWNER }] });
      if (/\/_apis\/projects\/Demo\/teams\/Team%20A\?/.test(url)) return reply({ id: "team-1" });
      if (/\/teamsettings\?/.test(url)) return reply({ bugsBehavior: 1, workingDays: [1, 2, 3, 4, 5], defaultIteration: { name: "Sprint 2" } });
      if (/\/backlogconfiguration\?/.test(url)) return reply({ requirementBacklog: { workItemTypes: [{ name: "Product Backlog Item" }] },
        bugWorkItems: { workItemTypes: [{ name: "Bug" }] },
        workItemTypeMappedStates: [{ workItemTypeName: "Product Backlog Item", states: STATES }, { workItemTypeName: "Bug", states: STATES }] });
      if (/\/iterations\/i2\/capacities\?/.test(url)) return reply({ teamMembers: [{ teamMember: DEV, activities: [{ capacityPerDay: 0 }], daysOff: [] }] });
      if (/\/iterations\/i2\/teamdaysoff\?/.test(url)) return reply({ daysOff: [] });
      if (/\/teamsettings\/iterations\?/.test(url)) return reply({ value: [sprint("i1", 1, "2026-11-09", "2026-11-20", "past"),
        sprint("i2", 2, "2026-11-23", "2026-12-04", "current"), sprint("i3", 3, "2026-12-07", "2026-12-18", "future"),
        sprint("i4", 4, "2026-12-21", "2027-01-01", "future")] });
      if (/classificationnodes\/iterations/.test(url)) return reply({ name: "Demo", children: [1, 2, 3, 4, 5].map((n) =>
        ({ name: "Sprint " + n, attributes: { startDate: n === 5 ? "2027-01-04T00:00:00Z" : "2026-11-09T00:00:00Z" } })) });
      if (/\/work\/boards\/b1\/columns\?/.test(url)) return reply({ value: [
        { name: "New", columnType: "incoming", stateMappings: { "Product Backlog Item": "New", Bug: "New" } },
        { name: "Committed", columnType: "inProgress", stateMappings: { "Product Backlog Item": "Committed", Bug: "Committed" } },
        { name: "Done", columnType: "outgoing", stateMappings: { "Product Backlog Item": "Done", Bug: "Done" } }] });
      if (/\/work\/boards\?/.test(url)) return reply({ value: [{ id: "b1", name: "Backlog items" }] });
      if (/Entries\/me\/BurndownReport/.test(url)) return reply({ AggregationSettings: { identifier: 1, settings: "Microsoft.VSTS.Scheduling.OriginalEstimate" },
        WorkItemTypeFilter: { identifier: "BacklogCategory", settings: "Microsoft.TaskCategory" } });
      if (/\/dashboards\/d1\?/.test(url)) return reply({ widgets: [
        { name: "Story Burndown", contributionId: "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.AnalyticsSprintBurndownWidget",
          settings: JSON.stringify({ aggregation: { identifier: 1, settings: "Microsoft.VSTS.Scheduling.Effort" },
            workItemTypeFilter: { identifier: "BacklogCategory", settings: "Microsoft.RequirementCategory" },
            iterationPath: "Demo\\Sprint 2", isCustomized: true, setBy: "owner@example.com" }) },
        { name: "Task Burndown", contributionId: "ms.vss-dashboards-web.Microsoft.VisualStudioOnline.Dashboards.AnalyticsSprintBurndownWidget",
          settings: JSON.stringify({ aggregation: { identifier: 0, settings: "" },
            workItemTypeFilter: { identifier: "BacklogCategory", settings: "Microsoft.TaskCategory" },
            iterationPath: "Demo\\Sprint 0", isCustomized: true }) }] });
      if (/\/dashboard\/dashboards\?/.test(url)) return reply({ value: [{ id: "d1", name: "Overview" }] });
      if (/\/wit\/wiql\?/.test(url)) {
        const name = JSON.parse(opts.body).query.match(/Sprint \d/)[0];
        return reply({ workItems: SPRINT_ITEMS[name].map((id) => ({ id })) });
      }
      const ids = (url.match(/workitems\?ids=([\d,]+)/) || [])[1];
      if (ids) return reply({ value: ids.split(",").map((id) => ITEMS[id]) });
      return reply({ message: "unexpected " + url }, 404);
    },
  };
  return { calls, saved, run: check.create(env) };
}

test("check: reads only - no writes, and POSTs only to the WIQL query", async () => {
  const m = ado();
  await m.run.run(PROFILE, { developer: "dev@example.com", capacity: 24 });
  assert.ok(m.calls.length > 10);
  assert.ok(m.calls.every((c) => c.method === "GET" || c.method === "POST"));
  assert.ok(m.calls.filter((c) => c.method === "POST").every((c) => /\/_apis\/wit\/wiql\?/.test(c.url)));
  assert.ok(!m.calls.some((c) => /analytics\.dev\.azure\.com/.test(c.url)), "Analytics is read only when asked");
  assert.match(m.saved[0].name, /^ado-check-\d{4}-\d{2}-\d{2}\.json$/);
});

test("check: keeps no person", async () => {
  const m = ado();
  const out = await m.run.run(PROFILE, { developer: "dev@example.com" });
  const text = JSON.stringify(out);
  ["dev@example.com", "owner@example.com", "Dev Example", "Owner Example"].forEach((who) => assert.ok(!text.includes(who), who));
  assert.equal(out.items.find((i) => i.id === 21).developer, true);
  assert.equal(out.items.find((i) => i.id === 23).developer, false);
});

test("check: the verdict names each broken rule", async () => {
  const m = ado();
  const out = await m.run.run(PROFILE, { developer: "dev@example.com", capacity: 24, analytics: true });
  const v = out.verdict.join("\n");
  assert.match(v, /OK +Bugs are managed with requirements/);
  assert.match(v, /CHECK +Not assigned to the developer: #23\./);
  assert.match(v, /CHECK +No Effort: #23\./, "the Task's missing Effort is not counted");
  assert.match(v, /CHECK +Done with criteria not ticked: #22\./);
  assert.match(v, /CHECK +Done without a linked pull request: #22\./);
  assert.match(v, /CHECK +Left open in Sprint 1: #11/);
  assert.match(v, /CHECK +Sprints that exist but are not selected for the team: Sprint 5\./);
  assert.match(v, /CHECK +Your sprint burndown sums OriginalEstimate over Tasks/);
  assert.match(v, /NOTE +Committed: 1 items, 2 points \(capacity 24\)\./);
  assert.match(v, /NOTE +In the sprint, not committed: #23\./);
  assert.match(v, /NOTE +Ready for test: #21\./);
  assert.match(v, /OK +Widget 'Story Burndown' on Overview shows Effort on backlog items for this sprint\./);
  assert.match(v, /CHECK +Widget 'Task Burndown' on Overview counts items, covers Tasks, is pinned to Sprint 0: set it to Backlog items, Sum of Effort and the current sprint\./);
  assert.match(v, /NOTE +Analytics burndown, 2026-11-24: 3 points remaining, 1 completed\./);
  assert.match(out.verdict[out.verdict.length - 1], /^Something needs a look/);
});

test("check: a failing section is reported and the rest still runs", async () => {
  const m = ado((url) => {
    if (/\/dashboard\/dashboards\?/.test(url)) return Promise.resolve({ ok: false, status: 500, text: () => Promise.resolve('{"message":"boom"}') });
    if (/analytics\.dev\.azure\.com/.test(url)) return Promise.reject(new TypeError("Failed to fetch"));
    return null;
  });
  const out = await m.run.run(PROFILE, { developer: "dev@example.com", analytics: true });
  const v = out.verdict.join("\n");
  assert.match(v, /CHECK +Could not read dashboards: boom\./);
  assert.match(v, /NOTE +Could not read analytics: Failed to fetch\./, "Analytics is a note, not a fault");
  assert.match(v, /CHECK +Not assigned to the developer: #23\./, "the items were still read");
});

test("check: a signed-out page is named as such", async () => {
  const m = ado(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("<html>Sign in</html>") }));
  const out = await m.run.run(PROFILE, { developer: "dev@example.com" });
  assert.match(out.errors.team, /signed out\? refresh the page, sign in and run again/);
});

test("check: a sprint set up our way reads ALL GOOD", () => {
  const v = check.verdict({
    team: { bugs: "asRequirements" }, members: { developer_member: true },
    states: { "Product Backlog Item": STATES }, requirement_types: ["Product Backlog Item"],
    sprints: { all: [{ path: "Demo\\Sprint 2" }, { path: "Demo\\Sprint 3" }, { path: "Demo\\Sprint 4" }], past: [],
      current: { name: "Sprint 2", start: "2026-11-23", finish: "2026-12-04" },
      future: [{ name: "Sprint 3" }, { name: "Sprint 4" }] },
    items: [{ id: 1, type: "Product Backlog Item", sprint: "Sprint 2", state: "Committed", effort: 3, developer: true, tags: [],
      criteria_open: 2, pull_requests: 0 }],
    burndown: { AggregationSettings: { settings: "Microsoft.VSTS.Scheduling.Effort" }, WorkItemTypeFilter: { settings: "Microsoft.RequirementCategory" } },
    dashboards: [], errors: {},
  }, { developer: "dev@example.com", capacity: 24, today: "2026-11-24" });
  assert.ok(!v.some((line) => /^CHECK/.test(line)), v.join("\n"));
  assert.match(v[v.length - 1], /^ALL GOOD/);
});
