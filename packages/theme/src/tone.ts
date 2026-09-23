import type { ElementNode, Listener } from "@domphy/core";
import {
  getTheme,
  TONE_STEPS,
  themeName,
  themeTokens,
  themeVars,
} from "./theme.js";

// Semantic tone aliases, resolved through the shift-N machinery below so they
// stay context-aware (dataTone) and correct in both light and dark themes.
// Mapping derived from stock @domphy/ui patch usage (packages/ui/src/patches)
// and cross-checked against consumer usage frequency:
//   surface        -> shift-1  subtle raised background (e.g. inputFile drop zone)
//   hover          -> shift-2  hover/active background (e.g. button, menu, list)
//   border         -> shift-3  subtle hairline divider (e.g. card footer separator)
//   border-strong  -> shift-4  control outline (e.g. button, input, card boundary)
//   muted          -> shift-8  secondary/disabled text (de-emphasis ONLY:
//                               always a step short of "text", and BELOW the
//                               WCAG AA 4.5:1 normal-text floor BY DESIGN —
//                               measured across all 10 built-in roles x the 8
//                               edge anchors x both themes, 40 of 160
//                               combinations fail AA, worst 3.55:1 (light,
//                               highlight, shift-0). Essential text must use
//                               "text", never "muted" — enforced by
//                               packages/ui/tests/contrast-states.test.ts's
//                               MUTED_BAND_EXEMPT allowlist, which requires a
//                               named reason for every patch that paints
//                               muted-band color and fails everything else
//                               below AA.
//   text           -> shift-9  default/primary text (>= 4.5:1 on any edge
//                               surface, every built-in role — the K=9 span;
//                               measured worst case 4.53:1, across all 10
//                               built-in roles x the 8 edge anchors x both
//                               themes. Also the tone input patches paint
//                               ::placeholder with — SC 1.4.3 does not exempt
//                               an editable field, so the hint sits at the
//                               same AA floor as body text.)
//
// Exported as a value (like ElementTones below) so tooling — @domphy/doctor,
// the MCP server — can validate/resolve alias names without hand-duplicating
// the map. Treat it as read-only.
export const ToneAliases: Record<string, string> = {
  surface: "shift-1",
  hover: "shift-2",
  border: "shift-3",
  "border-strong": "shift-4",
  muted: "shift-8",
  text: "shift-9",
};

// Exported as a value (not just a type) so tooling — @domphy/doctor, the MCP
// server, generated `tones.json` — can validate tone names without parsing TS.
export const ElementTones = ["inherit", "base", ...Object.keys(ToneAliases)];

[...Array(TONE_STEPS).keys()].forEach((i) => {
  ElementTones.push(`decrease-${i}`);
  ElementTones.push(`increase-${i}`);
  ElementTones.push(`shift-${i}`);
});

// A tone is normally one of the named grammar strings above, but offsetTone()
// also accepts a raw ramp index (0…TONE_STEPS-1) and passes it through
// untouched, bypassing the shift-N grammar's own biasContext()/shiftTone()
// folding entirely. textToneOn()'s context-aware overload relies on this to
// land an EXACT CONTRAST_SPAN gap that the relative shift-N grammar cannot
// always express (see its docblock).
export type ElementTone = (typeof ElementTones)[number] | number;

/**
 * The ramp's contrast span K: the index distance at which *every* pair of steps
 * clears WCAG 4.5:1, at every position on the ramp, for every built-in role in
 * both themes.
 *
 * DERIVED (DESIGN.md §2.1): K = ⌈λ·(N-1)⌉ with λ ≈ 0.501 (the WCAG 4.5:1
 * boundary solved from both ends of the CIE 1976 L*↔Y transform) and
 * N = TONE_STEPS = 18 → K = 9. Pinned end-to-end by
 * `packages/theme/tests/contrast.test.ts`, which also measures why 9 is the
 * floor and not 8: across the 20 built-in role/theme ramps the worst pair at
 * distance 9 is 4.53:1, at distance 8 it is 3.55:1.
 */
export const CONTRAST_SPAN = 9;

/**
 * The tone that reads as body text on a surface painted at `shift-<surface>`.
 *
 * `"text"` (shift-9) is only AA-safe against an *unshifted* surface. An
 * interactive control that paints its own fill moves that surface — hover +2,
 * pressed +2/+3, selected +3 — while an absolute `"text"` label stays put, so
 * the gap collapses to 7 or 6 (measured 3.58:1 for shift-9 on a shift-2 hover
 * fill, default neutral ramp, light). Pair every shifted fill with
 * `textToneOn(fill)` so the K-step gap travels with it; `shift-N` resolves
 * against the same `dataTone` context as the fill, so this holds on light and
 * dark surface anchors alike.
 *
 * The K steps are taken *away* from the fill on whichever side stays on the
 * ramp: `shift-(fill + K)` while that is a real step, otherwise
 * `shift-(fill - K)`. A fill deep into the ramp (a chart wedge at `shift-12`,
 * a dark solid button) must carry a LIGHTER label, not a darker one that does
 * not exist — the old unconditional `fill + K` produced `shift-21`, which is
 * not a tone name and made `themeColor()` throw.
 *
 * Domain: `surfaceShift` is clamped to a real ramp step, so every input yields
 * a valid tone.
 *
 * PASS THE LISTENER/NODE WHEN YOU HAVE ONE (the `object` param — the same
 * value `themeColor()`'s first argument takes). Without it, the K-step gap
 * is computed BLIND to the theme's `darkBias` and can silently clamp short: a
 * fill at `shift-8` under the built-in dark theme actually resolves to ramp
 * step 9 (`darkBias` lifts the ambient context off 0), whose farthest
 * reachable step is only 8 away — measured 3.55:1, below AA. `object` fixes
 * this exactly: it resolves the fill's REAL post-bias ramp step the same way
 * `themeColor()` will, then returns an absolute ramp index (still a valid
 * `ElementTone` — `offsetTone()` passes a number through untouched, skipping
 * the shift-N grammar's own re-biasing) exactly `CONTRAST_SPAN` steps away.
 * That is the only way to express "K steps away" here: a fill folded onto a
 * `darkBias`-lifted edge cannot reach the far side via a *relative* shift-N
 * at all, because shift-N's fold direction is fixed by the ambient base, not
 * by the label — no tone NAME can do it, only a literal ramp index can.
 *
 * @example
 * "&:hover": {
 *   backgroundColor: (l) => themeColor(l, "hover", color),         // shift-2
 *   color: (l) => themeColor(l, textToneOn(2, l), color),          // exact K=9 gap, any theme
 * }
 */
export function textToneOn(
  surfaceShift: number,
  object: ElementNode | Listener | null = null,
): ElementTone {
  const fill = Math.max(0, Math.min(TONE_STEPS - 1, Math.round(surfaceShift)));

  if (!object) {
    // No context: best-effort estimate in UNBIASED ramp space. Exact when the
    // runtime resolves this tone from context 0 with no darkBias (the light
    // theme's default surface); on a darkBias-lifted context (the built-in
    // dark theme) it can fall short by up to `darkBias` steps — pass `object`
    // to close that gap exactly.
    const away = fill + CONTRAST_SPAN;
    return `shift-${away <= TONE_STEPS - 1 ? away : fill - CONTRAST_SPAN}`;
  }

  const theme = getTheme(themeName(object));
  const base = biasContext(
    contextTone(object),
    theme.direction,
    theme.darkBias,
  );
  const fillStep = shiftTone(base, fill);
  const up = fillStep + CONTRAST_SPAN;
  const down = fillStep - CONTRAST_SPAN;
  if (up <= TONE_STEPS - 1) return up;
  if (down >= 0) return down;
  // Ramp too short for a full K-step gap in either direction from this fill
  // (unreachable at TONE_STEPS=18/CONTRAST_SPAN=9 — needs TONE_STEPS <
  // 2*CONTRAST_SPAN). Clamp to whichever edge is farther from the fill.
  return fillStep <= (TONE_STEPS - 1) / 2 ? TONE_STEPS - 1 : 0;
}

/**
 * The ramp tone to paint text ON TOP OF a shape filled at `fillTone` — a pie
 * wedge, a radial arc, anything painted with a fixed, saturated tone rather
 * than an ambient surface — as whichever END of the ramp (`shift-0` or
 * `shift-${TONE_STEPS - 1}`) is farther from the fill. A non-`shift-N` tone
 * (an alias, a custom string) has no ramp position to measure from and falls
 * back to the dark end.
 *
 * Deliberately NOT `textToneOn()`: that one returns the tone exactly
 * `CONTRAST_SPAN` steps away — the AA floor, right for a label that must
 * track a moving hover/pressed fill. A chart label sits on a fixed wedge, and
 * upstream chart libraries (shadcn/Recharts) paint it `fill-white` /
 * `fill-background` — a crisp end-of-ramp label, not a mid-ramp grey.
 *
 * DERIVED, not a new magic threshold: for any ramp step `s` in
 * `0..TONE_STEPS-1`, the farther true edge is `max(s, TONE_STEPS-1-s)` steps
 * away, whose minimum over every `s` is `CONTRAST_SPAN` exactly (the same K
 * the ramp's contrast span is built around — see `CONTRAST_SPAN`'s own
 * derivation above). The farther edge therefore always clears AA — but only
 * when measured against `fillTone`'s REAL resolved ramp step, which is why
 * this needs `object` exactly like `textToneOn()` does (see its docblock):
 * "shift-N" is fold-relative to the ambient context, not a literal index, and
 * the built-in themes' edge `darkBias` shifts that fold's origin off 0. Measured
 * without `object` on the built-in dark theme: `textToneOnRampEdge("shift-8")`
 * picked `shift-17`, but "shift-8" itself resolves to ramp step 9 there
 * (`darkBias` = 1), leaving only an 8-step gap — 3.88:1 worst role, below AA.
 * `object` resolves `fillTone` to its real step first, then returns a literal
 * ramp index (0 or `TONE_STEPS - 1`) rather than a `shift-N` name, so
 * `offsetTone()` passes it straight through instead of folding it again.
 *
 * Without `object`, falls back to the same unbiased-space estimate
 * `textToneOn()`'s no-context form uses — exact on an unshifted light-theme
 * surface, can fall short by up to the theme's `darkBias` otherwise.
 *
 * @example
 * // a pie wedge filled at PIE_CHART_PALETTE[i] (a "shift-N" tone)
 * color: (l) => themeColor(l, textToneOnRampEdge(wedgeTone, l), seriesColor)
 */
export function textToneOnRampEdge(
  fillTone: string,
  object: ElementNode | Listener | null = null,
): ElementTone {
  const match = /^shift-(\d+)$/.exec(fillTone);
  const dark = `shift-${TONE_STEPS - 1}`;
  if (!match) return dark;
  const fillN = Number(match[1]);

  if (!object) {
    return fillN + CONTRAST_SPAN <= TONE_STEPS - 1 ? dark : "shift-0";
  }

  const theme = getTheme(themeName(object));
  const origin = biasContext(
    contextTone(object),
    theme.direction,
    theme.darkBias,
  );
  const fillStep = shiftTone(origin, fillN);
  return TONE_STEPS - 1 - fillStep >= fillStep ? TONE_STEPS - 1 : 0;
}

function adjustTone(tone: number, level: number): number {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  let newIndex = tone + level;
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}

function shiftTone(tone: number, level: number): number {
  if (tone < 0 || tone > TONE_STEPS - 1) return tone;
  const midpoint = Math.floor((TONE_STEPS - 1) / 2);
  let newIndex = tone <= midpoint ? tone + level : tone - level;
  // Clamp overshoot to the near boundary. (Negating an out-of-range index, as
  // a prior version did, flips it to the opposite extreme — e.g. shift past
  // the dark end would land on the lightest tone.)
  newIndex = Math.max(0, Math.min(TONE_STEPS - 1, newIndex));
  return newIndex;
}

function offsetTone(originTone: number, tone: ElementTone = "inherit"): number {
  if (typeof tone === "number") return tone;

  if (tone === "inherit") return originTone;

  if (!ElementTones.includes(tone!)) {
    throw Error(`tone name "${tone}" invalid`);
  }

  if (tone in ToneAliases) {
    tone = ToneAliases[tone];
  }

  if (tone.startsWith("increase-")) {
    const offset = parseInt(tone.replace("increase-", ""), 10);
    return adjustTone(originTone, offset);
  } else if (tone.startsWith("decrease-")) {
    const offset = parseInt(tone.replace("decrease-", ""), 10);
    return adjustTone(originTone, -offset);
  } else if (tone.startsWith("shift-")) {
    const offset = parseInt(tone.replace("shift-", ""), 10);
    return shiftTone(originTone, offset);
  } else {
    return originTone;
  }
}

function contextTone(object: ElementNode | Listener | null): number {
  if (!object) return 0;
  const elementNode = (
    typeof object === "function" ? object.elementNode : object
  ) as ElementNode;
  let node: ElementNode = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTone"))) {
    node = node.parent as ElementNode;
  }

  let tone = 0;

  if (node && node.attributes && node.attributes.has("dataTone")) {
    tone = offsetTone(tone, node.attributes.get("dataTone"));
    typeof object === "function" &&
      node.attributes.addListener("dataTone", object);
  }
  return tone;
}

function biasContext(context: number, direction: string, bias: number): number {
  if (bias <= 0) return context;
  if (direction === "lighten" && context === 0) return bias;
  if (direction === "darken" && context === TONE_STEPS - 1)
    return TONE_STEPS - 1 - bias;
  return context;
}

/**
 * The one piece of tone arithmetic every resolver runs: given a surface
 * `context` (the ramp index the nearest `dataTone` ancestor painted) and a
 * requested `tone`, return the ramp index the value lands on.
 *
 * `themeColor`, `themeColorToken`, `resolveThemeColor` and `resolveToneStep`
 * all route through here so a static analyzer resolving a tone off-DOM gets
 * the same number the runtime paints — including the theme's edge `darkBias`
 * and the clamping at 0 / TONE_STEPS - 1 that makes a shifted surface resolve
 * differently from an unshifted one.
 */
function toneIndexAt(
  themeName: string,
  context: number,
  tone: ElementTone,
  colorName: string,
): number {
  if (tone === "base") return requireBaseTone(themeName, colorName);
  const theme = getTheme(themeName);
  return offsetTone(
    biasContext(context, theme.direction, theme.darkBias),
    tone,
  );
}

function requireBaseTone(theme: string, role: string): number {
  const index = getTheme(theme).baseTones[role];
  if (index === undefined) {
    throw new Error(
      `baseTones.${role} is not defined on theme "${theme}" — set a base tone index (0–${TONE_STEPS - 1}) via setTheme("${theme}", { baseTones: { ${role}: <index> } }) so themeColor(..., "base", "${role}") can resolve`,
    );
  }
  return index;
}

export function themeColor(
  object: ElementNode | Listener | null,
  tone: ElementTone = "inherit",
  color: string = "inherit",
): string {
  const themeColor = color === "inherit" ? "neutral" : color;

  if (!object) {
    // No node context implies the light theme (themeVars reads getTheme("light")).
    const colors = themeVars()[themeColor];
    if (!colors) {
      throw Error(`color "${themeColor}" not found on theme "light"`);
    }
    return colors[toneIndexAt("light", 0, tone, themeColor)];
  }

  const name = themeName(object);
  const colors = themeVars()[themeColor];
  if (!colors) {
    // themeVars() is keyed on the "light" theme STRUCTURE — it emits the
    // shared var(--…) baseline every theme's CSS block must provide. A role
    // registered only on another theme (setTheme("mytheme", { colors: … }))
    // is invisible here, so name the baseline as the failure point, not the
    // node's theme.
    if (name === "light") {
      throw Error(`color "${themeColor}" not found on theme "light"`);
    }
    throw Error(
      `color "${themeColor}" not found on the "light" theme (required by node theme "${name}") — themeColor() var references are keyed on the "light" theme structure; register the role on "light" as well (e.g. setTheme("light", { colors: { ${themeColor}: … } })) so the shared CSS-var baseline includes it`,
    );
  }
  const resultColor =
    colors[toneIndexAt(name, contextTone(object), tone, themeColor)];

  return resultColor;
}

/**
 * Resolved-value form of {@link themeColor}: returns the concrete token value
 * (e.g. "#4a7ff4") instead of a `var(--…)` CSS reference.
 *
 * ⚠ BACK-COMPAT TRAP: passing `null` as the object silently resolves against
 * the **"light"** theme — the value is baked at design time and will NOT
 * follow the user's active theme or dark mode. Many call sites rely on this
 * (it cannot change without breaking them), so be deliberate: if you mean
 * "resolve for a specific named theme", say so explicitly with
 * {@link resolveThemeColor} instead.
 */
export function themeColorToken(
  object: ElementNode | Listener | null,
  tone: ElementTone = "inherit",
  color: string = "inherit",
): string {
  const colorName = color === "inherit" ? "neutral" : color;
  const name = object ? themeName(object as ElementNode | Listener) : "light";
  const tokens = themeTokens(name);
  const colorTokens = tokens[colorName];
  if (!colorTokens) {
    throw Error(`color "${colorName}" not found on theme "${name}"`);
  }

  if (!object) return colorTokens[toneIndexAt("light", 0, tone, colorName)];

  return colorTokens[toneIndexAt(name, contextTone(object), tone, colorName)];
}

/**
 * First-class non-reactive token resolution: returns the resolved token value
 * (e.g. "#4a7ff4") for a NAMED theme, with no ElementNode/listener context
 * involved. This is the explicit form of `themeColorToken(null, …)` — use it
 * at design time (docs, theme builders, MCP tooling) or when a third-party API
 * requires a concrete hex/rgb string.
 *
 * Tone resolution starts from the surface named by `surface` — the `dataTone`
 * the nearest ancestor would have declared — defaulting to the theme's own
 * edge. There is no live dataTone/dataTheme inheritance: pass the context you
 * want. `theme` defaults to "light" (same default as the null-listener form,
 * but here it is a visible, named choice rather than a silent fallback).
 *
 * The returned value is baked at call time — it does NOT follow later theme
 * switches. For reactive, context-aware colors use themeColor() with a
 * listener instead.
 */
export function resolveThemeColor(
  options: {
    /** Theme name registered via setTheme() ("light", "dark", …). Default: "light". */
    theme?: string;
    /** Tone to resolve. Default: "inherit" (resolves to `surface`). */
    tone?: ElementTone;
    /** Color role. "inherit" maps to "neutral". Default: "inherit". */
    color?: string;
    /** `dataTone` of the surface to resolve against. Default: "inherit" (the theme edge). */
    surface?: ElementTone;
  } = {},
): string {
  const colorName =
    !options.color || options.color === "inherit" ? "neutral" : options.color;
  const theme = options.theme ?? "light";
  const colorTokens = themeTokens(theme)[colorName];
  if (!colorTokens) {
    throw Error(`color "${colorName}" not found on theme "${theme}"`);
  }
  return colorTokens[resolveToneStep(options)];
}

/**
 * The ramp index (0 … TONE_STEPS-1) a tone resolves to — the numeric half of
 * {@link resolveThemeColor}, for tooling that needs the step rather than the
 * token: contrast checks, `@domphy/doctor` rules, theme editors.
 *
 * Unlike reading a `themeColor()` result off a node-less listener (which is
 * always context 0), this resolves against a KNOWN surface: pass the `dataTone`
 * the element sits on as `surface` and the answer matches what the browser
 * paints, clamping and edge bias included.
 *
 * @example
 * // On a `dataTone: "shift-17"` surface, "shift-9" does NOT land on step 9:
 * resolveToneStep({ surface: "shift-17", tone: "shift-9" })  // → 7
 * resolveToneStep({ surface: "shift-17", tone: "increase-2" }) // → 17 (clamped)
 */
export function resolveToneStep(
  options: {
    /** Theme name registered via setTheme() ("light", "dark", …). Default: "light". */
    theme?: string;
    /** `dataTone` of the surface to resolve against. Default: "inherit" (the theme edge). */
    surface?: ElementTone;
    /** Tone to resolve. Default: "inherit" (resolves to `surface`). */
    tone?: ElementTone;
    /** Color role — only consulted for tone "base". Default: "inherit" → "neutral". */
    color?: string;
  } = {},
): number {
  const {
    theme = "light",
    surface = "inherit",
    tone = "inherit",
    color = "inherit",
  } = options;
  return toneIndexAt(
    theme,
    offsetTone(0, surface),
    tone,
    color === "inherit" ? "neutral" : color,
  );
}
