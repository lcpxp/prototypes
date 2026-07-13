// ------------------------------------------------------------------
// config.example.js - OPTIONAL local override.
//
// The app already ships with the public Supabase project config built
// into supabase.js, so nothing here is required to run or deploy.
//
// Create config.js (same directory) from this file ONLY to point a
// local build at a DIFFERENT Supabase project. When present it is
// loaded before supabase.js and takes precedence. config.js is
// gitignored and must never be committed. The service_role key must
// never appear anywhere in this repo.
// ------------------------------------------------------------------

window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",
};
