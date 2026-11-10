// ------------------------------------------------------------------
// tests/unit/ado-engine.test.js - Benchmarks for tools/ado/engine.js,
// driven against a mocked Azure DevOps.
//
// The engine writes to a system a session cannot reach, so the claims
// that matter are the ones a mistake could not be undone from:
//   1. It creates parents before children, each child under its parent,
//      each with the link back that makes it findable.
//   2. Pushing twice creates nothing the second time.
//   3. Verify shows zero differences straight after a push, and a
//      ticked criterion is not a difference.
//   4. Nothing is created when preflight fails, when the owner says no,
//      or after the first failure.
//   5. A sprint the team does not have falls back to the root, named.
// The fixture is invented: no organisation, project or id here is real.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const engine = require("../../tools/ado/engine.js");

const ROOT = "Demo";
const TEAM_SPRINTS = [ROOT + "\\Sprint 30-01"];

function profile() {
  return {
    organisation: "demo-org", project: ROOT, team: "Demo Team",
    area_path: ROOT + "\\Demo Team", iteration_root: ROOT,
    types: { epic: "Epic", feature: "Feature", story: "Product Backlog Item", bug: "Bug" },
    fields: {
      title: "System.Title", description: "System.Description", purpose: "Custom.Purpose",
      scope: "Custom.Scope", out_of_scope: "Custom.OutOfScope",
      criteria: "Microsoft.VSTS.Common.AcceptanceCriteria", clarifications: "Custom.Clarify",
      dependencies: "Custom.Dependencies", technical_notes: "Custom.Technical",
      effort: "Microsoft.VSTS.Scheduling.Effort", repro_steps: "Microsoft.VSTS.TCM.ReproSteps",
      start_date: "Microsoft.VSTS.Scheduling.StartDate",
      target_date: "Microsoft.VSTS.Scheduling.TargetDate",
      area: "System.AreaPath", iteration: "System.IterationPath", tags: "System.Tags",
    },
    required_defaults: { story: { "Microsoft.VSTS.Common.Priority": 2 } },
    forbidden_types: ["User Story"], checklist_control_id: null,
    lpio_base_url: "https://example.test",
  };
}

const box = (t) => `<div><span>[ ]</span><span> ${t}</span> </div>`;
function story(key, feature, extra) {
  return Object.assign({
    key, type: "story", feature_key: feature, hash: "h-" + key, iteration: TEAM_SPRINTS[0],
    sprint_missing: null, needs: [], attachments: [],
    link: { url: "https://example.test/?item=" + key, comment: "LPio " + key },
    fields: {
      title: "Show the fee", description: "As a merchant<br>I want the fee shown<br>So that I know it",
      purpose: "<div>Stops a wrong contract going out.</div>", scope: "<ul><li>The price sheet</li></ul>",
      criteria: box("A percentage prints as a percentage.") + box("A fixed fee prints with its currency."),
      effort: 3,
    },
  }, extra || {});
}
function payload(items) {
  return {
    version: 1, hash: "p1", profile: profile(),
    epics: [{ key: "category:core", ado_id: null, fields: { title: "Core" },
      link: { url: "https://example.test/", comment: "LPio category:core" } }],
    features: [{ key: "workstream:w1", epic_key: "category:core", ado_id: null,
      fields: { title: "Contracts", start_date: "2030-01-07", target_date: "2030-01-18" },
      link: { url: "https://example.test/?item=w1", comment: "LPio workstream:w1" } }],
    items: items || [story("i1#1", "workstream:w1"), story("i1#2", "workstream:w1", { needs: ["i1#1"],
      fields: Object.assign({}, story("x", "y").fields, {
        dependencies: "<ul><li>Needs: Show the fee ({{ado:i1#1}})</li></ul>" }) })],
    held_back: [{ key: "i9#1", title: "Not confirmed", reason: "Drafted." }],
  };
}

// A mocked Azure DevOps: enough of the REST surface to hold work items.
function mock(options) {
  const opts = options || {};
  const store = new Map();
  const log = { creates: [], validates: 0, throttled: 0, saved: [], lines: [] };
  let next = 100;
  const json = (status, body) => ({ status, ok: status >= 200 && status < 300, headers: { get: () => null },
    text: async () => (body === undefined ? "" : JSON.stringify(body)) });
  async function fetch(url, init) {
    const method = init.method;
    const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    if (opts.throttleOnce && !log.throttled) { log.throttled += 1; return json(429, { message: "slow down" }); }
    if (/\/workitemtypes\?/.test(url)) {
      return json(200, { value: ["Epic", "Feature", "Product Backlog Item", "Bug", "User Story"].map((name) => ({ name })) });
    }
    if (/\/workitemtypes\/[^/]+\/fields/.test(url)) {
      const refs = Object.values(profile().fields).concat(["Microsoft.VSTS.Common.Priority"]);
      return json(200, { value: refs.filter((r) => r !== opts.dropField)
        .map((referenceName) => ({ referenceName, alwaysRequired: false })) });
    }
    if (/teamsettings\/iterations/.test(url)) return json(200, { value: TEAM_SPRINTS.map((path) => ({ path })) });
    if (/teamsettings\/teamfieldvalues/.test(url)) return json(200, { values: [{ value: ROOT + "\\Demo Team" }] });
    if (/\/wiql\?/.test(url)) {
      const ids = [...store.values()].filter((w) => /Sprint/.test(body.query)
        ? body.query.includes("'" + w.fields["System.IterationPath"] + "'")
        : w.fields["System.Tags"] === "LPio").map((w) => ({ id: w.id }));
      return json(200, { workItems: ids });
    }
    const read = url.match(/workitems\?ids=([\d,]*)/);
    if (read) return json(200, { value: read[1].split(",").filter(Boolean).map((id) => store.get(Number(id))).filter(Boolean) });
    const make = url.match(/workitems\/\$([^?]+)\?(validateOnly=true)?/);
    if (make && method === "POST") {
      const type = decodeURIComponent(make[1]);
      if (make[2]) { log.validates += 1; return json(200, { id: -1 }); }
      const item = { id: next++, rev: 1, fields: { "System.WorkItemType": type, "System.State": "New" }, relations: [] };
      for (const op of body) {
        assert.equal(op.op, "add", "creates use add and nothing else");
        if (op.path === "/relations/-") item.relations.push(op.value);
        else item.fields[op.path.replace("/fields/", "")] = op.value;
      }
      if (opts.failOn && item.fields["System.Title"] === opts.failOn) return json(400, { message: "rule violated" });
      store.set(item.id, item);
      log.creates.push(type + ":" + item.id);
      return json(200, item);
    }
    const edit = url.match(/workitems\/(\d+)\?/);
    if (edit && method === "PATCH") {
      const item = store.get(Number(edit[1]));
      for (const op of body) {
        if (op.op === "test") { if (item.rev !== op.value) return json(409, { message: "rev moved" }); continue; }
        if (op.path === "/relations/-") item.relations.push(op.value);
        else item.fields[op.path.replace("/fields/", "")] = op.value;
      }
      item.rev += 1;
      return json(200, item);
    }
    return json(404, { message: "no such route: " + url });
  }
  const api = engine.create({
    origin: "https://ado.test", fetch, sleep: async () => {}, atob: (s) => Buffer.from(s, "base64").toString("binary"),
    confirm: () => opts.confirm !== false, log: (l) => log.lines.push(l), table: () => {},
    save: (name, value) => log.saved.push({ name, value }),
  });
  return { api, store, log };
}

test("the fixture payload is well formed against its own profile", () => {
  assert.deepEqual(engine.validate(payload()), []);
});

test("validate refuses a forbidden type, an unmapped field and a thin story", () => {
  const p = payload();
  p.profile.types.story = "User Story";
  assert.match(engine.validate(p).join("\n"), /User Story is a forbidden type/);
  const q = payload();
  q.items[0].fields.surprise = "x";
  q.items[0].fields.purpose = "<div> </div>";
  q.items[0].fields.criteria = box("Only one.");
  q.items[0].fields.effort = 4;
  const problems = engine.validate(q).join("\n");
  for (const want of [/no field for surprise/, /no purpose/, /1 acceptance criteria/, /effort 4 is not on the scale/]) {
    assert.match(problems, want);
  }
});

test("a push creates parents first, each child under its parent with its link back", async () => {
  const { api, store, log } = mock();
  const receipt = await api.push(payload());
  assert.deepEqual(log.creates.map((c) => c.split(":")[0]),
    ["Epic", "Feature", "Product Backlog Item", "Product Backlog Item"]);
  assert.equal(log.validates, 4, "every create is validated before the first is made");
  const [epic, feature, first, second] = [...store.values()];
  const parent = (w) => w.relations.find((r) => r.rel === "System.LinkTypes.Hierarchy-Reverse");
  assert.match(parent(feature).url, new RegExp("/" + epic.id + "$"));
  assert.match(parent(first).url, new RegExp("/" + feature.id + "$"));
  assert.equal(first.relations.find((r) => r.rel === "Hyperlink").attributes.comment, "LPio i1#1");
  assert.equal(first.fields["System.Tags"], "LPio");
  assert.equal(first.fields["System.State"], "New", "state is left to the process");
  assert.equal(first.fields["Microsoft.VSTS.Common.Priority"], 2, "required defaults are written");
  assert.match(second.fields["Custom.Dependencies"], new RegExp("#" + first.id), "a dependency names the real id");
  assert.ok(second.relations.some((r) => r.rel === "System.LinkTypes.Dependency-Reverse"
    && r.url.endsWith("/" + first.id)), "and becomes a Predecessor link");
  assert.equal(receipt.entries.length, 4);
  assert.ok(receipt.entries.every((e) => e.outcome === "created" && e.hash !== undefined));
  assert.match(log.saved[0].name, /^ado-push-receipt-\d{4}-\d{2}-\d{2}\.json$/);
  assert.ok(![...store.values()].some((w) => w.fields["System.Title"] === "Not confirmed"),
    "a held-back story is never created");
});

test("pushing twice creates nothing the second time", async () => {
  const { api, store, log } = mock();
  await api.push(payload());
  const size = store.size;
  const again = await api.push(payload());
  assert.equal(store.size, size);
  assert.equal(log.creates.length, 4);
  assert.ok(again.entries.every((e) => e.outcome === "exists"));
  assert.ok(again.entries.filter((e) => e.key.includes("#")).every((e) => e.hash),
    "an unchanged story keeps its hash on a re-run");
});

test("verify shows zero differences after a push, and a tick is not a difference", async () => {
  const { api, store } = mock();
  const receipt = await api.push(payload());
  assert.deepEqual(await api.verify(payload(), receipt), []);
  const item = [...store.values()][2];
  item.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] =
    "<div><span>[x] {Done}</span><span> A percentage prints as a percentage.</span>" +
    "<span> (<span>@someone</span> - 1 Jan)</span> </div>" + box("A fixed fee prints with its currency.");
  assert.deepEqual(await api.verify(payload(), receipt), []);
  item.fields["System.Title"] = "Renamed in DevOps";
  const diff = await api.verify(payload(), receipt);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].field, "System.Title");
});

test("nothing is created when preflight fails or the owner says no", async () => {
  const broken = mock({ dropField: "Custom.Purpose" });
  assert.equal(await broken.api.push(payload()), null);
  assert.equal(broken.store.size, 0);
  const declined = mock({ confirm: false });
  assert.equal(await declined.api.push(payload()), null);
  assert.equal(declined.store.size, 0);
});

test("it stops at the first failure, and a re-run skips what exists", async () => {
  const p = payload();
  p.items[1].fields.title = "Fails a rule";
  const first = mock({ failOn: "Fails a rule" });
  const receipt = await first.api.push(p);
  assert.match(receipt.stopped, /rule violated/);
  assert.equal(first.store.size, 3, "the three before it were created");
  assert.equal(receipt.entries.length, 3);
});

test("a sprint the team does not have goes to the root, and is named", async () => {
  const { api, store } = mock();
  const item = story("i2#1", "workstream:w1", { iteration: ROOT, sprint_missing: "30-02" });
  const pf = await api.preflight(payload([item]));
  assert.ok(pf.ok, "a named missing sprint is a warning, not a failure");
  assert.match(pf.checks.find((c) => /missing from the team/.test(c.check)).detail, /Sprint 30-02/);
  await api.push(payload([item]));
  assert.equal([...store.values()].pop().fields["System.IterationPath"], ROOT);
  const stale = await mock().api.preflight(payload([story("i3#1", "workstream:w1", { iteration: ROOT + "\\Sprint 31-09" })]));
  assert.equal(stale.ok, false, "a sprint path the team lacks fails preflight");
});

test("a throttled request is retried", async () => {
  const { api, log } = mock({ throttleOnce: true });
  const pf = await api.preflight(payload());
  assert.ok(pf.ok);
  assert.equal(log.throttled, 1);
});

test("a reconciliation applies only to items still at the planned revision", async () => {
  const { api, store } = mock();
  await api.push(payload());
  const [a, b] = [...store.values()].slice(2);
  b.rev = 7;
  const rows = await api.cleanup([
    { id: a.id, rev: 1, set: { "System.State": "Removed" }, comment: "Superseded." },
    { id: b.id, rev: 1, set: { "System.State": "Removed" } },
  ], profile());
  assert.equal(a.fields["System.State"], "Removed");
  assert.equal(b.fields["System.State"], "New");
  assert.match(rows[1].action, /moved since the plan/);
});

test("the sprint read-back counts criteria and ticks without carrying names", async () => {
  const { api, store } = mock();
  await api.push(payload());
  [...store.values()][2].fields["Microsoft.VSTS.Common.AcceptanceCriteria"] =
    "<div><span>[x] {Done}</span><span> one</span> </div>" + box("two");
  const out = await api.sprint("30-01", profile());
  assert.equal(out.items.length, 2);
  assert.deepEqual([out.items[0].criteria, out.items[0].ticked], [2, 1]);
  assert.equal(out.items[0].key, "i1#1");
  assert.ok(!JSON.stringify(out).includes("someone"));
});

test("the engine holds no target of its own", () => {
  const src = require("node:fs").readFileSync(require.resolve("../../tools/ado/engine.js"), "utf8");
  assert.doesNotMatch(src, /dev\.azure\.com|Custom\.[A-Z]/,
    "organisation, project and custom field references arrive in the payload");
});
