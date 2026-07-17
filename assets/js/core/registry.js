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
      integrations: "integrations",
      workAreas: "work_areas",
      workItemPhases: "work_item_phases",
      roadmapCategories: "roadmap_categories",
      roadmapMilestones: "roadmap_milestones",
      workItems: "work_items",
      workItemDependencies: "work_item_dependencies",
      workDocuments: "work_documents",
      workNotes: "work_notes",
      productCapabilities: "product_capabilities",
      moduleAccess: "module_access",
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

  // Resolve a work_items.department key to its display label. Returns
  // "" for an unset or unknown key, so callers can render it directly.
  App.departmentLabel = function (key) {
    var match = (App.registry.departments || []).filter(function (dept) {
      return dept.key === key;
    })[0];
    return match ? match.label : "";
  };
})();
