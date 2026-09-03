// ------------------------------------------------------------------
// pci/interstitial.js - The PCI compliance "checkout interstitial" for
// the Acquirer replica. When the agent proceeds past Product Selection it
// briefly engages them on PCI: confirm compliant (light-touch, optional
// status check + optional managed engagement), or enrol the merchant
// with the data already collected. A Skip failsafe is always available.
// Self-contained: it never redirects away or blocks the flow.
//
// When it closes it hands back to the wizard, which STAYS on Product &
// Pricing and (if enrolled) shows the PCI Compliance fee row. Exposed as
// App.pciInterstitial.open(ctx), ctx = { merchant, products, sites,
// addFee(), onDone() }. Uses the App.pciIxopay mock.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  var esc = App.escape;

  App.pciInterstitial = {
    open: function (ctx) {
      var root = document.getElementById("pxp-modal-root");
      var ixopay = App.pciIxopay;

      function close() { root.innerHTML = ""; }
      function finish() { close(); if (ctx.onDone) ctx.onDone(); }
      function shell(body) {
        root.innerHTML = '<div class="pxp-modal-scrim"><div class="pxp-inter" role="dialog" aria-label="PCI compliance">' + body + "</div></div>";
      }
      function q(sel) { return root.querySelector(sel); }
      function on(sel, fn) { var e = q(sel); if (e) e.addEventListener("click", fn); }

      function head(title, sub) {
        return '<div class="pxp-inter-head"><span class="pxp-inter-eyebrow">PCI DSS compliance</span>' +
          "<h2>" + esc(title) + "</h2><p>" + esc(sub) + "</p></div>";
      }
      function foot(skipLabel) {
        return '<div class="pxp-inter-foot"><button type="button" class="pxp-inter-skip" data-skip>' +
          esc(skipLabel || "Skip for now") + "</button></div>";
      }

      // ---- Step: the question ----
      function ask() {
        shell(
          head("Before you finish - is this merchant already PCI compliant?",
            "PCI DSS compliance is required to take card payments and protects the merchant. We can confirm it, or set it up for you - it takes about a minute, and the merchant doesn't need to be here.") +
          '<div class="pxp-inter-body"><div class="pxp-inter-options">' +
          '<button type="button" class="pxp-inter-card" data-yes><h3>Yes, already compliant</h3>' +
          "<p>Record their status. We can verify it with IXOPAY and, if you like, keep it monitored.</p></button>" +
          '<button type="button" class="pxp-inter-card" data-no><h3>No, or not sure</h3>' +
          "<p>We enrol them with the details already on this application. IXOPAY pre-fills the SAQ, emails the merchant and chases it to completion.</p></button>" +
          "</div></div>" + foot("Skip for now")
        );
        on("[data-yes]", compliantPath);
        on("[data-no]", enrolReview);
        on("[data-skip]", finish);
      }

      // ---- Path A: already compliant (light touch) ----
      function compliantPath() {
        shell(
          head("Confirm existing compliance",
            "We'll record this merchant as compliant. Optionally verify it now, or let us manage their ongoing compliance.") +
          '<div class="pxp-inter-body">' +
          '<button type="button" class="pxp-btn pxp-btn--ghost" data-check>Check status with IXOPAY</button>' +
          '<div id="pxp-check-result"></div>' +
          '<div class="pxp-engage"><div><strong>Support ongoing compliance?</strong>' +
          "<p class=\"pxp-hint\">We can run their annual checks and scans and chase renewals so it never lapses.</p></div></div>" +
          '<div class="pxp-inter-options"><button type="button" class="pxp-inter-card" data-engage><h3>Yes, enrol for managed compliance</h3>' +
          "<p>We handle the annual cycle. A PCI Compliance Fee is added to the quote.</p></button>" +
          '<button type="button" class="pxp-inter-card" data-justcompliant><h3>No thanks, continue</h3>' +
          "<p>Record them as compliant and move on.</p></button></div></div>" + foot("Skip for now")
        );
        on("[data-check]", function () {
          var res = ixopay.complianceCheck({ businessName: ctx.merchant.businessName });
          var host = document.getElementById("pxp-check-result");
          host.innerHTML = res.found
            ? '<div class="pxp-note pxp-note--ok pxp-mt16">Found on IXOPAY records: ' + esc(res.status) + ", valid until " + esc(res.expiryDate) + ".</div>"
            : '<div class="pxp-note pxp-note--info pxp-mt16">No record found. You can still enrol them below.</div>';
        });
        on("[data-engage]", enrolEmail);
        on("[data-justcompliant]", finish);
        on("[data-skip]", finish);
      }

      // ---- Path B: enrol - data review ----
      function enrolReview() {
        var m = ctx.merchant;
        var prod = ctx.products.map(function (p) { return p.name; }).join(", ");
        shell(
          head("Enrol " + m.businessName + " with IXOPAY",
            "This is exactly what we'll send to IXOPAY. Nothing is re-keyed - it comes straight from the application.") +
          '<div class="pxp-inter-body"><div class="pxp-review"><dl>' +
          "<dt>Business</dt><dd>" + esc(m.businessName) + "</dd>" +
          "<dt>Legal name</dt><dd>" + esc(m.legalName) + "</dd>" +
          "<dt>Website</dt><dd>" + esc(m.website) + "</dd>" +
          "<dt>MCC</dt><dd>" + esc(m.mcc) + "</dd>" +
          "<dt>Channel</dt><dd>" + esc(m.channel) + "</dd>" +
          "<dt>Product(s)</dt><dd>" + esc(prod) + "</dd>" +
          "<dt>Average transaction value</dt><dd>£" + esc(m.atv) + "</dd></dl></div>" +
          '<div class="pxp-actions"><button type="button" class="pxp-btn pxp-btn--primary" data-continue>Continue to enrol</button></div>' +
          "</div>" + foot("Skip for now")
        );
        on("[data-continue]", enrolEmail);
        on("[data-skip]", finish);
      }

      // ---- Enrolment email ----
      function enrolEmail() {
        shell(
          head("Send the enrolment invitation",
            "IXOPAY emails the merchant a link to a pre-filled SAQ. They complete it in their own time - they don't need to be here now.") +
          '<div class="pxp-inter-body"><div class="pxp-field"><label>Merchant email for the invitation</label>' +
          '<input class="pxp-input" id="pxp-enrol-email" type="email" value="' + esc(ctx.merchant.email) + '"></div>' +
          '<div class="pxp-actions"><button type="button" class="pxp-btn pxp-btn--primary" data-send>Send invitation</button></div>' +
          "</div>" + foot("Skip for now")
        );
        on("[data-send]", function () {
          var email = (document.getElementById("pxp-enrol-email") || {}).value || ctx.merchant.email;
          ixopay.createEnrolment({ merchant: ctx.merchant, products: ctx.products, email: email });
          if (ctx.addFee) ctx.addFee();
          sent(email);
        });
        on("[data-skip]", finish);
      }

      // ---- Confirmation ----
      function sent(email) {
        shell(
          head("Invitation sent",
            "IXOPAY pre-fills the SAQ, chases completion and manages the annual cycle from here.") +
          '<div class="pxp-inter-body"><div class="pxp-note pxp-note--ok">Invitation sent to ' + esc(email) +
          ". The PCI Compliance Fee (£4.99 / month, per merchant) has been added to this quote - you'll see it on the Products &amp; Pricing screen and in the Quote Tool.</div>" +
          '<div class="pxp-actions"><button type="button" class="pxp-btn pxp-btn--primary" data-done>Back to Products &amp; Pricing</button></div></div>'
        );
        on("[data-done]", finish);
      }

      ask();
    },
  };
})();
