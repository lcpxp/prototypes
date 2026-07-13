// ------------------------------------------------------------------
// config.example.js
//
// Copy this file to config.js in the same directory and fill in the
// values from your Supabase project (Project settings > API).
//
// config.js is listed in .gitignore and must never be committed.
// The anon key is safe to expose to browsers ONLY because Row Level
// Security is enabled on every table (see supabase/policies.sql).
// The service_role key must never appear anywhere in this repo.
// ------------------------------------------------------------------

window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",
};
