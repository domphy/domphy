import { ElementNode, Listener } from "@domphy/core";
import { ThemeInput, ThemeVars } from "./types.js";
import light from "./light.js";

const themes: Record<string, ThemeInput> = {
  light: JSON.parse(JSON.stringify(light)),
  dark: createDark(light),
};

// --- Validation ---

function validateTheme(partial: Partial<ThemeInput>): void {
  for (let key in partial) {
    if (!Object.keys(light).includes(key as keyof ThemeInput)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
  if (partial.fontSizes && !Array.isArray(partial.fontSizes)) {
    throw new Error(`fontSize must be array of string`);
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

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const colorName in input.colors) {
        [...Array(12).keys()].forEach(i =>
          styles[`--${colorName}-${i}`] = input.colors[colorName][i]
        );
      }
    } else if (key === "fontSizes") {
      [...Array(8).keys()].forEach(i =>
        styles[`--fontSize-${i}`] = input.fontSizes[i]
      );
    } else {
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          styles[`--${key}-${k.replace("/", "_")}`] = (value as Record<string, string>)[k];
        }
      }
    }
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
  if (!themes[name]) themes[name] = structuredClone(light);
  deepMerge(themes[name], input);
}

export function createDark(source: ThemeInput): ThemeInput {
  let dark = structuredClone(source)
  dark.direction = "lighten"
  for (let name in dark.colors) {
    dark.colors[name].reverse()
    dark.baseTones[name] = 12 - 1 - dark.baseTones[name]
  }
  return dark
}

export function themeTokens(name: string): Record<string, any> {
  let input = getTheme(name)
  let tokens: Record<string, any> = {};

  for (const key in input) {
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const name in input.colors) {
        let colorTones = {} as Partial<Record<number, string>>;
        [...Array(12).keys()].forEach(i => colorTones[i] = input.colors[name][i]);
        tokens[name] = colorTones as Record<number, string>;
      }
    } else if (key === "fontSizes") {
      tokens.fontSizes = input.fontSizes;
    } else {
      tokens[key] = {} as any;
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          tokens[key][k] = (value as Record<string, string>)[k];
        }
      }
    }
  }

  return tokens;
}

export function themeVars(): ThemeVars {
  let input = getTheme("light")
  let theme = {} as ThemeVars;

  for (const key in input) {
    const section = key as keyof ThemeVars;
    const value = input[key as keyof ThemeInput];

    if (key === "colors") {
      for (const name in input.colors) {
        let colorTones = {} as Partial<Record<number, string>>;
        [...Array(12).keys()].forEach(i => colorTones[i] = `var(--${name}-${i})`);
        theme[name] = colorTones as Record<number, string>;
      }
    } else if (key === "fontSizes") {
      theme.fontSizes = [...Array(8).keys()].map(i => `var(--fontSize-${i})`);
    } else {
      theme[section] = {} as ThemeVars[typeof section];
      if (typeof value === "object" && value !== null) {
        for (const k in value) {
          (theme[section] as Record<string, string>)[k] = `var(--${section as string}-${k.replace("/", "_")})`;
        }
      }
    }
  }

  return theme;
}

export function themeCSS(): string {
  return Object.entries(themes)
    .map(([name, input]) => buildThemeCSS(name, input))
    .join("\n")
}

export function themeApply(el?: HTMLStyleElement): void {
  if (typeof document === "undefined") return
  if (el) {
    el.textContent = themeCSS()
    return
  } else {
    el = document.getElementById("domphy-themes") as HTMLStyleElement
      ?? Object.assign(document.createElement("style"), { id: "domphy-themes" })
    el.textContent = themeCSS()
    document.head.appendChild(el)
  }

}

export function themeSpacing(n: number) {
  return n / 4 + "em"
}

export function themeName(object: ElementNode | Listener) {
  let elementNode = (typeof object == "function" ? object.elementNode : object) as ElementNode
  let node: ElementNode = elementNode;
  while (node && (!node.attributes || !node.attributes.get("dataTheme"))) {
    node = node.parent as ElementNode
  }

  let themeName = "light"

  if (node.attributes && node.attributes.has("dataTheme")) {
    themeName = node.attributes.get("dataTheme")
    typeof object == "function" && node.attributes.onChange("dataTheme", object)
  }
  return themeName
}

export type ThemeColor = keyof ThemeInput["colors"]