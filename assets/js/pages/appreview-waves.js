// ------------------------------------------------------------------
// appreview-waves.js - The wave list for modules/app-review/index.html,
// plus the standing watch list above it.
//
// The standing list is the point of the page. A wave's output is not
// the board, it is the short list of applications that must be kept on
// top of afterwards, and that list spans waves - so it is read here,
// across every wave still open, rather than by opening each one.
//
// Read-only, like the whole module: waves are opened, worked and
// closed from a Claude Code session (docs/APP-REVIEW.md).
// ------------------------------------------------------------------

(function () {
  "use strict";

  var M = App.appReview;

  function waveHref(id) {
    return "wave.html?wave=" + encodeURIComponent(id);
  }

  // Dates render as plain ISO days: this is a working record, and an
  // exact date is more use than "3 weeks ago".
  function day(value) {
    if (!value) return "";
    var parsed = new Date(value);
    return isNaN(parsed) ? "" : parsed.toISOString().slice(0, 10);
  }

  // ----------------------------------------------------------------
  // The standing watch list
  // ----------------------------------------------------------------

  function triggerCell(app) {
    var trigger = M.triggerOf(app);
    if (!trigger) {
      // A watch item with no trigger is the failure mode the trigger
      // field exists to prevent, so it is called out rather than left
      // blank and quietly rotting.
      return '<span class="ar-flag">No trigger set</span>';
    }
    var kind = trigger.kind === "date" ? "Date" : trigger.kind;
    return '<span class="ar-trigger-kind">' + App.escape(kind) + "</span> " +
      '<span class="ar-trigger">' + App.escape(trigger.label || "") + "</span>";
  }

  function watchingHtml(apps, waves, categories) {
    var openWaves = {};
    waves.forEach(function (wave) {
      if (wave.state !== "closed") openWaves[wave.id] = wave;
    });

    var watching = M.carryForward(
      apps.filter(function (app) { return openWaves[app.wave_id]; }),
      categories
    );

    if (!watching.length) {
      return '<p class="notice">Nothing is being watched. Items land here ' +
        "when a wave classifies them as ongoing attention, and they carry " +
        "forward into the next wave with their history intact.</p>";
    }

    var rows = watching.map(function (app) {
      var wave = openWaves[app.wave_id];
      return "<tr>" +
        '<td><span class="ar-merchant">' + App.escape(app.merchant_name) +
        '</span><span class="ar-partner">' +
        App.escape(app.partner_name || "No partner recorded") + "</span></td>" +
        "<td>" + triggerCell(app) + "</td>" +
        '<td><a href="' + waveHref(app.wave_id) + "&application=" +
        encodeURIComponent(app.id) + '">' +
        App.escape(wave.name) + "</a></td>" +
        "</tr>";
    }).join("");

    return '<div class="table-wrap"><table>' +
      "<thead><tr><th>Merchant</th><th>Waiting on</th><th>Wave</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  // ----------------------------------------------------------------
  // The waves themselves
  // ----------------------------------------------------------------

  function wavesHtml(waves, apps, categories) {
    if (!waves.length) {
      return '<p class="notice">No review waves yet. A wave is opened from a ' +
        "Claude Code session, which extracts the LaunchPad list and mail " +
        "evidence into the review_waves and review_applications tables.</p>";
    }

    var byWave = {};
    apps.forEach(function (app) {
      if (!byWave[app.wave_id]) byWave[app.wave_id] = [];
      byWave[app.wave_id].push(app);
    });

    var rows = waves.map(function (wave) {
      var counts = M.split(byWave[wave.id] || [], categories);
      var carried = wave.carried_from_wave_id
        ? '<span class="ar-partner">Carried forward from an earlier wave</span>'
        : "";
      return "<tr>" +
        '<td><a href="' + waveHref(wave.id) + '">' +
        App.escape(wave.name) + "</a>" + carried + "</td>" +
        "<td>" + App.statusBadge(wave.state) + "</td>" +
        '<td class="mono">' + App.escape(day(wave.opened_at)) + "</td>" +
        '<td class="mono">' + App.escape(day(wave.closed_at)) + "</td>" +
        '<td class="mono">' + counts.needs_action + "</td>" +
        '<td class="mono">' + counts.ongoing + "</td>" +
        '<td class="mono">' + counts.settled + "</td>" +
        "</tr>";
    }).join("");

    return '<div class="table-wrap"><table>' +
      "<thead><tr><th>Wave</th><th>State</th><th>Opened</th><th>Closed</th>" +
      "<th>Needs action</th><th>Watching</th><th>Settled</th></tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>";
  }

  App.onAuthed(async function () {
    var watchingHost = document.getElementById("ar-watching");
    var wavesHost = document.getElementById("ar-waves");

    var results = await Promise.all([
      App.db.from(App.registry.tables.reviewWaves)
        .select("id, name, state, opened_at, closed_at, carried_from_wave_id")
        .is("deleted_at", null)
        .order("opened_at", { ascending: false }),
      // Only the columns the counts and the watch list actually need.
      // The board fetches the rest; there is no reason for merchant
      // detail to travel to a page that does not show it.
      App.db.from(App.registry.tables.reviewApplications)
        .select("id, wave_id, merchant_name, partner_name, triage_category, " +
          "confirmed_at, display_order, next_trigger_type, next_trigger_date, " +
          "next_trigger_label")
        .is("deleted_at", null)
        .order("display_order", { ascending: true }),
      App.db.from(App.registry.tables.triageCategories)
        .select("key, label, group_key, colour_token, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    var failed = results.filter(function (r) { return r.error; })[0];
    if (failed) {
      App.notice(watchingHost, "error",
        "Could not load review waves: " + failed.error.message);
      App.notice(wavesHost, "error",
        "Could not load review waves: " + failed.error.message);
      return;
    }

    var waves = results[0].data || [];
    var apps = results[1].data || [];
    var categories = M.index(results[2].data || []);

    watchingHost.innerHTML = watchingHtml(apps, waves, categories);
    wavesHost.innerHTML = wavesHtml(waves, apps, categories);
  });
})();
