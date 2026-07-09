// ------------------------------------------------------------------
// tests/lib/repo.js - Shared helpers for the benchmark suite.
// Operates on git-tracked files only, so local scratch and the
// gitignored config.js are never scanned or leaked into output.
// ------------------------------------------------------------------
"use strict";
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function isTextFile(rel) {
  return /\.(js|css|html|md|sql|json|txt|sh|patch|gitignore|gitmessage)$/.test(rel)
    || /(^|\/)\.(gitignore|gitmessage)$/.test(rel);
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

module.exports = { ROOT, trackedFiles, read, isTextFile, lineOf };
