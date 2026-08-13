// ------------------------------------------------------------------
// registry.js - Single source of truth for the hub's modules, the
// Supabase tables they read, and role names. Navigation, dashboard
// cards and access-control keys all derive from here; no other file
// may hard-code a module path, table name or role string.
//
// Module paths are relative to the repo root. Always build links
// with App.moduleHref so pages below the root resolve correctly.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  App.registry = {
    modules: [
      {
        key: "roadmap",
        title: "Roadmap",
        path: "modules/roadmap/",
        heading: "Roadmap",
        description: "Executive, team and backlog views of one work set",
        statTable: null,
      },
      {
        key: "backlog",
        title: "Backlog",
        path: "modules/backlog/",
        description: "The full prioritised list of work items and their source material",
        statTable: "work_items",
        statLabel: "Work items",
      },
      {
        key: "reference",
        title: "API reference",
        path: "modules/reference/",
        description: "Specs and documented endpoints",
        statTable: "api_specs",
        statLabel: "Specs published",
      },
      {
        key: "integrations",
        title: "Integrations",
        path: "modules/integrations/",
        description: "Third-party services connected to Launchpad",
        statTable: "integrations",
        statLabel: "Connected services",
      },
      {
        key: "app-review",
        title: "App Review",
        path: "modules/app-review/",
        heading: "Application review",
        description: "Waves of merchant application triage against LaunchPad",
        statTable: null,
      },
      {
        key: "prototypes",
        title: "Prototypes",
        path: "modules/prototypes/",
        description: "Working prototypes and mockups",
        statTable: "prototypes",
        statLabel: "Registered prototypes",
      },
      {
        key: "platform",
        title: "Platform",
        path: "modules/platform/",
        description: "What Launchpad is and the capabilities in place today",
        statTable: "product_capabilities",
        statLabel: "Capabilities documented",
      },
      {
        key: "users",
        title: "Users",
        path: "modules/users/",
        description: "Who has access and to what",
        statTable: "profiles",
        statLabel: "Portal users",
      },
    ],
    tables: {
      profiles: "profiles",
      apiSpecs: "api_specs",
      apiEndpoints: "api_endpoints",
      apiTags: "api_tags",
      apiTopics: "api_topics",
      prototypes: "prototypes",
      futurePrototypes: "future_prototypes",
      integrations: "integrations",
      portalLinks: "portal_links",
      workAreas: "work_areas",
      workItemPhases: "work_item_phases",
      roadmapCategories: "roadmap_categories",
      roadmapMilestones: "roadmap_milestones",
      workItems: "work_items",
      knowledgeLinks: "knowledge_links",
      workDocuments: "work_documents",
      workNotes: "work_notes",
      productCapabilities: "product_capabilities",
      domainTerms: "domain_terms",
      journeyStages: "journey_stages",
      moduleAccess: "module_access",
      reviewWaves: "review_waves",
      reviewApplications: "review_applications",
      reviewEvidence: "review_evidence",
      reviewRevisions: "review_revisions",
      triageCategories: "triage_categories",
      launchpadStatuses: "launchpad_statuses",
    },
    // Link kinds: the display half of the vocabulary in
    // supabase/schema/33_links.sql (link_kinds). The database is
    // authoritative for which kinds exist and what they mean; this
    // mirrors only the labels, so the page can render "Part of" and
    // "Includes" without a second fetch. A kind missing here renders
    // nothing rather than a raw key. Keys and readings must match the
    // seed - tests/checks/knowledge-links.test.js holds them in step.
    linkKinds: {
      duplicate_of:  { label: "Duplicate of",  inverse: "Has duplicate",  family: "equivalence", symmetric: false },
      supersedes:    { label: "Supersedes",    inverse: "Superseded by",  family: "equivalence", symmetric: false },
      part_of:       { label: "Part of",       inverse: "Includes",       family: "hierarchy",   symmetric: false },
      blocks:        { label: "Blocks",        inverse: "Blocked by",     family: "sequence",    symmetric: false },
      relates_to:    { label: "Related to",    inverse: "Related to",     family: "association", symmetric: true },
      distinct_from: { label: "Distinct from", inverse: "Distinct from",  family: "association", symmetric: true },
      about:         { label: "About",         inverse: "Described by",   family: "knowledge",   symmetric: false },
      affects:       { label: "Affects",       inverse: "Affected by",    family: "knowledge",   symmetric: false },
    },
    // Link entity types: the display half of link_entity_types in
    // supabase/schema/33_links.sql. The database is authoritative for
    // which types exist; this mirrors the label and names the column
    // that stands in for a title, so a page can render the far end of
    // any link without a second lookup of the vocabulary itself.
    // A type with no `module` has no page to open yet - the link still
    // renders, as its label, rather than vanishing. `note` is the last
    // one: a note is always shown inside the thing it is about, so it
    // has no standalone home to link to.
    // tests/checks/knowledge-links.test.js holds these in step with the
    // seed.
    linkEntities: {
      work_item:  { table: "work_items",           titleColumn: "title", label: "Work item",       module: "roadmap" },
      note:       { table: "work_notes",           titleColumn: "body",  label: "Note" },
      capability: { table: "product_capabilities", titleColumn: "title", label: "Capability",      module: "platform", anchor: "capability" },
      term:       { table: "domain_terms",         titleColumn: "term",  label: "Glossary term",   module: "platform", anchor: "term" },
      stage:      { table: "journey_stages",       titleColumn: "title", label: "Journey stage",   module: "platform", anchor: "stage" },
      area:       { table: "work_areas",           titleColumn: "title", label: "Filing area",     module: "platform", anchor: "area" },
      document:   { table: "work_documents",       titleColumn: "title", label: "Source document", module: "backlog",  anchor: "document" },
    },
    // Spec families group api_specs rows into distinct reference
    // "sites" inside the reference module. Order here is display
    // order. Keys mirror the api_specs.family check constraint.
    specFamilies: [
      {
        key: "launchpad",
        label: "Launchpad API",
        description:
          "Inbound application flows, plus Unity-initiated actions " +
          "such as repurchase journeys for existing merchants.",
      },
      {
        key: "unity",
        label: "Unity Merchant Portal API",
        description:
          "Endpoints used when integrating Launchpad with the Unity " +
          "merchant portal.",
      },
      {
        key: "integration",
        label: "Integration APIs",
        description: "Third-party and outbound integration surfaces.",
      },
      {
        key: "other",
        label: "Other",
        description: "Uncategorised reference material.",
      },
    ],
    // Department is a coarse org-owner tag on a work item (see
    // docs/WORKFLOW.md): the business function accountable for it,
    // orthogonal to its area or theme. Keys mirror the
    // work_items.department check constraint; order here is display
    // order. The label carries the exact wording (mixed "&"/"and") so
    // no page hard-codes it - resolve with App.departmentLabel.
    departments: [
      { key: "sales_commercial", label: "Sales & Commercial" },
      { key: "operations_onboarding", label: "Operations and Onboarding" },
      { key: "product_technology", label: "Product and Technology" },
      { key: "finance_revenue", label: "Finance and Revenue" },
      { key: "legal_compliance", label: "Legal & Compliance" },
      { key: "risk_underwriting", label: "Risk & Underwriting" },
    ],
    roles: {
      admin: "admin",
      member: "member",
    },
  };

  App.moduleHref = function (mod) {
    return (App.root || ".") + "/" + mod.path;
  };

  // Build a deep link to a single row inside a module, matching the
  // per-module routing each page understands (roadmap/backlog open a
  // detail by ?item=, reference by ?spec=#ep-, prototypes link to their
  // own page, the list modules use a #<prefix>-<id> anchor). Falls back
  // to the module index when the row lacks what a link needs. Shared by
  // search.js and the dashboard activity feed so they cannot drift.
  App.itemHref = function (mod, row) {
    if (!mod) return "#";
    var base = App.moduleHref(mod);
    var id = row && row.id;
    switch (mod.key) {
      case "prototypes":
        return row && row.path
          ? (App.root || ".") + "/" + String(row.path).replace(/^\/+/, "")
          : base;
      case "reference":
        return row && row.spec_id
          ? base + "index.html?spec=" + encodeURIComponent(row.spec_id) +
            (id ? "#ep-" + id : "")
          : base;
      case "roadmap":
      case "backlog":
        return id ? base + "index.html?item=" + encodeURIComponent(id) : base;
      // A review row is only meaningful inside its wave, so the link
      // opens the board with that application's drawer, never the row
      // on its own.
      case "app-review":
        if (row && row.wave_id) {
          return base + "wave.html?wave=" + encodeURIComponent(row.wave_id) +
            (id ? "&application=" + encodeURIComponent(id) : "");
        }
        return id ? base + "wave.html?wave=" + encodeURIComponent(id) : base;
      case "platform":
        return id ? base + "index.html#capability-" + id : base;
      case "users":
        return id ? base + "index.html#user-" + id : base;
      case "integrations":
        return id ? base + "index.html#integration-" + id : base;
      default:
        return base;
    }
  };

  // Build a link to the far end of a knowledge_links row. Delegates to
  // App.itemHref where the entity type has a module, so a link and a
  // search result open the same place. Returns "" for a type with no
  // page yet, which callers render as a label rather than a dead link -
  // silence would hide the relationship, and a link to nowhere would
  // lie about it.
  App.linkHref = function (type, id, root) {
    var entity = (App.registry.linkEntities || {})[type];
    if (!entity || !entity.module || !id) return "";
    var mod = App.registry.modules.find(function (m) {
      return m.key === entity.module;
    });
    if (!mod) return "";
    var previous = App.root;
    if (root !== undefined) App.root = root;
    // An entity with an `anchor` addresses a row within its module's
    // page; without one it routes through App.itemHref, so a link and a
    // search result open the same place by the same rule.
    var href = entity.anchor
      ? App.moduleHref(mod) + "index.html#" + entity.anchor + "-" + id
      : App.itemHref(mod, { id: id });
    App.root = previous;
    return href;
  };

  // Resolve a work_items.department key to its display label. Returns
  // "" for an unset or unknown key, so callers can render it directly.
  App.departmentLabel = function (key) {
    var match = (App.registry.departments || []).filter(function (dept) {
      return dept.key === key;
    })[0];
    return match ? match.label : "";
  };
})();
