// ------------------------------------------------------------------
// links.js - The typed knowledge graph, resolved for rendering.
//
// knowledge_links stores one row per relationship with a type at each
// end (supabase/schema/33_links.sql). Both renderers that read it used
// to ignore the types: roadmap.js selected only the ids and resolved
// the far end through a work-items map, platform.js resolved only
// capability-to-capability. Seven entity types give 49 ordered pairs;
// two of them rendered, so a link from a work item to a capability, a
// term or a document showed nothing at all - and nobody wrote more of
// them, because a link that cannot be seen is not worth recording.
//
// This resolves any pair. A page passes the rows in, gets an index
// keyed by "<type>:<id>" with the reading that applies from THAT end,
// then asks for the titles of whatever the links point at.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  // Index every link under BOTH of its ends. A symmetric kind reads the
  // same either way ("Related to"); a directional one flips, so the row
  // pointed AT reads the inverse ("Includes" against "Part of").
  // Mirrors the knowledge_graph view; the labels come from the registry
  // so no page issues a second query for them.
  App.links = {};

  App.links.index = function (rows) {
    var index = {};
    (rows || []).forEach(function (row) {
      var kind = App.registry.linkKinds[row.kind];
      if (!kind) return;
      var push = function (type, id, otherType, otherId, reads) {
        if (!type || !id || !otherType || !otherId) return;
        var key = type + ":" + id;
        (index[key] = index[key] || []).push({
          kind: row.kind, reads: reads, family: kind.family,
          otherType: otherType, otherId: otherId,
          note: row.note || "", confidence: row.confidence,
        });
      };
      push(row.from_type, row.from_id, row.to_type, row.to_id, kind.label);
      push(row.to_type, row.to_id, row.from_type, row.from_id,
        kind.symmetric ? kind.label : kind.inverse);
    });
    Object.keys(index).forEach(function (key) {
      index[key].sort(function (a, b) {
        return a.family.localeCompare(b.family) ||
          a.kind.localeCompare(b.kind) ||
          a.otherType.localeCompare(b.otherType);
      });
    });
    return index;
  };

  // Everything an index points at, grouped by entity type, so a caller
  // can fetch exactly the rows it needs and nothing else.
  App.links.targets = function (index) {
    var byType = {};
    Object.keys(index).forEach(function (key) {
      index[key].forEach(function (link) {
        var set = byType[link.otherType] = byType[link.otherType] || {};
        set[link.otherId] = true;
      });
    });
    Object.keys(byType).forEach(function (type) {
      byType[type] = Object.keys(byType[type]);
    });
    return byType;
  };

  // Fetch display titles for whatever the links reach. One query per
  // entity type actually present, ids constrained, so a page with no
  // cross-type links issues no extra request at all. A type the
  // registry does not know is skipped rather than guessed at.
  App.links.loadTitles = function (index) {
    var byType = App.links.targets(index);
    var types = Object.keys(byType).filter(function (type) {
      return App.registry.linkEntities[type];
    });
    return Promise.all(types.map(function (type) {
      var entity = App.registry.linkEntities[type];
      return App.db.from(entity.table)
        .select("id, " + entity.titleColumn)
        .in("id", byType[type])
        .then(function (result) {
          return { type: type, entity: entity, result: result };
        });
    })).then(function (loaded) {
      var titles = {};
      loaded.forEach(function (item) {
        if (item.result.error || !item.result.data) return;
        item.result.data.forEach(function (row) {
          var value = row[item.entity.titleColumn];
          if (value == null) return;
          value = String(value);
          // A note has no title, so its body stands in, trimmed to a
          // length that reads as a label rather than a paragraph.
          if (value.length > 80) value = value.slice(0, 77) + "...";
          titles[item.type + ":" + row.id] = value;
        });
      });
      return titles;
    });
  };

  // What a link should render as from one end. Returns the reading, the
  // target's display name and an href where the target has a page.
  // A target whose title could not be read (no grant, or a row removed)
  // still renders as its entity label rather than disappearing - the
  // relationship is a fact even when its far end is out of reach.
  App.links.resolve = function (link, titles, root) {
    var entity = App.registry.linkEntities[link.otherType] || {};
    var key = link.otherType + ":" + link.otherId;
    var title = titles ? titles[key] : "";
    return {
      reads: link.reads,
      kind: link.kind,
      note: link.note,
      confidence: link.confidence,
      type: link.otherType,
      typeLabel: entity.label || link.otherType,
      title: title || (entity.label ? entity.label + " (not readable)" : ""),
      resolved: Boolean(title),
      href: App.linkHref ? App.linkHref(link.otherType, link.otherId, root) : "",
    };
  };
})();
