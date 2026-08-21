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
//                               ~4.1-4.2:1 on an edge surface — below WCAG AA
//                               4.5:1 for normal text by design; essential text
//                               must use "text", never "muted")
//   text           -> shift-9  default/primary text (>= 4.5:1 on any edge
//                               surface, every built-in role — the K=9 span)
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

export type ElementTone = (typeof ElementTones)[number];

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

function _themeTone(
  object: ElementNode | Listener,
  tone: ElementTone = "inherit",
): number {
  return offsetTone(contextTone(object), tone);
}

function biasContext(context: number, direction: string, bias: number): number {
  if (bias <= 0) return context;
  if (direction === "lighten" && context === 0) return bias;
  if (direction === "darken" && context === TONE_STEPS - 1)
    return TONE_STEPS - 1 - bias;
  return context;
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
    if (tone === "base") return colors[requireBaseTone("light", themeColor)];
    return colors[offsetTone(0, tone)];
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
  let resultTone: number;
  if (tone === "base") {
    resultTone = requireBaseTone(name, themeColor);
  } else {
    const theme = getTheme(name);
    const context = biasContext(
      contextTone(object),
      theme.direction,
      theme.darkBias,
    );
    resultTone = offsetTone(context, tone);
  }
  const resultColor = colors[resultTone];

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

  if (!object) {
    if (tone === "base")
      return colorTokens[requireBaseTone("light", colorName)];
    return colorTokens[offsetTone(0, tone)];
  }

  let resultTone: number;
  if (tone === "base") {
    resultTone = requireBaseTone(name, colorName);
  } else {
    const theme = getTheme(name);
    const context = biasContext(
      contextTone(object),
      theme.direction,
      theme.darkBias,
    );
    resultTone = offsetTone(context, tone);
  }

  return colorTokens[resultTone];
}

/**
 * First-class non-reactive token resolution: returns the resolved token value
 * (e.g. "#4a7ff4") for a NAMED theme, with no ElementNode/listener context
 * involved. This is the explicit form of `themeColorToken(null, …)` — use it
 * at design time (docs, theme builders, MCP tooling) or when a third-party API
 * requires a concrete hex/rgb string.
 *
 * Tone resolution starts from context tone 0 (the theme's own edge), so there
 * is no dataTone/dataTheme inheritance — pass the exact `tone` you want.
 * `theme` defaults to "light" (same default as the null-listener form, but
 * here it is a visible, named choice rather than a silent fallback).
 *
 * The returned value is baked at call time — it does NOT follow later theme
 * switches. For reactive, context-aware colors use themeColor() with a
 * listener instead.
 */
export function resolveThemeColor(
  options: {
    /** Theme name registered via setTheme() ("light", "dark", …). Default: "light". */
    theme?: string;
    /** Tone to resolve. Default: "inherit" (context tone 0). */
    tone?: ElementTone;
    /** Color role. "inherit" maps to "neutral". Default: "inherit". */
    color?: string;
  } = {},
): string {
  const { theme = "light", tone = "inherit", color = "inherit" } = options;
  const colorName = color === "inherit" ? "neutral" : color;
  const tokens = themeTokens(theme);
  const colorTokens = tokens[colorName];
  if (!colorTokens) {
    throw Error(`color "${colorName}" not found on theme "${theme}"`);
  }
  if (tone === "base") return colorTokens[requireBaseTone(theme, colorName)];
  return colorTokens[offsetTone(0, tone)];
}
