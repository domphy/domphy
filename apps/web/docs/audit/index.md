---
title: "@domphy/audit"
description: "Baseline-free layout and theme verification for Domphy UIs via Playwright."
---

# @domphy/audit

:::warning In Development
`@domphy/audit` is not yet published to npm. This page documents the planned API. Track progress at [github.com/domphy/domphy](https://github.com/domphy/domphy).
:::

`@domphy/audit` is a **baseline-free layout and theme verifier** for Domphy UIs. It runs after the browser renders the page and checks actual layout, theme setup, and overlay behavior — no screenshots, no baselines.

It is the runtime complement to `@domphy/doctor` (which checks the source tree before render):

| | `@domphy/doctor` | `@domphy/audit` |
|---|---|---|
| When | Before render (static) | After render (Playwright) |
| Input | Element tree | Live page |
| Catches | Intent errors in code | Rendering violations |
| Baseline needed | No | No |

## Install

```bash
npm install -D @domphy/audit playwright
npx playwright install chromium
```

Playwright is an optional peer dependency — bring the version your project already uses.

## CLI

The fastest way to audit any URL:

```bash
npx @domphy/audit https://myapp.com
npx @domphy/audit http://localhost:5173 --static
```

Exits 0 if no issues, exits 1 if any issues found. `--static` skips the interactive hover scan.

## Usage with Playwright

```ts
import { test, expect } from "@playwright/test"
import { scanInteractive } from "@domphy/audit"
import { writeFileSync } from "node:fs"

test("no layout violations", async ({ page }) => {
  await page.goto("/dashboard")
  await page.waitForLoadState("networkidle")

  const result = await scanInteractive(page)

  // Save SVG for debugging failed runs
  if (!result.ok) writeFileSync("layout-audit.svg", result.svg)

  expect(result.issues).toHaveLength(0)
})
```

## What it checks

### Static a11y (`auditA11y`)

Checks a **Domphy element tree** (plain object) for accessibility violations — no browser or Playwright required. Runs in Node, at build time, or in Vitest.

```ts
import { auditA11y } from "@domphy/audit"

const result = auditA11y(App)
console.log(result.ok)      // boolean
console.log(result.issues)  // A11yIssue[]
```

Rules: `missing-alt` (img without alt), `missing-label` (input/textarea/select without label), `heading-hierarchy` (skipped heading level), `missing-lang` (html without lang).

See the [Static a11y reference](./a11y) for the full rule documentation.

### Theme (`checkTheme`)

Detects missing Domphy theme setup — the most common cause of transparent backgrounds and invisible text:

- `data-theme` attribute missing on `<html>` — CSS vars like `--neutral-0` are scoped to `[data-theme]` and will be unresolved
- `--neutral-0` CSS custom property unresolved (resolves to empty string)

```ts
import { checkTheme } from "@domphy/audit"

const issues = await checkTheme(page)
// [{ type: "theme", message: "document.documentElement is missing data-theme attribute..." }]
```

### Overlay (`checkOverlays`)

Detects visible positioned overlay elements (absolute/fixed, z-index > 0, not `display:none`) with:

- **Transparent background** — `background-color: rgba(0,0,0,0)` on a visible overlay lets content bleed through
- **Hover gap** — physical gap > 4px between a trigger element and its dropdown (gap fires `mouseleave` on mouse crossing it, closing the dropdown prematurely)

```ts
import { checkOverlays } from "@domphy/audit"

const issues = await checkOverlays(page)
```

### Overlap (`detectOverlaps`)

Sibling elements whose bounding boxes intersect are flagged. Ancestor–descendant relationships are excluded.

```ts
import { detectOverlaps } from "@domphy/audit"

const issues = await detectOverlaps(page)
// [{ type: "overlap", message: "...", rect: {...} }]
```

### Geometry (`verifyGeometry`)

Domphy-styled buttons obey a deterministic height formula:

```
height = (6 + 2d) × U    where U = fontSize / 4,  d = density value
```

Detects buttons whose rendered height deviates from this formula.

```ts
import { verifyGeometry } from "@domphy/audit"

const issues = await verifyGeometry(page)
```

### Contrast (`checkContrast`)

Text elements are checked for WCAG 4.5:1 minimum contrast ratio using computed `color` and resolved background color.

```ts
import { checkContrast } from "@domphy/audit"

const issues = await checkContrast(page)           // default 4.5:1
const issues2 = await checkContrast(page, 3.0)     // custom threshold
```

## `scanInteractive(page, options?)`

Runs all checks in sequence and also **auto-discovers overlay triggers**: finds elements with hidden absolutely-positioned children, hovers each, then checks for newly-visible overlay bugs.

```ts
import { scanInteractive } from "@domphy/audit"
import type { AuditPageFull } from "@domphy/audit"

const result = await scanInteractive(page as AuditPageFull, {
  hoverDelay: 150,   // ms to wait after hover (default: 150)
  staticOnly: false, // set true to skip interactive hover scan
})

console.log(result.ok)        // boolean
console.log(result.issues)    // AuditIssue[]
console.log(result.svg)       // annotated SVG string
```

`AuditPageFull` extends `AuditPage` with `hover(selector)` and `waitForTimeout(ms)` — the Playwright `Page` object satisfies this interface directly.

## SVG output

Every result includes an `svg` string — a lightweight text skeleton of the rendered layout with issues annotated by color:

- **Red** — overlap, theme, and overlay issues
- **Orange** — geometry violations
- **Gold** — contrast failures

The SVG is pure text (not a screenshot): fast, tiny, and diffable in CI.

```ts
import { snapshot, toSVG } from "@domphy/audit"

const layout = await snapshot(page)     // collect bounding boxes
const svg = toSVG(layout, issues)       // render annotated SVG
```

## Types

### Playwright-based types

```ts
type IssueType = "overlap" | "geometry" | "contrast" | "theme" | "overlay"

interface AuditIssue {
  type: IssueType
  message: string
  rect?: { x: number; y: number; width: number; height: number }
}

interface AuditResult {
  ok: boolean
  issues: AuditIssue[]
  svg: string
}

interface AuditPage {
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>
}

interface AuditPageFull extends AuditPage {
  hover(selector: string, options?: { force?: boolean }): Promise<void>
  waitForTimeout(ms: number): Promise<void>
}
```

### Static a11y types

```ts
type A11yRule =
  | "missing-alt"
  | "missing-label"
  | "heading-hierarchy"
  | "missing-lang"

interface A11yIssue {
  rule: A11yRule
  message: string
  path: string        // dot-path through the element tree, e.g. "root[0]>div>img"
}

interface A11yResult {
  ok: boolean
  issues: A11yIssue[]
}
```
