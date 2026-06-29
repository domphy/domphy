---
title: "Interpreting Audit Results"
description: "How to read AuditIssue messages, understand each issue type, and fix the underlying cause."
---

# Interpreting Audit Results

:::warning In Development
`@domphy/audit` is not yet published to npm. This page documents the planned API.
:::

Every audit function returns `AuditResult`:

```ts
interface AuditResult {
  ok: boolean        // false if issues.length > 0
  issues: AuditIssue[]
  svg: string        // annotated SVG of the page layout
}

interface AuditIssue {
  type: "overlap" | "geometry" | "contrast" | "theme" | "overlay"
  message: string   // human-readable description with measurements
  rect?: Rect       // bounding box of the violation (omitted for page-level issues)
}
```

When `result.ok` is `false`, iterate `result.issues` and look at `type` and `message` to locate the problem.

## Issue types

### `theme` — missing theme setup

Theme issues have no `rect`. They are page-level configuration problems that will cause visual breakage across the entire app, not just one element.

**Triggers:**
- `document.documentElement` (the `<html>` element) does not have a `data-theme` attribute
- The CSS custom property `--neutral-0` is unresolved on the root element

**Example messages:**
```
document.documentElement is missing data-theme attribute — Domphy CSS vars
(--neutral-*, --primary-*, etc.) are scoped to [data-theme] selectors and
will be unresolved, causing transparent backgrounds

CSS custom property --neutral-0 is unresolved — themeApply() has not run
or the data-theme attribute is absent; all Domphy color vars will be empty
```

**What causes it:** `themeApply()` was not called before the page was rendered, or `data-theme` was placed on a child container div rather than on `<html>` itself.

`themeApply()` injects a `<style id="domphy-themes">` element whose CSS rules are scoped to `[data-theme]` selectors. It does not set the `data-theme` attribute. The audit checks `document.documentElement` specifically, so the attribute must be on `<html>`:

```ts
// In your Playwright test setup, before navigating to the page:
await page.addInitScript(() => {
  document.documentElement.setAttribute("data-theme", "light")
})

// Or in your app's HTML/SSR template:
// <html data-theme="light">
```

If your app sets `dataTheme` on a root container div (not on `<html>`), add `data-theme` to `<html>` to satisfy the audit:

```ts
// SSR template — put data-theme on html
const html = `<!DOCTYPE html>
<html data-theme="light">
  <head>
    <style id="domphy-themes">${themeCSS()}</style>
  </head>
  <body>...</body>
</html>`
```

---

### `contrast` — text contrast below threshold

Contrast issues include a `rect` pointing to the element with insufficient contrast.

**Example message:**
```
contrast 3.21:1 < 4.5 on <span> "Subscribe to newsletter"
```

The message shows the actual ratio, the threshold, the element tag, and the first 40 characters of text content.

**What gets scanned:** All `p`, `span`, `li`, `td`, `th`, `h1`–`h6`, `button`, `a`, and `label` elements with non-empty text. Each element's `color` is compared against its resolved background color. The background is resolved by walking up the DOM tree until an element with a non-transparent `background-color` is found; if none is found, white `(255, 255, 255)` is assumed.

**WCAG contrast formula:**
```
ratio = (lighter + 0.05) / (darker + 0.05)
```
where `lighter` and `darker` are the relative luminances of foreground and background.

**How to fix:** Use `themeColor` tokens rather than raw color literals. Domphy theme tones are designed so that adjacent color steps maintain acceptable contrast:

```ts
import { themeColor } from "@domphy/theme"

// Avoid: raw literal that may fail contrast in dark mode or custom themes
{ span: "Subscribe", style: { color: "#aaa" } }

// Prefer: theme token — tone relationships are theme-aware
{ span: "Subscribe", style: { color: (l) => themeColor(l, "shift-4") } }
```

If you intentionally need a lower threshold — for example large decorative text where WCAG AA allows 3:1 — pass `minContrast` to `checkLayout`:

```ts
import { checkLayout } from "@domphy/audit"

const result = await checkLayout(page, { minContrast: 3.0 })
```

---

### `overlap` — sibling elements intersecting

Overlap issues include a `rect` for the intersection area.

**Example message:**
```
<div.menu_a3f> overlaps <div.panel_b12> by 120×24px
```

Shows both element selectors (tag + first class name) and the intersection dimensions.

**What gets scanned:** All DOM elements with non-zero bounding boxes. Ancestor–descendant pairs are excluded — a child sitting inside its parent is not an overlap. Only siblings whose boxes intersect are flagged.

**What causes it:** Absolute or negative-margin positioning where two sibling boxes intersect. Floated elements, negative margins, or absolutely-positioned elements that were not accounted for in the surrounding layout.

**How to fix:** Look at the two element selectors in the message. Check their position properties and any negative margins or absolute positioning. If the overlap is intentional (e.g. a badge overlapping an avatar icon), you can exclude the overlap check for that specific test:

```ts
import { checkLayout } from "@domphy/audit"

const result = await checkLayout(page, {
  checks: ["theme", "geometry", "contrast", "overlay"]
})
```

---

### `geometry` — Domphy button height formula violated

Geometry issues include a `rect` pointing to the offending button.

**Example messages:**
```
button paddingBlock (8.0px) doesn't match any Domphy density at 14px font (d≈2.29)
button height: got 38.0px, expected 36.0px (d=2, U=3.5px)
```

**The formula:** Domphy-styled buttons obey a deterministic height:

```
U = fontSize / 4
height = (6 + 2d) × U
```

where `d` is the density value, one of `[0.75, 1, 1.5, 2, 2.5]`. The audit detects which density the button's computed `paddingTop` matches (within 0.1 density units), then checks if the rendered height equals the expected value within the tolerance (default 1px).

**Example at `density=2, fontSize=16px`:**
```
U = 16 / 4 = 4px
height = (6 + 2×2) × 4 = 40px
```

Only elements with a class matching the pattern `button_[a-z][0-9a-f]+` are scanned — Domphy-styled buttons. Plain `<button>` elements without a Domphy class are skipped.

**What causes it:** Overriding a Domphy button's `padding`, `height`, `line-height`, or `font-size` directly via inline style or CSS, which decouples the rendered height from the formula.

**How to fix:** Do not apply manual height or padding to Domphy buttons. Use the density parameter provided by the component:

```ts
import { button } from "@domphy/ui"

// Avoid: manual override breaks the geometry contract
{ button: "Submit", style: { height: "48px" } }

// Prefer: density prop keeps height derivable from the formula
button({ label: "Submit", density: 2 })
```

For subpixel rounding on specific devices, increase the tolerance:

```ts
const result = await checkLayout(page, { tolerance: 2 })
```

---

### `overlay` — transparent background or hover dead zone

Overlay issues include a `rect` identifying the problem area.

The audit scans elements that are visible (`display` is not `none`, `visibility` is not `hidden`), have non-zero dimensions, and have `position: absolute` or `position: fixed` with `z-index > 0`. For each such overlay, two checks run.

**Check 1: transparent background**

**Example message:**
```
<div.dropdown_c9e> is a visible overlay (position:absolute, z-index:10) with a
fully transparent background — missing data-theme on <html> or dataTone on the container
```

The overlay is visible but has `background-color: rgba(0, 0, 0, 0)` with no gradient or backdrop filter. This causes content behind it to bleed through.

**How to fix:** The most common cause is that the overlay uses Domphy color vars (`var(--neutral-*)`) but `data-theme` is absent from an ancestor, making the vars unresolved and therefore transparent. Resolve the `theme` issue first. If the overlay has its own background set via `themeColor`, ensure the element or an ancestor has a `dataTone` attribute.

**Check 2: hover dead zone**

**Example message:**
```
<div.menu_b2a> has a 8px gap below its offset parent — moving the mouse from trigger
to overlay crosses a dead zone that fires hover-out and closes it prematurely
(use top:100% + paddingTop instead of top:calc(100% + N))
```

The overlay's top edge is more than 4px below its offset parent's bottom edge. A user trying to move the cursor from the trigger into the dropdown crosses a physical gap where neither element is under the cursor, triggering `mouseleave` and closing the dropdown.

**How to fix:** The gap between trigger and overlay must be inside the overlay's own hit area:

```ts
// Wrong: creates an 8px dead zone between trigger and dropdown
{ div: dropdownMenu, style: { top: "calc(100% + 8px)" } }

// Correct: gap is inside the overlay's padding — cursor never leaves
{ div: dropdownMenu, style: { top: "100%", paddingTop: "8px" } }
```

`checkOverlays` only scans elements that are currently visible. To test overlays that appear on hover, use `scanInteractive()`, which auto-discovers and activates trigger elements, or manually hover a trigger before calling `checkLayout`:

```ts
await page.hover(".nav-item")
await page.waitForTimeout(150)
const result = await checkLayout(page)
```

---

## Reading the SVG

Every `AuditResult` includes an `svg` string. It is a text-only vector drawing — not a screenshot — showing element bounding boxes in gray, with issue areas overlaid in color:

| Color | Issue types |
|---|---|
| Red | `overlap`, `theme`, `overlay` |
| Orange | `geometry` |
| Gold | `contrast` |

Each issue rectangle contains a `<title>` element with the full issue message, readable on hover in any browser or SVG viewer.

**Save SVG on test failure for visual debugging:**

```ts
import { test, expect } from "@playwright/test"
import { checkLayout } from "@domphy/audit"
import { writeFileSync } from "node:fs"

test("no layout violations", async ({ page }) => {
  await page.goto("/")
  await page.waitForLoadState("networkidle")

  const result = await checkLayout(page)

  if (!result.ok) {
    writeFileSync("test-results/layout-audit.svg", result.svg)
    console.log(`SVG saved to test-results/layout-audit.svg`)
  }

  expect(result.issues).toHaveLength(0)
})
```

Open `layout-audit.svg` in a browser: gray outlines show all element boxes; colored overlays mark violations. Hovering a colored rectangle shows the issue message in the browser tooltip.

If you need the SVG without running any checks:

```ts
import { snapshot, toSVG } from "@domphy/audit"

const layout = await snapshot(page)   // collect all element bounding boxes
const svg = toSVG(layout, [])         // empty issues = gray skeleton only
writeFileSync("layout.svg", svg)
```
