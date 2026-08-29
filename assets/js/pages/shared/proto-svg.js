// ------------------------------------------------------------------
// shared/proto-svg.js - Inline SVG diagram viewer for a prototype overview
// page. Fetches the diagram named in #proto-diagram[data-src],
// sanitises it and injects it inline (fit-to-width, viewBox
// preserved), with a click-to-enlarge overlay and download-original.
//
// The sanitiser strips <script>, on* handlers and external hrefs even
// though the seed diagram is self-authored and safe: it proves the
// pipeline for a future where diagrams are uploaded by other users.
// ------------------------------------------------------------------

(function () {
  "use strict";

  var mount = document.getElementById("proto-diagram");
  if (!mount) return;

  var src = mount.getAttribute("data-src");
  var title = mount.getAttribute("data-title") || "Diagram";
  if (!src) return;

  function sanitize(svgText) {
    var doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    var svg = doc.documentElement;
    if (!svg || svg.nodeName.toLowerCase() === "parsererror") return null;

    svg.querySelectorAll("script").forEach(function (node) {
      node.parentNode.removeChild(node);
    });

    var els = [svg].concat(Array.prototype.slice.call(svg.querySelectorAll("*")));
    els.forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        // Event handlers never survive import.
        if (name.indexOf("on") === 0) {
          el.removeAttribute(attr.name);
          return;
        }
        // Keep only same-document fragment references; drop links out.
        if (name === "href" || name === "xlink:href") {
          if ((attr.value || "").trim().charAt(0) !== "#") {
            el.removeAttribute(attr.name);
          }
        }
      });
    });
    return svg;
  }

  function fallback(message) {
    // Never hard-fail: offer the raw file instead of an empty panel.
    mount.classList.remove("proto-diagram");
    mount.innerHTML =
      '<p class="notice">' + App.escape(message) + " " +
      '<a href="' + App.escape(src) + '">Open the diagram file</a>.</p>';
  }

  function openOverlay(svgText) {
    var dialog = document.createElement("dialog");
    dialog.className = "modal proto-overlay";
    var head = document.createElement("div");
    head.className = "modal-head";
    var heading = document.createElement("h2");
    heading.textContent = title;
    var close = document.createElement("button");
    close.className = "button quiet";
    close.textContent = "Close";
    close.addEventListener("click", function () { dialog.close(); });
    head.appendChild(heading);
    head.appendChild(close);
    dialog.appendChild(head);

    var big = sanitize(svgText);
    if (big) dialog.appendChild(big);

    var actions = document.createElement("p");
    var dl = document.createElement("button");
    dl.className = "button secondary";
    dl.textContent = "Download original";
    dl.addEventListener("click", function () {
      // Name the download after the source file, so the loader serves
      // any prototype's diagram rather than only the PCI one.
      App.download(src.split("/").pop(), svgText, "image/svg+xml");
    });
    actions.appendChild(dl);
    dialog.appendChild(actions);

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", function () { dialog.remove(); });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  fetch(src)
    .then(function (response) {
      if (!response.ok) throw new Error("status " + response.status);
      return response.text();
    })
    .then(function (svgText) {
      var svg = sanitize(svgText);
      if (!svg) {
        fallback("The diagram could not be parsed.");
        return;
      }
      mount.innerHTML = "";
      mount.appendChild(svg);
      mount.setAttribute("role", "button");
      mount.setAttribute("tabindex", "0");
      mount.setAttribute("aria-label", "Enlarge " + title);
      mount.addEventListener("click", function () { openOverlay(svgText); });
      mount.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openOverlay(svgText);
        }
      });
    })
    .catch(function () {
      fallback("The diagram could not be loaded.");
    });
})();
