// ------------------------------------------------------------------
// detail.js - The completeness contract for rendering a row.
//
// The rule from docs/plan/40-SURFACING.md: a value that is stored and
// not rendered is a defect. Hand-written detail views break it the
// same way every time - they list the fields that existed the day they
// were written, and a column added later is stored, fetched and
// invisible, with no error to notice.
//
// roadmap-detail.js already had the answer in one place: KNOWN_ATTRS
// names the attribute keys it renders by hand, and everything else in
// the bag still renders as a generic row. This generalises that from
// one jsonb column to a whole row, so the default is that a value
// appears and the exception - `hidden` - has to be written down.
//
// App.detail.facts(row, spec):
//   fields   ordered known fields, each {key, label, html?}
//   flatten  object-valued keys whose own keys become their own rows
//   hidden   keys deliberately not shown (ids, sort orders, keys
//            already rendered as a resolved title elsewhere)
//   overflowLabel  heading for everything the spec did not name
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};
  App.detail = App.detail || {};

  function esc(value) { return App.escape(value == null ? "" : value); }

  // "created_at" -> "Created at". Underscores become spaces so a column
  // nobody wrote a label for still reads as words rather than a key.
  function labelOf(key) {
    var words = String(key).replace(/_/g, " ").trim();
    return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
  }

  function isEmpty(value) {
    if (value === null || value === undefined || value === "") return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  }

  // Any value, as readable HTML. An array joins; a nested object shows
  // its own pairs rather than JSON, because the point is that a reader
  // can read it. Everything is escaped.
  function valueHtml(value) {
    if (Array.isArray(value)) return esc(value.join(", "));
    if (value && typeof value === "object") {
      return Object.keys(value).map(function (key) {
        return '<span class="detail-pair"><b>' + esc(labelOf(key)) + "</b> " +
          valueHtml(value[key]) + "</span>";
      }).join("");
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return esc(value);
  }

  function row(label, html) {
    return html ? "<dt>" + esc(label) + "</dt><dd>" + html + "</dd>" : "";
  }

  App.detail.labelOf = labelOf;
  App.detail.valueHtml = valueHtml;
  App.detail.isEmpty = isEmpty;

  App.detail.facts = function (record, spec) {
    record = record || {};
    spec = spec || {};
    var fields = spec.fields || [];
    var flatten = spec.flatten || [];
    var hidden = spec.hidden || [];
    var seen = {};
    var html = "";

    // 1. The fields the caller named, in the order it named them. An
    //    `html` builder wins; otherwise the value renders generically.
    fields.forEach(function (field) {
      seen[field.key] = true;
      var value = record[field.key];
      var rendered = field.html ? field.html(value, record) : valueHtml(value);
      if (field.html ? !rendered : isEmpty(value)) return;
      html += row(field.label || labelOf(field.key), rendered);
    });

    // 2. Objects the caller asked to lift, so a bag of label/value
    //    pairs reads as rows rather than as one nested lump.
    flatten.forEach(function (key) {
      seen[key] = true;
      var bag = record[key];
      if (!bag || typeof bag !== "object" || Array.isArray(bag)) return;
      Object.keys(bag).forEach(function (inner) {
        if (isEmpty(bag[inner])) return;
        html += row(labelOf(inner), valueHtml(bag[inner]));
      });
    });

    // 3. Everything else. This is the whole point: a column added to
    //    the table tomorrow appears here without anyone editing this
    //    page, so the failure mode is a slightly plain row rather than
    //    a value nobody can see.
    hidden.forEach(function (key) { seen[key] = true; });
    var overflow = Object.keys(record).filter(function (key) {
      return !seen[key] && !isEmpty(record[key]);
    }).sort().map(function (key) {
      return row(labelOf(key), valueHtml(record[key]));
    }).join("");

    if (overflow) {
      html += '<dt class="detail-overflow-head" aria-hidden="true"></dt>' +
        '<dd class="detail-overflow-head">' +
        esc(spec.overflowLabel || "Also recorded against this") + "</dd>" +
        overflow;
    }
    return html ? '<dl class="detail-facts">' + html + "</dl>" : "";
  };
})();
