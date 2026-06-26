---
title: "CI Integration"
description: "Running @domphy/audit in GitHub Actions, saving SVG artifacts, and using checkLayout for fast audit jobs."
---

# CI Integration

`@domphy/audit` integrates with any CI that can run Playwright. The typical setup is a dedicated audit job that starts a local dev server, runs checks via `@playwright/test`, and uploads the SVG as an artifact when violations are found.

## Install

```bash
npm install -D @domphy/audit playwright @playwright/test
npx playwright install chromium
```

## Basic Playwright test

The simplest audit test calls `checkLayout` on a running page and fails if any issues are found:

```ts
// tests/audit.spec.ts
import { test, expect } from "@playwright/test"
import { checkLayout } from "@domphy/audit"
import { writeFileSync, mkdirSync } from "node:fs"

test("layout audit — homepage", async ({ page }) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  const result = await checkLayout(page)

  if (!result.ok) {
    mkdirSync("test-results", { recursive: true })
    writeFileSync("test-results/audit-homepage.svg", result.svg)
  }

  expect(result.ok).toBe(true)
})
```

## Playwright config

Point `webServer` at your dev server so Playwright starts it automatically and waits until it is ready:

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
```

Locally, `reuseExistingServer: true` reuses an already-running dev server so you do not wait for a cold start on every run.

## GitHub Actions workflow

```yaml
# .github/workflows/audit.yml
name: Layout Audit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  audit:
    name: Audit layout
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run layout audit
        run: npx playwright test tests/audit.spec.ts

      - name: Upload SVG artifacts on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: audit-svgs
          path: test-results/*.svg
          retention-days: 14
```

When the audit fails, the SVG files are uploaded as build artifacts. Open them in a browser to see which elements are flagged.

## Auditing multiple pages

Use a data-driven test to audit several routes in one run:

```ts
// tests/audit.spec.ts
import { test, expect } from "@playwright/test"
import { checkLayout } from "@domphy/audit"
import { writeFileSync, mkdirSync } from "node:fs"

const PAGES = [
  { name: "home", path: "/" },
  { name: "dashboard", path: "/dashboard" },
  { name: "settings", path: "/settings" },
]

for (const { name, path } of PAGES) {
  test(`layout audit — ${name}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState("networkidle")

    const result = await checkLayout(page)

    if (!result.ok) {
      mkdirSync("test-results", { recursive: true })
      writeFileSync(`test-results/audit-${name}.svg`, result.svg)
    }

    expect(result.ok).toBe(true)
  })
}
```

## Running only specific checks

`checkLayout` accepts an `AuditOptions` object. In CI you may want to skip certain checks or tune thresholds:

```ts
import { checkLayout } from "@domphy/audit"

// Skip overlap on pages that intentionally layer elements (e.g. a canvas editor)
const result = await checkLayout(page, {
  checks: ["theme", "geometry", "contrast", "overlay"]
})

// Stricter contrast threshold (WCAG AAA for body text)
const strict = await checkLayout(page, { minContrast: 7.0 })

// Wider geometry tolerance for a viewport that causes subpixel rounding
const rounded = await checkLayout(page, { tolerance: 2 })
```

See [`checkLayout` API](./check-layout) for the full option reference.

## Interactive overlay audit in CI

`checkLayout` operates on the current page state and does not trigger hover interactions. To also audit dropdowns and menus that open on hover, use `scanInteractive`:

```ts
import { scanInteractive } from "@domphy/audit"
import type { AuditPageFull } from "@domphy/audit"

test("interactive audit — nav dropdowns", async ({ page }) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  // scanInteractive hovers all potential overlay triggers and checks
  // the overlays that become visible
  const result = await scanInteractive(page as AuditPageFull, {
    hoverDelay: 200, // ms to wait after each hover before checking
  })

  if (!result.ok) {
    writeFileSync("test-results/audit-interactive.svg", result.svg)
  }

  expect(result.ok).toBe(true)
})
```

`scanInteractive` also accepts `staticOnly: true` to skip the hover phase — equivalent to `checkLayout` but using the `AuditPageFull` interface.

## CLI in CI

For a quick smoke-test without writing a test file, the CLI works against any accessible URL:

```bash
# Start your server first, then:
npx @domphy/audit http://localhost:5173

# --static skips interactive hover scan (faster)
npx @domphy/audit http://localhost:5173 --static

# Exit code 0 = no issues; exit code 1 = issues found
# Use in a shell script:
npx @domphy/audit https://staging.myapp.com || exit 1
```

The CLI prints each issue with its type, position, and message:

```
Auditing http://localhost:5173...

3 issue(s) found:

  [theme] document.documentElement is missing data-theme attribute
  [contrast] [320,84 210×22] contrast 2.91:1 < 4.5 on <span> "Powered by Domphy"
  [overlap] [0,0 100×100] <div.sidebar_a1b> overlaps <main.content_c2d> by 12×400px
```

## Keeping audit fast

- `checkLayout` runs all 5 checks in parallel — a full audit on a typical page takes under 200ms in Playwright.
- `scanInteractive` adds one hover+wait per discovered trigger (default 150ms each). On a page with many nav items this can add seconds. Use it only for pages where overlay bugs are a concern.
- Run audit tests in a separate job so they do not block your unit test job.
- Cache Playwright browsers between runs using `actions/cache` on `~/.cache/ms-playwright`.
