// ------------------------------------------------------------------
// drawer.js - A shared slide-over dialog surface.
//
// The portal had a drawer, but only inside the roadmap page module
// (assets/js/pages/roadmap/drawer.js), wired to that board's items and
// its ?item= deep link. This is the same interaction with nothing
// page-specific in it, so a second feature does not need a second
// implementation. The roadmap can move onto this later; it is left
// alone here rather than refactored mid-feature.
//
// App.drawer(opts) returns a controller:
//   open(html, options)  fill and show; options.label sets the dialog's
//                        accessible name, options.onFill runs once the
//                        markup is in the DOM (wire buttons there)
//   close()              hide and return focus where it came from
//   isOpen()             current state
//
// opts names the elements by id: drawer, scrim, body and close. The
// caller owns the markup and the CSS; this owns the behaviour -
// Escape, backdrop click, focus return and focus containment.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Everything that can hold focus inside the dialog, in DOM order.
  var FOCUSABLE = [
    "a[href]", "button:not([disabled])", "input:not([disabled])",
    "select:not([disabled])", "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  App.drawer = function (opts) {
    var settings = opts || {};
    var drawer = document.getElementById(settings.drawer);
    var scrim = settings.scrim ? document.getElementById(settings.scrim) : null;
    var body = document.getElementById(settings.body);
    var closeBtn = settings.close ? document.getElementById(settings.close) : null;
    // Class set on <body> while open, so a page can lock scrolling.
    var openClass = settings.openClass || "drawer-open";
    var lastFocus = null;

    function isOpen() {
      return !!drawer && !drawer.hidden;
    }

    function focusable() {
      if (!drawer) return [];
      return Array.prototype.filter.call(
        drawer.querySelectorAll(FOCUSABLE),
        function (el) { return el.offsetParent !== null || el === closeBtn; }
      );
    }

    // Keep Tab inside the dialog. aria-modal tells assistive tech the
    // rest of the page is inert; without this, a sighted keyboard user
    // would still tab straight out into the board behind it.
    function trapTab(event) {
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;
      if (event.shiftKey && (active === first || !drawer.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function open(html, options) {
      if (!drawer || !body) return;
      var config = options || {};
      body.innerHTML = html;
      if (config.label) drawer.setAttribute("aria-label", config.label);
      // Remember where focus came from BEFORE showing the dialog, so
      // closing returns the user to the row they opened.
      lastFocus = document.activeElement;
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      document.body.classList.add(openClass);
      if (typeof config.onFill === "function") config.onFill(body);
      if (closeBtn) closeBtn.focus();
      else drawer.focus();
    }

    function close() {
      if (!isOpen()) return;
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
      document.body.classList.remove(openClass);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
      if (typeof settings.onClose === "function") settings.onClose();
    }

    if (closeBtn) closeBtn.addEventListener("click", close);
    if (scrim) scrim.addEventListener("click", close);
    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;
      if (event.key === "Escape") close();
      else if (event.key === "Tab") trapTab(event);
    });

    return { open: open, close: close, isOpen: isOpen, body: body };
  };
})();
