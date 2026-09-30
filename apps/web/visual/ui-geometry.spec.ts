import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import * as esbuild from "esbuild";
import type { Finding } from "./ui-geometry-page.ts";
import { PATCHES, runId } from "./ui-geometry-run.ts";

/**
 * GEOMETRY audit of every @domphy/ui patch (packages/ui/tests/patch-catalog.ts
 * HOST + PATCH_ARGS), measured in real Chromium.
 *
 * Matrix: font size 12/14/16/18/20/24 px applied to (a) the ROOT (rem-based
 * themeSize scales, em-based spacing scales) and (b) the HOST only (root 16 px,
 * the surrounding wrapper's font-size = the size — the toggleGroup 0.22.5 bug
 * mechanism), x light/dark, x five densities (dataDensity decrease-2 … increase-2
 * plus the default) — one page, patches x variants (label, icon+label,
 * label+icon, value/placeholder, checkbox/radio/switch+label, sizes/variants).
 *
 * Every rule below is a geometric invariant, never a snapshot.
 *
 *   pnpm --filter domphy-web visual:ui-geometry
 *   GEOMETRY_PATCHES=toggleGroup,tabs …   mount and assert only those patches
 *   GEOMETRY_SHOTS=0 …                    skip the per-patch contact sheets
 *
 * Output (report.txt / report.json / shots/) goes to
 * apps/web/.ui-qa/geometry/<GEOMETRY_PATCHES or GEOMETRY_RUN>/, and the esbuild
 * bundle to visual/.serve/<same>/ — both gitignored, both per run, so several of
 * these run side by side. It starts no server, so there is no port to clash on.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..", "..");

const outDir = join(here, ".serve", runId);
const bundlePath = join(outDir, "ui-geometry.js");
const reportDir = resolve(here, "..", ".ui-qa", "geometry", runId);

const SIZES = [12, 14, 16, 18, 20, 24] as const;
const THEMES = ["light", "dark"] as const;
type Config = {
  root: number;
  host: number;
  lineHeight: string;
  theme: "light" | "dark";
};
/** Host line-height: normal (UA default), 1.5 (Tailwind/Bootstrap body), 1.8 (WordPress-style themes). */
const LINE_HEIGHTS = ["normal", "1.5", "1.8"] as const;

const CONFIGS: Config[] = [];
for (const theme of THEMES) {
  for (const lineHeight of LINE_HEIGHTS) {
    for (const size of SIZES)
      CONFIGS.push({ root: size, host: size, lineHeight, theme });
    for (const size of SIZES) {
      if (size !== 16)
        CONFIGS.push({ root: 16, host: size, lineHeight, theme });
    }
  }
}
const label = (c: Config) =>
  `${c.root === c.host ? `root${c.root}` : `host${c.host}`}/lh${c.lineHeight}/${c.theme}`;

type Row = Finding & { configs: string[]; densities: string[]; worst: string };
let rows: Row[] = [];
let mountErrors: string[] = [];

async function bundle(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  await esbuild.build({
    entryPoints: [join(here, "ui-geometry-page.ts")],
    bundle: true,
    format: "iife",
    outfile: bundlePath,
    platform: "browser",
    target: "es2022",
    tsconfigRaw: "{}",
    alias: {
      "@domphy/core": join(repo, "packages/core/src/index.ts"),
      "@domphy/theme": join(repo, "packages/theme/src/index.ts"),
      "@domphy/ui": join(repo, "packages/ui/src/index.ts"),
      "@domphy/floating": join(repo, "packages/floating/src/index.ts"),
      // packages/floating vendors floating-ui; tsup.config.ts aliases the same three.
      "@floating-ui/utils/dom": join(
        repo,
        "packages/floating/src/utils/dom.ts",
      ),
      "@floating-ui/utils": join(repo, "packages/floating/src/utils/index.ts"),
      "@floating-ui/core": join(repo, "packages/floating/src/core/index.ts"),
    },
    define: { "process.env.NODE_ENV": '"development"' },
    logLevel: "warning",
  });
}

async function openPage(page: Page): Promise<void> {
  await page.goto("about:blank");
  await page.setContent(
    '<!doctype html><html data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>*,*::before,*::after{box-sizing:border-box}</style>' +
      `<script>window.__geoPatches=${JSON.stringify(PATCHES)}</script>` +
      '</head><body><div id="root"></div></body></html>',
  );
  await page.addScriptTag({ path: bundlePath });
  await page.waitForFunction(() => window.__geo?.ready === true, undefined, {
    timeout: 120_000,
  });
}

function aggregate(perConfig: { config: string; found: Finding[] }[]): Row[] {
  const map = new Map<string, Row>();
  for (const { config, found } of perConfig) {
    for (const f of found) {
      const key = [f.rule, f.patch, f.variant, f.el].join("|");
      const hit = map.get(key);
      if (!hit) {
        map.set(key, {
          ...f,
          configs: [config],
          densities: [f.density],
          worst: config,
        });
      } else {
        if (!hit.configs.includes(config)) hit.configs.push(config);
        if (!hit.densities.includes(f.density)) hit.densities.push(f.density);
        if (Math.abs(f.measured) > Math.abs(hit.measured)) {
          hit.measured = f.measured;
          hit.detail = f.detail;
          hit.worst = config;
        }
      }
    }
  }
  return [...map.values()];
}

function format(list: Row[]): string {
  const byPatch = new Map<string, Row[]>();
  for (const r of list)
    byPatch.set(r.patch, [...(byPatch.get(r.patch) ?? []), r]);
  const lines: string[] = [];
  for (const [patch, items] of [...byPatch].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    lines.push(`${patch}`);
    for (const r of items) {
      lines.push(
        `  ${r.rule} [${r.variant}/${r.density}] ${r.el}  max ${r.measured}px  in ${r.configs.length} configs (${summariseConfigs(r.configs)})\n      ${r.detail}`,
      );
    }
  }
  return lines.join("\n");
}

/** Which line-heights, font sizes and modes fail, e.g. "lh[1.8] size[12,14,16] modes[root,host]". */
function summariseConfigs(configs: string[]): string {
  const parts = configs.map(
    (c) => /^(root|host)(\d+)\/lh([^/]+)\/(.+)$/.exec(c)!,
  );
  const uniq = (i: number) => [...new Set(parts.map((m) => m[i]))].join(",");
  return `lh[${uniq(3)}] px[${uniq(2)}] mode[${uniq(1)}] theme[${uniq(4)}]`;
}

const failing = (rule: Finding["rule"]) => rows.filter((r) => r.rule === rule);

test.beforeAll(async ({ browser }) => {
  test.setTimeout(900_000);
  await bundle();
  const page = await browser.newPage({
    viewport: { width: 2200, height: 1000 },
  });
  await openPage(page);
  const perConfig: { config: string; found: Finding[] }[] = [];
  for (const config of CONFIGS) {
    await page.evaluate((c) => window.__geo.apply(c), config);
    const found = await page.evaluate(() => window.__geo.measure());
    perConfig.push({ config: label(config), found });
  }
  await page.evaluate(() =>
    window.__geo.apply({
      root: 16,
      host: 16,
      lineHeight: "normal",
      theme: "light",
    }),
  );
  // A real Tab keypress sets keyboard modality, so programmatic focus() is :focus-visible
  // (focusRings() throws if that ever stops holding).
  await page.bringToFront();
  await page.keyboard.press("Tab");
  const rings = await page.evaluate(() => window.__geo.focusRings());
  perConfig.push({ config: "root16/lhnormal/light", found: rings });
  mountErrors = await page.evaluate(() => window.__geo.errors);
  rows = aggregate(perConfig);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "report.json"), JSON.stringify(rows, null, 1));
  writeFileSync(join(reportDir, "report.txt"), format(rows));
  console.log(
    `geometry: ${PATCHES.length ? PATCHES.join(",") : "all patches"} -> ${reportDir}`,
  );
  await page.close();
});

test("geometry invariants R0..R5 hold for every patch", async () => {
  const rules: [Finding["rule"], string][] = [
    [
      "R0",
      "R0 mount contract: every patch cell lays out and mounts with zero console errors",
    ],
    [
      "R1",
      "R1 truth: half-leading is symmetric, so a single-line control's label centre = its padding-box centre (|Δ| ≤ 1px)",
    ],
    [
      "R2",
      "R2 truth: a control not meant to scroll has scrollSize ≤ clientSize + 1 and its text is not clipped by an overflow:hidden ancestor",
    ],
    [
      "R3",
      "R3 truth: a line box of computed line-height L needs a content box ≥ L (CSS 2.1 §10.6.3), else it overflows the fixed height",
    ],
    [
      "R4",
      "R4 truth: children of a single-line control (icon, indicator, text) share one vertical centre (|Δ| ≤ 1px)",
    ],
    [
      "R5",
      "R5 truth: siblings of one kind share a height; same-intent form controls in a row share height and centre line; a focus ring is not clipped by an ancestor",
    ],
  ];
  for (const [rule, title] of rules) {
    await test.step(title, () => {
      const bad = failing(rule);
      const errors = rule === "R0" ? mountErrors.join(", ") : "";
      expect.soft(errors, "console errors while mounting").toBe("");
      expect.soft(format(bad), `${bad.length} failing`).toBe("");
    });
  }
});

test("contact sheets: one per patch at 14px and 20px, light and dark", async ({
  browser,
}) => {
  test.skip(
    process.env.GEOMETRY_SHOTS === "0",
    "GEOMETRY_SHOTS=0 disables the sheets",
  );
  test.setTimeout(900_000);
  const dir = join(reportDir, "shots");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 2200, height: 1000 },
  });
  await openPage(page);
  const sheets = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll("[data-geo-section='default'] [data-geo-sheet]"),
    ).map((g) => g.getAttribute("data-geo-sheet") as string),
  );
  await page.addStyleTag({
    content: "[id^='domphy-toast-'] { display: none !important }",
  });
  for (const size of [14, 20] as const) {
    for (const theme of THEMES) {
      await page.evaluate((c) => window.__geo.apply(c), {
        root: size,
        host: size,
        lineHeight: "normal",
        theme,
      });
      for (const patch of sheets) {
        await page
          .locator(
            `[data-geo-section='default'] [data-geo-sheet="${patch}"]`,
          )
          .screenshot({
            path: join(
              dir,
              `${patch.replace(/[^a-zA-Z0-9]/g, "_")}-${size}px-${theme}.png`,
            ),
          });
      }
    }
  }
  console.log(`contact sheets: ${dir}`);
  await page.close();
});
