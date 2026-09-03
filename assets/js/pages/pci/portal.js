// ------------------------------------------------------------------
// pci/portal.js - The Acquirer Partner Portal replica: the "Merchant
// Prescreen & Quote" wizard. Renders the 7-step stepper and content;
// steps 1, 2 and 5 are built out, the rest are pass-through. On Continue
// from Product Selection it hands off to the PCI interstitial
// (pci-interstitial.js) and owns the Quote Tool drawer + PCI fee row.
// Data is pre-filled to mirror the screenshots; in-memory only.
// ------------------------------------------------------------------

(function () {
  "use strict";

  if (!document.getElementById("pxp-stepper")) return;
  var esc = App.escape;
  function el(id) { return document.getElementById(id); }

  var CARET = '<svg class="pxp-fees-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';

  // Pre-filled application, mirroring the screenshots. Every value is
  // invented: this repo is public, so no real person, contact detail or
  // domain belongs in it.
  var app = {
    merchant: {
      contact: "A. Berger", email: "a.berger@example.com",
      phone: "+44 20 7946 0000", referrer: "J. Marsh",
      businessName: "Daopay Test Application", legalName: "Daopay Test Application Company",
      website: "https://www.daopay-test.example", channel: "Online",
      industries: "Other (High Risk)", legalForm: "Private company",
      size: "£1M to £5M - SME IV", baseCurrency: "€ Euro",
      incorporationNumber: "1234567", incorporationDate: "2022/01/01",
      mcc: "[5816] Digital Goods - Games", address: "Flat 1, First Street",
      city: "Vienna", country: "Austria", postal: "111111", atv: "25",
    },
    sites: [{ name: "A Demonstration Website", url: "https://www.daopay-test.example", status: "active" }],
    products: [{ site: "A Demonstration Website", name: "ECOM - Integrated / Gateway (High Risk)", qty: 1 }],
  };
  var quote = { hasPciFee: false };
  var pciHandled = false;
  var current = 1;
  var steps = [
    "Application Information", "Operating Sites Setup", "Payment Solution",
    "Acquirer Selection", "Product Selection", "Related Entities", "Summary",
  ];

  // ---- Stepper ----
  function renderStepper() {
    var html = "";
    steps.forEach(function (title, i) {
      var n = i + 1;
      var circle = "pxp-step-circle";
      var t = "pxp-step-title";
      if (n === current) { circle += " pxp-step-circle--active"; t += " pxp-step-title--active"; }
      else if (n < current) { circle += " pxp-step-circle--valid"; t += " pxp-step-title--done"; }
      html += '<div class="pxp-step"><div class="pxp-step-btn">' +
        '<div class="' + circle + '"><span class="pxp-step-number">' + n + "</span></div>" +
        '<div class="pxp-step-content"><h3 class="' + t + '">' + esc(title) + "</h3></div></div>" +
        (n < steps.length ? '<div class="pxp-step-line' + (n < current ? " pxp-step-line--valid" : "") + '"></div>' : "") +
        "</div>";
    });
    el("pxp-stepper").innerHTML = html;
  }

  // ---- Nav buttons ----
  function nav(back) {
    return '<div class="pxp-actions">' +
      (back ? '<button type="button" class="pxp-btn pxp-btn--ghost" data-nav="back">Go back</button>' : "") +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-nav="continue">Continue</button></div>';
  }

  // ---- Step 1: Application Information ----
  function field(label, value) {
    return '<div class="pxp-field"><label>' + esc(label) + '</label>' +
      '<input class="pxp-input" value="' + esc(value) + '"></div>';
  }
  function stepApplication() {
    var m = app.merchant;
    return '<div class="pxp-panel"><h2 class="pxp-title-wrapper">Application Information</h2>' +
      '<div class="pxp-subhead">Lead information</div>' +
      field("Contact name", m.contact) + field("Contact email", m.email) +
      field("Phone number - include country code", m.phone) + field("Lead referrer (optional)", m.referrer) +
      field("Business name", m.businessName) + field("Company website (optional)", m.website) +
      '<div class="pxp-field"><label>Are you looking for in-store products, online products, or both (omni)?</label>' +
      '<span class="pxp-choice"><input type="radio" name="ch" disabled> In Store</span>' +
      '<span class="pxp-choice"><input type="radio" name="ch" checked disabled> Online</span>' +
      '<span class="pxp-choice"><input type="radio" name="ch" disabled> Both (Omni)</span></div>' +
      '<div class="pxp-subhead">Industry selection</div>' +
      '<span class="pxp-choice"><input type="checkbox" checked disabled> ' + esc(m.industries) + "</span>" +
      '<div class="pxp-subhead">Merchant information</div>' + field("Legal name of business", m.legalName) +
      '<div class="pxp-subhead">Business details</div>' +
      field("Business legal form", m.legalForm) + field("Business size", m.size) +
      field("Base currency", m.baseCurrency) + field("Business incorporation number", m.incorporationNumber) +
      field("Business incorporation date", m.incorporationDate) +
      '<div class="pxp-subhead">Industry codes</div>' + field("Industry MCC & description", m.mcc) +
      '<div class="pxp-subhead">Business address</div>' +
      field("Street address", m.address) + field("City", m.city) + field("Country", m.country) + field("Postal code", m.postal) +
      '<div class="pxp-subhead">Trading information</div>' +
      '<div class="pxp-field"><label>Average transaction value (ATV)</label>' +
      '<input class="pxp-input" value="£ ' + esc(m.atv) + '">' +
      '<p class="pxp-hint">This field accepts GBP values only. Please convert to GBP from your base currency (EUR / USD, etc.) before submitting.</p></div>' +
      nav(false) + "</div>";
  }

  // ---- Step 2: Operating Sites ----
  function stepSites() {
    var rows = app.sites.map(function (s) {
      return '<div class="pxp-site-row"><span>' + esc(s.name) + "</span>" +
        '<div class="pxp-cluster"><span class="pxp-site-status"><span class="pxp-indicator pxp-indicator--green"></span> Status</span>' +
        '<a href="#" data-noop>Edit</a><a href="#" data-noop>Remove</a></div></div>';
    }).join("");
    return '<div class="pxp-panel"><h2 class="pxp-title-wrapper">Operating Sites Setup</h2>' +
      '<div class="pxp-site-group"><div class="pxp-site-group-head"><span>In Store</span>' +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-add-site>Add site</button></div>' +
      '<div class="pxp-site-empty">No in store sites added yet</div></div>' +
      '<div class="pxp-site-group"><div class="pxp-site-group-head"><span>Websites</span>' +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-add-site>Add site</button></div>' + rows + "</div>" +
      nav(true) + "</div>";
  }

  // ---- Step 5: Products & Pricing ----
  function feeRow(name, range) {
    return '<div class="pxp-row"><div><span class="pxp-fee-name">' + esc(name) + "</span></div>" +
      '<div class="pxp-cluster"><span class="pxp-fee-range">' + esc(range) + '</span>' +
      '<input class="pxp-fee-input" type="text" value="' + (name === "Auth / Processing" ? "0.015" : "0.000") + '"></div></div>';
  }
  // The PCI Compliance fee, shown at the bottom of Product & Pricing once
  // the merchant has been enrolled. A non-editable fee line (no input).
  function pciFeeRow() {
    if (!quote.hasPciFee) return "";
    return '<div class="pxp-separator"></div>' +
      '<div class="pxp-table pxp-pci-table"><div class="pxp-table-head"><span class="pxp-fee-name">PCI Compliance</span>' +
      '<span class="pxp-tag pxp-tag--teal">Added</span></div>' +
      '<div class="pxp-table-body"><div class="pxp-row"><div><span class="pxp-fee-name">PCI compliance (managed)</span>' +
      '<div class="pxp-fee-range">Managed compliance, per merchant - added on enrolment, non-editable.</div></div>' +
      "<strong>£4.99 / mo</strong></div></div></div>";
  }
  function stepProducts() {
    var p = app.products[0];
    return '<div class="pxp-panel"><h2 class="pxp-title-wrapper">Products &amp; Pricing</h2>' +
      '<div class="pxp-cluster pxp-mb16"><button type="button" class="pxp-btn pxp-btn--primary" data-noop>View E-Commerce Acquiring Rate Sheet</button></div>' +
      '<div class="pxp-table"><div class="pxp-table-head"><div class="pxp-cluster"><span>' + esc(p.site) +
      '</span><span class="pxp-tag pxp-tag--teal">Online</span></div>' +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-noop>Add product</button></div>' +
      '<div class="pxp-table-body"><div class="pxp-row"><span>' + esc(p.name) + "</span>" +
      '<div class="pxp-cluster"><input class="pxp-qty" type="number" min="1" max="999" value="' + p.qty + '">' +
      '<a href="#" data-noop>Configure pricing</a><a href="#" data-noop>Remove</a></div></div>' +
      '<div class="pxp-row"><b>Total: 1</b>' +
      '<span><b>Status: </b><span class="pxp-indicator pxp-indicator--green"></span></span></div></div></div>' +
      '<div class="pxp-separator"></div>' +
      '<div class="pxp-table"><div class="pxp-table-head"><span class="pxp-fee-name">Fees</span></div>' +
      '<div class="pxp-table-body">' + feeRow("Auth / Processing", "£0.015 - £10.000") +
      feeRow("Refund", "£0.000 - £10.000") + feeRow("Chargeback", "£0.000 - £50.000") + "</div></div>" +
      '<div class="pxp-fees-toggle" data-fees-toggle><span>Processing Fees - Detailed <span class="pxp-fees-hint">(Click to expand)</span></span>' + CARET + "</div>" +
      pciFeeRow() +
      nav(true) + "</div>";
  }

  // ---- Pass-through steps ----
  function stepPass(title, body) {
    return '<div class="pxp-panel"><h2 class="pxp-title-wrapper">' + esc(title) + "</h2>" +
      "<p>" + esc(body) + '</p><p class="pxp-hint">Pre-selected for this demonstration. Continue to proceed.</p>' +
      nav(true) + "</div>";
  }
  function stepSummary() {
    var m = app.merchant;
    var pci = quote.hasPciFee ? "Enrolled with IXOPAY (invitation sent)" : "Not engaged";
    return '<div class="pxp-panel"><h2 class="pxp-title-wrapper">Summary</h2>' +
      '<div class="pxp-review"><dl>' +
      "<dt>Business</dt><dd>" + esc(m.businessName) + "</dd>" +
      "<dt>Site</dt><dd>" + esc(app.sites[0].name) + "</dd>" +
      "<dt>Product</dt><dd>" + esc(app.products[0].name) + "</dd>" +
      "<dt>PCI compliance</dt><dd>" + esc(pci) + "</dd></dl></div>" +
      '<div class="pxp-actions"><button type="button" class="pxp-btn pxp-btn--ghost" data-nav="back">Go back</button>' +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-submit>Submit application</button></div>' +
      '<div id="pxp-submit-note"></div></div>';
  }

  // ---- Render + wire ----
  function renderStep() {
    var host = el("pxp-step-content");
    if (current === 1) host.innerHTML = stepApplication();
    else if (current === 2) host.innerHTML = stepSites();
    else if (current === 3) host.innerHTML = stepPass("Payment Solution", "The payment solution for this merchant is configured here.");
    else if (current === 4) host.innerHTML = stepPass("Acquirer Selection", "The acquirer for this application is selected here.");
    else if (current === 5) host.innerHTML = stepProducts();
    else if (current === 6) host.innerHTML = stepPass("Related Entities", "Directors, owners and related entities are captured here.");
    else host.innerHTML = stepSummary();
    wireStep();
  }

  function wireStep() {
    var host = el("pxp-step-content");
    var back = host.querySelector('[data-nav="back"]');
    if (back) back.addEventListener("click", function () { goTo(current - 1); });
    var cont = host.querySelector('[data-nav="continue"]');
    if (cont) cont.addEventListener("click", onContinue);
    host.querySelectorAll("[data-noop]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); });
    });
    var addSite = host.querySelector("[data-add-site]");
    if (addSite) addSite.addEventListener("click", openSiteModal);
    var toggle = host.querySelector("[data-fees-toggle]");
    if (toggle) toggle.addEventListener("click", function () {
      toggle.querySelector(".pxp-fees-chevron").classList.toggle("pxp-fees-chevron--open");
    });
    var submit = host.querySelector("[data-submit]");
    if (submit) submit.addEventListener("click", function () {
      el("pxp-submit-note").innerHTML = '<div class="pxp-note pxp-note--ok pxp-mt16">Application submitted. This is a demonstration - no data leaves the page.</div>';
    });
  }

  function onContinue() {
    if (current === 5 && !pciHandled) {
      // Proceed past the sales screen: engage on PCI compliance first. When
      // the interstitial closes we stay on Product & Pricing - now showing
      // the PCI Compliance fee row if enrolled - so the agent can proceed.
      App.pciInterstitial.open({
        merchant: app.merchant, products: app.products, sites: app.sites,
        addFee: addPciFee,
        onDone: function () { pciHandled = true; renderStep(); },
      });
      return;
    }
    goTo(current + 1);
  }

  function goTo(n) {
    if (n < 1 || n > steps.length) return;
    current = n;
    renderStepper();
    renderStep();
    var c = document.querySelector(".pxp-content");
    if (c) c.scrollTo({ top: 0 });
  }

  // ---- Site modal ----
  function openSiteModal() {
    var root = el("pxp-modal-root");
    root.innerHTML =
      '<div class="pxp-modal-scrim"><div class="pxp-modal" role="dialog" aria-label="Site">' +
      '<div class="pxp-modal-head"><h2>Site</h2></div><div class="pxp-modal-body">' +
      '<div class="pxp-field"><label>Site name</label><input class="pxp-input" placeholder="London HQ"></div>' +
      '<div class="pxp-field"><label>MCC</label><select class="pxp-select"><option>Select MCC</option></select></div>' +
      '<div class="pxp-field"><label>Does this site already operate under a MID?</label>' +
      '<span class="pxp-choice"><input type="radio" name="mid" checked> No</span>' +
      '<span class="pxp-choice"><input type="radio" name="mid"> Yes</span></div>' +
      '<div class="pxp-field"><label>URL</label><input class="pxp-input" value="https://"></div>' +
      '<div class="pxp-field"><label>Domain ownership</label><select class="pxp-select"><option></option></select></div>' +
      '<div class="pxp-field"><label>Activation state</label><select class="pxp-select"><option></option></select></div>' +
      '<div class="pxp-field"><label>Volume by processing (must equal 100%)</label>' +
      '<div class="pxp-vol"><input class="pxp-input" value="0"><input class="pxp-input" value="0"><input class="pxp-input" value="0"></div>' +
      '<p class="pxp-vol-total">Total: 0%</p></div></div>' +
      '<div class="pxp-modal-foot"><button type="button" class="pxp-btn pxp-btn--ghost" data-modal-cancel>Cancel</button>' +
      '<button type="button" class="pxp-btn pxp-btn--primary" data-modal-cancel>Save</button></div></div></div>';
    root.querySelectorAll("[data-modal-cancel]").forEach(function (b) {
      b.addEventListener("click", function () { root.innerHTML = ""; });
    });
  }

  // ---- Quote Tool drawer ----
  function buildDrawer() {
    var d = document.createElement("div");
    d.className = "pxp-drawer";
    d.id = "pxp-quote-drawer";
    document.body.appendChild(d);
    var scrim = document.createElement("div");
    scrim.className = "pxp-drawer-scrim";
    scrim.style.display = "none";
    scrim.id = "pxp-drawer-scrim";
    document.body.appendChild(scrim);
    scrim.addEventListener("click", closeQuote);
    renderQuote();
  }
  function renderQuote() {
    var d = el("pxp-quote-drawer");
    var p = app.products[0];
    var fee = quote.hasPciFee
      ? '<div class="pxp-quote-line--fee"><div class="pxp-cluster pxp-between"><strong>PCI Compliance Fee</strong><strong>£4.99 / mo</strong></div>' +
        '<div class="pxp-quote-sub">Managed PCI compliance, per merchant. Passed through to the merchant; added on invitation sent.</div></div>'
      : "";
    d.innerHTML =
      '<div class="pxp-drawer-head"><h2>Quote</h2><button type="button" class="pxp-drawer-close" id="pxp-quote-close" aria-label="Close">&times;</button></div>' +
      '<div class="pxp-drawer-body"><div class="pxp-quote-line"><span>' + esc(p.site) + '</span><span class="pxp-quote-sub">' + esc(app.sites[0].status) + "</span></div>" +
      '<div class="pxp-quote-line"><span>' + esc(p.name) + "</span><span>x" + p.qty + "</span></div>" +
      '<div class="pxp-quote-line"><span>Auth / Processing</span><span>£0.015</span></div>' + fee +
      '<div class="pxp-quote-total"><span>Estimated monthly add-ons</span><span>' + (quote.hasPciFee ? "£4.99" : "£0.00") + "</span></div></div>";
    el("pxp-quote-close").addEventListener("click", closeQuote);
  }
  function openQuote() { renderQuote(); el("pxp-quote-drawer").classList.add("pxp-drawer--open"); el("pxp-drawer-scrim").style.display = "block"; }
  function closeQuote() { el("pxp-quote-drawer").classList.remove("pxp-drawer--open"); el("pxp-drawer-scrim").style.display = "none"; }
  function addPciFee() {
    quote.hasPciFee = true;
    renderQuote();
    el("pxp-quote-open").classList.add("pxp-quote-trigger--flag");
  }

  // ---- Init ----
  el("pxp-quote-open").addEventListener("click", openQuote);
  buildDrawer();
  renderStepper();
  renderStep();
})();
