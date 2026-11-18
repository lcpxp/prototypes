// ------------------------------------------------------------------
// tests/unit/ado-survey.test.js - Benchmarks for tools/ado/survey.js,
// driven against a mocked Azure DevOps.
//
// The survey reads a real project and its result comes back to a
// session, so the claims that matter are:
//   1. It only reads: no request changes anything.
//   2. No person survives into the result - not as a field, a value or
//      a sample.
//   3. It says how each type is written: which fields are filled, the
//      values a picklist holds, the headings long fields use, and what
//      items are parented to.
// The fixture is invented: no organisation, project or id here is real.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const survey = require("../../tools/ado/survey.js");

const PROFILE = { organisation: "demo-org", project: "Demo", team: "Demo Team",
  types: { epic: "Epic", feature: "Feature", story: "Product Backlog Item", bug: "Bug" } };
const PERSON = { displayName: "Someone Real", uniqueName: "someone@example.test" };

const ITEMS = {
  1: { id: 1, fields: { "System.WorkItemType": "Feature", "System.Title": "Contracts" } },
  10: { id: 10, fields: { "System.WorkItemType": "Bug", "System.Title": "Fee prints wrong",
    "System.AssignedTo": PERSON, "System.CreatedBy": PERSON, "Microsoft.VSTS.Common.Severity": "3 - Medium",
    "System.IterationPath": "Demo\\Sprint 30-01", "System.Tags": "Contracts; Urgent",
    "Microsoft.VSTS.TCM.ReproSteps": "<div><b>Steps to reproduce</b></div><div>Open the contract.</div><div><b>Expected</b></div><div>4.5%</div>" },
    relations: [{ rel: "System.LinkTypes.Hierarchy-Reverse", url: "https://ado.example/_apis/wit/workItems/1" }] },
  11: { id: 11, fields: { "System.WorkItemType": "Bug", "System.Title": "Date a day early",
    "Microsoft.VSTS.Common.Severity": "2 - High", "System.IterationPath": "Demo",
    "Microsoft.VSTS.TCM.ReproSteps": "Steps to reproduce:<br>Pick the 26th.<br>Expected:<br>The 26th." } },
};

function ado() {
  const calls = [];
  const saved = [];
  const env = {
    origin: "https://ado.example", today: () => "2030-01-09", log: () => {},
    save: (name, value) => saved.push({ name, value }),
    fetch(url, opts) {
      const path = url.replace("https://ado.example", "");
      calls.push({ method: opts.method, path });
      const reply = (body) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
      if (/\/_apis\/work\/teamsettings\?/.test(path)) return reply({ bugsBehavior: "asRequirements", backlogVisibilities: {} });
      if (/\/_apis\/wit\/wiql/.test(path)) {
        const type = (JSON.parse(opts.body).query.match(/WorkItemType\] = '([^']+)'/) || [])[1];
        const ids = Object.values(ITEMS).filter((i) => i.fields["System.WorkItemType"] === type).map((i) => ({ id: i.id }));
        return reply({ workItems: ids });
      }
      if (/\/fields\?/.test(path)) return reply({ value: [{ referenceName: "Custom.Scope", name: "Scope", alwaysRequired: false }] });
      const ids = (path.match(/workitems\?ids=([\d,]*)/) || [])[1];
      if (ids !== undefined) return reply({ value: ids.split(",").filter(Boolean).map((id) => ITEMS[id]).filter(Boolean) });
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("{}") });
    },
  };
  return { calls, saved, run: survey.create(env) };
}

test("it only reads, and hands the result back as one file", async () => {
  const { calls, saved, run } = ado();
  await run.run(PROFILE);
  assert.ok(calls.every((c) => c.method === "GET" || /\/_apis\/wit\/wiql/.test(c.path)),
    "every request is a read; the only POST is a query");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "ado-survey-2030-01-09.json");
});

test("no person survives into the result", async () => {
  const { saved, run } = ado();
  await run.run(PROFILE);
  const text = JSON.stringify(saved[0].value);
  assert.doesNotMatch(text, /Someone Real|someone@example\.test/);
  assert.doesNotMatch(text, /System\.AssignedTo|System\.CreatedBy/);
});

test("it says how each type is written", async () => {
  const { saved, run } = ado();
  const out = await run.run(PROFILE);
  const bug = out.types.Bug.summary;
  assert.equal(bug.items, 2);
  assert.equal(bug.in_a_sprint, 1);
  assert.deepEqual(bug.parent_types, { Feature: 1 });
  assert.deepEqual(bug.fields["Microsoft.VSTS.Common.Severity"].values.map((v) => v.value).sort(),
    ["2 - High", "3 - Medium"]);
  const steps = bug.fields["Microsoft.VSTS.TCM.ReproSteps"].headings.map((h) => h.value);
  assert.ok(steps.includes("Steps to reproduce") && steps.includes("Expected"));
  assert.deepEqual(bug.fields["System.Tags"].values.map((v) => v.value).sort(), ["Contracts", "Urgent"]);
  assert.equal(out.types.Bug.samples.length, 2);
  assert.equal(saved.length, 1);
});
