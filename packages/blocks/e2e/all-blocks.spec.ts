import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import {
  attachConsole,
  isHardFailure,
  mountBlock,
  openDemo,
  scanMounted,
} from "./helpers";

/**
 * Full-catalog scan. After each mount: screenshot, axe critical/serious,
 * horizontal overflow, 300×150 replaced-element layout bug.
 * Reloads every RELOAD_EVERY mounts so WebGL contexts cannot pile up.
 *
 * Screenshots + HTML gallery: .ui-qa/blocks-e2e/ (gitignored).
 */
const RELOAD_EVERY = 8;
const shotsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  ".ui-qa",
  "blocks-e2e",
);

test.describe.configure({ timeout: 20 * 60 * 1000 });

test("every factory: screenshot + axe + overflow + layout", async ({
  page,
}) => {
  mkdirSync(shotsDir, { recursive: true });
  const consoleErrors = attachConsole(page);
  await openDemo(page);
  const registered = await page.evaluate(() =>
    [...document.querySelectorAll("[data-block]")]
      .map((element) => element.getAttribute("data-block"))
      .filter((name): name is string => !!name),
  );
  expect(registered.length).toBeGreaterThan(150);

  const seen = new Set<string>();
  const names: string[] = [];
  const only = (process.env.BLOCKS_E2E_SCAN_ONLY ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  for (const name of registered) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (only.length > 0 && !only.includes(key)) continue;
    seen.add(key);
    names.push(name);
  }

  const scans = [];
  const mountFailures: { name: string; detail: string }[] = [];
  for (let index = 0; index < names.length; index++) {
    if (index > 0 && index % RELOAD_EVERY === 0) {
      await openDemo(page);
    }
    const name = names[index];
    consoleErrors.length = 0;
    try {
      await mountBlock(page, name);
      scans.push(await scanMounted(page, name, shotsDir, consoleErrors));
    } catch (error) {
      mountFailures.push({
        name,
        detail: error instanceof Error ? error.message : String(error),
      });
      await openDemo(page);
    }
  }

  writeFileSync(
    join(shotsDir, "report.json"),
    JSON.stringify({ names, mountFailures, scans }, null, 2),
  );
  writeFileSync(
    join(shotsDir, "index.html"),
    galleryHtml(scans, mountFailures),
  );

  const hard = scans.filter(isHardFailure);
  expect(
    mountFailures,
    `mount failures:\n${JSON.stringify(mountFailures, null, 2)}`,
  ).toEqual([]);
  expect(
    hard,
    `${hard.length} blocks failed axe/overflow/layout. Open .ui-qa/blocks-e2e/index.html\n${JSON.stringify(
      hard.map((scan) => ({
        name: scan.name,
        axe: scan.axe,
        overflow: scan.overflow,
        layout300x150: scan.layout300x150,
      })),
      null,
      2,
    )}`,
  ).toEqual([]);
});

function galleryHtml(
  scans: Awaited<ReturnType<typeof scanMounted>>[],
  mountFailures: { name: string; detail: string }[],
): string {
  const rows = scans
    .map((scan) => {
      const flags = [
        scan.axe.length ? `axe:${scan.axe.length}` : "",
        scan.overflow ? "overflow" : "",
        scan.layout300x150 ? "300x150" : "",
      ]
        .filter(Boolean)
        .join(" ");
      const mark = flags
        ? `<strong style="color:#b00">${flags}</strong>`
        : "ok";
      return `<figure><img src="${scan.name}.png" alt="${scan.name}" width="320"><figcaption>${scan.name} — ${mark}</figcaption></figure>`;
    })
    .join("\n");
  const failed = mountFailures
    .map((item) => `<li>${item.name}: ${item.detail}</li>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>blocks e2e</title>
<style>body{font:14px system-ui;margin:16px}figure{display:inline-block;margin:8px;vertical-align:top}img{border:1px solid #ccc}</style>
<h1>@domphy/blocks Playwright scan</h1>
<p>Open this file to review real Chromium screenshots. Red flags fail the test.</p>
${failed ? `<h2>Mount failures</h2><ul>${failed}</ul>` : ""}
${rows}`;
}
