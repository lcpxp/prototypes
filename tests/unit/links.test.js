// ------------------------------------------------------------------
// tests/unit/links.test.js - The typed knowledge graph, resolved.
//
// Before this module, roadmap.js selected knowledge_links WITHOUT
// from_type/to_type and resolved the far end through a work-items map,
// and platform.js resolved capability-to-capability only. Seven entity
// types give 49 ordered pairs and exactly two of them rendered, so a
// work item linked to a capability, a term or a document showed
// nothing - and the graph stopped growing, because a link nobody can
// see is not worth recording. These benchmarks pin every pair.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// Objects built inside the vm have that realm's prototypes, so
// assert.deepEqual on them fails on identity alone. Round-tripping
// through JSON compares the values, which is what these assert about.
const plain = (v) => JSON.parse(JSON.stringify(v));

function load() {
  const sandbox = { window: null, navigator: {}, setTimeout, Promise };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  vm.runInContext(read("assets/js/core/links.js"), sandbox, { filename: "links.js" });
  return sandbox.App;
}
const App = load();

const link = (over) => Object.assign({
  from_type: "work_item", from_id: "w1", to_type: "capability", to_id: "c1",
  kind: "affects", note: "", confidence: "confirmed",
}, over);

test("a link is indexed under both of its ends", () => {
  const index = App.links.index([link()]);
  assert.deepEqual(Object.keys(index).sort(), ["capability:c1", "work_item:w1"]);
  assert.equal(index["work_item:w1"][0].reads, "Affects");
  assert.equal(index["capability:c1"][0].reads, "Affected by",
    "the end pointed AT reads the inverse");
});

test("a symmetric kind reads the same from either end", () => {
  const index = App.links.index([link({ kind: "relates_to" })]);
  assert.equal(index["work_item:w1"][0].reads, "Related to");
  assert.equal(index["capability:c1"][0].reads, "Related to");
});

test("each end records what type the other end is", () => {
  const index = App.links.index([link()]);
  assert.equal(index["work_item:w1"][0].otherType, "capability");
  assert.equal(index["capability:c1"][0].otherType, "work_item");
});

test("every registered entity type can be indexed", () => {
  // The regression guard: 49 ordered pairs, all of which must survive
  // indexing. Two of them used to render and the rest vanished.
  const types = Object.keys(App.registry.linkEntities);
  assert.equal(types.length, 7);
  const rows = [];
  types.forEach((from, i) => types.forEach((to, j) => {
    rows.push(link({ from_type: from, from_id: "a" + i, to_type: to, to_id: "b" + j,
      kind: "relates_to" }));
  }));
  const index = App.links.index(rows);
  types.forEach((type, i) => {
    assert.ok(index[type + ":a" + i], `${type} must be indexable as a source`);
    assert.ok(index[type + ":b" + i], `${type} must be indexable as a target`);
  });
});

test("an unknown kind is dropped rather than rendered as a raw key", () => {
  assert.deepEqual(plain(App.links.index([link({ kind: "invented_kind" })])), {});
});

test("a half-formed row cannot produce a one-ended link", () => {
  assert.deepEqual(plain(App.links.index([link({ to_id: null })])), {});
  assert.deepEqual(plain(App.links.index([link({ from_type: null })])), {});
});

test("targets groups everything the index reaches, by type", () => {
  const index = App.links.index([
    link(),
    link({ to_type: "term", to_id: "t1" }),
    link({ from_id: "w2", to_type: "term", to_id: "t1" }),
  ]);
  const targets = plain(App.links.targets(index));
  assert.deepEqual(targets.term, ["t1"], "ids are de-duplicated");
  assert.deepEqual(targets.capability, ["c1"]);
  assert.deepEqual(targets.work_item.sort(), ["w1", "w2"]);
});

test("loadTitles skips ids the caller already holds", () => {
  // The roadmap has every work item's title in memory. Without this it
  // re-queried forty rows it was holding, to look up names it had.
  const queried = [];
  App.db = { from: (table) => ({ select: () => ({ in: (col, ids) => {
    queried.push({ table, ids: ids.slice().sort() });
    return Promise.resolve({ data: [] });
  } }) }) };
  const index = App.links.index([
    link({ to_type: "work_item", to_id: "w9" }),
    link({ to_type: "term", to_id: "t1" }),
  ]);
  return App.links.loadTitles(index, {
    "work_item:w9": "already known", "work_item:w1": "also known",
  }).then(() => {
    const tables = queried.map((q) => q.table);
    assert.ok(!tables.includes("work_items"),
      "a type whose every id is already known must not be queried at all");
    assert.deepEqual(tables, ["domain_terms"]);
    assert.deepEqual(plain(queried[0].ids), ["t1"]);
  });
});

test("loadTitles with nothing known still fetches everything", () => {
  const queried = [];
  App.db = { from: (table) => ({ select: () => ({ in: (col, ids) => {
    queried.push(table);
    return Promise.resolve({ data: [] });
  } }) }) };
  return App.links.loadTitles(App.links.index([link()])).then(() => {
    assert.deepEqual(queried.sort(), ["product_capabilities", "work_items"]);
  });
});

test("resolve names the target, its type and where it opens", () => {
  const index = App.links.index([link()]);
  const out = App.links.resolve(index["work_item:w1"][0],
    { "capability:c1": "Screening" }, "../..");
  assert.equal(out.title, "Screening");
  assert.equal(out.typeLabel, "Capability");
  assert.equal(out.resolved, true);
  assert.match(out.href, /modules\/platform\/index\.html#capability-c1$/);
});

test("a target that cannot be read still names its type", () => {
  const index = App.links.index([link({ to_type: "stage", to_id: "s1" })]);
  const out = App.links.resolve(index["work_item:w1"][0], {}, "");
  assert.equal(out.title, "Journey stage (not readable)");
  assert.equal(out.resolved, false,
    "the caller can tell a real name from a placeholder");
});

test("a type with no page resolves to no href, never a dead link", () => {
  // `note` is the only one left: a note always renders inside the thing
  // it is about, so it has no standalone page to open.
  const index = App.links.index([link({ to_type: "note", to_id: "n1" })]);
  const out = App.links.resolve(index["work_item:w1"][0], { "note:n1": "A decision" }, "");
  assert.equal(out.title, "A decision");
  assert.equal(out.href, "", "a link to nowhere would lie about the relationship");
});

test("each anchored type addresses its own row, not its module's default", () => {
  // The trap: routing every type through App.itemHref would send a term
  // to #capability-<id>, because that is what the platform module does
  // for its primary entity.
  const cases = {
    term: /modules\/platform\/index\.html#term-x$/,
    stage: /modules\/platform\/index\.html#stage-x$/,
    area: /modules\/platform\/index\.html#area-x$/,
    capability: /modules\/platform\/index\.html#capability-x$/,
    document: /modules\/backlog\/index\.html#document-x$/,
    work_item: /modules\/roadmap\/index\.html\?item=x$/,
  };
  for (const [type, pattern] of Object.entries(cases)) {
    assert.match(App.linkHref(type, "x", "../.."), pattern, type);
  }
});

test("a note rides along, because on distinct_from it is the reason", () => {
  const index = App.links.index([link({
    kind: "distinct_from", note: "Different platform; no shared code.",
  })]);
  assert.equal(index["work_item:w1"][0].note, "Different platform; no shared code.");
  assert.equal(index["capability:c1"][0].note, "Different platform; no shared code.");
});

test("links sort by family then kind, so a drawer reads the same every time", () => {
  const index = App.links.index([
    link({ to_id: "c3", kind: "relates_to" }),
    link({ to_id: "c2", kind: "part_of" }),
    link({ to_id: "c4", kind: "blocks" }),
  ]);
  // association, then hierarchy, then sequence.
  assert.deepEqual(plain(index["work_item:w1"]).map((l) => l.kind),
    ["relates_to", "part_of", "blocks"]);
});

test("every entity type declares the column that stands in for a title", () => {
  for (const [key, entity] of Object.entries(App.registry.linkEntities)) {
    assert.ok(entity.table, `${key}: needs a table`);
    assert.ok(entity.titleColumn, `${key}: needs a title column, or it renders blank`);
    assert.ok(entity.label, `${key}: needs a label for the unresolvable case`);
  }
});
