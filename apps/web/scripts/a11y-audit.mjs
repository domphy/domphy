/**
 * Enterprise a11y gate (Front-End Checklist → Accessibility).
 *
 * Audits one or more public/local URLs with axe-core via Puppeteer.
 * Fails (exit 1) on critical/serious violations unless --warn-only.
 *
 * Usage:
 *   node apps/web/scripts/a11y-audit.mjs [url...]
 *   A11Y_URLS="https://domphy.com,https://domphy.com/docs" node apps/web/scripts/a11y-audit.mjs
 *   node apps/web/scripts/a11y-audit.mjs --warn-only https://domphy.com
 */

import { readdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import AxePuppeteer from "@axe-core/puppeteer";
import puppeteer from "puppeteer";

const args = process.argv.slice(2).filter((a) => a !== "--warn-only");
const warnOnly = process.argv.includes("--warn-only");
const envUrls = (process.env.A11Y_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const urls =
  args.length > 0
    ? args
    : envUrls.length > 0
      ? envUrls
      : ["https://domphy.com", "https://domphy.com/docs/quickstart"];

const FAIL_IMPACTS = new Set(["critical", "serious"]);

/** Prefer system Chrome / cached headless-shell so CI without full Chrome still works. */
function resolveChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  // Puppeteer cache: chrome-headless-shell (postinstall) or chrome
  const cacheRoot = join(homedir(), ".cache", "puppeteer");
  for (const product of ["chrome-headless-shell", "chrome"]) {
    const productDir = join(cacheRoot, product);
    if (!existsSync(productDir)) continue;
    for (const rev of readdirSync(productDir).sort().reverse()) {
      const win = join(
        productDir,
        rev,
        product === "chrome" ? "chrome-win64" : "chrome-headless-shell-win64",
        product === "chrome" ? "chrome.exe" : "chrome-headless-shell.exe",
      );
      const linux = join(
        productDir,
        rev,
        product === "chrome" ? "chrome-linux64" : "chrome-headless-shell-linux64",
        product === "chrome" ? "chrome" : "chrome-headless-shell",
      );
      if (existsSync(win)) return win;
      if (existsSync(linux)) return linux;
    }
  }
  return undefined;
}

function formatNodes(nodes, limit = 3) {
  return nodes
    .slice(0, limit)
    .map((n) => `    - ${n.target?.join(" ") ?? "?"} :: ${(n.failureSummary ?? n.html ?? "").slice(0, 120)}`)
    .join("\n");
}

async function auditUrl(browser, url) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60_000);
  try {
    await page.goto(url, { waitUntil: "networkidle2" });
    // Give islands / theme a beat to settle.
    await new Promise((r) => setTimeout(r, 500));
    const results = await new AxePuppeteer(page)
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    return { url, results };
  } finally {
    await page.close();
  }
}

const executablePath = resolveChromePath();
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

let failed = false;
const summary = [];

try {
  for (const url of urls) {
    process.stdout.write(`\n▶ axe audit: ${url}\n`);
    const { results } = await auditUrl(browser, url);
    const violations = results.violations ?? [];
    const blocking = violations.filter((v) =>
      (v.impact ? FAIL_IMPACTS.has(v.impact) : true),
    );

    for (const v of violations) {
      const mark = FAIL_IMPACTS.has(v.impact) ? "FAIL" : "warn";
      console.log(
        `  [${mark}] ${v.id} (${v.impact ?? "unknown"}) — ${v.help} [${v.nodes.length} node(s)]`,
      );
      console.log(formatNodes(v.nodes));
      console.log(`    → ${v.helpUrl}`);
    }

    // Front-End Checklist structural checks beyond axe.
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });
    const structural = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        lang: html.getAttribute("lang"),
        viewport: !!document.querySelector('meta[name="viewport"]'),
        charset: !!document.querySelector("meta[charset], meta[http-equiv='Content-Type']"),
        skipLink: !!document.querySelector('a.dp-skip-link, a[href="#main-content"]'),
        main: !!document.querySelector("main, #main-content, [role='main']"),
        doctype: document.doctype?.name === "html",
      };
    });
    await page.close();

    const structuralFails = [];
    if (!structural.lang) structuralFails.push("html[lang] missing");
    if (!structural.viewport) structuralFails.push("viewport meta missing");
    if (!structural.charset) structuralFails.push("charset missing");
    if (!structural.main) structuralFails.push("main landmark / #main-content missing");
    if (!structural.skipLink) structuralFails.push("skip-to-content link missing");
    if (!structural.doctype) structuralFails.push("HTML5 doctype missing");

    for (const f of structuralFails) {
      console.log(`  [FAIL] structural — ${f}`);
    }

    const ok = blocking.length === 0 && structuralFails.length === 0;
    summary.push({
      url,
      violations: violations.length,
      blocking: blocking.length,
      structuralFails: structuralFails.length,
      ok,
    });
    if (!ok) failed = true;
    console.log(
      ok
        ? `  ✓ clean (${violations.length} non-blocking / none)`
        : `  ✗ ${blocking.length} blocking axe + ${structuralFails.length} structural`,
    );
  }
} finally {
  await browser.close();
}

console.log("\n=== a11y summary ===");
for (const row of summary) {
  console.log(
    `${row.ok ? "✓" : "✗"} ${row.url} — axe:${row.violations} (blocking:${row.blocking}) structural:${row.structuralFails}`,
  );
}

if (failed && !warnOnly) {
  process.exit(1);
}
if (failed && warnOnly) {
  console.log("\n(warn-only: not failing CI)");
}
