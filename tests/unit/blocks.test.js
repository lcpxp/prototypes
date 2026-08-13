// ------------------------------------------------------------------
// tests/unit/blocks.test.js - The typed-block renderer.
//
// This lived twice - platform.js and reference-topics.js - as two
// copies of the same six kinds, and BOTH returned "" for anything
// else. Skipping was a deliberate forward-compatibility choice so
// content could lead the code; the cost was that a new block kind
// shipped to the database and rendered nothing, with no error and no
// trace. These benchmarks pin the replacement: one renderer, and an
// unrecognised kind lands visibly rather than vanishing.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { read } = require("../lib/repo.js");

function load() {
  const sandbox = {
    window: null, navigator: {}, setTimeout, JSON, Object,
    document: { addEventListener() {}, getElementById() { return null; } },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read("assets/js/core/ui.js"), sandbox, { filename: "ui.js" });
  vm.runInContext(read("assets/js/core/blocks.js"), sandbox, { filename: "blocks.js" });
  return sandbox.App;
}
const App = load();

test("an unrecognised kind renders its content, it does not vanish", () => {
  const html = App.blocks.render({
    kind: "timeline",
    caption: "Contract lifecycle",
    steps: ["generated", "sent", "signed"],
  });
  assert.match(html, /block-unknown/, "and is marked as provisional");
  assert.match(html, /timeline block/, "the kind names itself");
  assert.match(html, /Contract lifecycle/, "every key survives");
  assert.match(html, /generated/, "including nested values, stringified");
});

test("a block with no kind at all still renders", () => {
  const html = App.blocks.render({ text: "orphaned content" });
  assert.match(html, /untyped block/);
  assert.match(html, /orphaned content/);
});

test("an unknown block escapes its content like every other kind", () => {
  const html = App.blocks.render({ kind: "<script>", nasty: "<img src=x>" });
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /&lt;script&gt;/);
});

test("an unknown block carrying only its kind renders without a table", () => {
  const html = App.blocks.render({ kind: "divider" });
  assert.match(html, /divider block/);
  assert.doesNotMatch(html, /<table>/, "an empty table would be noise");
});

test("the six known kinds render as they always did", () => {
  assert.match(App.blocks.render({ kind: "p", text: "<i>hi</i>" }), /&lt;i&gt;hi&lt;\/i&gt;/);
  assert.match(App.blocks.render({ kind: "note", tone: "warn", text: "careful" }),
    /notice tone-warn/);
  assert.match(App.blocks.render({ kind: "note", tone: "invented" }), /tone-neutral/,
    "an unknown tone falls back rather than emitting a bogus class");
  assert.match(App.blocks.render({ kind: "code", json: { a: 1 } }), /&quot;a&quot;: 1/);
  assert.match(App.blocks.render({ kind: "table", columns: ["C<"], rows: [["v>"]] }),
    /C&lt;[\s\S]*v&gt;/);
  assert.match(App.blocks.render({ kind: "kv", items: [{ label: "K", value: "V" }] }),
    /<th>K<\/th><td>V<\/td>/);
  assert.match(App.blocks.render({ kind: "values", name: "Status", values: ["live"] }),
    /<code>live<\/code>/);
});

test("a caller can pass its own code treatment", () => {
  const html = App.blocks.render({ kind: "code", text: "x = 1" },
    { codeblock: function (v) { return '<div class="mine">' + v + "</div>"; } });
  assert.match(html, /<div class="mine">x = 1<\/div>/,
    "the reference viewer's richer codeblock rides through");
});

test("a non-object is not a block", () => {
  assert.equal(App.blocks.render(null), "");
  assert.equal(App.blocks.render("just a string"), "");
  assert.equal(App.blocks.render(undefined), "");
});

test("renderAll joins a list and tolerates an empty one", () => {
  assert.equal(App.blocks.renderAll([]), "");
  assert.equal(App.blocks.renderAll(null), "");
  const html = App.blocks.renderAll([
    { kind: "p", text: "one" },
    { kind: "mystery", note: "two" },
  ]);
  assert.match(html, /one/);
  assert.match(html, /two/, "an unknown kind mid-list does not silently drop out");
});

test("the known-kind list is declared, so a gate can check it", () => {
  // Round-tripped through JSON: an array built in the vm has that
  // realm's prototype and fails deepEqual on identity alone.
  assert.deepEqual(JSON.parse(JSON.stringify(App.blocks.KNOWN)).sort(),
    ["code", "kv", "note", "p", "table", "values"]);
});

test("both former copies now delegate here", () => {
  // The one-home rule: two implementations of one vocabulary is how
  // they drifted apart on what a `kv` block looks like.
  const platform = read("assets/js/pages/platform.js");
  const topics = read("assets/js/pages/reference-topics.js");
  for (const [name, src] of [["platform.js", platform], ["reference-topics.js", topics]]) {
    assert.match(src, /App\.blocks\.render\(/, `${name} must delegate to App.blocks`);
    assert.doesNotMatch(src, /case "values":/,
      `${name} must not keep a private copy of the block vocabulary`);
  }
});
