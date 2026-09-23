export type ThemeInput = {
  direction: "lighten" | "darken";
  colors: Record<string, string[]>;
  baseTones: Record<string, number>;
  fontSizes: string[];
  /** Named font stacks, e.g. `{ "sans-serif": "system-ui, …", monospace: "…" }`. */
  fontFamilies: Record<string, string>;
  /** Named font weights, e.g. `{ medium: "500" }`. */
  fontWeights: Record<string, string>;
  /** Named letter-spacing steps, e.g. `{ tight: "-0.025em" }`. */
  letterSpacings: Record<string, string>;
  densities: number[];
  darkBias: number;
  custom: Record<string, string | number>;
};

// Arrays are ATOMIC here: a ramp/fontSizes/densities list may be omitted, but
// never handed over with holes — recursing into them would type every ramp as
// `(string | undefined)[]` and push undefined-checks onto every consumer for a
// state `validateTheme()` rejects anyway.
type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends readonly unknown[]
    ? T[P]
    : T[P] extends object
      ? PartialDeep<T[P]>
      : T[P];
};

export type PartialThemeInput = PartialDeep<ThemeInput>;

export type ThemeVars = {
  [E in keyof ThemeInput["colors"]]: Record<number, string>;
} & {
  fontSizes: string[];
  fontFamilies: Record<string, string>;
  fontWeights: Record<string, string>;
  letterSpacings: Record<string, string>;
  custom: Record<string, string>;
};
