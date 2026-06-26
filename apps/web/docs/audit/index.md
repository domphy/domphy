# Audit

`@domphy/audit` is a **baseline-free layout verifier** for Domphy UIs. It runs after the browser renders the page and checks the actual layout geometry against mathematical rules — no historical screenshot needed.

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
```

Playwright is an optional peer dependency — bring the version your project already uses.

## Usage

```ts
import { test, expect } from "@playwright/test"
import { checkLayout } from "@domphy/audit"
import { writeFileSync } from "node:fs"

test("no layout violations", async ({ page }) => {
  await page.goto("/dashboard")

  const result = await checkLayout(page)

  // Save SVG for debugging failed runs
  if (!result.ok) writeFileSync("layout-audit.svg", result.svg)

  expect(result.issues).toHaveLength(0)
})
```

## What it checks

### Overlap

Sibling elements whose bounding boxes intersect are flagged as errors. Ancestor–descendant relationships are excluded (a parent containing its child is normal).

```ts
import { detectOverlaps } from "@domphy/audit"

const issues = await detectOverlaps(page)
// [{ type: "overlap", message: "<button.button_a3f> overlaps <button.button_b7c> by 12×4px", rect: {...} }]
```

### Geometry

Domphy-styled buttons obey a deterministic height formula derived from density and font size:

```
height = (6 + 2d) × U    where U = fontSize / 4
```

`verifyGeometry` detects buttons whose rendered height deviates from this formula, catching cases where a density patch was forgotten or overridden.

```ts
import { verifyGeometry } from "@domphy/audit"

const issues = await verifyGeometry(page)
// [{ type: "geometry", message: "button height: got 28.0px, expected 36.0px (d=1.5, U=4.0px)", rect: {...} }]
```

Only buttons with a Domphy-generated class (`button_{nodeId}`) are checked.

### Contrast

Text elements are checked for WCAG 4.5:1 minimum contrast ratio using computed `color` and resolved background color. The Domphy Tone Span theorem (K=9) guarantees compliant contrast when tones are applied correctly — this check catches the cases where they weren't.

```ts
import { checkContrast } from "@domphy/audit"

const issues = await checkContrast(page)          // default 4.5:1
const issues2 = await checkContrast(page, 3.0)    // custom threshold
```

## SVG output

Every `checkLayout` call returns an `svg` string — a lightweight skeleton of the rendered layout with issues annotated:

- Gray outlines — all visible elements
- **Red fill** — overlap intersection areas
- **Orange fill** — geometry violations
- **Gold fill** — contrast failures

The SVG is pure text (not a screenshot), so it is fast to generate, tiny, and diffable in version control.

```ts
import { snapshot, toSVG } from "@domphy/audit"

const layout = await snapshot(page)          // collect bounding boxes
const svg = toSVG(layout, issues)            // render annotated SVG
```

## Options

```ts
await checkLayout(page, {
  checks: ["overlap", "geometry"],   // skip contrast check
  tolerance: 2,                      // geometry px tolerance (default 1)
  minContrast: 3.0,                  // WCAG threshold (default 4.5)
})
```
