#!/usr/bin/env node
/**
 * @domphy/audit CLI — run a full interactive audit on a URL.
 *
 * Usage:
 *   npx @domphy/audit <url>
 *   npx @domphy/audit http://localhost:5173
 *   npx @domphy/audit https://domphy.com --static
 *
 * Requires `playwright` to be installed in your project:
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 */

(async () => {
  const url = process.argv[2];
  const staticOnly = process.argv.includes("--static");

  if (!url) {
    console.error("Usage: npx @domphy/audit <url> [--static]");
    process.exit(1);
  }

  let chromiumLauncher: { launch(opts?: object): Promise<unknown> };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pw = await import("playwright" as string);
    chromiumLauncher = pw.chromium;
  } catch {
    console.error(
      "Error: playwright is required. Install it with:\n  npm install --save-dev playwright\n  npx playwright install chromium",
    );
    process.exit(1);
  }

  const { scanInteractive } = await import("./discover.js");

  console.log(`Auditing ${url}...`);

  const browser = await (chromiumLauncher as any).launch({ headless: true });
  const page = await (browser as any).newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    const result = await scanInteractive(page, { staticOnly });

    if (result.issues.length === 0) {
      console.log("✓ No issues found.");
    } else {
      console.log(`\n${result.issues.length} issue(s) found:\n`);
      for (const issue of result.issues) {
        const rect = issue.rect
          ? ` [${issue.rect.x.toFixed(0)},${issue.rect.y.toFixed(0)} ${issue.rect.width.toFixed(0)}×${issue.rect.height.toFixed(0)}]`
          : "";
        console.log(`  [${issue.type}]${rect} ${issue.message}`);
      }
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
  }
})();
