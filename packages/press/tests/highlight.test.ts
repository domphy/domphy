import { resolveThemeColor } from "@domphy/theme";
import { describe, expect, it } from "vitest";
import {
  createHighlighter,
  parseFenceInfo,
  renderFence,
} from "../src/highlight.ts";

const highlight = (code: string): string => code;

describe("renderFence", () => {
  it("escapes lang before interpolating it into the class attribute", () => {
    const html = renderFence("const x = 1", `js" onfocus="alert(1)`, highlight);
    expect(html).not.toContain("onfocus");
    expect(html).not.toMatch(/class="[^"]*language-js"/);
    expect(html).toContain("language-js&quot;");
  });

  it("escapes a lang that would break out of the class attribute via markup", () => {
    const html = renderFence(
      "x",
      "css><img src=x onerror=alert(1)>",
      highlight,
    );
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).toContain("language-css&gt;");
  });

  it("still emits a language-* class for a normal fence lang", () => {
    const html = renderFence("x = 1", "python", highlight);
    expect(html).toContain('class="code-block language-python"');
    expect(parseFenceInfo("python").lang).toBe("python");
  });
});

describe("createHighlighter token contrast", () => {
  // Truth source: WCAG 2.1 SC 1.4.3 (4.5:1 for normal text), computed from the
  // token colours Shiki actually emits against the surface `.code-block pre`
  // paints — the PAGE surface, resolved from the theme package rather than
  // written down here. github-light, the previous light theme, fails its
  // attribute tone (#e36209) even on white.
  const relativeLuminance = (hex: string): number => {
    const value = hex.replace("#", "");
    const [r, g, b] = [0, 2, 4]
      .map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string): number => {
    const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort(
      (x, y) => y - x,
    );
    return (high + 0.05) / (low + 0.05);
  };

  // Shiki's dual-theme output carries the light tone as `color:#…` and the
  // dark one as the `--shiki-dark:#…` custom property (theme.ts swaps them on
  // html[data-theme="dark"]).
  const tones = (html: string, pattern: RegExp): string[] => [
    ...new Set([...html.matchAll(pattern)].map((m) => m[1].toLowerCase())),
  ];

  it("clears AA for every token colour on the page surface, both themes", async () => {
    const highlight = await createHighlighter();
    const html = highlight(
      [
        'import { defineConfig } from "@domphy/press"',
        "// a comment",
        "export default defineConfig({ title: 'Docs', count: 42, flag: true })",
      ].join("\n"),
      "ts",
    );
    for (const [theme, pattern] of [
      ["light", /(?:^|[;"])color:(#[0-9a-fA-F]{6})/g],
      ["dark", /--shiki-dark:(#[0-9a-fA-F]{6})/g],
    ] as const) {
      const surface = resolveThemeColor({ theme, tone: "inherit" });
      const colors = tones(html, pattern);
      expect(colors.length, `${theme} tokens`).toBeGreaterThan(3);
      expect(
        colors.filter((c) => contrast(c, surface) < 4.5),
        `${theme} on ${surface}`,
      ).toEqual([]);
    }
  }, 60_000);
});
