// Diagnostic: counts live CSSOM rules across boot / create / swap / clear to
// verify StyleList.patchCSS empty-rule guard (swap must add 0 rules; see REPORT.md).
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(
  path.join(dir, "..", "apps", "web", "package.json"),
);
const { chromium } = require("@playwright/test");

const { url, close } = await serve(4190);
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${url}/index.html?impl=fine`, { waitUntil: "load" });
  await page.waitForSelector("#run");

  const ruleCount = () =>
    page.evaluate(() => {
      let n = 0;
      for (const s of document.styleSheets) {
        try {
          n += s.cssRules.length;
        } catch {}
      }
      return n;
    });

  const step = async (label, fn) => {
    if (fn) {
      await fn();
      await page.evaluate(() => window.__flushSync());
    }
    console.log(`${label}: ${await ruleCount()} cssRules`);
  };

  await step("boot");
  await step("create 1k", () => page.click("#run"));
  await step("after swap", () => page.click("#swaprows"));
  await step("after clear", () => page.click("#clear"));
} finally {
  if (browser) await browser.close();
  await close();
}
