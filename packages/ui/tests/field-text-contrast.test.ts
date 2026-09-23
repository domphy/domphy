// @vitest-environment jsdom
//
// Two external truth sources, no expected value read off the code:
//
//  1. WCAG 2.1 SC 1.4.3 (Contrast Minimum) — the relative-luminance ratio
//     formula, 4.5:1 for normal text. Placeholder text is in scope: 1.4.3's
//     only relevant exception is "inactive user interface components" and an
//     editable field is not inactive.
//  2. CIE ΔE*ab — the 1976 CIELAB difference metric. The commonly cited
//     just-noticeable difference is ~2.3 (Mahy, Van Eycken & Oosterlinck,
//     "Evaluation of Uniform Colour Spaces developed after the adoption of
//     CIELAB and CIELUV", Color Res. Appl. 19 (1994) 105-121). A placeholder
//     the user cannot tell apart from a value they typed is the usability
//     failure that pulling the placeholder UP to the AA floor would otherwise
//     create, so the value has to clear the JND in the other direction.
//
// The tone pair itself lives in src/utils/fieldText.ts; this file measures it
// against those two standards over every built-in role, every edge anchor and
// both built-in themes.

import { ElementNode, flushSync } from "@domphy/core";
import { getTheme, resolveToneStep } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import * as ui from "../src/index.ts";
import { PLACEHOLDER_TONE, VALUE_TONE } from "../src/utils/fieldText.ts";
import { defaultContent, HOST, PATCH_ARGS } from "./patch-catalog.ts";

const AA_NORMAL_TEXT = 4.5; // WCAG 2.1 SC 1.4.3
const JND = 2.3; // CIE ΔE*ab just-noticeable difference

const ROLES = [
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
];
// Edge anchors are the only legal surface anchors (doctor: middle-surface-anchor).
const ANCHORS = [0, 1, 2, 3, 14, 15, 16, 17];
const THEMES = ["light", "dark"];

function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function channels(hex: string): [number, number, number] {
  return [
    srgbToLinear(parseInt(hex.slice(1, 3), 16)),
    srgbToLinear(parseInt(hex.slice(3, 5), 16)),
    srgbToLinear(parseInt(hex.slice(5, 7), 16)),
  ];
}

function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, b2] = channels(hex);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** CIELAB (D65 white point), for ΔE*ab. */
function lab(hex: string): [number, number, number] {
  const [r, g, b] = channels(hex);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function deltaE(a: string, b: string): number {
  const p = lab(a);
  const q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

function rampHex(theme: string, role: string, index: number): string | null {
  return getTheme(theme).colors[role]?.[index] ?? null;
}

describe("editable field text tones", () => {
  it("placeholder clears WCAG 2.1 AA on every edge anchor, every role, both themes", () => {
    const failures: string[] = [];
    for (const theme of THEMES) {
      for (const role of ROLES) {
        for (const anchor of ANCHORS) {
          const surface = `shift-${anchor}` as const;
          const background = rampHex(
            theme,
            role,
            resolveToneStep({ theme, surface, tone: "inherit", color: role }),
          );
          const foreground = rampHex(
            theme,
            role,
            resolveToneStep({
              theme,
              surface,
              tone: PLACEHOLDER_TONE,
              color: role,
            }),
          );
          if (!background || !foreground) continue;
          const ratio = contrastRatio(foreground, background);
          if (ratio < AA_NORMAL_TEXT) {
            failures.push(
              `${theme}/${role} on ${surface}: ${ratio.toFixed(2)}:1`,
            );
          }
        }
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("the typed value stays above the CIE ΔE*ab JND from the placeholder, every role/anchor/theme", () => {
    const failures: string[] = [];
    for (const theme of THEMES) {
      for (const role of ROLES) {
        for (const anchor of ANCHORS) {
          const surface = `shift-${anchor}` as const;
          const placeholder = rampHex(
            theme,
            role,
            resolveToneStep({
              theme,
              surface,
              tone: PLACEHOLDER_TONE,
              color: role,
            }),
          );
          const value = rampHex(
            theme,
            role,
            resolveToneStep({ theme, surface, tone: VALUE_TONE, color: role }),
          );
          if (!placeholder || !value) continue;
          const difference = deltaE(placeholder, value);
          if (difference < JND) {
            failures.push(
              `${theme}/${role} on ${surface}: ΔE ${difference.toFixed(2)}`,
            );
          }
        }
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("every patch that paints ::placeholder paints a distinct value color", () => {
    const seen: string[] = [];
    const failures: string[] = [];

    for (const [name, factory] of Object.entries(ui)) {
      if (typeof factory !== "function" || !HOST[name]) continue;
      const tag = HOST[name]!;
      let patch: unknown;
      try {
        patch =
          name in PATCH_ARGS
            ? (factory as (a: unknown) => unknown)(PATCH_ARGS[name])
            : (factory as () => unknown)();
      } catch {
        continue;
      }
      const host = document.createElement("div");
      document.body.appendChild(host);
      const node = new ElementNode({
        [tag]: defaultContent(tag),
        $: [patch],
      } as never);
      node.render(host);
      flushSync();
      const css = node.generateCSS();

      const placeholderRule = css.match(
        /([^{}]*::placeholder[^{}]*)\{([^{}]*)\}/,
      );
      if (!placeholderRule) continue;
      seen.push(name);

      const colorOf = (declarations: string) =>
        declarations.match(/(?:^|;)\s*color:\s*([^;]+)/)?.[1]?.trim();
      const placeholderColor = colorOf(placeholderRule[2]!);
      // The value color comes from the base rule of the SAME scope class the
      // placeholder rule sits in — a wrapper patch (combobox, inputPassword)
      // emits several scopes and only one of them is the editable element.
      const scope = placeholderRule[1]!.match(/\.[\w-]+/)?.[0];
      const valueColor = scope
        ? colorOf(
            css.match(
              new RegExp(`(?:^|\\})\\s*\\${scope}\\s*\\{([^{}]*)\\}`),
            )?.[1] ?? "",
          )
        : undefined;

      if (!placeholderColor || !valueColor) {
        failures.push(`${name}: could not read both colors`);
        continue;
      }
      for (const theme of THEMES) {
        const resolve = (value: string) => {
          const match = value.match(/var\(--([\w-]+)-(\d+)\)/);
          return match
            ? rampHex(theme, match[1]!, parseInt(match[2]!, 10))
            : null;
        };
        const placeholderHex = resolve(placeholderColor);
        const valueHex = resolve(valueColor);
        if (!placeholderHex || !valueHex) {
          failures.push(
            `${name} ${theme}: unresolved (${placeholderColor} / ${valueColor})`,
          );
          continue;
        }
        const difference = deltaE(placeholderHex, valueHex);
        if (difference < JND) {
          failures.push(
            `${name} ${theme}: ΔE ${difference.toFixed(2)} between placeholder ${placeholderColor} and value ${valueColor}`,
          );
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
    // A field patch that silently stops emitting the rule would fall out of
    // the loop above and assert nothing, so pin the set that must be covered.
    expect(seen.sort()).toEqual(
      [
        "combobox",
        "commandSearch",
        "inputNumber",
        "inputSearch",
        "inputText",
        "textarea",
      ].sort(),
    );
  });
});
