// ------------------------------------------------------------------
// tools.js - The nav's outbound links to external tools, rendered as
// icon buttons beside the theme switch.
//
// No target lives in this file. This repo is public, and a tool's
// host, the log indexes a saved search names and the API routes it
// filters on are all material docs/SECURITY.md keeps out of git. Each
// button is one portal_links row instead, read behind RLS by a
// signed-in user; this file only knows how to turn a row into a URL
// and an icon, so retuning a search is a database update rather than
// a commit and a deploy.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Icons the nav knows how to draw, keyed by portal_links.icon. A row
  // naming an icon that is not here renders nothing rather than an
  // empty button - add the SVG when a new kind of link arrives.
  var ICONS = {
    bug:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="8" y="6" width="8" height="12" rx="4"></rect>' +
      '<path d="M12 6V4"></path><path d="M10 4L8.5 2.5"></path>' +
      '<path d="M14 4l1.5-1.5"></path><path d="M8 9H4"></path>' +
      '<path d="M8 12H3"></path><path d="M8 15H4"></path>' +
      '<path d="M16 9h4"></path><path d="M16 12h5"></path>' +
      '<path d="M16 15h4"></path><path d="M12 6v12"></path></svg>',
  };

  // A row stores its search exactly as it would be pasted into the
  // tool's own search bar. Splunk's ?q= is stricter than that bar: it
  // must open with a command, so a search starting on a bare `index=`
  // term needs the implied `search` put back. Adding it here rather
  // than storing it keeps the row readable and re-pasteable.
  function searchCommand(spl) {
    var q = String(spl == null ? "" : spl).replace(/^\s+/, "");
    return /^(search\b|\|)/.test(q) ? q : "search " + q;
  }

  // Splunk answers a deep link into a saved search with its error page
  // whenever the browser arrives without a live session: the search URL
  // carries no way to bootstrap one, so the app gives up rather than
  // signing the visitor in and continuing. Loading the tool's own front
  // door first establishes the session, and the same deep link then
  // opens every time.
  //
  // So a Splunk button opens in two beats: the front door in a new tab,
  // a pause while the session settles, then the search in a tab of its
  // own and the front door closed behind it. Only Splunk gets the extra
  // step - it is a quirk of one tool, not a rule about links - and the
  // match is on the target's host rather than the row's key so a second
  // saved search inherits it without a code change. The host itself
  // still never enters this repo: the row is asked whether it is Splunk,
  // never where Splunk is.
  var WARM_HOST = /(^|\.)splunk/i;
  var WARM_MS = 1500;

  App.tools = {};

  // The scheme and host of a target with everything after it dropped -
  // the tool's front door. Derived from the row rather than stored, so
  // there is still one place a target lives. A regex rather than
  // new URL() because this file is loaded into the benchmarks' plain
  // sandbox, where the web platform's globals are not there to borrow.
  function frontDoor(url) {
    var match = /^https?:\/\/[^/?#]+/.exec(String(url == null ? "" : url));
    return match ? match[0] : "";
  }

  // The front door to open first, or "" for a row that needs no warm-up:
  // every tool that is not Splunk, and a Splunk row that already points
  // at the front door and so warms itself.
  App.tools.warmOrigin = function (row) {
    var href = App.tools.href(row);
    var front = frontDoor(href);
    if (!front || href.replace(/\/+$/, "") === front) return "";
    return WARM_HOST.test(front.replace(/^https?:\/\//, "")) ? front : "";
  };

  // The two-beat open, returning whether it took the press. The front
  // door is opened while the click is still being handled, so the
  // browser reads it as the navigation the press asked for rather than
  // as a popup; if it is blocked anyway this returns false and the
  // anchor is left to open the search by itself, exactly as it did
  // before any of this existed.
  //
  // The search tab comes a beat later, by which time the browser may
  // have spent the press's activation on the front door, so a blocked
  // second tab is expected rather than exceptional: the tab already in
  // hand is navigated to the search instead. Either way the visitor ends
  // on the search with a session behind them, which is the whole point.
  App.tools.openWarmed = function (href, front) {
    var warm = window.open(front, "_blank");
    if (!warm) return false;
    window.setTimeout(function () {
      var full = window.open(href, "_blank");
      if (!full) {
        try { warm.location.replace(href); } catch (err) { warm.location = href; }
        return;
      }
      // Sever the new tab's handle on this one. The anchors carry
      // rel="noopener" for the same reason; this path cannot ask for it
      // at open time because it needs the handle back to know the tab
      // was allowed at all.
      try { full.opener = null; } catch (err) { /* cross-origin */ }
      try { full.focus(); } catch (err) { /* not focusable */ }
      try { warm.close(); } catch (err) { /* already gone */ }
    }, WARM_MS);
    return true;
  };

  // Build a row's target: base_url, the search as ?q=, then every
  // extra parameter the row carries (time range, display options) in
  // the order the row lists them.
  App.tools.href = function (row) {
    if (!row || !row.base_url) return "";
    var parts = [];
    if (row.query) {
      parts.push("q=" + encodeURIComponent(searchCommand(row.query)));
    }
    var params = row.params || {};
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      parts.push(
        encodeURIComponent(key) + "=" +
        encodeURIComponent(value === null || value === undefined ? "" : value)
      );
    });
    if (!parts.length) return row.base_url;
    return row.base_url +
      (row.base_url.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
  };

  // One anchor per row. An anchor rather than a button so the new tab
  // is a plain navigation the browser never treats as a popup, and so
  // middle-click and cmd-click behave as they do on any other link.
  // data-warm carries the front door for the one tool that needs one,
  // which is what the click handler below looks for; a row without it
  // is an ordinary link and is left to the browser.
  App.tools.render = function (rows) {
    return (rows || []).map(function (row) {
      var icon = ICONS[row && row.icon];
      var href = App.tools.href(row);
      if (!icon || !href) return "";
      var label = App.escape(row.label || "");
      var warm = App.tools.warmOrigin(row);
      return '<a class="nav-icon-btn" href="' + App.escape(href) + '" ' +
        (warm ? 'data-warm="' + App.escape(warm) + '" ' : "") +
        'target="_blank" rel="noopener noreferrer" title="' + label + '" ' +
        'aria-label="' + label + '">' +
        '<span class="nav-icon" aria-hidden="true">' + icon + "</span></a>";
    }).join("");
  };

  // Delegated from the nav slot rather than bound per button: the rows
  // arrive after the nav is drawn, and a re-render would otherwise leave
  // stale handlers behind it.
  function onToolClick(event) {
    if (event.defaultPrevented) return;
    var target = event.target;
    var link = target && target.closest
      ? target.closest("a.nav-icon-btn[data-warm]") : null;
    if (!link) return;
    // Anything but a plain left press - middle-click, cmd or ctrl click,
    // shift, alt - is the visitor telling the browser where to put the
    // page. Those keep the behaviour they have always had: the search
    // opens directly, and a warm-up sequence would only fight them.
    if (event.button || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey) return;
    if (App.tools.openWarmed(link.href, link.getAttribute("data-warm"))) {
      event.preventDefault();
    }
  }

  // One read per page, memoised. The nav needs these rows on every
  // page and the dashboard's tools grid needs the same rows with their
  // descriptions; two fetches of one small table on one page is waste,
  // and a second copy is a second thing to keep in step.
  var pending = null;
  App.tools.load = function () {
    if (pending) return pending;
    if (!App.db) return Promise.resolve([]);
    pending = App.db
      .from(App.registry.tables.portalLinks)
      // The union of what the two consumers render: the nav draws an
      // icon and a tooltip, the dashboard's tools grid adds the
      // sentence. Named, not *, because this table's rows carry
      // internal URLs and a fetch here should say exactly what it
      // wants.
      .select("key,label,icon,base_url,query,params,description")
      .order("sort_order")
      .then(function (result) {
        return result.error || !result.data ? [] : result.data;
      });
    return pending;
  };

  // Fill the nav slot once the rows are known. Nothing renders until
  // the read lands, so a signed-out session or a failed fetch leaves
  // the nav as it was rather than offering a link to nowhere.
  App.tools.attach = function () {
    var host = document.getElementById("nav-tools");
    if (!host || !App.db || !App.onAuthed) return;
    host.addEventListener("click", onToolClick);
    App.onAuthed(function () {
      App.tools.load().then(function (rows) {
        if (rows.length) host.innerHTML = App.tools.render(rows);
      });
    });
  };
})();
