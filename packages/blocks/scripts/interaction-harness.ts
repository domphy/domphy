// Shared boot/teardown helper for REAL browser interaction checks (click,
// hover, keyboard, drag) against packages/blocks' demo harness — as opposed
// to visual-compare.ts, which only screenshots a static render. Each
// check script under scripts/interaction-checks/<name>.ts imports this,
// mounts one or more blocks, drives real input events, and asserts the
// resulting DOM/state actually changed as expected (not just "didn't throw").
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, type BrowserContext, type Locator, type Page, chromium } from "playwright";
import { createServer, type ViteDevServer } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

export type CheckResult = { name: string; pass: boolean; detail: string };

const results: CheckResult[] = [];

/** Record one assertion's outcome. Never throws — always keep checking the rest. */
export function report(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
}

export function summarize(): never {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  }
  process.exit(failed.length ? 1 : 0);
}

let server: ViteDevServer | undefined;
let browser: Browser | undefined;

/** Boots the vite demo server + a browser once; call teardown() when done. */
export async function boot(): Promise<{ browser: Browser; demoUrl: string }> {
  server = await createServer({
    root: packageRoot,
    configFile: resolve(packageRoot, "vite.demo.config.ts"),
    server: { port: 0 },
  });
  await server.listen();
  const address = server.httpServer?.address();
  const port = typeof address === "object" && address ? address.port : 5610;
  browser = await chromium.launch();
  return { browser, demoUrl: `http://localhost:${port}/demo.html` };
}

export async function teardown(): Promise<void> {
  await browser?.close();
  await server?.close();
}

/** Retries `action` once if it fails because the page navigated out from
 * under it — the demo bundle imports all ~250 blocks at once, so on a cold
 * dev-server start Vite's dependency crawler sometimes discovers a
 * previously-unbundled dep mid-request and forces one client-side full
 * reload ("Re-optimizing dependencies..."/"page reload ..." in the vite
 * log). If that lands between our readiness check and the next `evaluate`,
 * Playwright throws "execution context was destroyed" — just wait for the
 * page to settle again and retry once rather than failing the whole check. */
async function retryAcrossReload<T>(page: Page, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/execution context was destroyed|Target closed|disconnectLazyMount is not a function|mountBlock is not a function/i.test(message)) {
      throw error;
    }
    await page.waitForLoadState("networkidle");
    return action();
  }
}

/** Wraps `page.close()` so closing the page also closes its own context —
 * every caller already just calls `page.close()`, so this makes context
 * cleanup transparent instead of requiring every call site to track and
 * close the context separately. */
function attachContextAutoClose(page: Page, context: BrowserContext): Page {
  const originalClose = page.close.bind(page);
  page.close = (async (options?: Parameters<Page["close"]>[0]) => {
    await originalClose(options);
    await context.close().catch(() => {});
  }) as Page["close"];
  return page;
}

/** Navigates a fresh page, disconnects lazy-mount (so nothing else shifts
 * around while we interact), and force-mounts the requested block.
 *
 * Uses an explicit `browser.newContext()` + `context.newPage()` rather than
 * the `browser.newPage()` shorthand: that shorthand marks the context as
 * "single-owner" (Playwright throws "Please use browser.newContext()" if
 * anything tries to open a second page in it) — which is exactly what
 * `AxeBuilder#analyze()` does internally (it opens its own scratch page in
 * the same context to run `axe.finishRun()`), so every axe-core scan against
 * a `mountedPage()`-created page failed until this was an explicit context. */
export async function mountedPage(demoUrl: string, name: string): Promise<Page> {
  const context = await browser!.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(demoUrl, { waitUntil: "networkidle" });
    await retryAcrossReload(page, async () => {
      await page.waitForFunction(() => typeof (window as unknown as { disconnectLazyMount?: unknown }).disconnectLazyMount === "function");
      await page.evaluate(() => (window as unknown as { disconnectLazyMount: () => void }).disconnectLazyMount());
    });
    await retryAcrossReload(page, async () => {
      await page.waitForFunction(() => typeof (window as unknown as { mountBlock?: unknown }).mountBlock === "function");
      await page.evaluate((n) => (window as unknown as { mountBlock: (x: string) => void }).mountBlock(n), name);
    });
    await page.locator(`[data-block="${name}"]`).locator("*").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    return attachContextAutoClose(page, context);
  } catch (error) {
    // Without this, a page that fails partway through setup (goto timeout,
    // mountBlock never appearing) is never returned to the caller and so
    // never gets closed by the caller's own cleanup — leaking a live
    // renderer process for the rest of a long scan loop.
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    throw error;
  }
}

/** Like `mountedPage`, but runs `beforeNavigate` (e.g. `page.addInitScript(...)`)
 * on the fresh page before navigating — for checks that need to instrument
 * the page (e.g. tag WebGL calls) before the demo bundle's module script runs. */
export async function mountedPageWithInit(
  demoUrl: string,
  name: string,
  beforeNavigate: (page: Page) => Promise<void>,
): Promise<Page> {
  const context = await browser!.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  try {
    await beforeNavigate(page);
    await page.goto(demoUrl, { waitUntil: "networkidle" });
    await retryAcrossReload(page, async () => {
      await page.waitForFunction(() => typeof (window as unknown as { disconnectLazyMount?: unknown }).disconnectLazyMount === "function");
      await page.evaluate(() => (window as unknown as { disconnectLazyMount: () => void }).disconnectLazyMount());
    });
    await retryAcrossReload(page, async () => {
      await page.waitForFunction(() => typeof (window as unknown as { mountBlock?: unknown }).mountBlock === "function");
      await page.evaluate((n) => (window as unknown as { mountBlock: (x: string) => void }).mountBlock(n), name);
    });
    await page.locator(`[data-block="${name}"]`).locator("*").first().waitFor({ state: "attached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    return attachContextAutoClose(page, context);
  } catch (error) {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    throw error;
  }
}

/** Scrolls the block into view and returns its bounding box (post-scroll, so
 * mouse/click coordinates are meaningful). */
export async function locate(page: Page, name: string) {
  await page.evaluate(
    (n) => document.querySelector(`[data-block="${n}"]`)?.scrollIntoView({ block: "center" }),
    name,
  );
  await page.waitForTimeout(200);
  return page.locator(`[data-block="${name}"]`);
}

/** Screenshots exactly `locator`'s bounding box and returns the raw PNG bytes.
 * Used to prove a WebGL canvas (e.g. `globe`) actually re-rendered different
 * pixels after a drag/wheel interaction — NOT `canvas.toDataURL()` (unreliable
 * without `preserveDrawingBuffer`) and NOT `locator.screenshot()` (its
 * built-in scroll-then-capture reads a blank WebGL buffer, per
 * visual-compare.ts's own note). A manual boundingBox() + clipped
 * `page.screenshot()` captures the real compositor output every time. */
export async function pixelSnapshot(page: Page, locator: Locator): Promise<Buffer> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("pixelSnapshot: locator has no bounding box (not visible?)");
  return page.screenshot({ clip: box });
}
