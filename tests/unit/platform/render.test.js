// ------------------------------------------------------------------
// tests/unit/platform/render.test.js - Benchmarks for one capability
// as a card (App.platformCards in assets/js/pages/platform/cards.js).
//
// The card stopped being an always-open <article> on 2026-09-07 and
// became a <details> that opens on demand, so these pin the split
// between the two halves: what a reader sees before they click, and
// what waits until they do. Getting that boundary wrong is how the
// page became a wall - everything was in the first half.
//
// Builders are data-in / string-out, so they load in a Node vm
// alongside ui.js (App.escape, App.statusBadge), blocks.js and
// detail.js.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../../lib/repo.js");

function loadCards() {
  const sandbox = {
    location: { pathname: "/modules/platform/index.html" },
    navigator: {},
    setTimeout,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/blocks.js"), sandbox, { filename: "blocks.js" });
  vm.runInContext(read("assets/js/core/registry.js"), sandbox, { filename: "registry.js" });
  vm.runInContext(read("assets/js/core/links.js"), sandbox, { filename: "links.js" });
  vm.runInContext(read("assets/js/core/detail.js"), sandbox, { filename: "detail.js" });
  vm.runInContext(read("assets/js/pages/platform/cards.js"), sandbox,
    { filename: "platform-cards.js" });
  return sandbox.App.platformCards;
}

function cap(over) {
  return Object.assign({
    id: "c1", area_id: "a1", key: "cap-one", title: "Risk routing",
    summary: "Routes by risk.", domain: "product", kind: "capability",
    maturity: "partial", attestation: "owner", as_of: "2026-09-01",
    blocks: [], tags: [], sort_order: 10,
  }, over || {});
}

test("the closed card carries what a reader chooses on, and no more", () => {
  const C = loadCards();
  const html = C.capabilityCard(cap(), {});
  const summary = html.slice(html.indexOf("<summary>"), html.indexOf("</summary>"));

  assert.match(summary, /Risk routing/, "the title is the thing being chosen between");
  assert.match(summary, /partial/, "how real it is decides whether to read on");
  assert.match(summary, /checked 2026-09-01/, "and how old the claim is");
  assert.doesNotMatch(summary, /Routes by risk/,
    "the summary prose belongs to the open half - putting it in the closed " +
    "half is how 46 cards became an unscannable column");
});

test("the card is closed by default", () => {
  const C = loadCards();
  const html = C.capabilityCard(cap(), {});
  assert.match(html, /^<details class="cap-card"/,
    "a <details> without `open` starts closed, which is the whole fix");
  assert.doesNotMatch(html.slice(0, html.indexOf(">")), /\bopen\b/);
});

test("the open half carries the prose, the blocks and the row's own columns", () => {
  const C = loadCards();
  const html = C.capabilityCard(cap({
    blocks: [{ kind: "p", text: "Detail para." }],
    tags: ["risk", "routing"],
  }), {});
  assert.match(html, /Routes by risk\./);
  assert.match(html, /Detail para\./);
  assert.match(html, /risk, routing/, "tags render through the completeness contract");
});

test("attestation is badged for anything but the owner's own word", () => {
  const C = loadCards();
  assert.equal(C.attestationBadge(cap({ attestation: "owner" })), "",
    "owner-accepted is what a reader assumes of a knowledge base, so it " +
    "needs no badge - badging it would make the exception invisible");
  assert.match(C.attestationBadge(cap({ attestation: "derived" })), /tone-info[^>]*>derived/,
    "a session restating the owner's own delivered work is not the owner saying so");
  assert.match(C.attestationBadge(cap({ attestation: "unattested" })), /tone-warn[^>]*>unattested/);
});

test("an attestation nobody wrote a label for still shows, named", () => {
  const C = loadCards();
  // The exact failure the column replaced: a boolean could only say
  // verified or not, so a third state had nowhere to render at all.
  const html = C.attestationBadge(cap({ attestation: "audited" }));
  assert.match(html, /audited/,
    "a value added to the constraint must be visible before anyone edits this file");
});

test("freshness says plainly when a claim has never been checked", () => {
  const C = loadCards();
  assert.match(C.freshness(cap({ as_of: null }), false), /never checked/);
  assert.match(C.freshness(cap(), true), /work delivered since/,
    "a claim behind delivered work is the one a reader must not trust silently");
  assert.match(C.freshness(cap(), false), /checked 2026-09-01/);
});

test("a capability card carries its links and its provenance", () => {
  const C = loadCards();
  const ctx = {
    docById: { d1: { id: "d1", title: "Platform overview" } },
    linkIndex: {
      "capability:c1": [
        { kind: "relates_to", reads: "Related to", family: "association",
          otherType: "capability", otherId: "c2", note: "", confidence: "confirmed" },
      ],
    },
    linkTitles: { "capability:c2": "Contract execution" },
  };
  const html = C.capabilityCard(cap({ source_document_id: "d1" }), ctx);
  assert.match(html, /Related to/);
  assert.match(html, /Contract execution/);
  assert.match(html, /Source: Platform overview/);
});

test("a derived link is badged apart from a proposed one", () => {
  const C = loadCards();
  const link = (confidence) => ({
    linkIndex: {
      "capability:c1": [{ kind: "affects", reads: "Affected by", family: "knowledge",
        otherType: "work_item", otherId: "w1", note: "", confidence }],
    },
    linkTitles: { "work_item:w1": "Add screening provider" },
    root: "../..",
  });
  assert.match(C.capabilityLinks(cap(), link("proposed")), /tone-warn[^>]*>proposed/);
  assert.match(C.capabilityLinks(cap(), link("derived")), /tone-info[^>]*>derived/,
    "a link restating a row the owner owns is not a suggestion awaiting them");
  assert.doesNotMatch(C.capabilityLinks(cap(), link("confirmed")), /badge/,
    "confirmed is the default reading and needs no mark");
});

test("a capability link out to another entity type renders and links", () => {
  const C = loadCards();
  const ctx = {
    linkIndex: {
      "capability:c1": [{ kind: "affects", reads: "Affected by", family: "knowledge",
        otherType: "work_item", otherId: "w1", note: "", confidence: "confirmed" }],
    },
    linkTitles: { "work_item:w1": "Add screening provider" },
    root: "../..",
  };
  const html = C.capabilityLinks(cap(), ctx);
  assert.match(html, /Add screening provider/);
  assert.match(html, /modules\/roadmap\/index\.html\?item=w1/,
    "a link to a work item must open that item, not the roadmap index");
  assert.match(html, /Work item/, "and name the kind of thing it reached");
});

test("a link whose target cannot be read still names its type", () => {
  const C = loadCards();
  const ctx = {
    linkIndex: {
      "capability:c1": [{ kind: "part_of", reads: "Part of", family: "hierarchy",
        otherType: "stage", otherId: "s9", note: "", confidence: "confirmed" }],
    },
    linkTitles: {},
  };
  assert.match(C.capabilityCard(cap(), ctx), /Journey stage \(not readable\)/,
    "a relationship is a fact even when its far end is out of reach - " +
    "silence was the old behaviour and it hid the graph");
});

test("a card adds no fact list when there is nothing to add", () => {
  const C = loadCards();
  const bare = { id: "c9", key: "k", title: "Bare", domain: "product",
    kind: "capability", maturity: "planned", attestation: "unattested", blocks: [] };
  assert.doesNotMatch(C.capabilityCard(bare, {}), /<dl/);
});

test("everything rendered is escaped", () => {
  const C = loadCards();
  const html = C.capabilityCard(cap({
    title: "<script>bad()</script>",
    summary: "<img src=x>",
  }), {});
  assert.doesNotMatch(html, /<script>bad/);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;script&gt;/);
});
