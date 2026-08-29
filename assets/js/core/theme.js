// ------------------------------------------------------------------
// theme.js - Light/dark theme control.
//
// Loaded in <head> before the body renders so the stored choice is
// applied before first paint (no flash). The choice is persisted in
// localStorage; with no stored choice the theme follows the OS and
// tracks OS changes live until the user picks one explicitly.
//
// Sets data-theme on <html>; tokens.css keys the dark palette and
// color-scheme off that attribute. The nav toggle (rendered by
// ui.js) reads and drives App.theme.
//
// This is the first script on every page and the only blocking one, so
// it runs before ui.js exists and cannot use App.store - hence the
// guarded stored() below rather than the shared helper. That is the
// reason for the duplication, and the only one.
// ------------------------------------------------------------------

(function () {
  "use strict";

  window.App = window.App || {};

  var KEY = "lpio-theme";
  var root = document.documentElement;
  var mql = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function stored() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    return mql && mql.matches ? "dark" : "light";
  }

  function current() {
    return stored() || systemTheme();
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    // Let any listener (the nav toggle) reflect the new state.
    if (typeof App.onThemeChange === "function") App.onThemeChange(theme);
  }

  // Apply immediately: in <head> this runs before the body paints.
  apply(current());

  // Follow the OS only while the user has made no explicit choice.
  if (mql) {
    var onSystemChange = function () {
      if (!stored()) apply(systemTheme());
    };
    if (mql.addEventListener) mql.addEventListener("change", onSystemChange);
    else if (mql.addListener) mql.addListener(onSystemChange);
  }

  App.theme = {
    current: current,
    isDark: function () {
      return current() === "dark";
    },
    set: function (theme) {
      theme = theme === "dark" ? "dark" : "light";
      try {
        localStorage.setItem(KEY, theme);
      } catch (e) {
        /* storage blocked: the choice just won't persist */
      }
      apply(theme);
    },
    toggle: function () {
      App.theme.set(current() === "dark" ? "light" : "dark");
    },
  };
})();
