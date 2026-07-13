// ------------------------------------------------------------------
// tests/checks/style.test.js - Design-system gates.
// Enforces DESIGN.md/CLAUDE.md: all colour values come from
// assets/css/tokens.css (no hex literals elsewhere) and no emojis
// anywhere in tracked content.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read, lineOf } = require("../lib/repo.js");

const HEX = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w-])/g;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

test("no hex colour literals outside tokens.css", () => {
  const offences = [];
  const scan = trackedFiles().filter((f) =>
    (f.endsWith(".css") || f.endsWith(".html") || f.endsWith(".js")) &&
    f !== "assets/css/tokens.css");
  for (const file of scan) {
    const content = read(file);
    let m;
    HEX.lastIndex = 0;
    while ((m = HEX.exec(content)) !== null) {
      const lineStart = content.lastIndexOf("\n", m.index) + 1;
      const line = content.slice(lineStart, content.indexOf("\n", m.index));
      if (/href=|url\(#|getElementById|querySelector/.test(line)) continue;
      offences.push(`${file}:${lineOf(content, m.index)} "${m[0]}" - use a var(--token) from tokens.css`);
    }
  }
  assert.deepEqual(offences, [], "Hard-coded colours found:\n" + offences.join("\n"));
});

test("stylesheets are mobile-first: no max-width media queries", () => {
  const offences = [];
  for (const file of trackedFiles().filter((f) => f.endsWith(".css"))) {
    const content = read(file);
    const re = /@media[^{]*max-width/g;
    let m;
    while ((m = re.exec(content)) !== null) {
      offences.push(`${file}:${lineOf(content, m.index)} - style for small screens first, enhance with min-width (docs/DESIGN.md)`);
    }
  }
  assert.deepEqual(offences, [], "Desktop-first media queries found:\n" + offences.join("\n"));
});

test("no emojis in any tracked file", () => {
  const offences = [];
  for (const file of trackedFiles()) {
    if (!/\.(js|css|html|md|sql|json|txt)$/.test(file)) continue;
    const content = read(file);
    let m;
    EMOJI.lastIndex = 0;
    while ((m = EMOJI.exec(content)) !== null) {
      offences.push(`${file}:${lineOf(content, m.index)}`);
    }
  }
  assert.deepEqual(offences, [], "Emoji found at:\n" + offences.join("\n"));
});
