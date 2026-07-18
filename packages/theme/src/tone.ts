import type { ElementNode, Listener } from "@domphy/core";
import light from "./light.js";
import { getTheme, themeName, themeTokens, themeVars } from "./theme.js";

const TONE_STEPS = light.colors.neutral.length;

// Semantic tone aliases, resolved through the shift-N machinery below so they
// stay context-aware (dataTone) and correct in both light and dark themes.
// Mapping derived from stock @domphy/ui patch usage (packages/ui/src/patches)
// and cross-checked against consumer usage frequency:
//   surface        -> shift-1  subtle raised background (e.g. inputFile drop zone)
//   hover          -> shift-2  hover/active background (e.g. button, menu, list)
//   border         -> shift-3  subtle hairline divider (e.g. card footer separator)
//   border-strong  -> shift-4  control outline (e.g. button, input, card boundary)
//   muted          -> shift-8  secondary/disabled text
//   text           -> shift-9  default/primary text
const ToneAliases: Record<string, string> = {
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
    if (tone === "base") return colors[getTheme("light").baseTones[themeColor]];
    return colors[offsetTone(0, tone)];
  }

  const name = themeName(object);
  let resultTone: number;
  if (tone === "base") {
    resultTone = getTheme(name).baseTones[themeColor];
  } else {
    const theme = getTheme(name);
    const context = biasContext(
      contextTone(object),
      theme.direction,
      theme.darkBias,
    );
    resultTone = offsetTone(context, tone);
  }
  const colors = themeVars()[themeColor];
  if (!colors) {
    throw Error(`color "${themeColor}" not found on theme "${name}"`);
  }
  const resultColor = colors[resultTone];

  return resultColor;
}

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
      return colorTokens[getTheme("light").baseTones[colorName]];
    return colorTokens[offsetTone(0, tone)];
  }

  let resultTone: number;
  if (tone === "base") {
    resultTone = getTheme(name).baseTones[colorName];
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
