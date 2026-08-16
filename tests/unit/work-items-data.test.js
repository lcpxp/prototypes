// ------------------------------------------------------------------
// tests/unit/work-items-data.test.js - The reads that replace what the
// list pages stopped carrying (docs/plan/80-LOAD-SPEED.md).
//
// The bulk path is the dangerous one. A drawer that fails to load its
// prose shows a message; an export that fails to load it writes a file
// with a blank column and looks exactly like a successful export. So
// these hold the four ways that could happen: asking for the wrong
// rows, asking twice, never asking again for a row the database
// withheld, and swallowing a failed read.
//
// The client is a stub, so every request the loader makes is recorded
// and asserted rather than inferred.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

// A minimal PostgREST-shaped stub: from().select().in()/.eq().order()
// is a thenable, and every call is recorded on `sent`.
function fakeDb(reply) {
  const sent = [];
  const db = {
    from(table) {
      const q = { table, filters: {} };
      sent.push(q);
      const chain = {
        select(cols) { q.select = cols; return chain; },
        in(col, ids) { q.filters[col] = ids.slice(); return chain; },
        eq(col, value) { q.filters[col] = value; return chain; },
        order(col, opts) { q.order = [col, opts]; return chain; },
        then(resolve, reject) {
          return Promise.resolve().then(() => reply(q)).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  return { db, sent };
}

function load(reply) {
  const { db, sent } = fakeDb(reply);
  const sandbox = { window: null, Promise, Object, Array, JSON };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/registry.js"), sandbox,
    { filename: "registry.js" });
  sandbox.App.db = db;
  vm.runInContext(read("assets/js/pages/work-items-data.js"), sandbox,
    { filename: "work-items-data.js" });
  return { data: sandbox.App.workItemsData, sent, tables: sandbox.App.registry.tables };
}

// A value built inside the vm is structurally equal to one built here
// but never reference-equal, so anything compared whole is round-tripped
// into this realm first - the same convention as roadmap-detail.test.js.
function plain(o) { return JSON.parse(JSON.stringify(o)); }

function rows(n, from) {
  const out = [];
  for (let i = 0; i < n; i += 1) out.push({ id: "i" + ((from || 0) + i), title: "T" });
  return out;
}

test("details are fetched only for the rows that do not have them", async () => {
  const { data, sent, tables } = load((q) => ({
    data: q.filters.id.map((id) => ({ id, details: "prose " + id })),
  }));
  const items = [{ id: "a" }, { id: "b", details: "already here" }, { id: "c" }];
  await data.loadForExport(items, ["details"]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].table, tables.workItems);
  assert.equal(sent[0].select, "id, details");
  assert.deepEqual(sent[0].filters.id, ["a", "c"]);
  assert.deepEqual(items.map((i) => i.details),
    ["prose a", "already here", "prose c"]);
});

test("a row whose details are genuinely empty is not asked for again", async () => {
  // The presence rule, and the reason it is presence and not truthiness:
  // guarding on the value asks for an empty field on every export,
  // forever, with nothing ever looking wrong.
  const { data, sent } = load((q) => ({
    data: q.filters.id.map((id) => ({ id, details: null })),
  }));
  const items = [{ id: "a" }];
  await data.loadForExport(items, ["details"]);
  assert.equal(sent.length, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(items[0], "details"), true);
  await data.loadForExport(items, ["details"]);
  assert.equal(sent.length, 1, "the second export must issue no request");
});

test("a row the database withholds is answered, not asked for forever", async () => {
  // RLS can drop a row from the reply. Leaving the key unset means the
  // next export asks again for something it will never be given.
  const { data, sent } = load(() => ({ data: [] }));
  const items = [{ id: "a" }];
  await data.loadForExport(items, ["details"]);
  assert.equal(items[0].details, null);
  await data.loadForExport(items, ["details"]);
  assert.equal(sent.length, 1);
});

test("ids are batched, so a whole board does not become one 10KB URL", async () => {
  const { data, sent } = load((q) => ({
    data: q.filters.id.map((id) => ({ id, details: "x" })),
  }));
  const items = rows(data.BATCH * 2 + 1);
  await data.loadForExport(items, ["details"]);
  assert.equal(sent.length, 3);
  assert.deepEqual(sent.map((q) => q.filters.id.length), [data.BATCH, data.BATCH, 1]);
  assert.equal(items.every((i) => i.details === "x"), true);
});

test("notes are grouped per item and ordered active first", async () => {
  const { data, sent, tables } = load(() => ({
    data: [
      { work_item_id: "a", body: "superseded a", status: "superseded", created_at: "2026-03-01" },
      { work_item_id: "a", body: "newest a", status: "active", created_at: "2026-02-01" },
      { work_item_id: "b", body: "only b", status: "active", created_at: "2026-01-01" },
    ],
  }));
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  await data.loadForExport(items, ["notes"]);
  assert.equal(sent[0].table, tables.workNotes);
  assert.deepEqual(sent[0].filters.work_item_id, ["a", "b", "c"]);
  assert.deepEqual(plain(sent[0].order), ["created_at", { ascending: false }]);
  assert.deepEqual(plain(items[0].notes).map((n) => n.body), ["newest a", "superseded a"]);
  assert.deepEqual(plain(items[1].notes).map((n) => n.body), ["only b"]);
  assert.deepEqual(plain(items[2].notes), [], "an item with no notes is still answered");
});

test("the JSON export's two keys are fetched in one call", async () => {
  const { data, sent, tables } = load((q) => ({
    data: q.table === tables.workItems
      ? q.filters.id.map((id) => ({ id, details: "d" })) : [],
  }));
  const items = [{ id: "a" }];
  await data.loadForExport(items, ["details", "notes"]);
  assert.deepEqual(sent.map((q) => q.table).sort(),
    [tables.workItems, tables.workNotes].sort());
  assert.equal(items[0].details, "d");
  assert.deepEqual(plain(items[0].notes), []);
});

test("a failed read rejects, so the caller can cancel the download", async () => {
  // The whole point of the bulk fetch. Resolving on an error would let
  // the export write a file with a blank column and no sign of it.
  const { data } = load(() => ({ error: { message: "permission denied" } }));
  await assert.rejects(() => data.loadForExport([{ id: "a" }], ["details"]));
});

test("nothing is requested when every row is already loaded", async () => {
  const { data, sent } = load(() => ({ data: [] }));
  await data.loadForExport([{ id: "a", details: "d", notes: [] }], ["details", "notes"]);
  assert.equal(sent.length, 0);
});

test("a drawer's notes read is scoped to the one open item", async () => {
  const { data, sent, tables } = load(() => ({
    data: [
      { work_item_id: "a", body: "resolved", status: "resolved", created_at: "2026-03-01" },
      { work_item_id: "a", body: "live", status: "active", created_at: "2026-01-01" },
    ],
  }));
  const out = await data.loadNotes({ id: "a" });
  assert.equal(sent[0].table, tables.workNotes);
  assert.equal(sent[0].filters.work_item_id, "a");
  assert.deepEqual(out.notes.map((n) => n.body), ["live", "resolved"]);
});
