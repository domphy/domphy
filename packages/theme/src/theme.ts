import type { ElementNode, Listener } from "@domphy/core";
import light from "./light.js";
import type { ThemeInput, ThemeVars } from "./types.js";

// JSON clone (not structuredClone) so the build runs in older embedded
// browsers like SketchUp 2022's CEF, which predates Chromium 98.
// ThemeInput is plain JSON (no Map/Set/Date/typed arrays).
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// Custom-token keys may contain CSS-illegal characters (e.g. "radius/sm/lg").
// Map every illegal char to "_" so the declared property name and the var()
// reference always agree and stay valid CSS.
const escapeKey = (k: string): string => k.replace(/[^a-zA-Z0-9_-]/g, "_");

const themes: Record<string, ThemeInput> = {
  light: clone(light),
  dark: createDark(light),
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

function validateTheme(partial: Partial<ThemeInput>): void {
  for (const key in partial) {
    if (!Object.keys(light).includes(key as keyof ThemeInput)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
  if (partial.fontSizes && !Array.isArray(partial.fontSizes)) {
    throw new Error(`fontSize must be array of string`);
  }
  if (partial.densities) {
    if (
      !Array.isArray(partial.densities) ||
      partial.densities.some((v) => typeof v !== "number")
    ) {
      throw new Error(`densities must be array of number`);
    }
  }
  if ("custom" in partial) {
    const custom = partial.custom!;
    if (typeof custom !== "object" || custom === null) {
      throw new Error(`Invalid custom property: must be an object`);
    }
  }
}

// --- Deep Merge ---

function deepMerge(target: any, source: any): void {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      target[key] ??= {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// --- Builders (pure functions) ---

function buildThemeCSS(name: string, input: ThemeInput): string {
  const styles: Record<string, string | number> = {};
  const toneSteps = colorSteps(input);

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const colorName in input.colors) {
        [...Array(toneSteps).keys()].forEach(
          (i) => (styles[`--${colorName}-${i}`] = input.colors[colorName][i]),
        );
      }
    } else if (key === "fontSizes") {
      [...Array(8).keys()].forEach(
        (i) => (styles[`--fontSize-${i}`] = input.fontSizes[i]),
      );
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
  return `[data-theme="${name}"] {\n${text}}`;
}

// --- Public API ---

export function getTheme(name: string): ThemeInput {
  if (!themes[name]) throw Error(`Theme "${name}" not found`);
  return themes[name];
}

export function setTheme(name: string, input: Partial<ThemeInput>): void {
  validateTheme(input);
  if (!themes[name]) themes[name] = clone(light);
  deepMerge(themes[name], input);
  // Structure/values may have changed → drop memoized derivations.
  _themeVarsCache = null;
  _themeTokensCache.clear();
}

function createDark(source: ThemeInput): ThemeInput {
  const dark = clone(source);
  dark.direction = "lighten";
  for (const name in dark.colors) {
    dark.colors[name].reverse();
    dark.baseTones[name] = dark.colors[name].length - 1 - dark.baseTones[name];
  }
  return dark;
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
        const colorTones = {} as Partial<Record<number, string>>;
        [...Array(toneSteps).keys()].forEach(
          (i) => (colorTones[i] = `var(--${name}-${i})`),
        );
        theme[name] = colorTones as Record<number, string>;
      }
    } else if (key === "fontSizes") {
      theme.fontSizes = [...Array(8).keys()].map((i) => `var(--fontSize-${i})`);
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

export function themeCSS(): string {
  return Object.entries(themes)
    .map(([name, input]) => buildThemeCSS(name, input))
    .join("\n");
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
  return `${n / 4}em`;
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

export type ThemeColor = keyof ThemeInput["colors"];
