// Site brand theme — the single source for the docs site's palette.
//
// Imported for its side effects by BOTH:
//   - build.press.ts   (SSG: bakes themeCSS() into every page's <style>)
//   - islands-runtime.ts (client: themeApply() re-injects themeCSS() on
//     hydration, and its <style> lands AFTER the baked one in <head>)
// Both must see the same registry, or the client would re-apply the default
// blue palette over the baked brand one the moment any island mounts.

import { generateTheme, setTheme } from "@domphy/theme";

const brand = generateTheme({
  // Amber — matches favicon.svg (#de6f0b); the ramp's resolved base tone
  // lands at #de7c16, perceptually identical to the mark.
  primary: "#d97706",
  // Cool slate neutral — replaces the old raspberry secondary so it stops
  // fighting the orange brand.
  secondary: "#64748b",
  // Solid buttons use deep ramp steps (shift-13). Warm yellows collapse toward
  // the same brown as primary amber at that depth, so warning is lime-olive,
  // danger is vivid red, and error is rose — readable as three roles, not one.
  warning: "#65a30d",
  danger: "#ef4444",
  error: "#db2777",
});
// setTheme("light", …) re-derives "dark" from it (ramps reversed, baseTones
// mirrored). An explicit setTheme("dark", …) mirror here would be recorded as
// an override and replayed on top of every later rebuild — editing the brand
// palette above would then silently leave dark mode on the OLD ramps forever.
setTheme("light", brand);
