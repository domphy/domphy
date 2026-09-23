import { themeVars } from "./theme.js";

/**
 * Font stacks the built-in themes register. Loose-autocomplete union (same
 * pattern as {@link ThemeColor}): a custom theme may add its own names via
 * `setTheme(name, { fontFamilies: { … } })`, so arbitrary strings stay legal
 * while the built-ins rank first in editor completion.
 */
export const FONT_FAMILIES = ["sans-serif", "monospace"] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number] | (string & {});

/** Weight names the built-in themes register, 300 → 900. */
export const FONT_WEIGHTS = [
  "light",
  "regular",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
] as const;
export type FontWeight = (typeof FONT_WEIGHTS)[number] | (string & {});

/** Letter-spacing names the built-in themes register. */
export const LETTER_SPACINGS = [
  "tighter",
  "tight",
  "normal",
  "wide",
  "wider",
  "widest",
] as const;
export type LetterSpacing = (typeof LETTER_SPACINGS)[number] | (string & {});

function tokenReference(
  group: "fontFamilies" | "fontWeights" | "letterSpacings",
  name: string,
  accessor: string,
): string {
  // themeVars() is keyed on the "light" theme's STRUCTURE — it emits the shared
  // var(--…) baseline every theme's CSS block provides — so a name registered
  // only on another theme is invisible here, exactly as for color roles.
  const references = themeVars()[group] as Record<string, string> | undefined;
  const reference = references?.[name];
  if (!reference) {
    const known = Object.keys(references ?? {}).join(", ");
    throw Error(
      `${group}.${name} is not registered on the "light" theme — ${accessor}() resolves against the shared token baseline. Known names: ${known || "(none)"}. Register it with setTheme("light", { ${group}: { ${name}: … } }).`,
    );
  }
  return reference;
}

/**
 * A font stack from the theme: `themeFont()` → the UI sans stack,
 * `themeFont("monospace")` → the code stack.
 *
 * The themed root already carries `"sans-serif"` as its `font-family`, so most
 * elements need nothing. Reach for this when an element must opt OUT of the
 * inherited stack — a code block, a terminal, tabular figures.
 *
 * @example
 * { code: "npm i", style: { fontFamily: themeFont("monospace") } }
 */
export function themeFont(family: FontFamily = "sans-serif"): string {
  return tokenReference("fontFamilies", family, "themeFont");
}

/**
 * A font weight from the theme. Returns a `var(--fontWeight-…)` reference, so
 * a theme that swaps in a variable font with a narrower weight axis remaps
 * every call site at once.
 *
 * @example
 * { strong: "Total", style: { fontWeight: themeWeight("semibold") } }
 */
export function themeWeight(weight: FontWeight = "regular"): string {
  return tokenReference("fontWeights", weight, "themeWeight");
}

/**
 * A letter-spacing step from the theme. Values are `em`-relative, so tracking
 * scales with whatever `themeSize()` resolved on the element.
 *
 * Display text set at the top of the size scale generally wants `"tight"`;
 * small all-caps labels want `"wide"` or `"wider"`.
 *
 * @example
 * { h1: "Domphy", $: [heading()], style: { letterSpacing: themeLetterSpacing("tight") } }
 */
export function themeLetterSpacing(spacing: LetterSpacing = "normal"): string {
  return tokenReference("letterSpacings", spacing, "themeLetterSpacing");
}
