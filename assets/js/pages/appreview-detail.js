// ------------------------------------------------------------------
// appreview-detail.js - The drawer body for one application. A pure
// builder: rows in, HTML string out, with no fetching and no DOM
// beyond what it returns (the same split roadmap-detail.js uses).
//
// The drawer is where a classification has to justify itself. It shows
// what to do and why, what evidence that rests on, how far that
// evidence actually goes, and anything about the record that
// contradicts its own status.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var CONFIDENCE_LABEL = {
    corroborated: "Corroborated - the evidence states this directly",
    inferred: "Inferred - read from partial evidence, not stated outright",
    truncated: "Truncated evidence - the source cut off mid-sentence",
  };

  var TRIGGER_LABEL = {
    date: "Date",
    release: "Software release",
    person: "A person's reply",
    event: "External event",
  };

  function day(value) {
    if (!value) return "";
    var parsed = new Date(value);
    return isNaN(parsed) ? "" : parsed.toISOString().slice(0, 10);
  }

  function block(title, inner) {
    if (!inner) return "";
    return '<div class="ar-drawer-block"><span class="eyebrow">' +
      App.escape(title) + "</span>" + inner + "</div>";
  }

  function paragraph(text, fallback) {
    if (!text) {
      return fallback ? '<p class="ar-note">' + App.escape(fallback) + "</p>" : "";
    }
    return "<p>" + App.escape(text) + "</p>";
  }

  // Confirmation, stated as what it is. An assumed no-action and a
  // confirmed one must never read the same way, so they get different
  // wording, different colour and different meaning in the sentence.
  function confirmation(app) {
    if (app.confirmed_at) {
      return '<p class="ar-confirm is-confirmed">Confirmed on ' +
        App.escape(day(app.confirmed_at)) + ". A person has looked at this " +
        "and decided it needs nothing.</p>";
    }
    if (app.triage_category === "monitor") {
      return '<p class="ar-confirm is-assumed">Assumed to need nothing, not ' +
        "yet confirmed. This is an inference from the evidence below, not a " +
        "decision - checking it is still work.</p>";
    }
    return "";
  }

  function findingsHtml(findings) {
    if (!findings.length) return "";
    return findings.map(function (finding) {
      var cls = finding.kind === "danger" ? " is-danger"
        : finding.kind === "warn" ? " is-warn" : "";
      return '<div class="ar-finding' + cls + '">' +
        App.escape(finding.text) + "</div>";
    }).join("");
  }

  // The mail trail, oldest first, so it reads as the story it is.
  function trailHtml(evidence) {
    if (!evidence.length) {
      return '<p class="ar-note">No evidence recorded. Nothing here has been ' +
        "corroborated against a mail trail.</p>";
    }
    var items = evidence.map(function (row) {
      var meta = [];
      if (row.occurred_on) meta.push(App.escape(day(row.occurred_on)));
      if (row.direction) meta.push(App.escape(row.direction));
      if (row.actor) meta.push(App.escape(row.actor));
      if (row.source) meta.push(App.escape(row.source));
      var truncated = row.is_truncated
        ? '<p class="ar-trail-truncated">This source cut off mid-sentence. ' +
          "Anything past the break is unknown, not implied.</p>"
        : "";
      var ref = row.screenshot_ref
        ? '<p class="ar-trail-meta">' + App.escape(row.screenshot_ref) + "</p>"
        : "";
      return "<li>" +
        '<p class="ar-trail-meta">' + meta.join(" &middot; ") + "</p>" +
        "<p>" + App.escape(row.summary || "") + "</p>" +
        truncated + ref +
        "</li>";
    }).join("");
    return '<ul class="ar-trail">' + items + "</ul>";
  }

  function triggerHtml(app) {
    var trigger = App.appReview.triggerOf(app);
    if (!trigger) return "";
    return "<dl class=\"kv\"><dt>Waiting on</dt><dd>" +
      App.escape(TRIGGER_LABEL[trigger.kind] || trigger.kind) + "</dd>" +
      "<dt>Until</dt><dd>" + App.escape(trigger.label || "") + "</dd></dl>";
  }

  function metadataHtml(app, statuses, age) {
    var status = statuses[app.launchpad_status];
    var pairs = [
      ["LaunchPad status", status ? status.label : app.launchpad_status],
      ["Application id", app.launchpad_application_id],
      ["Partner", app.partner_name],
      ["Acquirer", app.acquirer],
      ["Risk level", app.risk_level],
      ["Raised by", app.raised_by],
      ["Created in LaunchPad", day(app.created_in_launchpad_at)],
      ["Last updated", day(app.launchpad_last_updated_at)],
      ["Last updated by", app.launchpad_last_updated_by],
    ];
    if (age.days !== null) {
      // Say what the age means, not just what it is. On a dormant
      // draft the number is real but carries no signal, and leaving
      // that unsaid is what made these records look stale before.
      pairs.push(["Age", age.isSignal
        ? age.days + " days" + (age.isStale ? " - past the point of chasing" : "")
        : age.days + " days - not a staleness signal at this status"]);
    }
    var rows = pairs.filter(function (pair) { return pair[1]; })
      .map(function (pair) {
        return "<dt>" + App.escape(pair[0]) + "</dt><dd>" +
          App.escape(pair[1]) + "</dd>";
      }).join("");
    return '<dl class="kv">' + rows + "</dl>";
  }

  // ctx: { categories, statuses, evidence, dupes }
  App.appReviewDetail = function (app, ctx) {
    var M = App.appReview;
    var category = ctx.categories[app.triage_category];
    var evidence = ctx.evidence || [];
    var age = M.ageOf(app, ctx.statuses, ctx.now);
    var findings = App.appReviewFindings.findings(app, evidence, ctx.dupes);

    var html =
      "<h2>" + App.escape(app.merchant_name) + "</h2>" +
      '<p class="ar-drawer-sub">' +
      App.escape(app.partner_name || "No partner recorded") +
      (category ? " &middot; " + App.escape(category.label) : "") +
      "</p>";

    html += confirmation(app);
    html += findingsHtml(findings);

    html += block("Action", paragraph(app.action_text,
      "No action recorded for this record."));
    html += block("Why", paragraph(app.rationale_text,
      "No rationale recorded. A classification without one cannot be checked."));
    html += block("Confidence",
      "<p>" + App.escape(CONFIDENCE_LABEL[app.evidence_confidence] ||
        app.evidence_confidence) + "</p>");
    html += block("Next trigger", triggerHtml(app));
    html += block("Status note", paragraph(app.launchpad_status_note));
    html += block("Mail trail", trailHtml(evidence));
    html += block("Record", metadataHtml(app, ctx.statuses, age));

    return html;
  };
})();
