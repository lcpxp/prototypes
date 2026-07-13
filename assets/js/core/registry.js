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
        key: "silos",
        title: "Project silos",
        path: "silos/",
        heading: "Silo index",
        description: "Independent workstreams and mini-projects",
        statTable: null,
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
        key: "prototypes",
        title: "Prototypes",
        path: "modules/prototypes/",
        description: "Working prototypes and mockups",
        statTable: "prototypes",
        statLabel: "Registered prototypes",
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
      prototypes: "prototypes",
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
    roles: {
      admin: "admin",
      member: "member",
    },
  };

  App.moduleHref = function (mod) {
    return (App.root || ".") + "/" + mod.path;
  };
})();
