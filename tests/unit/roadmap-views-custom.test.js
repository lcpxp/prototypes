// ------------------------------------------------------------------
// tests/unit/roadmap-views-custom.test.js - Benchmarks for the roadmap
// board's narrowing affordances, split from roadmap-views.test.js per
// its size-budget exit plan: the Department filter (byDepartment, owner
// OR business-area association) and the Custom view (per-row pick
// checkboxes for a hand-tailored PDF/export). Shares the loader and
// dataset in tests/lib/roadmap.js.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadView, sampleData } = require("../lib/roadmap.js");

test("byDepartment narrows items and passes areas/categories through", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "i1", area_id: "a1", department: "sales_commercial", title: "A" },
      { id: "i2", area_id: "a1", department: "risk_underwriting", title: "B" },
      { id: "i3", area_id: "a1", department: null, title: "C" },
    ],
  };
  const filtered = V.byDepartment(data, "sales_commercial");
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0].id, "i1");
  assert.equal(filtered.areas, data.areas, "areas pass through unchanged");
  assert.equal(V.byDepartment(data, ""), data);
  assert.equal(V.byDepartment(data, null), data);
});

test("byDepartment matches business area associations, not just the owner", () => {
  const V = loadView();
  const data = {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      // Owned by Product, but Operations is an associated business area.
      { id: "i1", area_id: "a1", department: "product_technology",
        associated_departments: ["operations_onboarding"], title: "Owned by Product, ops cares" },
      // Owned by Operations directly.
      { id: "i2", area_id: "a1", department: "operations_onboarding",
        associated_departments: [], title: "Owned by Operations" },
      // Neither owner nor association is Operations.
      { id: "i3", area_id: "a1", department: "risk_underwriting",
        associated_departments: ["finance_revenue"], title: "Unrelated" },
    ],
  };
  const ops = V.byDepartment(data, "operations_onboarding");
  assert.equal(ops.items.length, 2, "owner OR association both count");
  assert.deepEqual(ops.items.map((i) => i.id).sort(), ["i1", "i2"]);
  // A missing associated_departments array must not throw.
  const risk = V.byDepartment({ ...data, items: [{ id: "i4", department: "risk_underwriting" }] },
    "risk_underwriting");
  assert.equal(risk.items.length, 1);
});

test("byDepartment feeds the board so a filter narrows the render", () => {
  const V = loadView();
  const data = sampleData();
  const html = V.timeline(V.byDepartment(data, "sales_commercial"), "backlog");
  assert.match(html, /Growth bet/, "sales work shows");
  assert.doesNotMatch(html, /Unity integration/, "other departments drop out");
});

test("custom view rides a checkbox on each row; unpicked rows drop their check", () => {
  const V = loadView();
  const data = sampleData();
  const plain = V.timeline(data, "backlog");
  assert.doesNotMatch(plain, /data-pick-id/, "no checkbox when custom is off");
  const custom = V.timeline(data, "backlog", { custom: true });
  assert.match(custom, /data-pick-id="i2"/, "each row carries a pick checkbox");
  assert.match(custom, /data-pick-id="i2"[^>]*checked/, "picked by default");
  const pruned = V.timeline(data, "backlog", { custom: true, unpicked: { i2: true } });
  assert.match(pruned, /rmv-unpicked/, "the unpicked row is marked");
  assert.doesNotMatch(pruned, /data-pick-id="i2"[^>]*checked/, "i2's box is cleared");
  assert.match(pruned, /data-pick-id="i1"[^>]*checked/, "other rows stay picked");
  // Cascade carries the same affordance.
  assert.match(V.cascade(data, "backlog", { custom: true }), /data-pick-id="i2"/);
});

// A workstream family for the department-visibility and export rules.
function familyData() {
  return {
    categories: [{ id: "c1", key: "core", label: "Core", sort_order: 10 }],
    areas: [{ id: "a1", key: "core-area", title: "Core", scope: "product", category_id: "c1", sort_order: 10 }],
    items: [
      { id: "ws", area_id: "a1", category_id: "c1", title: "Platform workstream", level: "workstream",
        status: "in_progress", horizon: "now", presentation: "current",
        department: "product_technology", priority: 10, sort_order: 10 },
      { id: "kOps", parent_id: "ws", area_id: "a1", category_id: "c1", title: "Ops child", level: "item",
        status: "planned", horizon: "now", presentation: "sequenced",
        department: "operations_onboarding", priority: 20, sort_order: 20 },
      { id: "kProd", parent_id: "ws", area_id: "a1", category_id: "c1", title: "Prod child", level: "item",
        status: "planned", horizon: "now", presentation: "sequenced",
        department: "product_technology", priority: 30, sort_order: 30 },
      { id: "dv", parent_id: "ws", area_id: "a1", category_id: "c1", title: "A deliverable", level: "deliverable",
        status: "planned", horizon: "now", presentation: "sequenced",
        department: "product_technology", priority: 40, sort_order: 40 },
    ],
  };
}

test("byDepartment: a directly-matched workstream keeps its whole family", () => {
  const V = loadView();
  const kept = V.byDepartment(familyData(), "product_technology").items.map((i) => i.id).sort();
  assert.deepEqual(kept, ["dv", "kOps", "kProd", "ws"], "owner match keeps every child");
});

test("byDepartment: a workstream kept via an associated child keeps only the matching children", () => {
  const V = loadView();
  const kept = V.byDepartment(familyData(), "operations_onboarding").items.map((i) => i.id).sort();
  assert.deepEqual(kept, ["kOps", "ws"], "the workstream shows as context with just the ops child");
});

test("expandUnpicked drops a whole subtree so an export never orphans a child", () => {
  const V = loadView();
  const data = familyData();
  const ctx = V.context(data);
  const drop = V.expandUnpicked({ ws: true }, ctx);
  assert.deepEqual(Object.keys(drop).sort(), ["dv", "kOps", "kProd", "ws"],
    "unpicking the workstream drops its children and deliverable");
  assert.deepEqual(Object.keys(V.expandUnpicked({ kOps: true }, ctx)), ["kOps"],
    "unpicking a leaf drops only itself");
});

test("custom view: a child of an unpicked parent dims and loses its own box", () => {
  const V = loadView();
  const data = familyData();
  // roadmap.js passes unpicked (the parent) and excluded (its descendants).
  const html = V.timeline(data, "backlog",
    { custom: true, unpicked: { ws: true }, excluded: { kOps: true, kProd: true } });
  assert.match(html, /data-pick-id="ws"/, "the unpicked parent keeps a (clickable) box");
  assert.doesNotMatch(html, /data-pick-id="kProd"/, "an excluded child has no box");
  // The excluded child row still renders, dimmed.
  assert.match(html, /rmv-tl-row rmv-tl-row--child rmv-unpicked[\s\S]*?Prod child/,
    "the excluded child dims with its family");
});
