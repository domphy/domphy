import type { AuditIssue, AuditPage } from "./types.js";

export async function detectOverlaps(page: AuditPage): Promise<AuditIssue[]> {
  const pairs = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("*"));
    const items = elements
      .map((el) => ({ el, rect: el.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0);

    const result: {
      a: { tag: string; cls: string; rect: { x: number; y: number; width: number; height: number } };
      b: { tag: string; cls: string; rect: { x: number; y: number; width: number; height: number } };
      ix: { x: number; y: number; width: number; height: number };
    }[] = [];

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const { el: a, rect: ra } = items[i];
        const { el: b, rect: rb } = items[j];
        if (a.contains(b) || b.contains(a)) continue;

        const left = Math.max(ra.x, rb.x);
        const top = Math.max(ra.y, rb.y);
        const right = Math.min(ra.x + ra.width, rb.x + rb.width);
        const bottom = Math.min(ra.y + ra.height, rb.y + rb.height);

        if (left < right && top < bottom) {
          result.push({
            a: {
              tag: a.tagName.toLowerCase(),
              cls: a.className ? String(a.className).trim().split(" ")[0] : "",
              rect: { x: ra.x, y: ra.y, width: ra.width, height: ra.height },
            },
            b: {
              tag: b.tagName.toLowerCase(),
              cls: b.className ? String(b.className).trim().split(" ")[0] : "",
              rect: { x: rb.x, y: rb.y, width: rb.width, height: rb.height },
            },
            ix: { x: left, y: top, width: right - left, height: bottom - top },
          });
        }
      }
    }
    return result;
  });

  return pairs.map(({ a, b, ix }) => ({
    type: "overlap" as const,
    message: `<${a.tag}${a.cls ? "." + a.cls : ""}> overlaps <${b.tag}${b.cls ? "." + b.cls : ""}> by ${ix.width.toFixed(0)}×${ix.height.toFixed(0)}px`,
    rect: ix,
  }));
}
