import type { AuditIssue, AuditPage } from "./types.js";

export async function checkContrast(
  page: AuditPage,
  minRatio = 4.5,
): Promise<AuditIssue[]> {
  const findings = await page.evaluate((min: number) => {
    function parseRgb(css: string): [number, number, number, number] | null {
      const match = css.match(
        /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
      );
      if (!match) return null;
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
        match[4] !== undefined ? parseFloat(match[4]) : 1,
      ];
    }

    function luminance(r: number, g: number, b: number): number {
      const WEIGHTS = [0.2126, 0.7152, 0.0722];
      return [r, g, b].reduce((sum, channel, i) => {
        const normalized = channel / 255;
        const linear =
          normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        return sum + linear * WEIGHTS[i];
      }, 0);
    }

    function contrastRatio(
      fg: [number, number, number],
      bg: [number, number, number],
    ): number {
      const l1 = luminance(...fg);
      const l2 = luminance(...bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    function resolvedBackground(el: Element): [number, number, number] {
      let node: Element | null = el;
      while (node) {
        const parsed = parseRgb(getComputedStyle(node).backgroundColor);
        if (parsed && parsed[3] > 0) return [parsed[0], parsed[1], parsed[2]];
        node = node.parentElement;
      }
      return [255, 255, 255];
    }

    const TEXT_TAGS = "p,span,li,td,th,h1,h2,h3,h4,h5,h6,button,a,label";
    const result: {
      message: string;
      rect: { x: number; y: number; width: number; height: number };
    }[] = [];

    for (const el of Array.from(document.querySelectorAll(TEXT_TAGS))) {
      if (!el.textContent?.trim()) continue;
      const style = getComputedStyle(el);
      const fg = parseRgb(style.color);
      if (!fg || fg[3] === 0) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const bg = resolvedBackground(el);
      const ratio = contrastRatio([fg[0], fg[1], fg[2]], bg);

      if (ratio < min) {
        result.push({
          message: `contrast ${ratio.toFixed(2)}:1 < ${min} on <${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 40)}"`,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }
    return result;
  }, minRatio);

  return findings.map(({ message, rect }) => ({
    type: "contrast" as const,
    message,
    rect,
  }));
}
