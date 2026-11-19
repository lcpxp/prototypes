// ------------------------------------------------------------------
// tools/ado/correct.js - Carries a change made in LPio after a push
// across to the work items already in Azure DevOps (docs/DEVOPS.md,
// Corrections). The payload is ado_correction_payload(): every pushed
// story rendered as a push would render it now, with its id and the
// revision it was pushed at.
//
// DATA-FREE, like tools/ado/engine.js: the payload's profile names the
// target. It runs in the browser console on a page of the project:
//
//   await LPioCorrect.run(PAYLOAD)     plan, confirm, correct, receipt
//
// Rules: only fields whose text differs are written; Effort and
// Dependencies are never touched, because Azure DevOps owns them after
// the push. An item edited in Azure DevOps since the push, or no longer
// New, is listed separately and asked about before it is overwritten.
// Every write is guarded by the revision just read, so nothing changed
// in the meantime is lost. The receipt (outcome "updated") goes back
// through ado_receipt_apply, which takes each story's new revision and
// hash.
// ------------------------------------------------------------------
(function (root) {
  "use strict";

  var API = "api-version=7.1";
  var NEVER = { effort: true, dependencies: true };

  // What a rich-text field says, as tools/ado/engine.js reads it: markup,
  // entities and a checklist's ticks dropped, whitespace collapsed.
  function text(value) {
    return String(value == null ? "" : value)
      .replace(/<span>\s*\(<span>@[\s\S]*?<\/span>[^<]*\)<\/span>/g, " ")
      .replace(/\[(x| )\](\s*\{Done\})?/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
  }

  // The fields to write for one item: those whose text differs.
  function changes(p, item, current) {
    var set = {};
    Object.keys(item.fields || {}).forEach(function (name) {
      var ref = p.fields[name];
      if (NEVER[name] || !ref) return;
      if (text(item.fields[name]) !== text((current || {})[ref])) set[ref] = item.fields[name];
    });
    return set;
  }

  function create(env) {
    function call(method, url, body, type) {
      return env.fetch(env.origin + url, {
        method: method, credentials: "same-origin",
        headers: { "X-TFS-FedAuthRedirect": "Suppress", Accept: "application/json",
          "Content-Type": type || "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(function (res) {
        return res.text().then(function (raw) {
          var data = null;
          try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
          if (!res.ok || res.status === 203 || (raw && data === null)) {
            throw new Error(method + " " + url.split("?")[0] + " answered " + res.status +
              (data && data.message ? ": " + data.message : ""));
          }
          return data;
        });
      });
    }

    function plan(payload) {
      if (!payload || !payload.correction) {
        return Promise.reject(new Error("This is not a correction payload: build it with ado_correction_payload()."));
      }
      var p = payload.profile;
      var base = "/" + encodeURIComponent(p.organisation) + "/" + encodeURIComponent(p.project);
      var ids = payload.items.map(function (i) { return i.id; });
      return call("GET", base + "/_apis/wit/workitems?ids=" + ids.join(",") + "&" + API).then(function (r) {
        var byId = {};
        (r.value || []).forEach(function (w) { byId[w.id] = w; });
        return payload.items.map(function (item) {
          var w = byId[item.id];
          if (!w) return { item: item, action: "skip: not found" };
          var set = changes(p, item, w.fields);
          var moved = w.rev !== item.pushed_rev;
          var started = w.fields["System.State"] !== "New";
          return {
            item: item, rev: w.rev, set: set,
            action: !Object.keys(set).length ? "nothing to change"
              : moved || started ? "ask: " + (moved ? "edited in Azure DevOps since the push" : "no longer New")
              : "correct",
          };
        });
      });
    }

    function run(payload) {
      var p = payload && payload.profile;
      return plan(payload).then(function (rows) {
        env.table(rows.map(function (r) {
          return { id: r.item.id, title: text(r.item.fields.title).slice(0, 60), action: r.action,
            fields: Object.keys(r.set || {}).map(function (ref) { return ref.split(".").pop(); }).join(", ") };
        }));
        var clean = rows.filter(function (r) { return r.action === "correct"; });
        var asked = rows.filter(function (r) { return r.action.indexOf("ask") === 0; });
        if (asked.length && env.confirm("These were edited in Azure DevOps since the push, or have started: " +
            asked.map(function (r) { return "#" + r.item.id; }).join(", ") +
            ". Overwrite the fields listed with the LPio version?")) clean = clean.concat(asked);
        var entries = rows.filter(function (r) { return r.action === "nothing to change"; }).map(function (r) {
          return { key: r.item.key, id: r.item.id, type: r.item.type, rev: r.rev, hash: r.item.hash, outcome: "updated" };
        });
        if (!clean.length || !env.confirm("Correct " + clean.length + " work items in Azure DevOps?")) {
          env.log("Nothing was written.");
          return finish(entries, rows);
        }
        var base = "/" + encodeURIComponent(p.organisation) + "/" + encodeURIComponent(p.project);
        return clean.reduce(function (chain, r) {
          return chain.then(function () {
            var ops = [{ op: "test", path: "/rev", value: r.rev }];
            Object.keys(r.set).forEach(function (ref) { ops.push({ op: "add", path: "/fields/" + ref, value: r.set[ref] }); });
            return call("PATCH", base + "/_apis/wit/workitems/" + r.item.id + "?" + API, ops,
              "application/json-patch+json").then(function (w) {
              r.action = "corrected";
              entries.push({ key: r.item.key, id: r.item.id, type: r.item.type,
                rev: (w && w.rev) || r.rev + 1, hash: r.item.hash, outcome: "updated" });
            });
          });
        }, Promise.resolve()).then(function () { return finish(entries, rows); }, function (e) {
          env.log("Stopped: " + e.message + ". What was corrected before it is in the receipt.");
          finish(entries, rows);
          throw e;
        });
      });
    }

    function finish(entries, rows) {
      var receipt = { pushed_at: new Date().toISOString(), correction: true, entries: entries };
      env.table(rows.map(function (r) { return { id: r.item.id, action: r.action }; }));
      env.save("ado-correction-receipt-" + receipt.pushed_at.slice(0, 10) + ".json", receipt);
      return receipt;
    }

    return { plan: plan, run: run };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { create: create, text: text, changes: changes };
    return;
  }
  root.LPioCorrect = create({
    origin: root.location.origin,
    fetch: root.fetch.bind(root),
    confirm: function (question) { return root.confirm(question); },
    log: function (line) { root.console.log(line); },
    table: function (rows) { root.console.table(rows); },
    save: function (name, value) {
      var body = JSON.stringify(value, null, 2);
      root.saveReceipt = function () {
        var a = root.document.createElement("a");
        a.href = root.URL.createObjectURL(new root.Blob([body], { type: "application/json" }));
        a.download = name;
        root.document.body.appendChild(a);
        a.click();
        a.remove();
        return name;
      };
      root.saveReceipt();
      root.console.log(name + " should be in Downloads. If not, type saveReceipt() and press Enter.");
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
