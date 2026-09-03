// ------------------------------------------------------------------
// app-review/findings.js - The cross-record half of the review model:
// duplicates, the partner-blocker rollup, and the findings that fire
// when a record's own state disagrees with its evidence.
//
// Split from appreview-model.js, which derives values from a single
// row (its group, age, marker, trigger, ordering). Everything here
// needs to see more than one row, or needs the evidence trail, so it
// reads differently and is tested separately
// (tests/unit/app-review/findings.test.js).
//
// Findings are derived from TYPED signals on evidence rows, never by
// matching words in prose: rewording a summary must not be able to
// silently drop a finding.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Merchant + partner pairs appearing more than once in a wave. The
  // same merchant really can be submitted twice under one partner, and
  // the board has to say which is live - but a duplicate already
  // showing Cancelled has been retired, so proposing to retire it
  // again is noise.
  function duplicateKeys(apps) {
    var seen = {};
    var dupes = {};
    (apps || []).forEach(function (app) {
      var key = String(app.merchant_name || "").toLowerCase() + "|" +
        String(app.partner_name || "").toLowerCase();
      if (seen[key]) dupes[key] = true;
      seen[key] = true;
    });
    return dupes;
  }

  function duplicateKeyOf(app) {
    return String(app.merchant_name || "").toLowerCase() + "|" +
      String(app.partner_name || "").toLowerCase();
  }

  // Partner-scope blockers rolled up. "This partner is not established
  // with the acquirer" gates every application under that partner, so
  // it is read once at wave level rather than once per row.
  function partnerBlockers(apps) {
    var byPartner = {};
    (apps || []).forEach(function (app) {
      if (app.blocker_scope !== "partner") return;
      var name = app.partner_name || "Unattributed";
      if (!byPartner[name]) byPartner[name] = [];
      byPartner[name].push(app);
    });
    return Object.keys(byPartner).sort().map(function (name) {
      return { partner: name, applications: byPartner[name] };
    });
  }

  // Where the record's own state disagrees with its evidence, or where
  // something about it needs saying out loud. Derived from typed
  // signals on evidence rows rather than from reading prose, so a
  // rewording of a summary can never silently drop a finding.
  function findings(app, evidence, dupes) {
    var found = [];
    var signals = {};
    (evidence || []).forEach(function (row) {
      if (row.signal) signals[row.signal] = true;
      if (row.is_truncated) signals.truncated = true;
    });

    // Cancelled is the deletion mechanism in LP - records are
    // never really removed - so it means someone deliberately killed
    // this one, not that the partner withdrew.
    if (app.launchpad_status === "cancelled" && signals.approval) {
      found.push({
        kind: "danger",
        text: "Cancelled, but the trail holds an approval. Someone killed a " +
          "record the acquirer had already approved.",
      });
    }
    if (app.launchpad_status === "cancelled" && signals.decline) {
      found.push({
        kind: "danger",
        text: "Cancelled where the evidence shows a decline. This belongs in " +
          "Rejected: filed as Cancelled it skews decline-rate reporting " +
          "against the acquirer.",
      });
    }
    if (signals.delivery_failure) {
      found.push({
        kind: "warn",
        text: "A submission to the acquirer bounced. The manual email route " +
          "caps attachments at 35MB.",
      });
    }
    if (app.manual_pipeline) {
      found.push({
        kind: "warn",
        text: "Manual pipeline: do not send digitally. The acquirer is already " +
          "reviewing this merchant by email, and an automated send would " +
          "duplicate it on their side.",
      });
    }
    if (app.blocker_scope === "partner") {
      found.push({
        kind: "info",
        text: "Partner-scope blocker: this gates every application under " +
          (app.partner_name || "this partner") + ", not just this one.",
      });
    }
    if (app.blocker_scope === "merchant") {
      found.push({
        kind: "info",
        text: "Merchant-scope blocker: it follows the merchant and will " +
          "resurface if the same merchant is resubmitted under another partner.",
      });
    }
    if (dupes && dupes[duplicateKeyOf(app)]) {
      found.push({
        kind: "info",
        text: app.launchpad_status === "cancelled"
          ? "Duplicate record for this merchant and partner. This one is " +
            "already Cancelled, so it has been retired."
          : "Duplicate record for this merchant and partner. Check which is live.",
      });
    }
    if (app.evidence_confidence === "truncated" || signals.truncated) {
      found.push({
        kind: "info",
        text: "Read from truncated evidence. The source cut off mid-sentence, " +
          "so this reading is partial.",
      });
    }
    return found;
  }

  App.appReviewFindings = {
    duplicateKeys: duplicateKeys,
    duplicateKeyOf: duplicateKeyOf,
    partnerBlockers: partnerBlockers,
    findings: findings,
  };
})();
