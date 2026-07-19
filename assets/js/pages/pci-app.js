// ------------------------------------------------------------------
// pci-app.js - The PCI compliance prototype: three screens driven by
// the mock IXOPAY client (App.pciIxopay). Screen 1 is the agent flow
// and fee-product basket; screen 2 the simulated IXOPAY side (email +
// pre-filled SAQ); screen 3 the merchant record, monitoring, reporting.
// State is in memory only - a presenter-driven simulation, not a real
// integration; every mocked element is labelled in the UI.
// FUTURE: a localStorage checkpoint could let a reload resume mid-demo.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var ixopay = App.pciIxopay;
  if (!ixopay || !document.getElementById("pci-demo")) return;

  function $(id) { return document.getElementById(id); }

  // Merchant data "already collected in Launchpad" - the enrolment sends
  // this whole payload, demonstrating no re-capture. Generic sample data
  // only; DRAFT, refine with real onboarding fields.
  var merchant = {
    businessName: "Northwind Retail Ltd",
    mid: "MID-4482119",
    companyNumber: "09876543",
    mcc: "5651",
    sites: [{ url: "northwind-retail.example", channel: "ecommerce" }],
    products: ["ECOM Gateway", "POS Terminal x2", "Acquiring - Visa/MC"],
    estimatedAnnualCardVolume: "GBP 480,000",
    requirements: { saqType: "derived by IXOPAY from this payload" },
  };

  // DRAFT copy (agent modal, email, fee, SAQ) - confirm wording.
  var feeProduct = { name: "PCI compliance (managed)", fee: "GBP 4.50 / month" };
  var saqPrefilled = [
    "Cardholder data environment scope confirmed",
    "Approved service providers listed",
    "Network segmentation attested",
    "Stored account data: none (SAQ A eligible)",
  ];
  var saqRemaining = [
    "Confirm your compliance contact",
    "Confirm the website URL taking payments",
    "Accept the attestation of compliance",
  ];

  var state = { referenceId: null, status: null, expiryDate: null, hasFee: false };

  function log(dir, text, payload) {
    var li = document.createElement("li");
    var line = document.createElement("span");
    line.className = dir === "in" ? "pci-log-in" : "pci-log-out";
    line.textContent = (dir === "in" ? "< " : "> ") + text;
    li.appendChild(line);
    if (payload) {
      var pre = document.createElement("pre");
      pre.textContent = JSON.stringify(payload, null, 2);
      li.appendChild(pre);
    }
    var host = $("pci-log");
    host.appendChild(li);
    host.scrollTop = host.scrollHeight;
  }

  // A toned notice (tone-info / tone-ok / tone-warn from pages.css).
  // App.notice only styles the "error" kind, so render the tone here.
  function setNotice(id, tone, message) {
    $(id).innerHTML = '<p class="notice ' + tone + '">' +
      App.escape(message) + "</p>";
  }

  var STATUS_LABEL = {
    invited: "Invited", chased: "Chased", in_progress: "In progress",
    compliant: "Compliant", overdue: "Overdue",
  };

  function renderStatus() {
    var chip = $("pci-status");
    if (!state.status) {
      chip.innerHTML = '<span class="badge">Not enrolled</span>';
      $("pci-ref").textContent = "";
      $("pci-expiry").textContent = "";
      return;
    }
    var label = STATUS_LABEL[state.status] || state.status;
    chip.innerHTML = '<span class="badge ' + state.status + '">' +
      App.escape(label) + "</span>";
    $("pci-ref").textContent = "Reference " + state.referenceId;
    $("pci-expiry").textContent = state.expiryDate
      ? "Valid until " + state.expiryDate : "";
  }

  function renderBasket() {
    var items = merchant.products.map(function (name) {
      return '<li class="pci-line"><span>' + App.escape(name) +
        '</span><span class="pci-fee">included</span></li>';
    });
    if (state.hasFee) {
      items.push('<li class="pci-line pci-basket-item is-fee"><span>' +
        App.escape(feeProduct.name) + '</span><span class="pci-fee">' +
        App.escape(feeProduct.fee) + "</span></li>");
    }
    $("pci-basket").innerHTML = items.join("");
  }

  function renderMerchantProducts() {
    var names = merchant.products.slice();
    if (state.hasFee) names.push(feeProduct.name);
    $("pci-merchant-products").innerHTML = names.map(function (name) {
      return "<li>" + App.escape(name) + "</li>";
    }).join("");
  }

  // Screen 1: enrolment / verification.
  function enrol() {
    if (state.referenceId) return;
    log("out", "POST /enrolments", merchant);
    var res = ixopay.createEnrolment(merchant);
    state.referenceId = res.referenceId;
    state.status = "invited";
    state.expiryDate = null;
    log("in", "201 Created { referenceId: " + res.referenceId +
      ", status: invited }");
    renderStatus();
  }

  function onEvent(evt) {
    if (evt.type !== "invitation.sent") return;
    // The confirmed trigger: on invitation sent, Launchpad adds the fee
    // product to the basket. FUTURE: real basket/pricing integration.
    state.hasFee = true;
    log("in", "event: invitation.sent");
    renderBasket();
    renderMerchantProducts();
    setNotice("pci-basket-note", "tone-info",
      "PCI compliance fee product added to the basket on invitation sent.");
  }

  function onWebhook(payload) {
    state.status = payload.status;
    if (payload.expiryDate) state.expiryDate = payload.expiryDate;
    log("in", "webhook: status=" + payload.status);
    renderStatus();
  }

  function runVerify() {
    var res = ixopay.verifyCompliance({
      mid: merchant.mid, businessName: merchant.businessName,
    });
    log("out", "POST /compliance/verify { businessName }");
    log("in", "200 " + JSON.stringify(res));
    if (res.found) {
      state.referenceId = state.referenceId || "IXP-EXISTING";
      state.status = res.status;
      state.expiryDate = res.expiryDate;
      renderStatus();
      setNotice("pci-verify-result", "tone-ok", "Found on IXOPAY records: " +
        res.status + ", valid until " + res.expiryDate +
        ". Monitoring only, no enrolment.");
      $("pci-enrol").classList.add("hidden");
    } else {
      setNotice("pci-verify-result", "tone-warn",
        "No record found. Proceed to enrol with the existing payload.");
      $("pci-enrol").classList.remove("hidden");
    }
  }

  // Screen 2: pre-filled SAQ.
  function renderSaq() {
    var rows = saqPrefilled.map(function (item) {
      return '<li><input type="checkbox" checked disabled> <span>' +
        App.escape(item) + '</span> <span class="pci-prefilled">' +
        "pre-filled from your provider</span></li>";
    });
    saqRemaining.forEach(function (item, i) {
      rows.push('<li><input type="checkbox" class="pci-saq-remaining" ' +
        'id="pci-saq-r' + i + '"> <label for="pci-saq-r' + i + '">' +
        App.escape(item) + "</label></li>");
    });
    $("pci-saq-list").innerHTML = rows.join("");
    updateSaqProgress();
    Array.prototype.forEach.call(
      document.querySelectorAll(".pci-saq-remaining"),
      function (box) { box.addEventListener("change", updateSaqProgress); }
    );
  }

  function updateSaqProgress() {
    var boxes = document.querySelectorAll(".pci-saq-remaining");
    var done = 0;
    Array.prototype.forEach.call(boxes, function (b) { if (b.checked) done++; });
    var total = saqPrefilled.length + saqRemaining.length;
    var complete = saqPrefilled.length + done;
    $("pci-saq-fill").style.inlineSize = Math.round((complete / total) * 100) + "%";
    $("pci-saq-count").textContent = complete + " of " + total + " complete";
    $("pci-saq-submit").disabled = done < saqRemaining.length;
  }

  function openSaq() {
    if (!state.referenceId) {
      setNotice("pci-saq-note", "tone-warn", "Enrol the merchant on screen 1 first.");
      return;
    }
    $("pci-saq-panel").classList.remove("hidden");
    ixopay._start(state.referenceId);
    renderSaq();
  }

  function submitSaq() {
    ixopay._complete(state.referenceId);
    $("pci-saq-submit").disabled = true;
    setNotice("pci-saq-note", "tone-ok",
      "Submitted. IXOPAY marks the merchant compliant and owns the annual cycle.");
  }

  // Screen 3: monitoring / reporting.
  function runPoll() {
    if (!state.referenceId) return;
    log("out", "GET /status/" + state.referenceId);
    var res = ixopay.getStatus(state.referenceId);
    log("in", "200 " + JSON.stringify(res));
    if (res.status && res.status !== "unknown") {
      state.status = res.status;
      state.expiryDate = res.expiryDate || state.expiryDate;
      renderStatus();
    }
  }

  function runReport() {
    log("out", "GET /reports/summary");
    var r = ixopay.getReport();
    log("in", "200 { enrolled: " + r.enrolled + ", compliant: " + r.compliant +
      ", inProgress: " + r.inProgress + ", overdue: " + r.overdue + " }");
    $("pci-report").innerHTML = report("Enrolled", r.enrolled) +
      report("Compliant", r.compliant) + report("In progress", r.inProgress) +
      report("Overdue", r.overdue);
  }

  function report(label, value) {
    return "<div><dd class=\"pci-stat\">" + value + "</dd><dt>" +
      App.escape(label) + "</dt></div>";
  }

  function setScreen(n) {
    ["1", "2", "3"].forEach(function (id) {
      $("screen-" + id).classList.toggle("hidden", id !== n);
      var btn = $("nav-" + id);
      btn.classList.toggle("secondary", btn.dataset.screen !== n);
    });
  }

  function init() {
    ixopay.onEvent(onEvent);
    ixopay.onWebhook(onWebhook);

    Array.prototype.forEach.call(document.querySelectorAll("[data-screen]"),
      function (btn) {
        btn.addEventListener("click", function () { setScreen(btn.dataset.screen); });
      });

    $("pci-add-compliance").addEventListener("click", function () {
      $("pci-verify-result").innerHTML = "";
      $("pci-enrol").classList.remove("hidden");
      $("pci-agent").showModal();
    });
    $("pci-yes").addEventListener("click", function () {
      $("pci-step-ask").classList.add("hidden");
      $("pci-step-verify").classList.remove("hidden");
    });
    $("pci-no").addEventListener("click", function () { $("pci-agent").close(); enrol(); });
    $("pci-agent-close").addEventListener("click", function () { $("pci-agent").close(); });
    $("pci-verify").addEventListener("click", runVerify);
    $("pci-enrol").addEventListener("click", function () { $("pci-agent").close(); enrol(); });
    $("pci-agent").addEventListener("close", function () {
      $("pci-step-ask").classList.remove("hidden");
      $("pci-step-verify").classList.add("hidden");
    });

    $("pci-open-saq").addEventListener("click", openSaq);
    $("pci-saq-submit").addEventListener("click", submitSaq);
    $("pci-chase").addEventListener("click", function () {
      if (state.referenceId) ixopay._chase(state.referenceId);
    });
    $("pci-poll").addEventListener("click", runPoll);
    $("pci-report-btn").addEventListener("click", runReport);
    $("pci-time").addEventListener("click", function () {
      if (state.referenceId) ixopay._overdue(state.referenceId);
    });

    renderBasket();
    renderMerchantProducts();
    renderStatus();
    runReport();
    setScreen("1");
  }

  init();
})();
