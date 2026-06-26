---
title: "checkLayout API"
description: "The checkLayout() function: selective checks, AuditOptions tuning, and how it differs from scanInteractive."
---

# `checkLayout`

`checkLayout` is the main orchestration entry point for `@domphy/audit`. It runs all five audit checks in parallel on the current page state and returns a combined `AuditResult`.

```ts
import { checkLayout } from "@domphy/audit"

const result = await checkLayout(page)
console.log(result.ok)       // boolean — false if any issues found
console.log(result.issues)   // AuditIssue[]
console.log(result.svg)      // annotated SVG string
```

## Signature

```ts
function checkLayout(
  page: AuditPage,
  options?: AuditOptions
): Promise<AuditResult>
```

`AuditPage` is a minimal interface compatible with any Playwright `Page` object:

```ts
interface AuditPage {
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>
}
```

Pass a Playwright `page` directly — it satisfies the interface.

## AuditOptions

```ts
interface AuditOptions {
  checks?: ("overlap" | "geometry" | "contrast" | "theme" | "overlay")[]
  tolerance?: number
  minContrast?: number
}
```

### `checks` — which checks to run

Default: `["theme", "overlap", "geometry", "contrast", "overlay"]` (all five).

Omit checks that are not relevant to the page under test:

```ts
// Only run contrast and theme checks
const result = await checkLayout(page, {
  checks: ["theme", "contrast"]
})

// Run everything except overlap (page intentionally layers elements)
const result = await checkLayout(page, {
  checks: ["theme", "geometry", "contrast", "overlay"]
})

// Run a single check
const result = await checkLayout(page, { checks: ["contrast"] })
```

Checks that are excluded from `checks` return zero issues. The SVG snapshot is always collected regardless of `checks`.

### `tolerance` — geometry deviation in pixels

Default: `1` (px).

Used by the `geometry` check. A Domphy button's rendered height is compared against the expected value from the formula `(6 + 2d) × U`. If the deviation exceeds `tolerance`, the button is flagged.

```ts
// Allow up to 2px deviation — useful for subpixel rounding on HiDPI displays
const result = await checkLayout(page, { tolerance: 2 })
```

Has no effect when `"geometry"` is not included in `checks`.

### `minContrast` — minimum WCAG contrast ratio

Default: `4.5` (WCAG AA for normal text).

Used by the `contrast` check. Any text element with a ratio below this threshold is flagged.

```ts
// WCAG AA: 4.5 (default)
const aa = await checkLayout(page, { minContrast: 4.5 })

// WCAG AA for large text (18pt+): 3.0
const large = await checkLayout(page, { minContrast: 3.0 })

// WCAG AAA for body text: 7.0
const aaa = await checkLayout(page, { minContrast: 7.0 })
```

Has no effect when `"contrast"` is not included in `checks`.

## Execution model

`checkLayout` runs all selected checks **in parallel** via `Promise.all`, plus one additional `snapshot` call for the SVG. Total browser round-trips: 1 per check + 1 for the snapshot. For the default 5-check run, that is 6 concurrent `page.evaluate()` calls.

```
checkTheme(page)
detectOverlaps(page)     ← all 5 run concurrently
verifyGeometry(page, tolerance)
checkContrast(page, minContrast)
checkOverlays(page)
snapshot(page)           ← always runs for SVG
```

Issues from all selected checks are merged into a single `issues` array. The `svg` is built from the snapshot and all collected issues.

## Calling individual checks

All check functions are exported individually. Call them directly when you need results from a single check without the overhead of `checkLayout`:

```ts
import {
  checkTheme,
  detectOverlaps,
  verifyGeometry,
  checkContrast,
  checkOverlays,
} from "@domphy/audit"

// Run only the contrast check
const contrastIssues = await checkContrast(page)           // default 4.5:1
const strict = await checkContrast(page, 7.0)              // custom threshold

// Run only the geometry check
const geometryIssues = await verifyGeometry(page)          // default tolerance 1px
const loose = await verifyGeometry(page, 2)               // 2px tolerance

// Run theme, overlap, and overlay checks
const [theme, overlaps, overlays] = await Promise.all([
  checkTheme(page),
  detectOverlaps(page),
  checkOverlays(page),
])
```

The individual functions each return `Promise<AuditIssue[]>` — not `AuditResult`.

## `checkLayout` vs `scanInteractive`

| | `checkLayout` | `scanInteractive` |
|---|---|---|
| Page interface | `AuditPage` | `AuditPageFull` |
| Requires `hover()` | No | Yes |
| Geometry check | Yes (default) | No |
| Hover trigger discovery | No | Yes |
| Options | `AuditOptions` | `{ hoverDelay, staticOnly }` |
| Configurable checks | Yes (`checks` array) | No (fixed set) |
| Deduplicates issues | No | Yes |

`checkLayout` is the right choice for:
- Most page-level regression tests
- CI audit jobs where interactive hover is not needed
- When you need `AuditOptions` to tune thresholds or skip checks

`scanInteractive` is the right choice for:
- Pages with hover-triggered dropdowns, menus, or popovers
- When you want automatic overlay trigger discovery
- Full end-to-end interactive audits

Note: `scanInteractive` does not run the `geometry` check. If you need to test button geometry on a page that also has interactive overlays, run both:

```ts
import { checkLayout, scanInteractive } from "@domphy/audit"
import type { AuditPageFull } from "@domphy/audit"

await page.goto("/")
await page.waitForLoadState("networkidle")

// Run static checks including geometry
const static_ = await checkLayout(page)

// Run interactive checks for overlays
const interactive = await scanInteractive(page as AuditPageFull)

// Merge and report
const allIssues = [...static_.issues, ...interactive.issues]
if (allIssues.length > 0) {
  for (const issue of allIssues) {
    console.log(`[${issue.type}] ${issue.message}`)
  }
}
```

## Full example

```ts
import { test, expect } from "@playwright/test"
import { checkLayout } from "@domphy/audit"
import { writeFileSync } from "node:fs"

test.describe("layout audit", () => {
  test("homepage — all checks", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const result = await checkLayout(page)

    if (!result.ok) {
      writeFileSync("test-results/audit-homepage.svg", result.svg)
      console.table(
        result.issues.map((i) => ({
          type: i.type,
          message: i.message.slice(0, 80),
          x: i.rect?.x,
          y: i.rect?.y,
        }))
      )
    }

    expect(result.ok).toBe(true)
  })

  test("settings page — contrast only", async ({ page }) => {
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")

    // Only audit contrast; skip geometry/overlap which are tested elsewhere
    const result = await checkLayout(page, {
      checks: ["contrast"],
      minContrast: 4.5,
    })

    expect(result.issues).toHaveLength(0)
  })

  test("editor page — loose geometry tolerance", async ({ page }) => {
    await page.goto("/editor")
    await page.waitForLoadState("networkidle")

    // Editor uses a canvas + toolbar; allow 2px rounding in button geometry
    const result = await checkLayout(page, {
      checks: ["theme", "contrast", "geometry"],
      tolerance: 2,
    })

    expect(result.ok).toBe(true)
  })
})
```
