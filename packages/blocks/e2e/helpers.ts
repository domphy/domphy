import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

type DemoWindow = Window & {
  mountBlock?: (name: string, props?: unknown) => void;
  disconnectLazyMount?: () => void;
};

/**
 * Vite's first cold crawl of the demo (all ~173 factories) can force one
 * full page reload mid-evaluate. Retry once on the known "execution
 * context was destroyed" class rather than failing the spec.
 */
async function retryAcrossReload<T>(
  page: Page,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      !/execution context was destroyed|Target closed|disconnectLazyMount is not a function|mountBlock is not a function/i.test(
        message,
      )
    ) {
      throw error;
    }
    await page.waitForLoadState("networkidle");
    return action();
  }
}

/** Stop lazy-mount of sibling cards, then force-render one named block. */
export async function mountBlock(page: Page, name: string): Promise<void> {
  await retryAcrossReload(page, async () => {
    await page.waitForFunction(
      () =>
        typeof (window as unknown as DemoWindow).mountBlock === "function" &&
        typeof (window as unknown as DemoWindow).disconnectLazyMount ===
          "function",
    );
    await page.evaluate(() => {
      (window as unknown as DemoWindow).disconnectLazyMount?.();
    });
  });
  await retryAcrossReload(page, async () => {
    await page.evaluate((blockName) => {
      (window as unknown as DemoWindow).mountBlock?.(blockName);
    }, name);
  });
  const card = page.locator(`[data-block="${name}"]`);
  await expect(card).toBeVisible();
  await expect(card.locator(".error")).toHaveCount(0);
  await card
    .locator(".block-box")
    .locator("*")
    .first()
    .waitFor({ state: "attached", timeout: 8_000 });
}

export async function openDemo(page: Page): Promise<void> {
  const pageErrors: string[] = [];
  const onError = (error: Error) => {
    pageErrors.push(error.message);
  };
  page.on("pageerror", onError);
  try {
    await page.goto("/demo.html", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => typeof (window as unknown as DemoWindow).mountBlock === "function",
      undefined,
      { timeout: 90_000 },
    );
    expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  } finally {
    page.off("pageerror", onError);
  }
}

export type BlockScan = {
  name: string;
  axe: string[];
  overflow: boolean;
  layout300x150: boolean;
  consoleErrors: string[];
  screenshot: string;
};

type LayoutProbe = {
  overflow: boolean;
  layout300x150: boolean;
};

/** Axe critical/serious + overflow + 300×150 replaced-element bug + PNG. */
export async function scanMounted(
  page: Page,
  name: string,
  shotsDir: string,
  consoleErrors: string[],
): Promise<BlockScan> {
  mkdirSync(shotsDir, { recursive: true });
  const screenshot = join(shotsDir, `${name}.png`);
  const box = page.locator(`[data-block="${name}"] .block-box`);
  await box.screenshot({ path: screenshot });

  const axe = await new AxeBuilder({ page })
    .include(`[data-block="${name}"] .block-box`)
    // Decorative duplicates (textReveal ghost copy, neon halo, etc.)
    .exclude('[aria-hidden="true"]')
    .analyze();
  const axeHits = axe.violations
    .filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    )
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} [${violation.nodes.length}]`,
    );

  const layout = await page.evaluate((blockName): LayoutProbe => {
    const root = document.querySelector(
      `[data-block="${blockName}"] .block-box`,
    );
    if (!(root instanceof HTMLElement)) {
      return { overflow: false, layout300x150: false };
    }
    // Page-level overflow only: a neon halo, comic drop-shadow, or device
    // side-button painting past the card box is the effect, not a catalog
    // layout break. Horizontal scroll on the demo document is the bug.
    const overflow =
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth + 1;
    const replaced = root.querySelectorAll(
      "svg, canvas, video, iframe, embed, object",
    );
    let layout300x150 = false;
    for (const element of replaced) {
      const style = getComputedStyle(element);
      if (style.position === "static") continue;
      const hasOffset = [style.top, style.right, style.bottom, style.left].some(
        (value) => value !== "auto",
      );
      if (!hasOffset) continue;
      const rect = element.getBoundingClientRect();
      if (Math.round(rect.width) === 300 && Math.round(rect.height) === 150) {
        layout300x150 = true;
        break;
      }
    }
    return { overflow, layout300x150 };
  }, name);

  return {
    name,
    axe: axeHits,
    overflow: layout.overflow,
    layout300x150: layout.layout300x150,
    consoleErrors: [...consoleErrors],
    screenshot,
  };
}

export function attachConsole(page: Page): string[] {
  const lines: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") lines.push(message.text().slice(0, 300));
  });
  page.on("pageerror", (error) => {
    lines.push(error.message.slice(0, 300));
  });
  return lines;
}

export function isHardFailure(scan: BlockScan): boolean {
  return scan.axe.length > 0 || scan.overflow || scan.layout300x150;
}
