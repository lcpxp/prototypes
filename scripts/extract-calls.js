#!/usr/bin/env node
// ------------------------------------------------------------------
// scripts/extract-calls.js - Reads a LP front-end checkout and
// emits the routes it actually calls: one entry per this.http.<verb>
// call site, with the URL expression resolved to a route key.
//
// This is inventory C of the three in docs/plan/20-API-REFERENCE.md,
// and the reason it exists is docs/plan/00-PROGRAMME.md's closed
// scope decision: 552 routes exist, the portal calls 411 of them, and
// a reference that cannot tell those apart shows a reader 141 routes
// nothing has touched in years as though they were current. That
// distinction has to be DERIVED on every run rather than typed once,
// or it is wrong the day someone wires up a controller and nobody
// notices.
//
// Like extract-routes.js this reads a scratch checkout passed on the
// command line and NEVER a committed copy. The LP source does
// not enter this public repo, and neither does this output beyond the
// counts and digest in supabase/reference-coverage.json.
//
// Usage:
//   node scripts/extract-calls.js <path-to-portal-src>
//   node scripts/extract-calls.js <path> --digest   (just the sha256)
//
// Why this evaluates instead of pattern-matching
// ----------------------------------------------
// The portal builds its URLs out of ordinary TypeScript. A regex pass
// resolves about three quarters of the call sites and then stalls,
// because the last quarter is constructor fields, property
// initialisers, defaulted helper parameters, ternaries inside template
// literals, and a base that comes from an injection token. Rather than
// grow a rule per shape, this substitutes a marker for the API root,
// runs the expressions, and reads the answer. The nine rules below are
// what that costs; each has a benchmark in
// tests/unit/call-extract.test.js, so this file can be trusted without
// the LP source on hand.
// ------------------------------------------------------------------
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { routeKey } = require("./extract-routes.js");

// Rule 1: the API root is a marker, not a URL. msalConfig.apis[0].uri
// really ends in "/api/"; substituting a marker means a resolved value
// is recognisable by its prefix and an expression that never touched
// the config cannot masquerade as a route.
const ROOT = "@@/";

// Rule 2: an unknown identifier reads as "${x}" - truthy, so a
// `path ? base + path : base` takes the branch a caller passing a real
// id would take, and collapsing to {} in the route key so it compares
// against a code route's placeholder.
const SENTINEL = "${x}";

// Rule 3: this.http.<verb> is the only spelling in the codebase. A
// looser pattern (any *.get) matches rxjs operators and Map lookups.
// The whitespace tolerance is not decoration: the portal happens to
// keep `.http.get` on one line today, so a strict pattern scores the
// same 401 - but a reformat that broke the chain across lines would
// silently drop call sites and report routes as uncalled. Nothing
// would fail. The fixture holds a split call for that reason.
const VERB_RE = /\.http\s*\.\s*(get|post|put|patch|delete)\s*(?:<[\s\S]*?>)?\s*\(/g;

// Rule 4: the config expression in every spelling the portal uses.
const URI_RE = /\$\{\s*(?:this\.)?config\??\.[\w.[\]]*uri\s*\}|(?:this\.)?config\??\.[\w.[\]]*uri/;

const FIELD = "[#\\w]+";

// Rule 5: TypeScript that JavaScript will not run. Private-field
// sigils become an ordinary identifier; non-null assertions go.
function toJs(source) {
  return source.replace(/#(\w+)/g, "_p_$1").replace(/!\./g, ".");
}

function stripParamTypes(params) {
  return params.split(",").map(function (p) {
    const eq = p.indexOf("=");
    const head = eq === -1 ? p : p.slice(0, eq);
    const name = /([#\w]+)\s*\??\s*:/.exec(head) || /^\s*([#\w]+)\s*\??\s*$/.exec(head);
    if (!name) return null;
    const id = name[1].replace(/^#/, "_p_");
    return eq === -1 ? id : id + " =" + p.slice(eq + 1);
  }).filter(function (p) { return p !== null; }).join(", ");
}

// Rule 6: a helper's own parameters must be invisible to the scope
// proxy. `with` answers before the closure does, so a proxy claiming
// every name makes `flowUrl(acquirerId)` see a truthy `flowId` and
// build a route with a trailing id the caller never passed. Two wrong
// routes came from exactly that.
function lens(scope, shadowed) {
  return new Proxy(scope, {
    has: function (t, k) { return !(shadowed && shadowed.has(k)); },
    get: function (t, k) { return k in t ? t[k] : SENTINEL; },
  });
}

function evaluate(expr, scope) {
  return new Function("__s", "with(__s){return (" + expr + ");}")(lens(scope));
}

// Rule 7: an interpolation that does not start its own segment is a
// query string, not a path parameter - `.../admin/users${query}` where
// query is `?partnerId=...` or ''. A real route parameter always
// follows a slash, so anything else ends the path.
function relativeKey(method, rel) {
  let p = "/api/" + rel.replace(/^\/+/, "").replace(/^api\//, "");
  p = p.replace(/([^/])\$\{[^}]*\}[\s\S]*$/, "$1");
  p = p.replace(/[?#][\s\S]*$/, "");
  // Collapse the interpolations before routeKey sees them: its own
  // placeholder rule matches {name}, so a bare `${id}` would leave the
  // dollar behind and no key would ever compare equal to a code route.
  return routeKey(method, p.replace(/\$\{[^}]*\}/g, "{}"));
}

// The first argument of a call, read by balancing brackets so a nested
// call or a template literal comes back whole.
function firstArg(source, open) {
  let depth = 0, quote = null;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth === 0) return source.slice(open + 1, i).trim();
    } else if (ch === "," && depth === 1) return source.slice(open + 1, i).trim();
  }
  return null;
}

function walk(dir, out) {
  out = out || [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Rule 8: an injection token is a route prefix with more than one
// value. MERCHANT_API_BASE is `v1/merchants` in the Acquirer tenant and
// `v1/partner/merchant` in the partner tenant, so one call site
// reaches two live routes - the mirror convention, in the source.
// Emitting one of them reports half the merchant surface as uncalled.
function collectShared(sources) {
  const consts = {};
  for (const src of sources.values()) {
    let m; const RE = /(?:const|export const)\s+([A-Z_0-9]+)\s*=\s*['"`]([^'"`$]*)['"`]/g;
    while ((m = RE.exec(src)) !== null) consts[m[1]] = m[2];
  }
  const tokens = {};
  const add = function (name, value) {
    if (value === undefined) return;
    (tokens[name] = tokens[name] || new Set()).add(value);
  };
  for (const src of sources.values()) {
    let m;
    const PROV = /\{\s*provide:\s*(\w+),\s*useValue:\s*(\w+)\s*\}/g;
    while ((m = PROV.exec(src)) !== null) add(m[1], consts[m[2]]);
    const FACT = /new InjectionToken<[^>]*>\(\s*['"](\w+)['"][\s\S]{0,200}?factory:\s*\(\)\s*=>\s*(\w+)/g;
    while ((m = FACT.exec(src)) !== null) add(m[1], consts[m[2]]);
  }
  return { consts: consts, tokens: tokens };
}

// One file in, the call sites it holds out. `shared` comes from
// collectShared over the whole checkout, because a prefix constant is
// routinely declared in a different file from the service using it.
function extractFile(raw, file, shared) {
  const src = toJs(raw);
  const found = [];
  if (!/\.http\s*\.\s*(get|post|put|patch|delete)\s*[<(]/.test(src)) return found;
  const consts = shared.consts, tokens = shared.tokens;

  const injected = {};
  let inj; const INJ = /@Inject\((\w+)\)\s*(?:private\s+|readonly\s+|public\s+)*(\w+)\s*:\s*string/g;
  while ((inj = INJ.exec(src)) !== null) {
    if (tokens[inj[1]]) injected[inj[2]] = Array.from(tokens[inj[1]]);
  }
  let combos = [{}];
  for (const name of Object.keys(injected)) {
    const values = injected[name];
    combos = combos.reduce(function (acc, c) {
      return acc.concat(values.map(function (v) {
        return Object.assign({}, c, { [name]: v });
      }));
    }, []);
  }

  const locals = {};
  let c; const CRE = /\b(?:const|let|readonly)\s+(\w+)\s*(?::\s*string\s*)?=\s*['"]([^'"$]*)['"]/g;
  while ((c = CRE.exec(src)) !== null) locals[c[1]] = c[2];

  const config = { msalConfig: { apis: [{ uri: ROOT }] } };
  const seen = new Set();

  combos.forEach(function (combo, comboIndex) {
    const self = { config: config };
    const scope = Object.assign({}, consts, locals, combo, {
      __this: self, config: config, encodeURIComponent: function (v) { return v; },
    });

    // Rule 9: fields resolve in the order TypeScript runs them -
    // property initialisers, then the constructor body. Both spellings
    // appear in the portal, sometimes in one class. Only a value that
    // reached the API root is kept, so an unrelated field cannot
    // shadow a base.
    const INIT = /^[ \t]*(?:private\s+|protected\s+|public\s+)?(?:readonly\s+)?(\w+)\s*!?\s*(?::\s*[\w<>[\]|\s]+)?=\s*(`[^`]*`|[^;\n]+);/gm;
    const ASSIGN = /this\.(\w+)\s*=\s*((?:`[^`]*`|[^;\n])+);/g;
    [INIT, ASSIGN].forEach(function (RE) {
      let a; RE.lastIndex = 0;
      while ((a = RE.exec(src)) !== null) {
        try {
          const value = evaluate(a[2].replace(/\bthis\./g, "__this."), scope);
          if (typeof value === "string" && value.startsWith(ROOT)) self[a[1]] = value;
        } catch (e) { /* not a URL expression */ }
      }
    });

    let h;
    const HELP = /(?:private\s+|protected\s+)?(\w+)\s*\(([^)]*)\)\s*:\s*string\s*\{([\s\S]*?)\n {2}\}/g;
    while ((h = HELP.exec(src)) !== null) {
      const params = stripParamTypes(h[2]);
      const body = h[3].replace(/\bthis\./g, "__this.");
      const own = new Set(params.split(",").map(function (p) {
        return p.split("=")[0].trim();
      }).filter(Boolean));
      try {
        self[h[1]] = new Function("__s",
          "return function(" + params + "){with(__s){" + body + "}};")(lens(scope, own));
      } catch (e) { /* not a URL helper */ }
    }

    VERB_RE.lastIndex = 0;
    let m;
    while ((m = VERB_RE.exec(src)) !== null) {
      const open = m.index + m[0].length - 1;
      const arg = firstArg(src, open);
      if (arg === null) continue;
      // A method that builds its URL into a local first - `let url =
      // this.baseUrl;` then `get(url, {params})` - is the same route,
      // so follow one hop back to the nearest declaration above.
      let expr = arg;
      if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
        const DECL = new RegExp("(?:let|const|var)\\s+" + arg +
          "\\s*(?::[^=]*)?=\\s*(`[^`]*`|[^;\\n]+);", "g");
        let d, last = null;
        while ((d = DECL.exec(src)) !== null && d.index < m.index) last = d[1];
        if (last) expr = last;
      }
      let value = null;
      try { value = evaluate(expr.replace(/\bthis\./g, "__this."), scope); } catch (e) { /* below */ }
      const site = {
        method: m[1].toUpperCase(), file: file,
        line: src.slice(0, m.index).split("\n").length,
        expression: arg.replace(/\s+/g, " "),
      };
      if (typeof value !== "string" || !value.startsWith(ROOT)) {
        // Not a route: seven call sites GET a pre-signed URL that an
        // earlier response handed back, so the request leaves the API.
        if (comboIndex === 0) found.push(Object.assign({ key: null }, site));
        continue;
      }
      const key = relativeKey(m[1], value.slice(ROOT.length));
      if (seen.has(key + site.line)) continue;
      seen.add(key + site.line);
      found.push(Object.assign({ key: key }, site));
    }
  });
  return found;
}

function digestOf(keys) {
  return crypto.createHash("sha256")
    .update(Array.from(new Set(keys)).sort().join("\n")).digest("hex");
}

function extractDir(dir) {
  const files = walk(dir);
  const sources = new Map(files.map(function (f) {
    return [f, fs.readFileSync(f, "utf8")];
  }));
  const shared = collectShared(sources);
  const sites = [];
  for (const entry of sources) {
    sites.push(...extractFile(entry[1], entry[0], shared));
  }
  const routed = sites.filter(function (s) { return s.key; });
  const keys = Array.from(new Set(routed.map(function (s) { return s.key; }))).sort();
  // A call site under a multi-provider token yields one entry per
  // provider, so count the sites themselves by where they are, not by
  // how many routes they reach.
  const where = function (s) { return s.file + ":" + s.line; };
  const siteCount = new Set(sites.map(where)).size;
  const resolvedCount = new Set(routed.map(where)).size;
  const callers = {};
  for (const s of routed) {
    (callers[s.key] = callers[s.key] || new Set()).add(path.relative(dir, s.file));
  }
  return {
    sites: siteCount,
    resolved: resolvedCount,
    unresolved: siteCount - resolvedCount,
    files: new Set(routed.map(function (s) { return s.file; })).size,
    keys: keys,
    distinct: keys.length,
    callers: Object.fromEntries(Object.entries(callers).map(function (e) {
      return [e[0], Array.from(e[1]).sort()];
    })),
    digest: digestOf(keys),
  };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Usage: node scripts/extract-calls.js <path-to-portal-src> [--digest]");
    process.exit(2);
  }
  const result = extractDir(dir);
  if (process.argv.includes("--digest")) console.log(result.digest);
  else console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  ROOT, SENTINEL, toJs, stripParamTypes, evaluate, relativeKey,
  firstArg, collectShared, extractFile, extractDir, digestOf,
};
