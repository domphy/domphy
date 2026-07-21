// Site brand theme — the single source for the docs site's palette.
//
// Imported for its side effects by BOTH:
//   - build.press.ts   (SSG: bakes themeCSS() into every page's <style>)
//   - islands-runtime.ts (client: themeApply() re-injects themeCSS() on
//     hydration, and its <style> lands AFTER the baked one in <head>)
// Both must see the same registry, or the client would re-apply the default
// blue palette over the baked brand one the moment any island mounts.

import { generateTheme, setTheme } from "@domphy/theme";

const TONE_STEPS = 18;

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
setTheme("light", brand);

// Mirror the ramps for dark exactly the way the built-in dark theme is
// derived from light (createDark): reverse each ramp, mirror baseTones.
setTheme("dark", {
  direction: "lighten",
  colors: Object.fromEntries(
    Object.entries(brand.colors!).map(([name, ramp]) => [
      name,
      [...ramp].reverse(),
    ]),
  ),
  baseTones: Object.fromEntries(
    Object.entries(brand.baseTones!).map(([name, tone]) => [
      name,
      TONE_STEPS - 1 - tone,
    ]),
  ),
});
