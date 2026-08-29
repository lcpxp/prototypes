// ------------------------------------------------------------------
// tests/unit/render-fallbacks.test.js - Two renderers that handled the
// values they were written for and quietly mishandled the rest.
//
// Both were found on 2026-08-13 while writing the COVERAGE map in
// tests/checks/render-coverage.test.js. That map asks, per vocabulary,
// "where does every value of this render?" - and answering it honestly
// is what exposed them. Neither produced an error; both produced a
// page that read as though the data said something it did not.
//
//   profiles.role      roleBadge was `admin ? "admin" : "member"`, so a
//                      third role rendered as "member" on every row.
//   blocker_scope      only partner and merchant had a branch. The
//                      constraint also allows 'record', which carried
//                      no flag - a blocked application reading as
//                      though nothing were blocking it.
//
// A silent wrong label is worse than a missing one: nothing prompts
// anybody to look.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function sandboxWith(files) {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object, String,
    location: { pathname: "/modules/users/index.html", search: "", hash: "" },
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  vm.runInContext(read("assets/js/core/detail.js"), sandbox, { filename: "detail.js" });
  // The page modules boot on authentication; a no-op keeps them inert.
  sandbox.App.onAuthed = function () {};
  for (const file of files) vm.runInContext(read(file), sandbox, { filename: file });
  return sandbox.App;
}

// --- profiles.role -------------------------------------------------

const users = sandboxWith(["assets/js/pages/users.js"]).usersView;

test("both roles the constraint allows render as themselves", () => {
  assert.match(users.roleBadge("admin"), />admin</);
  assert.match(users.roleBadge("member"), />member</);
});

test("admin keeps its own class, so the accent styling survives", () => {
  assert.match(users.roleBadge("admin"), /class="badge admin"/,
    "components.css styles .badge.admin; losing the class loses the emphasis");
});

test("a role the renderer has never seen shows itself, not 'member'", () => {
  // The regression. A third role added to the profiles.role constraint
  // used to render as "member" on every row: stored, shown, and wrong.
  const html = users.roleBadge("reviewer");
  assert.match(html, />reviewer</,
    "an unknown role must name itself rather than borrowing another's label");
  assert.doesNotMatch(html, /member/);
});

test("a missing role renders empty rather than claiming membership", () => {
  for (const value of [null, undefined, ""]) {
    assert.doesNotMatch(users.roleBadge(value), /member|admin/,
      "absence is not membership");
  }
});

test("a hostile role cannot inject markup", () => {
  const html = users.roleBadge('"><img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("a column added to profiles becomes a column in the register", () => {
  // The completeness contract, in a table. The header used to end with
  // a hard-coded "Added"; a column added to profiles was fetched and
  // then had nowhere to land.
  const columns = users.trailingColumns([
    { id: "u1", email: "a@b.c", display_name: "A", role: "admin",
      created_at: "2026-01-01T00:00:00Z", last_seen_at: "2026-08-01T00:00:00Z" },
  ]);
  // Array.from, not .map: a value built inside the vm is structurally
  // equal to one built here but never reference-equal.
  assert.deepEqual(Array.from(columns, (c) => c.key), ["created_at", "last_seen_at"],
    "named fields lead, then anything else the rows carry");
  assert.equal(columns[0].label, "Added", "the named field keeps its own label");
  assert.equal(columns[1].label, "Last seen at",
    "and an unnamed one derives a readable label from the key");
});

test("the register's extra columns are the union across rows, sorted", () => {
  // One row carrying a column and another not must still produce one
  // header, and the order must not depend on which row came first.
  const columns = users.trailingColumns([
    { id: "u1", email: "a@b.c", display_name: "A", role: "admin", zeta: 1 },
    { id: "u2", email: "d@e.f", display_name: "D", role: "member", alpha: 2 },
  ]);
  assert.deepEqual(Array.from(columns, (c) => c.key), ["created_at", "alpha", "zeta"]);
});

test("the register never prints the columns it lays out by hand", () => {
  const keys = users.trailingColumns([
    { id: "u1", email: "a@b.c", display_name: "A", role: "admin" },
  ]).map((c) => c.key);
  for (const handled of ["id", "email", "display_name", "role"]) {
    assert.ok(!keys.includes(handled), `${handled} already has its own column`);
  }
});

// --- review_applications.blocker_scope -----------------------------

const review = sandboxWith([
  "assets/js/pages/app-review/model.js",
  "assets/js/pages/app-review/findings.js",
  "assets/js/pages/app-review/render.js",
]).appReviewRender;

const ctx = { dupes: {}, categories: {} };

test("every scope the constraint allows produces a flag", () => {
  // 'record' is the one that had no branch. All three are in the
  // check constraint on review_applications.blocker_scope.
  for (const [scope, label] of [
    ["partner", "Partner blocker"],
    ["merchant", "Merchant blocker"],
    ["record", "Record blocker"],
  ]) {
    const html = review.flagsHtml({ blocker_scope: scope }, ctx);
    assert.match(html, new RegExp(label),
      `blocker_scope '${scope}' must be visible on the row`);
  }
});

test("no scope means no blocker flag", () => {
  const html = review.flagsHtml({ blocker_scope: null }, ctx);
  assert.doesNotMatch(html, /blocker/i,
    "an unblocked application must not gain a flag it did not earn");
});

test("a scope added later is flagged rather than dropped", () => {
  assert.match(review.flagsHtml({ blocker_scope: "acquirer" }, ctx),
    /Acquirer blocker/,
    "the branch is generic now, so a fourth scope needs no code change");
});

test("a hostile scope cannot inject markup", () => {
  const html = review.flagsHtml({ blocker_scope: '<img src=x>' }, ctx);
  assert.doesNotMatch(html, /<img/);
});

test("the manual-pipeline flag still reads as the danger it is", () => {
  // Guarding the edit: the blocker branch sits directly beneath it.
  const html = review.flagsHtml({ manual_pipeline: true }, ctx);
  assert.match(html, /is-danger/);
  assert.match(html, /Do not send digitally/);
});
