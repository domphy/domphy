import type { AuditIssue, AuditPage, Rect } from "./types.js";

const SKIP_TAGS = new Set(["html", "head", "body", "script", "style", "meta", "link", "noscript", "title"]);
const ISSUE_COLORS: Record<string, string> = {
  overlap: "red",
  geometry: "orange",
  contrast: "gold",
};

interface ElementBox {
  tag: string;
  rect: Rect;
}

export interface LayoutSnapshot {
  width: number;
  height: number;
  boxes: ElementBox[];
}

export async function snapshot(page: AuditPage): Promise<LayoutSnapshot> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const boxes = Array.from(document.querySelectorAll("*"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
      })
      .filter(({ rect }) => rect.width > 0 && rect.height > 0 && rect.y < height && rect.x < width);
    return { width, height, boxes };
  });
}

export function toSVG(layout: LayoutSnapshot, issues: AuditIssue[]): string {
  const { width, height, boxes } = layout;

  const rects = boxes
    .filter((b) => !SKIP_TAGS.has(b.tag))
    .map(
      (b) =>
        `<rect x="${b.rect.x.toFixed(1)}" y="${b.rect.y.toFixed(1)}" width="${b.rect.width.toFixed(1)}" height="${b.rect.height.toFixed(1)}" fill="none" stroke="#ccc" stroke-width="0.5"/>`,
    )
    .join("\n");

  const marks = issues
    .filter((i) => i.rect)
    .map((i) => {
      const r = i.rect!;
      const color = ISSUE_COLORS[i.type] ?? "red";
      return `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.width.toFixed(1)}" height="${r.height.toFixed(1)}" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="1"><title>${i.message}</title></rect>`;
    })
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    rects,
    marks,
    `</svg>`,
  ].join("\n");
}
