// @vitest-environment jsdom
//
// Truth source: WCAG 2.1 SC 1.4.3 (Contrast Minimum) — the relative-luminance
// contrast-ratio formula, computed on the hex values the built-in "light" and
// "dark" ramps actually ship. Nothing here is read back off the patches.
//
// Why a state-by-state sweep and not just the theme-level K=9 test: the ramp
// guarantee (packages/theme/tests/contrast.test.ts) is an INDEX-DISTANCE
// property. A control that paints its own fill moves the background out from
// under an absolutely-toned label — hover +2, pressed +2/+3, selected +3 — and
// the distance silently drops to 7 or 6. Measured before the textToneOn() fix:
// 16 painted states across 10 patches between 1.87:1 and 4.48:1.
//
// The sweep mounts every patch on its documented host, reads the CSS the
// runtime really generates, resolves each rule's effective (color,
// background-color) through the base rule's cascade, and scores both themes.
//
// Limitation, by design: it models one level of cascade (a state block over
// its own base rule), not descendant overrides. A state fill on an ancestor
// whose text lives in a descendant that declares its OWN color — `& tbody
// tr:hover` over `& td` — would read as safe here alone. Reimplementing a
// descendant-aware cascade walk here would duplicate @domphy/doctor's
// `descendant-color-override` rule (single source of truth for cross-selector
// cascade analysis — see AGENTS.md); that rule already runs over every patch
// via `doctor-conformance.test.ts` ("probes 98 patch trees with zero error/
// warning diagnostics") and is what caught and fixed the one real instance of
// this pattern, `table.ts`'s `& tbody tr:hover td, & tbody tr:hover th`. Run
// the axe color-contrast pass in real Chromium too when adding a state fill
// to a container rather than to the element that holds the text.

import { ElementNode, flushSync } from "@domphy/core";
import { getTheme } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import * as ui from "../src/index.ts";
import { defaultContent, HOST, PATCH_ARGS } from "./patch-catalog.ts";

const AA_NORMAL_TEXT = 4.5; // WCAG 2.1 SC 1.4.3

function srgbToLinear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return (
    0.2126 * srgbToLinear(parseInt(hex.slice(1, 3), 16)) +
    0.7152 * srgbToLinear(parseInt(hex.slice(3, 5), 16)) +
    0.0722 * srgbToLinear(parseInt(hex.slice(5, 7), 16))
  );
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `var(--neutral-9)` -> the hex that theme's ramp holds at index 9. */
function resolveVar(theme: string, value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/var\(--([\w-]+)-(\d+)\)/);
  if (!match) return null;
  const ramp = getTheme(theme).colors[match[1]!];
  return ramp?.[parseInt(match[2]!, 10)] ?? null;
}

function parseRules(css: string): {
  selector: string;
  declarations: Record<string, string>;
}[] {
  const rules: { selector: string; declarations: Record<string, string> }[] =
    [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1]!.trim();
    if (selector.startsWith("@")) continue;
    const declarations: Record<string, string> = {};
    for (const part of match[2]!.split(";")) {
      const colon = part.indexOf(":");
      if (colon < 0) continue;
      declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
    }
    rules.push({ selector, declarations });
  }
  return rules;
}

/**
 * States WCAG 1.4.3 does not apply to, or that paint no text at all.
 *
 * - `[disabled]` / `aria-disabled` — "inactive user interface components" are
 *   explicitly exempt from 1.4.3.
 * `::placeholder` is deliberately NOT exempt: 1.4.3 covers it (an editable
 * field is not an "inactive user interface component"), and the old shift-7
 * tone measured 3.32:1 light / 3.50:1 dark. The patches now paint it "text".
 *
 * - `::-webkit-*` / `::-moz-*` / `::backdrop` / `::marker` / `::selection`
 *   and any `::before`/`::after` whose `content` is empty — these paint
 *   shapes (thumbs, tracks, dots, connectors), governed by 1.4.11 (3:1
 *   non-text), not 1.4.3.
 * - `:focus-visible` — the ring is a box-shadow, not text.
 */
function paintsText(
  selector: string,
  declarations: Record<string, string>,
): boolean {
  const subject = selector.replace(/:not\([^)]*\)/g, "");
  if (
    /\[disabled\]|aria-disabled|aria-busy|::-webkit|::-moz|:focus-visible|::marker|::selection|::backdrop/.test(
      subject,
    )
  )
    return false;
  if (/::(before|after)/.test(subject)) {
    const content = declarations.content;
    return !!content && !/^["']\s*["']$/.test(content) && content !== "none";
  }
  return true;
}

/**
 * Painted text states that stay in the theme's documented `muted` band
 * (>= 3:1, < 4.5:1 — `packages/theme/tests/contrast.test.ts` pins both ends).
 * Each entry names WHY the content is supplementary rather than essential.
 * Anything not listed here must clear AA.
 */
const MUTED_BAND_EXEMPT: Record<string, string> = {
  "breadcrumb::after":
    "decorative item separator glyph, the tone shadcn's breadcrumb separator uses",
  "steps::before":
    "upcoming-step marker — the de-emphasis treatment peers give pending steps",
  "splitterHandle:hover":
    "the handle hosts no text; `color` only feeds the ::after grip bar (1.4.11)",
};

function exemptionKey(name: string, selector: string): string | null {
  for (const key in MUTED_BAND_EXEMPT) {
    const [patch, fragment] = key.split(/(?=::|:hover)/);
    if (name === patch && selector.includes(fragment!)) return key;
  }
  return null;
}

describe("painted text states clear WCAG 2.1 AA (SC 1.4.3)", () => {
  it("every patch, every hover/press/selected fill, light + dark", () => {
    const failures: string[] = [];

    for (const [name, factory] of Object.entries(ui)) {
      if (typeof factory !== "function" || !HOST[name]) continue;
      const tag = HOST[name];
      let patch: unknown;
      try {
        patch =
          name in PATCH_ARGS
            ? (factory as (a: unknown) => unknown)(PATCH_ARGS[name])
            : (factory as () => unknown)();
      } catch {
        continue; // construct-time failures are the conformance test's job
      }

      const element: Record<string, unknown> = {
        [tag]: defaultContent(tag),
        $: [patch],
      };
      if (name === "link" || name === "linkButton") element.href = "#";
      if (name === "image") {
        element.src = "x.png";
        element.alt = "";
      }

      const host = document.createElement("div");
      document.body.appendChild(host);
      const node = new ElementNode(element as never);
      node.render(host);
      flushSync();
      const rules = parseRules(node.generateCSS());

      // Base (unqualified) rule per scope class — a `&:hover` block that only
      // swaps the background still paints the base rule's color on top of it.
      const base: Record<string, { color?: string; background?: string }> = {};
      const scopeOf = (selector: string) =>
        (selector.match(/\.[\w-]+/g) ?? []).join("");
      for (const rule of rules) {
        if (!/^\.[\w-]+$/.test(rule.selector)) continue;
        base[scopeOf(rule.selector)] = {
          color: rule.declarations.color,
          background: rule.declarations["background-color"],
        };
      }

      for (const rule of rules) {
        if (!paintsText(rule.selector, rule.declarations)) continue;
        const scope = scopeOf(rule.selector);
        const color = rule.declarations.color ?? base[scope]?.color;
        const background =
          rule.declarations["background-color"] ?? base[scope]?.background;
        if (!background || background === "transparent") continue;

        const readableSelector = rule.selector.replace(/\.[\w-]+/g, "");
        const exemption = exemptionKey(name, readableSelector);

        for (const theme of ["light", "dark"]) {
          const backgroundHex = resolveVar(theme, background);
          if (!backgroundHex) continue;
          // No own color means the page's body text tone lands here.
          const colorHex =
            resolveVar(theme, color) ?? getTheme(theme).colors.neutral![9]!;
          const ratio = contrastRatio(colorHex, backgroundHex);
          if (ratio >= AA_NORMAL_TEXT) continue;
          if (exemption && ratio >= 3) continue;
          failures.push(
            `${name} ${theme} "${readableSelector.trim() || "(resting)"}": ${ratio.toFixed(2)}:1 (${color ?? "inherited body text"} on ${background})`,
          );
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
