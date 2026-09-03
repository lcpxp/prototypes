// ------------------------------------------------------------------
// eu-acquirer/sim.js - The simulation layer for the EU Acquirer replica: the
// toast stack, the email prompt, and the stepped progress modal that
// stands in for e-signature and the automated handoff.
//
// The point is that the demo shows work happening. A real send takes
// time, involves other parties and fires background jobs nobody sees;
// here each of those is a step that spins, then ticks, so an observer
// can follow what the platform is doing and when.
//
// Exposes on EuAcquirerDemo: toast, askEmail, runSteps.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var esc = App.escape;
  var demo = window.EuAcquirerDemo;
  if (!demo) return;

  var TICK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="3" aria-hidden="true">' +
    '<path d="M20 6L9 17l-5-5"/></svg>';
  var BANG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" ' +
    'stroke="currentColor" stroke-width="3" stroke-linecap="round" ' +
    'aria-hidden="true"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>';

  // ---------------- Toasts ----------------
  // Top right, newest under the last, each self-dismissing after long
  // enough to read it. A close button because a stack of five that you
  // cannot clear is worse than no stack at all.
  var DWELL = 5200;

  function stack() {
    var el = document.querySelector(".ps-toaststack");
    if (!el) {
      el = document.createElement("div");
      el.className = "ps-toaststack";
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    return el;
  }

  demo.toast = function (title, body, tone) {
    var node = document.createElement("div");
    node.className = "ps-toast ps-toast--" + (tone || "success");
    node.innerHTML =
      '<span class="ps-toast-mark">' + (tone === "warn" ? BANG : TICK) + "</span>" +
      '<span class="ps-toast-text"><strong>' + esc(title) + "</strong>" +
      (body ? "<span>" + esc(body) + "</span>" : "") + "</span>" +
      '<button type="button" class="ps-toast-close" aria-label="Dismiss">' +
      "&times;</button>";
    stack().appendChild(node);

    var timer = window.setTimeout(remove, DWELL);
    function remove() {
      window.clearTimeout(timer);
      node.classList.add("ps-toast--out");
      window.setTimeout(function () { node.remove(); }, 200);
    }
    node.querySelector(".ps-toast-close").addEventListener("click", remove);
    return node;
  };

  // ---------------- Shared modal shell ----------------
  function openModal(title, subtitle, bodyHtml, footHtml) {
    var scrim = document.createElement("div");
    scrim.className = "ps-modal-scrim";
    scrim.innerHTML = '<div class="ps-modal" role="dialog" aria-modal="true">' +
      '<div class="ps-modal-head"><h2>' + esc(title) + "</h2>" +
      (subtitle ? "<p>" + esc(subtitle) + "</p>" : "") + "</div>" +
      '<div class="ps-modal-body">' + bodyHtml + "</div>" +
      '<div class="ps-modal-foot">' + (footHtml || "") + "</div></div>";
    document.body.appendChild(scrim);
    return scrim;
  }

  // ---------------- Email prompt ----------------
  // Sending anything for signature asks who it goes to. Pre-filled, so
  // the demo is one keystroke, but visible, so nobody forgets a real
  // send needs an address.
  demo.askEmail = function (title, subtitle, label) {
    return new Promise(function (resolve) {
      var scrim = openModal(title, subtitle,
        '<div class="ps-field"><label for="ps-email">' + esc(label) +
        '</label><input class="ps-input" id="ps-email" type="email" ' +
        'value="dummy@email.com"></div>',
        '<button type="button" class="ps-btn ps-btn--ghost" data-close>Cancel</button>' +
        '<button type="button" class="ps-btn ps-btn--primary" data-send>Send</button>');

      var input = scrim.querySelector("#ps-email");
      input.focus();
      input.select();

      function done(value) { scrim.remove(); resolve(value); }
      scrim.querySelector("[data-close]").addEventListener("click", function () {
        done(null);
      });
      scrim.querySelector("[data-send]").addEventListener("click", function () {
        var value = input.value.trim();
        if (!value) { input.focus(); return; }
        done(value);
      });
      input.addEventListener("keydown", function (event) {
        if (event.key === "Enter") scrim.querySelector("[data-send]").click();
      });
    });
  };

  // ---------------- Stepped progress ----------------
  // steps: [{ label, note, wait }] - each spins for `wait` ms, then
  // ticks and the next one starts. Resolves when the last one lands.
  demo.runSteps = function (title, subtitle, steps, closeLabel) {
    return new Promise(function (resolve) {
      var rows = steps.map(function (s, i) {
        return '<li class="ps-simstep" data-step="' + i + '">' +
          '<span class="ps-simstep-mark"><span class="ps-spinner"></span>' +
          '<span class="ps-simstep-tick">' + TICK + "</span></span>" +
          '<span class="ps-simstep-text"><strong>' + esc(s.label) + "</strong>" +
          (s.note ? "<span>" + esc(s.note) + "</span>" : "") + "</span></li>";
      }).join("");

      var scrim = openModal(title, subtitle,
        '<ol class="ps-simlist">' + rows + "</ol>",
        '<button type="button" class="ps-btn ps-btn--primary" data-done disabled>' +
        esc(closeLabel || "Done") + "</button>");

      var list = scrim.querySelectorAll(".ps-simstep");
      var doneBtn = scrim.querySelector("[data-done]");

      function advance(i) {
        if (i >= steps.length) {
          doneBtn.disabled = false;
          doneBtn.focus();
          doneBtn.addEventListener("click", function () {
            scrim.remove();
            resolve();
          });
          return;
        }
        list[i].classList.add("ps-simstep--running");
        window.setTimeout(function () {
          list[i].classList.remove("ps-simstep--running");
          list[i].classList.add("ps-simstep--done");
          if (steps[i].toast) demo.toast(steps[i].toast[0], steps[i].toast[1]);
          advance(i + 1);
        }, steps[i].wait || 900);
      }
      advance(0);
    });
  };

  // A run with no modal: the same stepped timing, toasts only. Used for
  // the automated handoff, which in the real flow nobody is watching.
  demo.runBackground = function (steps) {
    return new Promise(function (resolve) {
      function advance(i) {
        if (i >= steps.length) { resolve(); return; }
        window.setTimeout(function () {
          demo.toast(steps[i].toast[0], steps[i].toast[1]);
          advance(i + 1);
        }, steps[i].wait || 900);
      }
      advance(0);
    });
  };
})();
