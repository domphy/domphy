import { ElementNode, Listener } from '@domphy/core';

declare const ElementSizes: string[];
type ElementSize = typeof ElementSizes[number];
declare function themeSize(object: ElementNode | Listener, size?: ElementSize): string;

declare const ElementTones: string[];
type ElementTone = typeof ElementTones[number];
declare function contextColor(object: ElementNode | Listener, tone?: ElementTone, color?: string): string;
declare function themeColor(object: ElementNode | Listener | null, tone?: ElementTone, color?: string): string;

type ThemeInput = {
    direction: "lighten" | "darken";
    colors: Record<string, string[]>;
    baseTones: Record<string, number>;
    fontSizes: string[];
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
declare function createDark(source: ThemeInput): ThemeInput;
declare function themeTokens(name: string): Record<string, any>;
declare function themeVars(): ThemeVars;
declare function themeCSS(): string;
declare function themeApply(el?: HTMLStyleElement): void;
declare function themeSpacing(n: number): string;
declare function themeName(object: ElementNode | Listener): string;
type ThemeColor = keyof ThemeInput["colors"];

export { type ElementSize, type ElementTone, type ThemeColor, contextColor, createDark, getTheme, setTheme, themeApply, themeCSS, themeColor, themeName, themeSize, themeSpacing, themeTokens, themeVars };
