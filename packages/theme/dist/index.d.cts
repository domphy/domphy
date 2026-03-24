import { ElementNode, Listener } from '@domphy/core';

declare const ElementSizes: string[];
type ElementSize = typeof ElementSizes[number];
declare function themeSize(object: ElementNode | Listener, size?: ElementSize): string;

declare const ElementDensities: string[];
type ElementDensity = typeof ElementDensities[number];
declare function themeDensity(object: ElementNode | Listener | null): number;

declare const ElementTones: string[];
type ElementTone = typeof ElementTones[number];
declare function themeColor(object: ElementNode | Listener | null, tone?: ElementTone, color?: string): string;
declare function themeColorToken(object: ElementNode | Listener | null, tone?: ElementTone, color?: string): string;

type ThemeInput = {
    direction: "lighten" | "darken";
    colors: Record<string, string[]>;
    baseTones: Record<string, number>;
    fontSizes: string[];
    densities: number[];
    darkBias: number;
    custom: Record<string, string | number>;
};
type ThemeVars = {
    [E in keyof ThemeInput["colors"]]: Record<number, string>;
} & {
    fontSizes: string[];
    custom: Record<string, string>;
};

declare function getTheme(name: string): ThemeInput;
declare function setTheme(name: string, input: Partial<ThemeInput>): void;
declare function themeTokens(name: string): Record<string, any>;
declare function themeVars(): ThemeVars;
declare function themeCSS(): string;
declare function themeApply(el?: HTMLStyleElement): void;
declare function themeSpacing(n: number): string;
declare function themeName(object: ElementNode | Listener): string;
type ThemeColor = keyof ThemeInput["colors"];

export { type ElementDensity, type ElementSize, type ElementTone, type ThemeColor, getTheme, setTheme, themeApply, themeCSS, themeColor, themeColorToken, themeDensity, themeName, themeSize, themeSpacing, themeTokens, themeVars };
