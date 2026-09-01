// ------------------------------------------------------------------
// tests/checks/render-coverage.test.js - Nothing stored-but-invisible.
//
// The rule, from docs/plan/40-SURFACING.md: a value that is stored and
// not rendered is a defect, not a backlog item. This gate makes that
// mechanical for the three vocabularies the database can grow without
// the code noticing:
//
//   1. every value a check constraint allows,
//   2. every link entity type,
//   3. every typed block kind.
//
// It generalises the benchmark written after three product_capabilities
// kinds shipped and rendered nowhere for a week. The failure mode is
// always the same: a value is added to a constraint, no renderer knows
// it, and rows carrying it show blank or vanish with no error.
//
// A value is covered one of four ways, each stated with its reason so
// that "it renders somehow" is a claim someone made rather than an
// assumption nobody checked:
//
//   file     a named renderer must mention every value, for
//            vocabularies with a hand-written label per value
//   generic  it renders without a per-value branch
//   derived  it is never shown, but drives something that is
//   hole     it renders nowhere, and that is a known debt
//
// Writing this map is what found two live defects: roleBadge printed
// "member" for any role that was not admin, and blocker_scope 'record'
// had no branch at all. Both are fixed; the reasons record it. Its one
// declared `hole` - knowledge_links.confidence - is closed too, so the
// category currently has no members and exists for the next one.
//
// Link KINDS are not checked here: tests/checks/knowledge-links.test.js
// holds those against the schema seed, and one concept gets one home.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, read, trackedFiles } = require("../lib/repo.js");

// --- the vocabularies, read out of the schema ----------------------

const TABLE_RE = /create table if not exists public\.(\w+)/;
const CHECK_RE = /^\s{2}(\w+)\s+text\b[\s\S]*?check\s*\(\s*\1\s+in\s*\(([^)]*)\)\s*\)/gm;

function constraints() {
  const found = {};
  const dir = path.join(ROOT, "supabase", "schema");
  for (const file of fs.readdirSync(dir).sort()) {
    if (!file.endsWith(".sql")) continue;
    const parts = read("supabase/schema/" + file).split(TABLE_RE);
    for (let i = 1; i < parts.length; i += 2) {
      const table = parts[i];
      const body = parts[i + 1].split("create table")[0];
      CHECK_RE.lastIndex = 0;
      let m;
      while ((m = CHECK_RE.exec(body)) !== null) {
        const values = [...m[2].matchAll(/'([\w-]+)'/g)].map((v) => v[1]);
        if (values.length) found[table + "." + m[1]] = values;
      }
    }
  }
  return found;
}

// --- where each one renders ----------------------------------------
// Adding a constraint without adding a line here fails the last test in
// this file, which is the point: a new vocabulary forces a decision
// about where it shows up, in the commit that introduces it.

const wordOf = (v) => new RegExp('"' + v + '"|\\b' + v + '\\b');

// Each entity line itself ends with "},", so the map has to be read to
// its own closing brace rather than to the first one found.
function linkEntitiesBlock() {
  const registry = read("assets/js/core/registry.js");
  const after = registry.split("linkEntities: {")[1] || "";
  const end = after.search(/\n {4}\},/);
  return end === -1 ? after : after.slice(0, end);
}

const COVERAGE = {
  // Hand-written label per value: the renderer must name each one, or a
  // row carrying it renders blank.
  "work_items.status": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_items.prd_status": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_items.project_status": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_item_phases.phase": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_notes.kind": { file: "assets/js/pages/roadmap/detail.js" },
  "work_items.horizon": { file: "assets/js/pages/roadmap/views.js" },
  "work_items.end_horizon": { file: "assets/js/pages/roadmap/views.js" },
  "work_items.presentation": { file: "assets/js/pages/roadmap/views.js" },
  "work_items.department": { file: "assets/js/core/registry.js" },
  "work_items.benefit_type": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_items.benefit_status": { file: "assets/js/pages/roadmap/detail-values.js" },
  "work_items.sales_route": { file: "assets/js/pages/roadmap/detail-values.js" },
  // Owned by a stricter benchmark that checks the KINDS registry rather
  // than a mention anywhere in the file. One concept, one home.
  "product_capabilities.kind": { ownedBy: "tests/unit/platform/knowledge.test.js" },
  "api_specs.family": { file: "assets/js/core/registry.js" },

  // Rendered without a per-value branch. The reason is the claim.
  "work_items.level": { generic: "the drawer sentence-cases the raw value" },
  "work_items.type": { generic: "the drawer sentence-cases the raw value" },
  "work_items.effort": { generic: "the drawer sentence-cases the raw value" },
  "work_items.impact": { generic: "the drawer sentence-cases the raw value" },
  "work_notes.status": { generic: "active is the default and unlabelled; the drawer names the rest" },
  "work_documents.kind": { generic: "the backlog table prints the raw kind" },
  "work_documents.status": { generic: "App.statusBadge renders any status" },
  "api_specs.status": { generic: "App.statusBadge renders any status" },
  "api_endpoints.method": { generic: "App.methodBadge renders any method, unknown ones unstyled" },
  "prototypes.status": { generic: "App.statusBadge renders any status" },
  "future_prototypes.status": { file: "assets/js/pages/ideas/render.js" },
  "future_prototypes.effort": { file: "assets/js/pages/ideas/render.js" },
  "integrations.status": { generic: "App.statusBadge renders any status" },
  "integrations.direction": { generic: "the integrations table prints the raw direction" },
  "product_capabilities.maturity": { generic: "App.statusBadge renders any maturity" },
  "work_areas.scope": { generic: "a filter, not a rendered label" },
  "profiles.role": { generic: "roleBadge renders whatever role the row carries - it was a binary else-branch until 2026-08-13 and printed 'member' for anything not admin" },
  "link_kinds.family": { generic: "groups links in a drawer; never shown as text" },
  "review_waves.state": { generic: "the review board prints the raw state" },
  "review_waves.kind": { file: "assets/js/pages/portal-review/render.js" },
  "review_findings.kind": { file: "assets/js/pages/portal-review/render.js" },
  "review_findings.state": { file: "assets/js/pages/portal-review/render.js" },
  "review_findings.emphasis": { file: "assets/js/pages/portal-review/render.js" },
  "review_findings.visibility": { file: "assets/js/pages/portal-review/render.js" },
  "review_findings.disposition": { file: "assets/js/pages/portal-review/render.js" },
  "review_applications.evidence_confidence": { generic: "a label map with a raw fallback, so an unmapped value still shows" },
  "review_applications.blocker_scope": { generic: "the board flags any scope the row carries - 'record' had no branch at all until 2026-08-13 and carried no flag" },
  "review_applications.next_trigger_type": { generic: "the review board derives the trigger line from it" },
  "review_evidence.source": { generic: "the evidence list prints the raw source" },
  "review_evidence.direction": { generic: "the evidence list prints the raw direction" },
  "review_evidence.signal": { derived: "never shown as text: a typed signal drives the contradiction findings structurally, so its effect is visible rather than its value" },
  "triage_categories.group_key": { file: "assets/js/pages/app-review/model.js" },

  // Was the one declared hole in this file, closed 2026-08-13: a link
  // an assistant proposed now carries a `proposed` badge in both the
  // roadmap drawer and the platform card, so a reader can tell a
  // suggestion from the owner's decision. `confirmed` is the
  // unremarkable case and shows nothing.
  "knowledge_links.confidence": {
    generic: "a proposed link is badged; confirmed shows nothing because it is " +
      "the default reading, so both values are accounted for",
  },
};

// --- the gates -----------------------------------------------------

test("every constraint vocabulary has a declared home", () => {
  const undeclared = Object.keys(constraints()).filter((key) => !COVERAGE[key]);
  assert.deepEqual(undeclared, [],
    "These check constraints have nowhere declared to render:\n" +
    undeclared.join("\n") +
    "\nAdd a line to COVERAGE in this file - a renderer, or `generic` " +
    "with the reason it needs no branch. A value nobody renders is a " +
    "row that shows blank.");
});

test("every hand-labelled value is named by its renderer", () => {
  const missing = [];
  for (const [key, values] of Object.entries(constraints())) {
    const rule = COVERAGE[key];
    if (!rule || !rule.file) continue;
    const src = read(rule.file);
    for (const value of values) {
      if (!wordOf(value).test(src)) {
        missing.push(`${key} allows '${value}' but ${rule.file} never names it`);
      }
    }
  }
  assert.deepEqual(missing, [], "Values with no label:\n" + missing.join("\n"));
});

test("a declared generic rendering says why it needs no branch", () => {
  for (const [key, rule] of Object.entries(COVERAGE)) {
    if (rule.file || rule.ownedBy) continue;
    const reason = rule.generic || rule.derived || rule.hole;
    assert.ok(reason && reason.length > 15,
      `${key}: a claim that it renders generically needs the reason with it.`);
  }
});

test("a vocabulary delegated to another gate is actually covered there", () => {
  for (const [key, rule] of Object.entries(COVERAGE)) {
    if (!rule.ownedBy) continue;
    const column = key.split(".")[1];
    assert.match(read(rule.ownedBy), new RegExp(column),
      `${key} is delegated to ${rule.ownedBy}, which does not mention it. ` +
      "A delegation nobody honours is worse than no gate.");
  }
});

test("every link entity type is declared, labelled and titled", () => {
  // The seed is authoritative for which types exist; registry.js
  // mirrors the display half. A type in one and not the other means a
  // link renders as a raw key, or not at all.
  const schema = read("supabase/schema/33_links.sql");
  const seed = schema.split("insert into public.link_entity_types")[1] || "";
  const seeded = [...seed.slice(0, seed.indexOf(";")).matchAll(/\('(\w+)',\s*'(\w+)'/g)]
    .map((m) => ({ key: m[1], table: m[2] }));
  assert.ok(seeded.length >= 7, "the entity-type seed must be readable");

  const block = linkEntitiesBlock();
  for (const entity of seeded) {
    const line = block.split("\n").find((l) => l.trim().startsWith(entity.key + ":"));
    assert.ok(line, `link_entity_types seeds '${entity.key}' but registry.linkEntities omits it`);
    assert.match(line, new RegExp('table: "' + entity.table + '"'),
      `${entity.key}: registry names a different table than the seed`);
    assert.match(line, /label: "/, `${entity.key}: needs a label for the unresolvable case`);
    assert.match(line, /titleColumn: "/, `${entity.key}: needs a column to display`);
  }
});

// Types whose rows have a page of their own, so App.itemHref already
// builds a whole address for them and an anchor would be wrong. Every
// other type with a module addresses a row WITHIN a page and needs
// one - routing them all through App.itemHref would send a term to
// #capability-<id>.
const ROUTED = ["work_item", "prototype"];

test("an anchored entity type has an anchor a link can address", () => {
  for (const line of linkEntitiesBlock().split("\n")) {
    if (!/module: "/.test(line)) continue;
    const key = line.trim().split(":")[0];
    if (ROUTED.includes(key)) continue;
    assert.match(line, /anchor: "/,
      `${key}: has a module but no anchor, so a link lands on the page and ` +
      "not on the row.");
  }
});

test("an anchored destination is actually reachable on its page", () => {
  // An anchor nothing scrolls to is a destination in name only. The
  // backlog page carried a #document-<id> anchor for a day without
  // calling App.deepLinkScroll, so a link landed on the page and never
  // reached the row.
  const registry = read("assets/js/core/registry.js");
  const modules = {};
  for (const m of registry.matchAll(/key: "([\w-]+)",[\s\S]{0,200}?path: "([^"]+)"/g)) {
    modules[m[1]] = m[2];
  }
  for (const line of linkEntitiesBlock().split("\n")) {
    const anchored = /anchor: "/.test(line) && /module: "([\w-]+)"/.exec(line);
    if (!anchored) continue;
    const key = line.trim().split(":")[0];
    // An entity may name the page its rows live on; index.html is only
    // the default. The prototype ideas board is ideas.html, and the
    // gate has to look where the rows actually are.
    const named = /page: "([\w.-]+)"/.exec(line);
    const page = read(modules[anchored[1]] + (named ? named[1] : "index.html"));
    const scripts = [...page.matchAll(/src="[^"]*assets\/js\/pages\/([\w/-]+\.js)"/g)]
      .map((m) => "assets/js/pages/" + m[1]);
    assert.ok(scripts.length, `${key}: module ${anchored[1]} loads no page module`);
    assert.ok(scripts.some((f) => /App\.deepLinkScroll\(\)/.test(read(f))),
      `${key} anchors on the ${anchored[1]} page, but none of its page ` +
      `modules (${scripts.join(", ")}) calls App.deepLinkScroll(). ` +
      "The link would land on the page and never reach the row.");
  }
});

// Surfaces that render a whole row through App.detail.facts. Adopting
// the contract is what makes a per-column check unnecessary there: the
// builder shows every key it was not told to hide, so a column added
// tomorrow appears without anyone editing the page. The risk is
// regression - somebody replacing it with a hand-written list, which
// is how the invisible-column problem started.
const CONTRACT_ADOPTERS = [
  "assets/js/pages/integrations.js",
  "assets/js/pages/roadmap/detail.js",
  "assets/js/pages/platform/platform.js",
  "assets/js/pages/backlog/backlog.js",
  "assets/js/pages/app-review/detail.js",
];

test("a surface that adopted the completeness contract still uses it", () => {
  for (const file of CONTRACT_ADOPTERS) {
    const src = read(file);
    assert.match(src, /App\.detail\.facts\(/,
      `${file} adopted App.detail.facts and must keep using it. A hand-written ` +
      "field list renders the columns that existed the day it was written.");
    assert.doesNotMatch(src, /Object\.keys\(detail\)\.forEach/,
      `${file} must not walk the detail bag by hand alongside the contract`);
  }
});

test("every page that renders a whole row loads the contract", () => {
  // A page whose module calls App.detail.facts and whose HTML does not
  // include core/detail.js throws on first render, and the failure is
  // invisible to a suite that loads modules directly into a vm.
  // Every page under modules/, not just index.html: the app-review
  // drawer lives on wave.html, and scanning only index pages would have
  // called that one clean while it threw on first render.
  const pages = trackedFiles().filter((f) => /^modules\/.+\.html$/.test(f));
  const needs = new Set();
  for (const file of CONTRACT_ADOPTERS.concat(["assets/js/pages/users.js"])) {
    needs.add(file.split("/").pop());
  }
  for (const page of pages) {
    const html = read(page);
    const uses = [...needs].filter((mod) => html.includes("pages/" + mod));
    if (!uses.length) continue;
    assert.match(html, /core\/detail\.js/,
      `${page} loads ${uses.join(", ")}, which render through App.detail. ` +
      "Without core/detail.js the page throws on first render.");
  }
});

test("a table that grows its own columns keeps deriving them", () => {
  // The contract in a table (users.js): the header ends with whatever
  // the rows carry, not with a hard-coded final column.
  const src = read("assets/js/pages/users.js");
  assert.match(src, /App\.detail\.labelOf\(/,
    "an unnamed column must derive a readable label rather than being dropped");
  assert.match(src, /trailing\.forEach/,
    "both the header and every row must walk the same derived column list");
  assert.doesNotMatch(src, /head \+= "<th>Added<\/th>"/,
    "a hard-coded final header is how a column added to profiles lands nowhere");
});

test("the completeness contract renders what it was not told about", () => {
  // The guarantee itself, asserted against the source: remove the
  // overflow branch and every unnamed column silently disappears again.
  const src = read("assets/js/core/detail.js");
  assert.match(src, /overflowLabel/,
    "the overflow section is the contract - without it this is just a " +
    "field list with extra steps");
  assert.match(src, /return !seen\[key\] && !isEmpty\(record\[key\]\)/,
    "everything not named and not empty must reach the output");
});

test("the block renderer has a fallback, so no kind is dropped", () => {
  const src = read("assets/js/core/blocks.js");
  assert.match(src, /default:\s*\n\s*return unknownBlock\(block\)/,
    "an unrecognised block kind must render generically. Returning '' " +
    "is how a new kind shipped to the database and showed nothing.");
  assert.doesNotMatch(read("assets/js/pages/platform/platform.js"), /case "values":/,
    "the vocabulary has one home: assets/js/core/blocks.js");
  assert.doesNotMatch(read("assets/js/pages/reference/topics.js"), /case "values":/,
    "the vocabulary has one home: assets/js/core/blocks.js");
});

test("known holes are listed, not silently tolerated", () => {
  // A hole is a declared debt with a reason. There are none right now;
  // the cap exists so that if one is ever added the list stays short
  // and visible rather than remembered.
  const holes = Object.entries(COVERAGE).filter(([, r]) => r.hole);
  assert.ok(holes.length <= 3,
    "More than three vocabularies render nowhere. Fix one before adding " +
    "another: " + holes.map(([k]) => k).join(", "));
});
