// ------------------------------------------------------------------
// tests/unit/ado-correct.test.js - Benchmarks for tools/ado/correct.js,
// driven against a mocked Azure DevOps.
//
// A correction writes over work items someone may already be using, so
// the claims that matter are:
//   1. Only fields whose text differs are written; Effort and
//      Dependencies never are.
//   2. An item edited in Azure DevOps since the push is asked about,
//      and left alone when the answer is no.
//   3. Every write is guarded by the revision just read.
//   4. The receipt records each story's new revision and hash, and an
//      unchanged story still has its hash refreshed.
// The fixture is invented: no organisation, project or id here is real.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const correct = require("../../tools/ado/correct.js");

const PROFILE = { organisation: "demo-org", project: "Demo",
  fields: { title: "System.Title", description: "System.Description",
    criteria: "Microsoft.VSTS.Common.AcceptanceCriteria", effort: "Microsoft.VSTS.Scheduling.Effort",
    dependencies: "Custom.Dependencies" } };

function payload() {
  return { correction: true, profile: PROFILE, items: [
    { key: "a#1", id: 101, type: "story", hash: "h1", pushed_rev: 1, fields: {
      title: "Sites and their MCC", description: "<p><strong>Sites</strong></p>As a reviewer",
      criteria: "<div><span>[ ]</span><span> Sites: each site is listed.</span> </div>",
      effort: 3, dependencies: "<ul><li>Needs: x</li></ul>" } },
    { key: "b#1", id: 102, type: "story", hash: "h2", pushed_rev: 1, fields: {
      title: "Event fees only", description: "As a merchant", effort: 1 } },
    { key: "c#1", id: 103, type: "bug", hash: "h3", pushed_rev: 1, fields: {
      title: "Unchanged", criteria: "<div><span>[ ]</span><span> Works.</span> </div>" } },
  ] };
}

const CURRENT = {
  101: { id: 101, rev: 1, fields: { "System.State": "New", "System.Title": "Sites and their MCC",
    "System.Description": "As a reviewer", "Microsoft.VSTS.Common.AcceptanceCriteria": "old",
    "Microsoft.VSTS.Scheduling.Effort": 5, "Custom.Dependencies": "" } },
  102: { id: 102, rev: 4, fields: { "System.State": "New", "System.Title": "Old title",
    "System.Description": "As a merchant<br>Specifically EVENT only" } },
  103: { id: 103, rev: 1, fields: { "System.State": "New", "System.Title": "Unchanged",
    "Microsoft.VSTS.Common.AcceptanceCriteria": "<div><span>[x] {Done}</span><span> Works.</span></div>" } },
};

function ado(answers) {
  const calls = [];
  const saved = [];
  const asked = [];
  const env = {
    origin: "https://ado.example", log: () => {}, table: () => {},
    confirm: (q) => { asked.push(q); return answers.shift(); },
    save: (name, value) => saved.push({ name, value }),
    fetch(url, opts) {
      const path = url.replace("https://ado.example", "");
      calls.push({ method: opts.method, path, body: opts.body ? JSON.parse(opts.body) : null });
      const reply = (body) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
      const ids = (path.match(/workitems\?ids=([\d,]*)/) || [])[1];
      if (ids !== undefined) return reply({ value: ids.split(",").map((id) => CURRENT[id]) });
      const patched = (path.match(/workitems\/(\d+)\?/) || [])[1];
      if (patched) return reply({ id: Number(patched), rev: CURRENT[patched].rev + 1 });
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("{}") });
    },
  };
  return { calls, saved, asked, run: correct.create(env) };
}

test("correct: refuses a payload that is not a correction", async () => {
  const m = ado([]);
  await assert.rejects(m.run.run({ profile: PROFILE, items: [] }), /ado_correction_payload/);
  assert.equal(m.calls.length, 0);
});

test("correct: writes only differing fields, never Effort or Dependencies, guarded by the revision", async () => {
  const m = ado([false, true]);
  const receipt = await m.run.run(payload());
  const patches = m.calls.filter((c) => c.method === "PATCH");
  assert.equal(patches.length, 1, "the edited item was declined, the unchanged one needs nothing");
  const ops = patches[0].body;
  assert.deepEqual(ops[0], { op: "test", path: "/rev", value: 1 });
  const refs = ops.slice(1).map((o) => o.path);
  assert.deepEqual(refs.sort(), ["/fields/Microsoft.VSTS.Common.AcceptanceCriteria", "/fields/System.Description"]);
  assert.ok(!refs.some((r) => /Effort|Dependencies/.test(r)));
  assert.equal(m.asked.length, 2);
  assert.match(m.asked[0], /\b102\b/, "the item edited since the push is named");
  const keys = receipt.entries.map((e) => e.key + ":" + e.rev).sort();
  assert.deepEqual(keys, ["a#1:2", "c#1:1"], "corrected at its new revision; unchanged keeps its own");
  assert.ok(receipt.entries.every((e) => e.outcome === "updated"));
  assert.match(m.saved[0].name, /^ado-correction-receipt-/);
});

test("correct: an edited item is overwritten only when the owner says yes", async () => {
  const m = ado([true, true]);
  await m.run.run(payload());
  const patched = m.calls.filter((c) => c.method === "PATCH").map((c) => c.path.match(/workitems\/(\d+)/)[1]);
  assert.deepEqual(patched.sort(), ["101", "102"]);
  const ops = m.calls.find((c) => c.method === "PATCH" && /102/.test(c.path)).body;
  assert.deepEqual(ops[0], { op: "test", path: "/rev", value: 4 }, "guarded by the revision just read");
});

test("correct: a ticked criterion is not a difference", () => {
  assert.equal(correct.text("<div><span>[x] {Done}</span><span> Works.</span></div>"),
    correct.text("<div><span>[ ]</span><span> Works.</span> </div>"));
});

test("correct: an edit made since the push is kept, unless it is already folded into LPio", async () => {
  const pl = payload();
  pl.items[1].pushed_fields = { title: "Old title", description: "As a merchant" };
  pl.items[1].folded = ["description"];
  pl.items[0].pushed_fields = { criteria: "pushed", description: "As a reviewer" };
  const m = ado([true]);
  const receipt = await m.run.run(pl);
  const patch102 = m.calls.find((c) => c.method === "PATCH" && /102/.test(c.path));
  const refs102 = patch102.body.slice(1).map((o) => o.path);
  assert.deepEqual(refs102.sort(), ["/fields/System.Description", "/fields/System.Title"],
    "the folded description and the untouched title are written");
  const patch101 = m.calls.find((c) => c.method === "PATCH" && /101/.test(c.path));
  assert.deepEqual(patch101.body.slice(1).map((o) => o.path), ["/fields/System.Description"],
    "criteria edited since the push are kept");
  const e101 = receipt.entries.find((e) => e.id === 101);
  assert.equal(e101.outcome, "kept");
  assert.deepEqual(e101.kept, ["criteria"]);
  assert.equal(m.asked.length, 1, "pushed text known: nothing to ask about the edited item");
});
