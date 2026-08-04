import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";

/**
 * Real-browser checks for @domphy/chart against the STANDALONE visual
 * catalog (visual/serve-standalone.mjs), solo-mounted per docs demo via
 * `?catalog=chart&only=<name>`:
 *
 *   pnpm --filter domphy-web visual:chart
 *
 * Per demo: zero page errors, WebGL canvas + SVG axes/legend present, painted
 * pixels are non-uniform (chart actually drew), tooltip appears on hover and
 * stays inside the viewport at 375/768/1280, a [data-theme] flip repaints,
 * and a container resize re-lays-out. The dataZoom demo additionally gets a
 * real mouse drag across the slider (regression: mid-drag re-renders used to
 * kill the drag and snap the thumbs back). Screenshots land in .ui-qa/chart/.
 */

const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "chart",
);
mkdirSync(shotsDir, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375x667", width: 375, height: 667 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1280x800", width: 1280, height: 800 },
] as const;

const DEMOS = [
  "lineArea",
  "barStacked",
  "pieDonut",
  "heatmapCartesian",
] as const;

type DemoName = (typeof DEMOS)[number];

// Where to hover for the tooltip check, as fractions of the canvas box.
// pieDonut uses trigger:"item" with two off-center pies — hover the left
// pie's sector ring, not the dead middle between the two pies.
const HOVER: Record<DemoName, { fx: number; fy: number }> = {
  lineArea: { fx: 0.5, fy: 0.5 },
  barStacked: { fx: 0.5, fy: 0.5 },
  pieDonut: { fx: 0.25, fy: 0.5 },
  heatmapCartesian: { fx: 0.5, fy: 0.5 },
};

function soloUrl(demo: string): string {
  return `/?catalog=chart&only=${demo}`;
}

async function openSolo(
  page: Page,
  demo: string,
  viewport?: (typeof VIEWPORTS)[number],
): Promise<string[]> {
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) =>
    consoleErrors.push(String(error.message).slice(0, 200)),
  );
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(soloUrl(demo), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  // WebGL init is async (luma.gl createDevice) — give it a beat.
  await page.waitForTimeout(800);
  return consoleErrors;
}

/** The chart host: the cell's innermost positioned div holding the canvas. */
function chartHost(page: Page) {
  return page.locator("[data-visual] canvas").first();
}

/** True when this Chromium can create a WebGL2 context at all. */
async function webglAvailable(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    return canvas.getContext("webgl2") !== null;
  });
}

for (const demo of DEMOS) {
  test.describe(`chart demo: ${demo}`, () => {
    test("renders canvas + SVG overlay with painted content, no page errors", async ({
      page,
    }) => {
      const errors = await openSolo(page, demo, VIEWPORTS[2]);
      expect(errors).toEqual([]);

      // WebGL canvas sized to the container (drawing buffer > 0).
      const canvas = chartHost(page);
      await expect(canvas).toBeVisible();
      const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height,
      }));
      expect(dims.width).toBeGreaterThan(0);
      expect(dims.height).toBeGreaterThan(0);

      // SVG overlay: axes (cartesian demos) and/or legend labels exist.
      const overlay = await page.evaluate(() => {
        const host = document.querySelector("[data-visual]")!;
        const svgTexts = host.querySelectorAll("svg text").length;
        const axes = host.querySelectorAll(".dc-axes").length;
        const legends = host.querySelectorAll(".dc-legend").length;
        return { svgTexts, axes, legends };
      });
      expect(overlay.svgTexts).toBeGreaterThan(0);
      expect(overlay.axes + overlay.legends).toBeGreaterThan(0);

      // Painted pixels: a real chart render is not a flat single-color page.
      // (PNG byte size is a crude-but-effective uniformity detector: a flat
      // image compresses to almost nothing.)
      const shot = await page
        .locator("[data-visual]")
        .first()
        .screenshot({ path: join(shotsDir, `${demo}-render.png`) });
      expect(shot.length).toBeGreaterThan(4000);

      // Report WebGL availability for the audit trail; SVG assertions above
      // hold regardless.
      const webgl = await webglAvailable(page);
      console.log(`[chart:${demo}] webgl2 available: ${webgl}`);
    });

    for (const viewport of VIEWPORTS) {
      test(`tooltip on hover stays in viewport @ ${viewport.name}`, async ({
        page,
      }) => {
        const errors = await openSolo(page, demo, viewport);
        expect(errors).toEqual([]);

        const canvasBox = await chartHost(page).boundingBox();
        expect(canvasBox).not.toBeNull();
        // Hover the demo's tooltip hotspot inside the grid area.
        const hover = HOVER[demo];
        await page.mouse.move(
          canvasBox!.x + canvasBox!.width * hover.fx,
          canvasBox!.y + canvasBox!.height * hover.fy,
          { steps: 4 },
        );
        const tooltip = page.locator(".dc-tooltip").first();
        await expect(tooltip).toBeVisible({ timeout: 5000 });
        await expect(tooltip).toHaveCSS("opacity", "1");
        // Position settles via an async computePosition promise.
        await page.waitForTimeout(150);

        const tipBox = await tooltip.boundingBox();
        expect(tipBox).not.toBeNull();
        expect(tipBox!.width).toBeGreaterThan(0);
        // Tooltip is position:absolute inside the chart host — it must not
        // escape the viewport horizontally.
        expect(tipBox!.x).toBeGreaterThanOrEqual(-1);
        expect(tipBox!.x + tipBox!.width).toBeLessThanOrEqual(
          viewport.width + 1,
        );

        await page.screenshot({
          path: join(shotsDir, `${demo}-tooltip-${viewport.name}.png`),
        });
      });
    }

    test("dark-mode flip repaints (overlay re-renders / colors change)", async ({
      page,
    }) => {
      const errors = await openSolo(page, demo, VIEWPORTS[2]);
      expect(errors).toEqual([]);

      const cell = page.locator("[data-visual]").first();
      const light = await cell.screenshot();
      await page.evaluate(() =>
        document.documentElement.setAttribute("data-theme", "dark"),
      );
      await page.waitForTimeout(500);
      const dark = await cell.screenshot({
        path: join(shotsDir, `${demo}-dark.png`),
      });
      // SVG var(--…) layers repaint at paint time and the MutationObserver
      // re-render re-resolves WebGL uniforms — either way the pixels differ.
      expect(light.equals(dark)).toBe(false);
      expect(errors).toEqual([]);
    });

    test("container resize re-lays-out (SVG width follows container)", async ({
      page,
    }) => {
      const errors = await openSolo(page, demo, VIEWPORTS[2]);
      expect(errors).toEqual([]);

      const widthOf = () =>
        page.evaluate(() => {
          const host = document.querySelector("[data-visual]")!;
          const svg = host.querySelector("svg")!;
          return Number(svg.getAttribute("width"));
        });
      const before = await widthOf();
      await page.setViewportSize({ width: 900, height: 800 });
      await page.waitForTimeout(600);
      const after = await widthOf();
      expect(after).toBeGreaterThan(0);
      expect(after).not.toBe(before);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("chart demo: dataZoom", () => {
  // End-to-end regression for the engine fix: a slider drag re-renders on
  // every mousemove; the slider (and its document-level drag listeners) must
  // survive, and the thumbs must track the dragged window — not snap back to
  // the option's initial start/end.
  test("slider drag persists across re-renders and moves the window", async ({
    page,
  }) => {
    const errors = await openSolo(page, "dataZoom", VIEWPORTS[2]);
    expect(errors).toEqual([]);

    const group = page.locator(".dc-datazoom").first();
    await expect(group).toBeVisible();
    const fill = group.locator("rect").nth(1);
    const fillBefore = await fill.getAttribute("x");

    // Drag the left handle rightward with a real mouse.
    const handle = group.locator("rect").nth(2);
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    const startX = handleBox!.x + handleBox!.width / 2;
    const startY = handleBox!.y + handleBox!.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 60, startY, { steps: 6 });

    // Mid-drag: the same group element must still be in the DOM (identity
    // survives the re-render that the first mousemove triggered).
    const sameGroup = await page.evaluate(
      (el) => document.querySelector(".dc-datazoom") === el,
      await group.elementHandle(),
    );
    expect(sameGroup).toBe(true);

    await page.mouse.up();
    const fillAfter = await fill.getAttribute("x");
    expect(Number(fillAfter)).toBeGreaterThan(Number(fillBefore));

    await page.screenshot({ path: join(shotsDir, "dataZoom-after-drag.png") });
    expect(errors).toEqual([]);
  });

  test("legend click hides its series (and survives a resize)", async ({
    page,
  }) => {
    const errors = await openSolo(page, "barStacked", VIEWPORTS[2]);
    expect(errors).toEqual([]);

    const legend = page.locator(".dc-legend").first();
    await expect(legend).toBeVisible();
    // First legend item hit area (even-indexed rects are hit areas). Dispatch
    // directly: the label text sits on top of the hit rect and would
    // intercept a positional click.
    const firstHit = legend.locator("rect").first();
    await firstHit.dispatchEvent("click");
    await page.waitForTimeout(300);

    // The item is now in the disabled state (dimmed swatch/label).
    const dimmed = await legend.locator("text[opacity='0.5']").count();
    expect(dimmed).toBeGreaterThan(0);

    // Resize must NOT reset the toggle (regression: resize re-ran
    // setOption(), wiping hiddenSeries).
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(600);
    const stillDimmed = await legend.locator("text[opacity='0.5']").count();
    expect(stillDimmed).toBeGreaterThan(0);

    await page.screenshot({
      path: join(shotsDir, "barStacked-legend-toggle-after-resize.png"),
    });
    expect(errors).toEqual([]);
  });
});
