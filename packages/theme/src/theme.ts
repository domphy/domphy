import type { ElementNode, Listener } from "@domphy/core";
import light from "./light.js";
import type { PartialThemeInput, ThemeInput, ThemeVars } from "./types.js";

// JSON clone (not structuredClone) so the build runs in older embedded
// browsers like SketchUp 2022's CEF, which predates Chromium 98.
// ThemeInput is plain JSON (no Map/Set/Date/typed arrays).
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Custom-token keys may contain CSS-illegal characters (e.g. "radius/sm/lg").
// [a-zA-Z0-9-] pass through unchanged (hyphen is both a legal CSS ident char
// and extremely common in real token names — "sans-serif", "border-radius"
// — escaping it would mangle those for no reason). Everything else,
// INCLUDING a literal "_", is escaped as `_<hex charcode>_`: "_" has to be
// escaped too so it can be reserved as the escape delimiter — otherwise a
// literal "_" in one key could imitate part of another key's escape
// sequence. That makes the mapping injective (collision-free): the only way
// a "_" appears in the output is this escape, so decoding is unambiguous and
// two distinct keys can never collapse onto the same escaped string. (The
// prior version mapped every illegal char to a bare "_" with no positional
// info, so "radius/sm" and "radius sm" both produced "radius_sm".)
const escapeKey = (k: string): string =>
  k.replace(/[^a-zA-Z0-9-]/g, (c) => `_${c.charCodeAt(0).toString(16)}_`);

const themes: Record<string, ThemeInput> = {
  light: clone(light),
  dark: createDark(light),
};

// Every explicit setTheme("dark", …) payload, accumulated. "dark" is a
// DERIVATION of "light" (createDark reverses each ramp), so it has to be
// rebuilt whenever "light" changes: without this,
// setTheme("light", generateTheme({ primary: brand })) left "dark" on the
// stock blue ramp, and a role registered only on "light" was missing from
// "dark" entirely (themeColor(..., role) threw there). Replaying the
// overrides on top of the rebuild keeps deliberate dark-only customization
// regardless of call order.
const darkOverrides: PartialThemeInput = {};

// Number of tone steps in every color ramp. The tone model (shift-N /
// increase-N / decrease-N, edge anchors, contrast rules) is baked around this
// fixed width, so setTheme() validates that every ramp stays exactly this long
// — a shorter/longer ramp would desynchronize themeVars()/buildThemeCSS() (which
// follow the ramp structure) from offsetTone()/ElementTones (which assume it).
export const TONE_STEPS = light.colors.neutral.length;

// Number of entries in the fontSizes scale (themeSize spans increase/decrease
// 0–7). buildThemeCSS() unconditionally emits --fontSize-0..7, so a short array
// would leak literal "undefined" into the generated CSS.
const FONT_SIZE_STEPS = 8;

// Number of entries in the densities scale (themeDensity spans
// increase/decrease 0–4 — see ElementDensities in density.ts).
const DENSITY_STEPS = 5;

// ThemeInput keys holding a NAMED token record (not a positional scale like
// fontSizes) → the CSS custom-property prefix they emit. The prefix is the CSS
// property the token feeds (--fontWeight-medium: 500), so a declaration in
// devtools and the token that produced it read the same.
const NAMED_TOKEN_PREFIX: Record<string, string> = {
  fontFamilies: "fontFamily",
  fontWeights: "fontWeight",
  letterSpacings: "letterSpacing",
};

// Memo caches. themeVars() depends only on the theme STRUCTURE (color names,
// tone steps, custom keys) — it emits `var(--…)` references, never resolved
// values — so its result is stable until setTheme() changes that structure.
// themeTokens() returns resolved values per theme, cached per name. Both are
// invalidated in setTheme(). Callers must treat the returned objects as
// read-only (they are shared).
let _themeVarsCache: ThemeVars | null = null;
const _themeTokensCache = new Map<string, Record<string, any>>();

function colorSteps(input: ThemeInput): number {
  const firstColor = Object.keys(input.colors)[0];
  return firstColor ? input.colors[firstColor].length : 0;
}

// --- Validation ---

// Theme values/names/keys are interpolated RAW into a <style> block by
// buildThemeCSS() — ";" injects an extra declaration, "}" closes the rule
// early, and "</style" (any whitespace/case) breaks out of the element,
// letting a crafted custom theme (e.g. loaded from an API response) inject
// arbitrary CSS/markup. Reject all three at validation time.
function assertCssSafe(value: string, where: string): void {
  if (/[;}]/.test(value) || /<\/\s*style/i.test(value)) {
    throw new Error(
      `${where} contains unsafe CSS characters (";", "}", or "</style") — theme values are interpolated into a <style> block`,
    );
  }
}

function validateTheme(partial: PartialThemeInput): void {
  for (const key in partial) {
    if (!Object.keys(light).includes(key as keyof ThemeInput)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
  if (partial.fontSizes !== undefined) {
    const valid =
      Array.isArray(partial.fontSizes) &&
      partial.fontSizes.length === FONT_SIZE_STEPS &&
      partial.fontSizes.every((v) => typeof v === "string" && v.length > 0);
    if (!valid) {
      throw new Error(
        `fontSize must be array of ${FONT_SIZE_STEPS} non-empty string (the size scale has ${FONT_SIZE_STEPS} steps: 0–${FONT_SIZE_STEPS - 1})`,
      );
    }
    partial.fontSizes.forEach((v, i) => assertCssSafe(v!, `fontSizes[${i}]`));
  }
  // fontFamilies / fontWeights / letterSpacings are named records whose values
  // are interpolated straight into the <style> block, same as colors. They are
  // merged (deepMerge never deletes), so a partial can only add or replace a
  // name — the built-in names stay resolvable.
  for (const key of [
    "fontFamilies",
    "fontWeights",
    "letterSpacings",
  ] as const) {
    if (!(key in partial)) continue;
    const group = partial[key]!;
    if (typeof group !== "object" || group === null || Array.isArray(group)) {
      throw new Error(`${key} must be an object of non-empty strings`);
    }
    for (const name in group) {
      const value = group[name];
      if (typeof value !== "string" || value.length === 0) {
        throw new Error(`${key}.${name} must be a non-empty string`);
      }
      assertCssSafe(name, `${key} name "${name}"`);
      assertCssSafe(value, `${key}.${name}`);
    }
  }
  if (partial.densities) {
    if (
      !Array.isArray(partial.densities) ||
      partial.densities.some((v) => typeof v !== "number")
    ) {
      throw new Error(`densities must be array of number`);
    }
    // Structural check, same class as fontSizes/colors above: themeDensity()
    // indexes densities[0..DENSITY_STEPS-1] directly, so a short array returns
    // undefined and leaks "calc(NaNem)" into control padding. Non-positive
    // factors would zero/negate padding outright.
    if (partial.densities.length !== DENSITY_STEPS) {
      throw new Error(
        `densities must have exactly ${DENSITY_STEPS} entries (the density scale has ${DENSITY_STEPS} steps: 0–${DENSITY_STEPS - 1}), got ${partial.densities.length}`,
      );
    }
    if (partial.densities.some((v) => !Number.isFinite(v) || v! <= 0)) {
      throw new Error(`densities entries must be positive finite numbers`);
    }
  }
  if (partial.darkBias !== undefined) {
    // darkBias feeds biasContext() as a tone offset — a non-integer/out-of-range
    // value (e.g. from a JSON-loaded custom theme) yields NaN tone indices and
    // undefined colors instead of an actionable error.
    const v = partial.darkBias;
    if (
      typeof v !== "number" ||
      !Number.isInteger(v) ||
      v < 0 ||
      v > TONE_STEPS - 1
    ) {
      throw new Error(
        `darkBias must be an integer between 0 and ${TONE_STEPS - 1} (the tone ramp has ${TONE_STEPS} steps)`,
      );
    }
  }
  if ("custom" in partial) {
    const custom = partial.custom!;
    if (typeof custom !== "object" || custom === null) {
      throw new Error(`Invalid custom property: must be an object`);
    }
    for (const k in custom) {
      const v = custom[k];
      if (typeof v === "string") assertCssSafe(v, `custom.${k}`);
    }
  }
  if ("colors" in partial) {
    const colors = partial.colors!;
    const valid =
      typeof colors === "object" &&
      colors !== null &&
      Object.values(colors).every(
        (v) => Array.isArray(v) && v.every((c) => typeof c === "string"),
      );
    if (!valid) {
      throw new Error(`colors must be an object of string[]`);
    }
    // Structural checks: every ramp must span the full tone model so that
    // themeColor()/themeVars()/buildThemeCSS() can never index past the end
    // (which produced literal "undefined" in styles) — and ramps of differing
    // lengths would silently disagree with each other.
    for (const name in colors) {
      assertCssSafe(name, `colors role "${name}"`);
      const ramp = colors[name]!;
      if (ramp.length !== TONE_STEPS) {
        throw new Error(
          `colors.${name} must have exactly ${TONE_STEPS} tone steps (got ${ramp.length}) — the tone model is fixed at shift-0…shift-${TONE_STEPS - 1}`,
        );
      }
      if (ramp.some((c) => c!.length === 0)) {
        throw new Error(`colors.${name} must contain only non-empty strings`);
      }
      ramp.forEach((c, i) => assertCssSafe(c!, `colors.${name}[${i}]`));
    }
  }
  if ("baseTones" in partial) {
    const baseTones = partial.baseTones!;
    const valid =
      typeof baseTones === "object" &&
      baseTones !== null &&
      Object.values(baseTones).every((v) => typeof v === "number");
    if (!valid) {
      throw new Error(`baseTones must be an object of number`);
    }
    for (const name in baseTones) {
      const v = baseTones[name]!;
      if (!Number.isInteger(v) || v < 0 || v > TONE_STEPS - 1) {
        throw new Error(
          `baseTones.${name} must be an integer between 0 and ${TONE_STEPS - 1} (the tone ramp has ${TONE_STEPS} steps)`,
        );
      }
    }
  }
  if ("direction" in partial) {
    if (partial.direction !== "lighten" && partial.direction !== "darken") {
      throw new Error(`direction must be "lighten" or "darken"`);
    }
  }
}

// --- Deep Merge ---

function deepMerge(target: any, source: any): void {
  // Guard against prototype pollution: a JSON.parse'd payload (e.g. a custom
  // theme loaded from an API response) can carry an own enumerable
  // "__proto__" key, which `for...in` picks up unlike object-literal syntax.
  // Must run at every recursion depth — the key can appear inside any
  // nested Record-typed field (custom, colors, baseTones), not just the top.
  for (const key of Object.keys(source)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      target[key] ??= {};
      deepMerge(target[key], source[key]);
    } else if (Array.isArray(source[key])) {
      // Shallow clone: a ramp/densities array registered via setTheme() must
      // not stay aliased to the caller's array — mutating the caller's array
      // afterwards would silently mutate the registered theme. Elements are
      // always primitives (hex strings, numbers), so a shallow copy suffices.
      target[key] = [...source[key]];
    } else {
      target[key] = source[key];
    }
  }
}

// --- Builders (pure functions) ---

// A theme name is interpolated RAW into a quoted attribute selector in
// buildThemeCSS() (`[data-theme="${name}"]`), not through escapeKey() — a
// theme name has no collision-safety requirement of its own (setTheme()
// already keys `themes` by the exact string). A bare `"`, with none of
// assertCssSafe()'s existing ";"/"}"/"</style" chars, is still enough to
// close that quoted value early and start a fresh selector (e.g.
// `x"],script{color:red`) that rides the theme block's own trailing "}" to
// close itself. Checked once here and called from BOTH setTheme() (so a bad
// name is rejected before it ever enters the registry) and buildThemeCSS()
// (defense in depth against a registry mutated some other way).
function assertThemeNameSafe(name: string): void {
  assertCssSafe(name, "theme name");
  if (name.includes('"')) {
    throw new Error(
      'theme name contains a double-quote (") character — it is interpolated into a [data-theme="…"] attribute selector',
    );
  }
}

function buildThemeCSS(name: string, input: ThemeInput): string {
  assertThemeNameSafe(name);
  const styles: Record<string, string | number> = {};
  const toneSteps = colorSteps(input);

  // Native UI — scrollbars, form controls, the date/color pickers, spellcheck
  // underlines — follows `color-scheme`, never our custom properties: without
  // it a dark theme still renders white scrollbars and white <input> internals.
  // Derived from `direction`, not hard-coded per name: a theme that DARKENS
  // away from its edge is light-based, one that LIGHTENS is dark-based, which
  // is exactly how createDark() flips it. Emitted here (not from JS) so SSR
  // output is already correct — no flash before hydration.
  styles["color-scheme"] = input.direction === "lighten" ? "dark" : "light";

  // The document's own font stack. Without it a page that only calls
  // themeApply() inherits the UA default, which is a serif — AGENTS.md's
  // "theme owns the font stack" rule has nowhere to hold otherwise, and every
  // patch would have to restate fontFamily to escape Times New Roman.
  // Declared on the themed root so it inherits and any element/patch rule wins.
  const rootFamily = input.fontFamilies?.["sans-serif"];
  if (rootFamily) styles["font-family"] = rootFamily;

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const colorName in input.colors) {
        const safeColor = escapeKey(colorName);
        [...Array(toneSteps).keys()].forEach(
          (i) => (styles[`--${safeColor}-${i}`] = input.colors[colorName][i]),
        );
      }
    } else if (key === "fontSizes") {
      [...Array(FONT_SIZE_STEPS).keys()].forEach(
        (i) => (styles[`--fontSize-${i}`] = input.fontSizes[i]),
      );
    } else if (NAMED_TOKEN_PREFIX[key]) {
      const group = value as Record<string, string>;
      for (const name in group) {
        styles[`--${NAMED_TOKEN_PREFIX[key]}-${escapeKey(name)}`] = group[name];
      }
    } else if (key === "custom") {
      if (value && typeof value === "object") {
        for (const k in value as Record<string, string>) {
          styles[`--custom-${escapeKey(k)}`] = (
            value as Record<string, string>
          )[k];
        }
      }
    }
    // densities / baseTones / direction / darkBias are not CSS custom properties
  }

  let text = "";
  for (const prop in styles) {
    text += `  ${prop}: ${styles[prop]};\n`;
  }
  // "light" is the registry's base theme — createDark() derives from it,
  // setTheme() seeds every new theme from clone(light), themeVars() reads it,
  // and themeName() returns "light" when no [data-theme] ancestor exists. The
  // JS resolver therefore already falls back to light; without the :root
  // selector the CSS side did NOT, so a page that never sets data-theme
  // resolved every var(--…) to nothing and rendered unstyled with no error.
  // Peers put the default tokens on :root the same way (Tailwind v4 @theme,
  // MUI CssVarsProvider, Radix Colors, Open Props) and override via a
  // class/attribute. `:root` and `[data-theme="…"]` have identical
  // specificity (0,1,0), and themeCSS() emits light first (insertion order of
  // `themes`), so any later [data-theme] block still wins on <html> itself.
  // Proven in a real browser by packages/theme/e2e/tokens.spec.ts.
  const selector =
    name === "light"
      ? `:root,\n[data-theme="light"]`
      : `[data-theme="${name}"]`;
  return `${selector} {\n${text}}`;
}

// --- Public API ---

export function getTheme(name: string): ThemeInput {
  if (!themes[name]) throw Error(`Theme "${name}" not found`);
  return themes[name];
}

export function setTheme(name: string, input: PartialThemeInput): void {
  assertThemeNameSafe(name);
  validateTheme(input);
  if (!themes[name]) themes[name] = clone(light);
  deepMerge(themes[name], input);
  if (name === "dark") deepMerge(darkOverrides, input);
  if (name === "light" || name === "dark") rebuildDark();
  // Structure/values may have changed → drop memoized derivations.
  _themeVarsCache = null;
  _themeTokensCache.clear();
}

function createDark(source: ThemeInput): ThemeInput {
  const dark = clone(source);
  dark.direction = "lighten";
  for (const name in dark.colors) {
    dark.colors[name].reverse();
    // A role registered without a baseTones entry stays without one, so
    // requireBaseTone() throws its actionable message instead of indexing the
    // ramp with NaN (length - 1 - undefined).
    if (typeof dark.baseTones[name] === "number") {
      dark.baseTones[name] =
        dark.colors[name].length - 1 - dark.baseTones[name];
    }
  }
  return dark;
}

function rebuildDark(): void {
  themes.dark = createDark(themes.light);
  deepMerge(themes.dark, darkOverrides);
}

export function themeTokens(name: string): Record<string, any> {
  const cached = _themeTokensCache.get(name);
  if (cached) return cached;
  const input = getTheme(name);
  const toneSteps = colorSteps(input);
  const tokens: Record<string, any> = {};

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const name in input.colors) {
        const colorTones = {} as Partial<Record<number, string>>;
        [...Array(toneSteps).keys()].forEach(
          (i) => (colorTones[i] = input.colors[name][i]),
        );
        tokens[name] = colorTones as Record<number, string>;
      }
    } else if (key === "fontSizes") {
      tokens.fontSizes = input.fontSizes;
    } else if (NAMED_TOKEN_PREFIX[key]) {
      tokens[key] = { ...(value as Record<string, string>) };
    } else if (key === "densities") {
      tokens.densities = input.densities;
    } else if (key === "custom") {
      tokens.custom = {};
      if (value && typeof value === "object") {
        for (const k in value as Record<string, string>) {
          tokens.custom[k] = (value as Record<string, string>)[k];
        }
      }
    }
    // baseTones / direction / darkBias are metadata — reachable via getTheme(), not tokens
  }

  _themeTokensCache.set(name, tokens);
  return tokens;
}

export function themeVars(): ThemeVars {
  if (_themeVarsCache) return _themeVarsCache;
  const input = getTheme("light");
  const toneSteps = colorSteps(input);
  const theme = {} as ThemeVars;

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const name in input.colors) {
        const safeName = escapeKey(name);
        const colorTones = {} as Partial<Record<number, string>>;
        [...Array(toneSteps).keys()].forEach(
          (i) => (colorTones[i] = `var(--${safeName}-${i})`),
        );
        theme[name] = colorTones as Record<number, string>;
      }
    } else if (key === "fontSizes") {
      theme.fontSizes = [...Array(FONT_SIZE_STEPS).keys()].map(
        (i) => `var(--fontSize-${i})`,
      );
    } else if (NAMED_TOKEN_PREFIX[key]) {
      const references: Record<string, string> = {};
      for (const name in value as Record<string, string>) {
        references[name] =
          `var(--${NAMED_TOKEN_PREFIX[key]}-${escapeKey(name)})`;
      }
      (theme as Record<string, unknown>)[key] = references;
    } else if (key === "custom") {
      theme.custom = {} as Record<string, string>;
      if (value && typeof value === "object") {
        for (const k in value as Record<string, string>) {
          theme.custom[k] = `var(--custom-${escapeKey(k)})`;
        }
      }
    }
    // densities / baseTones / direction / darkBias are not exposed as CSS vars
  }

  _themeVarsCache = theme;
  return theme;
}

// Standard form-control font reset (the same rule normalize.css/modern-normalize
// ship): Chromium/Firefox/Safari default <button>/<input>/<select>/<textarea>/
// <optgroup> to the UA form-control font stack (Chromium: Arial), not the
// inherited document font. Without this, every themed form-control patch had
// to restate `fontFamily: "inherit"` itself to escape it — root-fixed here so
// those per-patch overrides (17 declarations across 14 @domphy/ui patches)
// become removable: a patch's own per-node style class still outranks this
// bare-tag rule by specificity, so a patch that DOES want to override font
// still can. Theme-independent (not tied to light/dark), so it is emitted
// once, outside the per-theme selector blocks.
const FORM_CONTROL_FONT_RESET =
  "button,input,select,textarea,optgroup{font:inherit}";

// The `:root` (attribute-less page) fallback this relies on, and the 504/504
// resolveToneStep matrix, are proven against real Chromium by
// packages/theme/e2e/tokens.spec.ts (`pnpm --filter @domphy/theme test:e2e`).
export function themeCSS(): string {
  const themeBlocks = Object.entries(themes)
    .map(([name, input]) => buildThemeCSS(name, input))
    .join("\n");
  return `${themeBlocks}\n${FORM_CONTROL_FONT_RESET}`;
}

export function themeApply(el?: HTMLStyleElement): void {
  if (typeof document === "undefined") return;
  if (el) {
    el.textContent = themeCSS();
    return;
  } else {
    el =
      (document.getElementById("domphy-themes") as HTMLStyleElement) ??
      Object.assign(document.createElement("style"), { id: "domphy-themes" });
    el.textContent = themeCSS();
    document.head.appendChild(el);
  }
}

export function themeSpacing(n: number) {
  return `calc(${n / 4}em)`;
}

// Fluid spacing using CSS clamp(). Returns a value that scales linearly
// between themeSpacing(min) and themeSpacing(max) across a viewport width
// range (default 320px → 1280px). Use for structural spacing that should
// grow with the viewport — not for bounded-control padding (use density for that).
//
// Preferred value is Utopia-style: convert em→px at the documented root
// 16px/em (CSS initial font-size; spacing.md's 1em = 16px), interpolate in
// px, emit vw (+ em intercept). Using Δem as vw treats 1em as 1px and the
// clamp stays at min on every realistic viewport.
//
// Example: themeFluidSpacing(4, 16) → "clamp(1em, 5vw, 4em)"
// (1em at 320px viewport, 4em at 1280px, at 16px/em)
const ROOT_PX_PER_EM = 16;

export function themeFluidSpacing(
  min: number,
  max: number,
  viewportMin = 320,
  viewportMax = 1280,
): string {
  const minEm = min / 4;
  const maxEm = max / 4;
  const minPx = minEm * ROOT_PX_PER_EM;
  const maxPx = maxEm * ROOT_PX_PER_EM;
  const slopeVw = ((maxPx - minPx) / (viewportMax - viewportMin)) * 100;
  const interceptPx = minPx - (slopeVw * viewportMin) / 100;
  const interceptEm = interceptPx / ROOT_PX_PER_EM;
  const slopeRounded = parseFloat(slopeVw.toFixed(4));
  const interceptRounded = parseFloat(interceptEm.toFixed(4));
  const preferred =
    interceptRounded === 0
      ? `${slopeRounded}vw`
      : `${interceptRounded}em + ${slopeRounded}vw`;
  return `clamp(${minEm}em, ${preferred}, ${maxEm}em)`;
}

// System theme detection helper. Reads window.matchMedia and/or a saved
// localStorage preference, sets data-theme on targetEl (default: <html>),
// then listens for OS-level changes. Returns a cleanup function.
//
// Usage:
//   const cleanup = applySystemTheme()          // one-liner on client startup
//   const cleanup = applySystemTheme(document.documentElement, { storageKey: "my-theme" })
//
// When the user manually changes the theme, call:
//   localStorage.setItem(storageKey, "dark")    // applySystemTheme will honour it on reload
//   element.setAttribute("data-theme", "dark")  // update DOM immediately
//
// For SSR: call only on the client (typeof window !== "undefined"). Calling it
// server-side throws an actionable error instead of a bare ReferenceError — the
// default targetEl (document.documentElement) is resolved lazily inside the
// function body, not eagerly in the parameter list.
export function applySystemTheme(
  targetEl?: Element,
  options: {
    /**
     * Honour an existing `"light"`/`"dark"` value under `storageKey` and
     * ignore OS changes while that value exists. The helper never writes —
     * persist a user choice with `localStorage.setItem(storageKey, "light"|"dark")`.
     * When false, skip the read and always follow the OS. Default: true.
     */
    persist?: boolean;
    /** localStorage key. Default: "dp-theme". */
    storageKey?: string;
  } = {},
): () => void {
  if (typeof document === "undefined") {
    throw new Error(
      'applySystemTheme() requires a browser DOM — "document" is not defined. ' +
        'For SSR, call it only on the client (e.g. inside an _onMount lifecycle hook, or behind a typeof window !== "undefined" guard).',
    );
  }
  const target = targetEl ?? document.documentElement;
  const { persist = true, storageKey = "dp-theme" } = options;

  // Touching window.localStorage THROWS (not returns null) when storage is
  // partitioned or blocked: a sandboxed <iframe> without allow-same-origin,
  // Chrome's "block third-party cookies", Safari private mode quota. Domphy
  // ships inside embedded web views where that is normal, and an uncaught
  // SecurityError here would take down app startup over a preference. Fall
  // back to the OS preference instead.
  const readStored = (): string | null => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  };

  const resolve = (): "light" | "dark" => {
    if (persist) {
      const saved = readStored();
      if (saved === "light" || saved === "dark") return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  target.setAttribute("data-theme", resolve());

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (event: MediaQueryListEvent) => {
    // Only follow the OS change when there is no user-saved preference.
    if (!persist || !readStored()) {
      target.setAttribute("data-theme", event.matches ? "dark" : "light");
    }
  };
  mql.addEventListener("change", handler);

  return () => mql.removeEventListener("change", handler);
}

export function themeName(object: ElementNode | Listener) {
  const elementNode = (
    typeof object === "function" ? object.elementNode : object
  ) as ElementNode;
  let node: ElementNode = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTheme"))) {
    node = node.parent as ElementNode;
  }

  let themeName = "light";

  if (node && node.attributes && node.attributes.has("dataTheme")) {
    themeName = node.attributes.get("dataTheme");
    typeof object === "function" &&
      node.attributes.addListener("dataTheme", object);
  }
  return themeName;
}

// The 10 semantic roles every built-in theme (light/dark) ships — single source
// of truth for both the runtime list (icons, docs demos, e.g. ThemeBuilder's
// color-picker sidebar) and the ColorRole type below. `ThemeInput.colors` stays
// a plain string-indexed record (custom themes may register their own role
// names via setTheme/generateTheme), so this is deliberately NOT presented as
// an exhaustive runtime constraint anywhere it's consumed.
export const COLOR_ROLES = [
  "neutral",
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "attention",
  "error",
  "danger",
  "highlight",
] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

// `ColorRole | (string & {})` — NOT plain `string` and NOT a strict `ColorRole`
// union. `ThemeInput.colors` being a generic Record (see above) means a strict
// union would reject valid custom-role code. But every prior version of this
// type (`keyof ThemeInput["colors"]`, which TS widens to plain `string` for a
// generic Record) gave editors/AI codegen ZERO signal about the 10 built-in
// role names — a typo'd role (e.g. "accent", not a real role) type-checked fine
// and only surfaced as an unhandled runtime throw from themeColor(). The
// `string & {}` branch preserves full acceptance of arbitrary custom-role
// strings while `ColorRole` still ranks first in autocomplete/hover — this is
// the standard "loose autocomplete" pattern (TS does not support "reject unknown
// literals but allow an explicit escape hatch" any more precisely than this).
export type ThemeColor = ColorRole | (string & {});
