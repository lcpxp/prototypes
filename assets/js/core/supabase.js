// ------------------------------------------------------------------
// supabase.js - Initialises the Supabase client as App.db.
//
// The project URL and anon key below are PUBLIC by design. The anon
// key only grants what Row Level Security allows (see docs/SECURITY.md),
// so it is safe to ship to the browser and is committed here so the
// static site works everywhere - including GitHub Pages - with no
// setup step. The service_role key must NEVER appear in this repo.
//
// To point a local build at a different Supabase project, define
// window.APP_CONFIG (SUPABASE_URL, SUPABASE_ANON_KEY) before this
// script runs; those values take precedence over the defaults below.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var PUBLIC_CONFIG = {
    SUPABASE_URL: "https://zlmkofbkobmhnslfnqsf.supabase.co",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbWtvZmJrb2JtaG5zbGZucXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1MzU3NzUsImV4cCI6MjA5OTExMTc3NX0.GbxNfkwmwLW_kvzDNz2MJ0ipZ2jxdT5-1_75sDf1Bs8",
  };

  var override = window.APP_CONFIG;
  var config =
    override && override.SUPABASE_URL && override.SUPABASE_ANON_KEY
      ? override
      : PUBLIC_CONFIG;

  App.db = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );
})();
