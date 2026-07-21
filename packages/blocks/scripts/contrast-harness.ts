// Shared WCAG contrast measurement helper for the "backgrounds" category
// audit. Unlike a static color-math check (which can't see the effect of
// mix-blend-mode/blur/opacity compositing), this measures the ACTUAL
// rendered pixels behind each visible text run via a real screenshot, so a
// decorative glow that reads as dark in its own declared color but composites
// bright under `mix-blend-mode: screen` still gets caught.

import type { Page } from "playwright";
import { PNG } from "pngjs";

export type TextRun = {
  index: number;
  text: string;
  tag: string;
  rect: { x: number; y: number; width: number; height: number };
  color: string;
  fontSizePx: number;
  fontWeight: number;
};

export type ContrastResult = TextRun & {
  textRgb: [number, number, number];
  bgRgb: [number, number, number];
  ratio: number;
  requiredRatio: number;
  passes: boolean;
  backgroundSampleCount: number;
};

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseCssColor(color: string): [number, number, number] {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return [0, 0, 0];
  const parts = match[1].split(",").map((part) => parseFloat(part.trim()));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** WCAG 2 "large text" threshold: >=24px any weight, or >=18.66px (~19px) at bold (>=700). */
function requiredRatioFor(fontSizePx: number, fontWeight: number): number {
  const isLarge =
    fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  return isLarge ? 3 : 4.5;
}

/**
 * Finds every element within the block whose own direct child text content
 * (not a nested element's) is non-empty — the actual visible text runs a
 * reader would read, not decorative wrapper divs.
 */
export async function findTextRuns(
  page: Page,
  blockName: string,
): Promise<TextRun[]> {
  return page.evaluate((name) => {
    // Scoped to `.block-box` (the factory's own mounted output), not the
    // outer `[data-block]` card wrapper — that wrapper also carries the demo
    // harness's own `<h2>${name}</h2>` title, which isn't part of the block
    // under test and would otherwise get measured as if it were.
    const root = document.querySelector(`[data-block="${name}"] .block-box`);
    if (!root) return [];
    const runs: Array<{
      index: number;
      text: string;
      tag: string;
      rect: { x: number; y: number; width: number; height: number };
      color: string;
      fontSizePx: number;
      fontWeight: number;
    }> = [];
    const seen = new Set<Element>();
    const stack: Element[] = [root];
    while (stack.length > 0) {
      const el = stack.pop() as Element;
      if (seen.has(el)) continue;
      seen.add(el);
      const directText = Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join("")
        .trim();
      if (directText.length > 0) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const opacity = Number.parseFloat(style.opacity);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          (Number.isNaN(opacity) || opacity > 0.05) &&
          // `aria-hidden="true"` marks content as decorative/duplicate (e.g. a
          // "peek-through" reveal layer whose text is never shown as a full
          // static block, only through a small moving cutout, with the same
          // message already carried by an always-visible sibling) — evaluating
          // WCAG contrast against it produces a false-positive failure for
          // text that was never meant to be independently read.
          el.closest('[aria-hidden="true"]') === null
        ) {
          // Tagged so a later pass (after scrolling this exact element into
          // view) can re-locate it and read its FRESH post-scroll rect —
          // the rect captured here reflects wherever it sits before any
          // scrolling happens.
          const index = runs.length;
          el.setAttribute("data-contrast-index", String(index));
          runs.push({
            index,
            text: directText,
            tag: el.tagName.toLowerCase(),
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            color: style.color,
            fontSizePx: Number.parseFloat(style.fontSize),
            fontWeight: Number.parseInt(style.fontWeight, 10) || 400,
          });
        }
      }
      for (const child of Array.from(el.children)) stack.push(child);
    }
    return runs;
  }, blockName);
}

/** Scrolls the tagged text run into view and returns its fresh post-scroll
 * bounding rect — the rect captured at discovery time may be off-screen. */
async function scrollRunIntoViewAndGetRect(
  page: Page,
  index: number,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate((runIndex) => {
    const el = document.querySelector(`[data-contrast-index="${runIndex}"]`);
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, index);
}

/**
 * Screenshots the padded region around a text run and estimates the real
 * background color behind it: grid-samples the region, discards points
 * whose color is close to the KNOWN text color (glyph ink / anti-aliased
 * edges), and averages the rest. Falls back to a thin border strip just
 * outside the tight text rect if too few background samples remain (dense
 * bold headings can have high ink coverage).
 */
async function sampleBackgroundBehindText(
  page: Page,
  run: TextRun,
): Promise<{ rgb: [number, number, number]; sampleCount: number }> {
  const padding = 6;
  const clip = {
    x: Math.max(0, run.rect.x - padding),
    y: Math.max(0, run.rect.y - padding),
    width: run.rect.width + padding * 2,
    height: run.rect.height + padding * 2,
  };
  const buffer = await page.screenshot({ clip });
  const png = PNG.sync.read(buffer);
  const textRgb = parseCssColor(run.color);

  const samples: [number, number, number][] = [];
  const stepsX = 12;
  const stepsY = 8;
  for (let stepY = 0; stepY <= stepsY; stepY += 1) {
    for (let stepX = 0; stepX <= stepsX; stepX += 1) {
      const x = Math.min(
        png.width - 1,
        Math.round((stepX / stepsX) * (png.width - 1)),
      );
      const y = Math.min(
        png.height - 1,
        Math.round((stepY / stepsY) * (png.height - 1)),
      );
      const index = (png.width * y + x) << 2;
      const pixel: [number, number, number] = [
        png.data[index],
        png.data[index + 1],
        png.data[index + 2],
      ];
      const distance = Math.sqrt(
        (pixel[0] - textRgb[0]) ** 2 +
          (pixel[1] - textRgb[1]) ** 2 +
          (pixel[2] - textRgb[2]) ** 2,
      );
      // Also exclude near-pure-black/white extremes only when they exactly
      // match text color's own extreme, handled by the distance check above.
      if (distance > 45) samples.push(pixel);
    }
  }

  if (samples.length < (stepsX + 1) * (stepsY + 1) * 0.15) {
    // High ink coverage — fall back to sampling only the outer border ring
    // (the padding margin added above), which is background by construction
    // since it sits outside the text element's own tight rect.
    samples.length = 0;
    const borderPx = Math.max(2, Math.round(padding * 0.6));
    for (let stepY = 0; stepY <= stepsY; stepY += 1) {
      for (let stepX = 0; stepX <= stepsX; stepX += 1) {
        const isBorder =
          stepX <= 1 ||
          stepX >= stepsX - 1 ||
          stepY <= 1 ||
          stepY >= stepsY - 1;
        if (!isBorder) continue;
        const x = Math.min(
          png.width - 1,
          Math.round((stepX / stepsX) * (png.width - 1)),
        );
        const y = Math.min(
          png.height - 1,
          Math.round((stepY / stepsY) * (png.height - 1)),
        );
        const index = (png.width * y + x) << 2;
        samples.push([
          png.data[index],
          png.data[index + 1],
          png.data[index + 2],
        ]);
      }
    }
    void borderPx;
  }

  if (samples.length === 0)
    samples.push([
      textRgb[0] === 0 ? 255 : 0,
      textRgb[1] === 0 ? 255 : 0,
      textRgb[2] === 0 ? 255 : 0,
    ]);

  const sum = samples.reduce(
    (accumulator, pixel) => [
      accumulator[0] + pixel[0],
      accumulator[1] + pixel[1],
      accumulator[2] + pixel[2],
    ],
    [0, 0, 0],
  );
  const average: [number, number, number] = [
    sum[0] / samples.length,
    sum[1] / samples.length,
    sum[2] / samples.length,
  ];
  return { rgb: average, sampleCount: samples.length };
}

/**
 * Measures real WCAG contrast for every visible text run in a mounted block,
 * against the actual composited background pixels behind it (not the
 * declared CSS background color, which blend-modes/blur/opacity can make
 * misleading). Call after the block has settled into its resting/animated
 * state you want to check (e.g. after waitForTimeout past an entrance
 * animation, or at a specific point mid-loop for ambient effects).
 */
export async function measureBlockContrast(
  page: Page,
  blockName: string,
): Promise<ContrastResult[]> {
  const runs = await findTextRuns(page, blockName);
  const results: ContrastResult[] = [];
  for (const run of runs) {
    // The rect from findTextRuns reflects wherever the element sits before
    // any scrolling — scroll THIS run into view and re-read its rect so the
    // screenshot clip below actually falls inside the viewport.
    const freshRect = await scrollRunIntoViewAndGetRect(page, run.index);
    if (!freshRect || freshRect.width === 0 || freshRect.height === 0) continue;
    await page.waitForTimeout(120);
    const runAtCurrentPosition: TextRun = { ...run, rect: freshRect };
    const textRgb = parseCssColor(run.color);
    const { rgb: bgRgb, sampleCount } = await sampleBackgroundBehindText(
      page,
      runAtCurrentPosition,
    );
    const ratio = contrastRatio(textRgb, bgRgb);
    const requiredRatio = requiredRatioFor(run.fontSizePx, run.fontWeight);
    results.push({
      ...runAtCurrentPosition,
      textRgb,
      bgRgb,
      ratio,
      requiredRatio,
      passes: ratio >= requiredRatio,
      backgroundSampleCount: sampleCount,
    });
  }
  return results;
}
