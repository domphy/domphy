import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Real-browser checks for @domphy/three (the three() patch + reconciler +
 * frameloop + teardown), solo-mounted via the standalone catalog's
 * `?catalog=three&only=<name>` mode with a REAL WebGLRenderer:
 *
 *   pnpm --filter domphy-web visual:three
 *
 * Headless Chromium renders WebGL through SwiftShader (verified: ANGLE
 * Vulkan SwiftShader, webgl2, pixel readback works), so these tests assert
 * on actual rendered output, not just mount bookkeeping:
 *
 * - mount: canvas fills its host, drawing-buffer size tracks host × dpr,
 *   no page errors.
 * - render: two canvas-region screenshots 400ms apart must DIFFER (the
 *   onFrame-rotated cube proves the shared rAF loop is live), and the
 *   screenshot must not be a trivially-compressible solid frame.
 * - resize sweep 375/768/1280: canvas CSS + drawing-buffer sizes track the
 *   host (ResizeObserver → root.setSize → gl.setSize), no page errors.
 * - unmount: toggling the host off removes the canvas without page errors
 *   (forceContextLoss/gl.dispose/listener teardown path), remounting brings
 *   a fresh rendering canvas back.
 *
 * Screenshots land in .ui-qa/three/.
 */

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "three",
);
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

function soloUrl(demo: string): string {
  return `/?catalog=three&only=${demo}`;
}

function watchPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) =>
    errors.push(String(error.message).slice(0, 300)),
  );
  return errors;
}

async function openSolo(page: Page, demo: string): Promise<string[]> {
  const errors = watchPageErrors(page);
  await page.goto(soloUrl(demo), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  return errors;
}

interface CanvasMetrics {
  cssWidth: number;
  cssHeight: number;
  bufferWidth: number;
  bufferHeight: number;
  hostWidth: number;
  hostHeight: number;
}

async function measureCanvas(page: Page): Promise<CanvasMetrics> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) throw new Error("no canvas mounted");
    const host = canvas.parentElement!;
    const rect = canvas.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    return {
      cssWidth: rect.width,
      cssHeight: rect.height,
      bufferWidth: canvas.width,
      bufferHeight: canvas.height,
      hostWidth: hostRect.width,
      hostHeight: hostRect.height,
    };
  });
}

test.describe("three() — spinning cube (real WebGLRenderer)", () => {
  test("mounts a live-rendering canvas at 1280x800", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await openSolo(page, "spinningCube");
    await page.waitForSelector("canvas", { timeout: 30_000 });
    await page.waitForTimeout(600); // let several frames render

    const metrics = await measureCanvas(page);
    expect(metrics.cssWidth).toBeGreaterThan(0);
    expect(metrics.cssHeight).toBeGreaterThan(0);
    // Canvas CSS size fills its host (canvas style width/height 100%).
    expect(Math.abs(metrics.cssWidth - metrics.hostWidth)).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs(metrics.cssHeight - metrics.hostHeight),
    ).toBeLessThanOrEqual(1);
    // Drawing buffer sized by gl.setSize (host × dpr, dpr = 1 headless).
    expect(metrics.bufferWidth).toBeGreaterThan(0);
    expect(metrics.bufferHeight).toBeGreaterThan(0);

    // Live-render proof: the onFrame-rotated cube must change the frame.
    const canvas = page.locator("canvas");
    const frameA = await canvas.screenshot();
    await page.waitForTimeout(400);
    const frameB = await canvas.screenshot();
    expect(
      frameA.equals(frameB),
      "canvas did not change between frames — frameloop not rendering",
    ).toBe(false);
    // A solid-color frame compresses to a few hundred bytes; a shaded 3D
    // scene on a #0b0e1a background is far richer.
    expect(frameA.length).toBeGreaterThan(2000);

    await page.screenshot({ path: join(shotsDir, "spinning-cube-1280.png") });
    expect(errors).toEqual([]);
  });

  for (const viewport of VIEWPORTS) {
    test(`keeps canvas sized to host at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      const errors = await openSolo(page, "spinningCube");
      await page.waitForSelector("canvas", { timeout: 30_000 });
      await page.waitForTimeout(500); // ResizeObserver → setSize settles

      const metrics = await measureCanvas(page);
      expect(metrics.cssWidth).toBeGreaterThan(0);
      expect(
        Math.abs(metrics.cssWidth - metrics.hostWidth),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(metrics.cssHeight - metrics.hostHeight),
      ).toBeLessThanOrEqual(1);
      // Buffer tracks CSS size (dpr 1): ResizeObserver-driven setSize must
      // have resized the drawing buffer to the actual host width.
      expect(
        Math.abs(metrics.bufferWidth - metrics.cssWidth),
      ).toBeLessThanOrEqual(2);

      await page.screenshot({
        path: join(shotsDir, `spinning-cube-${viewport.name}.png`),
      });
      expect(errors).toEqual([]);
    });
  }

  test("unmount disposes without errors; remount renders again", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const errors = await openSolo(page, "toggle");
    await page.waitForSelector("canvas", { timeout: 30_000 });
    await page.waitForTimeout(500);

    const before = await page.locator("canvas").screenshot();
    expect(before.length).toBeGreaterThan(2000);

    // Unmount — exercises the Remove hook: events disconnect, reconciler
    // dispose, renderLists.dispose + forceContextLoss + gl.dispose,
    // ResizeObserver disconnect. Any throw surfaces as a page error.
    await page.click("[data-three-toggle='1']");
    await page.waitForTimeout(300);
    expect(await page.locator("canvas").count()).toBe(0);

    // Remount — a fresh root/canvas/renderer must render again (no poisoned
    // module-level loop state from the teardown).
    await page.click("[data-three-toggle='1']");
    await page.waitForSelector("canvas", { timeout: 30_000 });
    await page.waitForTimeout(500);
    const remounted = await measureCanvas(page);
    expect(remounted.bufferWidth).toBeGreaterThan(0);
    const frameA = await page.locator("canvas").screenshot();
    await page.waitForTimeout(400);
    const frameB = await page.locator("canvas").screenshot();
    expect(frameA.equals(frameB)).toBe(false);

    await page.screenshot({ path: join(shotsDir, "toggle-remounted.png") });
    expect(errors).toEqual([]);
  });
});
