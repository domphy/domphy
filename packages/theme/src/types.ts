export type ThemeInput = {
  direction: "lighten" | "darken",
  colors: Record<string, string[]>,
  baseTones: Record<string, number>,
  fontSizes: string[],
  densities: number[],
  darkBias: number,
  custom: Record<string, string | number>,
}

type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

export type PartialThemeInput = PartialDeep<ThemeInput>;

export type ThemeVars = {
  [E in keyof ThemeInput["colors"]]: Record<number, string>;
} & {
  fontSizes: string[];
  custom: Record<string, string>;
}
