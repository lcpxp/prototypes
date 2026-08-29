// ------------------------------------------------------------------
// tests/checks/db-style-contract.test.js - The database names styles.
//
// Two columns hold the NAME of something in this repo, resolved at
// render time, which means no static check can see the reference and
// both fail SILENTLY:
//
//   triage_categories.colour_token -> a --<token> / --<token>-soft pair
//     in tokens.css. appreview-render.js builds
//     style="--row-accent:var(--<token>);--row-tint:var(--<token>-soft)"
//     from the row. A missing pair falls through to neutral defaults:
//     the row renders, just grey, and nothing fails.
//
//   portal_links.icon -> a key in the ICONS map in core/tools.js. A row
//     naming an icon that is not there renders nothing at all.
//
// So 26 tokens in tokens.css have no var() reference anywhere in the
// stylesheets and are NOT dead - nine of them are named from seeded
// rows. Anyone pruning "unused" tokens by grep would silently grey out
// the application-review board. This gate is what makes that pruning
// safe, and what catches a seeded value with nothing behind it.
// ------------------------------------------------------------------
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { trackedFiles, read } = require("../lib/repo.js");

function supabaseSql() {
  return trackedFiles().filter((f) => f.startsWith("supabase/") && f.endsWith(".sql"));
}

// Every colour_token literal committed anywhere in supabase/, including
// the applied migrations: a value the live database still holds is a
// value the stylesheet still has to answer.
function seededColourTokens() {
  const found = new Set();
  for (const file of supabaseSql()) {
    for (const m of read(file).matchAll(/'(ar-[a-z][a-z0-9-]*)'/g)) found.add(m[1]);
  }
  return [...found].sort();
}

function seededIcons() {
  const found = new Set();
  for (const file of supabaseSql()) {
    const src = read(file);
    for (const m of src.matchAll(/icon text not null default '([a-z][a-z0-9-]*)'/g)) found.add(m[1]);
  }
  return [...found].sort();
}

function iconKeys() {
  const tools = read("assets/js/core/tools.js");
  const block = tools.slice(tools.indexOf("var ICONS = {"));
  const end = block.indexOf("\n  };");
  return [...block.slice(0, end).matchAll(/^\s{4}([a-z][a-z0-9_]*):/gm)].map((m) => m[1]);
}

test("every colour_token the database holds has its token pair in tokens.css", () => {
  const tokens = read("assets/css/tokens.css");
  const missing = [];
  for (const token of seededColourTokens()) {
    for (const name of [`--${token}`, `--${token}-soft`]) {
      if (!tokens.includes(`${name}:`)) {
        missing.push(`${token}: tokens.css defines no ${name}`);
      }
    }
  }
  assert.deepEqual(missing, [], "Seeded colour_token values with no token:\n" +
    missing.join("\n") + "\nThe row still renders - grey, with no error - which " +
    "is why this has to be checked rather than noticed.");
});

test("each of those pairs is defined for both themes", () => {
  // tokens.css states each pair twice: the light palette and the dark
  // override. One definition means the board loses its colour in one
  // theme only, which is the kind of thing nobody reports.
  const tokens = read("assets/css/tokens.css");
  const wrong = [];
  for (const token of seededColourTokens()) {
    for (const name of [`--${token}`, `--${token}-soft`]) {
      const n = (tokens.match(new RegExp(name.replace(/-/g, "\\-") + ":", "g")) || []).length;
      if (n !== 2) wrong.push(`${name}: defined ${n} time(s), expected 2 (light + dark)`);
    }
  }
  assert.deepEqual(wrong, [], "Token pairs not defined for both themes:\n" + wrong.join("\n"));
});

test("no --ar- token pair is orphaned", () => {
  // The other direction: a token pair nothing names is dead weight that
  // the next reader cannot tell apart from the live ones.
  const tokens = read("assets/css/tokens.css");
  const seeded = new Set(seededColourTokens());
  const css = trackedFiles()
    .filter((f) => f.endsWith(".css") && f !== "assets/css/tokens.css")
    .map(read).join("\n");
  const orphans = [];
  for (const m of tokens.matchAll(/^\s*--(ar-[a-z][a-z0-9-]*):/gm)) {
    const name = m[1];
    const base = name.replace(/-soft$/, "");
    if (seeded.has(base) || seeded.has(name)) continue;
    if (css.includes(`var(--${name})`)) continue;
    orphans.push(name);
  }
  assert.deepEqual(orphans, [],
    `--ar- tokens that no seeded row names and no stylesheet uses: ${orphans.join(", ")}. ` +
    "Either a row should name it, or it should go.");
});

test("every icon the schema can default to is one the nav can draw", () => {
  const known = iconKeys();
  assert.ok(known.length > 0, "tools.js ICONS map could not be read");
  const missing = seededIcons().filter((i) => !known.includes(i));
  assert.deepEqual(missing, [],
    `portal_links rows can carry icon(s) ${missing.join(", ")}, which core/tools.js ` +
    `cannot draw (it knows: ${known.join(", ")}). Such a row renders nothing at all.`);
});
