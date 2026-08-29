// ------------------------------------------------------------------
// portalreview-model.js - Every derivation the portal review board
// needs, as pure functions (App.portalReview). Rows in, plain values
// out, no DOM and no fetching, so they load in a Node vm for testing.
//
// Nothing here is stored: coverage per part, per-area open counts, the
// three-way grouping and the walker's queue are all computed from the
// rows at render time. Storing any of them would create a second
// version of a number that the rows already answer, and the two would
// disagree the first time a session wrote one and not the other.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // A finding is live when it is not soft-deleted. Everything else is
  // a question about state or disposition, asked separately.
  function live(rows) {
    return (rows || []).filter(function (row) { return row && !row.deleted_at; });
  }

  // The three groups the board reads by, in the order it reads them.
  // Open leads; the rest collapse. `works` is its own group on purpose:
  // a review that records only faults reads as a worse system than it
  // is, and recording what worked was worth keeping.
  var GROUPS = [
    { key: "open", label: "Open" },
    { key: "verify", label: "Awaiting verification" },
    { key: "settled", label: "Settled" },
    { key: "works", label: "Worked well" },
  ];

  function groupOf(finding) {
    if (!finding) return "open";
    if (finding.kind === "works") return "works";
    if (finding.state === "answered") return "verify";
    if (finding.state === "verified" || finding.state === "closed") return "settled";
    return "open";
  }

  App.portalReview = {};
  App.portalReview.GROUPS = GROUPS.slice();
  App.portalReview.live = live;
  App.portalReview.groupOf = groupOf;

  // Findings for one area, split into the four groups in order. An
  // empty group is still present, so a caller can say "0" rather than
  // having to know the group exists.
  App.portalReview.groupsFor = function (findings) {
    var out = {};
    GROUPS.forEach(function (g) { out[g.key] = []; });
    live(findings).forEach(function (f) { out[groupOf(f)].push(f); });
    return out;
  };

  // Areas grouped into their parts, in sort order, each part carrying
  // its own coverage. `walked` is the set of area ids walked in the
  // wave being viewed; `openBy` counts open findings per area id.
  App.portalReview.parts = function (areas, walked, openBy) {
    walked = walked || {};
    openBy = openBy || {};
    var order = [];
    var byPart = {};
    (areas || []).slice()
      .filter(function (a) { return a && !a.retired_at; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); })
      .forEach(function (area) {
        if (!byPart[area.part]) { byPart[area.part] = []; order.push(area.part); }
        byPart[area.part].push(area);
      });
    return order.map(function (part) {
      var rows = byPart[part];
      var done = rows.filter(function (a) { return walked[a.id]; }).length;
      return {
        part: part,
        areas: rows.map(function (area) {
          return {
            area: area,
            walked: Boolean(walked[area.id]),
            open: openBy[area.id] || 0,
          };
        }),
        walked: done,
        total: rows.length,
        open: rows.reduce(function (n, a) { return n + (openBy[a.id] || 0); }, 0),
      };
    });
  };

  // { areaId: true } for one wave, from the pass rows.
  App.portalReview.walkedIn = function (passes, waveId) {
    var out = {};
    (passes || []).forEach(function (p) {
      if (p && (!waveId || p.wave_id === waveId)) out[p.area_id] = true;
    });
    return out;
  };

  // { areaId: n } counting open findings only. A finding with no area
  // is counted under the empty key rather than dropped, so the total
  // across areas always reconciles with the wave's own count.
  App.portalReview.openByArea = function (findings) {
    var out = {};
    live(findings).forEach(function (f) {
      if (groupOf(f) !== "open") return;
      var key = f.area_id || "";
      out[key] = (out[key] || 0) + 1;
    });
    return out;
  };

  // The walker: the next area in order that this wave has not walked.
  // Trivial mechanically, and it is what made a thirty-nine-area sweep
  // finishable. Returns null when the wave has walked everything.
  App.portalReview.nextArea = function (areas, walked, afterId) {
    walked = walked || {};
    var ordered = (areas || []).slice()
      .filter(function (a) { return a && !a.retired_at; })
      .sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
    var start = 0;
    if (afterId) {
      var at = ordered.findIndex(function (a) { return a.id === afterId; });
      if (at >= 0) start = at + 1;
    }
    for (var i = start; i < ordered.length; i++) {
      if (!walked[ordered[i].id]) return ordered[i];
    }
    // Wrap, so "next" from the last unwalked area finds an earlier one
    // rather than reporting the sweep finished when it is not.
    for (var j = 0; j < start && j < ordered.length; j++) {
      if (!walked[ordered[j].id]) return ordered[j];
    }
    return null;
  };

  // The wave's headline: what it has covered and what it still needs.
  App.portalReview.waveSummary = function (areas, passes, findings, waveId) {
    var walked = App.portalReview.walkedIn(passes, waveId);
    var total = (areas || []).filter(function (a) { return a && !a.retired_at; }).length;
    var rows = live(findings);
    var counts = { open: 0, verify: 0, settled: 0, works: 0 };
    rows.forEach(function (f) { counts[groupOf(f)]++; });
    return {
      areas: total,
      walked: Object.keys(walked).length,
      findings: rows.length,
      open: counts.open,
      awaiting_verification: counts.verify,
      settled: counts.settled,
      works: counts.works,
      standing: rows.filter(function (f) { return f.standing && f.state !== "closed"; }).length,
      owner_action: rows.filter(function (f) { return f.owner_action && f.state !== "closed"; }).length,
      blockers: rows.filter(function (f) {
        return f.emphasis === "blocker" && groupOf(f) === "open";
      }).length,
    };
  };

  // The single next action, in words. A count is a fact; this is a
  // thing to do, and the difference is why the wave card exists rather
  // than another counter.
  App.portalReview.nextAction = function (summary) {
    if (!summary) return "";
    if (summary.walked < summary.areas) {
      var left = summary.areas - summary.walked;
      return left + (left === 1 ? " area still to walk" : " areas still to walk");
    }
    if (summary.awaiting_verification > 0) {
      return summary.awaiting_verification +
        (summary.awaiting_verification === 1
          ? " answer waiting on your verification"
          : " answers waiting on your verification");
    }
    if (summary.owner_action > 0) {
      return summary.owner_action +
        (summary.owner_action === 1 ? " finding waiting on you" : " findings waiting on you");
    }
    if (summary.open > 0) {
      return summary.open + (summary.open === 1
        ? " finding open with the developers" : " findings open with the developers");
    }
    return "Nothing outstanding. The wave is ready to triage.";
  };

  // The triage view's grouping: every finding in the closing wave under
  // the disposition proposed for it, with the undecided leading -
  // because those are the ones the pass exists to settle.
  var DISPOSITIONS = ["promoted", "merged", "parked", "archived"];
  App.portalReview.DISPOSITIONS = DISPOSITIONS.slice();

  App.portalReview.triageGroups = function (findings) {
    var out = [{ key: "", label: "Not yet decided", findings: [] }];
    var byKey = { "": out[0] };
    DISPOSITIONS.forEach(function (key) {
      var g = { key: key, findings: [] };
      byKey[key] = g;
      out.push(g);
    });
    live(findings).forEach(function (f) {
      var g = byKey[f.disposition || ""] || byKey[""];
      g.findings.push(f);
    });
    return out;
  };
})();
