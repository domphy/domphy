---
title: "Color Roles & Semantic Colors"
description: "Apply semantic color roles for surfaces, text, borders, and states using themeColor and tone system."
---

# Color Roles & Semantic Colors

## Semantic vs. literal colors

Never use literal colors (`"#3b82f6"`, `"rgba(0,0,0,0.5)"`) in Domphy elements. The doctor flags these as `raw-theme-value`. Instead, use semantic color roles via `themeColor()`:

```ts
import { themeColor } from "@domphy/theme"

// ✗ Literal — breaks dark mode, doctor flags it
const bad = { div: "Error", style: { color: "#ef4444" } }

// ✓ Semantic — adapts to theme and dark mode
const good = { div: "Error", style: { color: (l) => themeColor(l, "shift-9", "error") } }

// ✓ Even better — use a patch
const best = { span: "Error", $: [small({ color: "error" })] }
```

## Surface roles

Use shift scale anchors for backgrounds and borders — prefer the semantic alias when one exists:

| Role | Alias | Tone | Use |
|------|-------|------|-----|
| Page background | — | `"inherit"` | Root background |
| Card background | `"surface"` | `"shift-1"` | Slightly elevated surface |
| Hover / input background | `"hover"` | `"shift-2"` | Form fields, hover backgrounds, code blocks |
| Border | `"border"` | `"shift-3"` | Dividers, subtle separators |
| Control outline | `"border-strong"` | `"shift-4"` | Button/input/card boundary |
| Placeholder text | — | `"shift-7"` | Hint text |
| Secondary / disabled text | `"muted"` | `"shift-8"` | Labels, captions |
| Body text / icon | `"text"` | `"shift-9"` | Primary readable content, action icons |
| Heading text | — | `"shift-11"` | High-contrast headings |

```ts
const Card = {
  div: CardContent,
  style: {
    background: (l) => themeColor(l, "surface"),
    border: (l) => `1px solid ${themeColor(l, "border")}`,
    borderRadius: (l) => themeSpacing(2),
    padding: (l) => themeSpacing(4),
  },
}
```

## Semantic color families

Use color families for meaning, not decoration:

| Family | When to use |
|--------|-------------|
| `"primary"` | Main actions, links, active states |
| `"secondary"` | Secondary actions, alternative paths |
| `"success"` | Completed, confirmed, positive |
| `"warning"` | Caution, degraded state |
| `"error"` / `"danger"` | Failed, destructive, critical |
| `"info"` | Informational, neutral notices |
| `"attention"` / `"highlight"` | Callouts, promotions |
| `"neutral"` | Default, disabled, placeholder |

```ts
const StatusBadge = (status: "success" | "warning" | "error") => ({
  span: status,
  style: {
    background: (l) => themeColor(l, "shift-2", status),
    color: (l) => themeColor(l, "shift-11", status),
    border: (l) => `1px solid ${themeColor(l, "shift-5", status)}`,
    padding: (l) => `${themeSpacing(0.5)} ${themeSpacing(2)}`,
    borderRadius: (l) => themeSpacing(1),
    fontSize: (l) => themeSize(l, "decrease-1"),
  },
})
```

## Interactive state colors

Use `"increase-N"` tone for hover/pressed states:

```ts
import { toState } from "@domphy/core"

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  const hovered = toState(false)

  return {
    button: label,
    onClick,
    onMouseEnter: () => hovered.set(true),
    onMouseLeave: () => hovered.set(false),
    style: {
      background: (l) => themeColor(l,
        hovered.get(l) ? "increase-1" : "shift-2",
        "primary"
      ),
      color: (l) => themeColor(l, "shift-11", "primary"),
      border: (l) => `1px solid ${themeColor(l, "shift-6", "primary")}`,
      padding: (l) => `${themeSpacing(themeDensity(l) * 1)} ${themeSpacing(themeDensity(l) * 3)}`,
      cursor: "pointer",
      transition: "background 100ms ease",
    },
  }
}
```

## Focus ring

Standard accessible focus ring using the primary color:

```ts
const FocusableInput = {
  input: null,
  type: "text",
  style: {
    outline: "none",
    boxShadow: (l) => `0 0 0 2px ${themeColor(l, "shift-7", "primary")}`,
  },
  // Only show ring when focused
  // Use the CSS :focus-visible selector via a class or :focus-within on parent
}
```

## Overlay colors with opacity

For overlays, shadows, and scrims:

```ts
const Overlay = {
  div: null,
  style: {
    position: "fixed",
    inset: 0,
    // Use neutral at high shift with opacity for scrim
    background: (l) => themeColor(l, "shift-15", "neutral"),
    opacity: 0.5,
    zIndex: 100,
  },
}
```

## `themeColorToken` — concrete hex values

When a third-party library requires a raw hex/rgb (e.g., Chart.js, D3, canvas):

```ts
import { themeColorToken } from "@domphy/theme"

// Returns a concrete string like "#4a7ff4" resolved from the theme
const chartColor = themeColorToken(myElement, "shift-9", "primary")

// Use in Chart.js config
const chartConfig = {
  data: {
    datasets: [{
      backgroundColor: themeColorToken(myElement, "shift-3", "primary"),
      borderColor: themeColorToken(myElement, "shift-9", "primary"),
    }],
  },
}
```

`themeColorToken` uses CIELAB/LCH matching — the same algorithm that powers `@domphy/doctor`'s `raw-theme-value` hint.

## Color audit

Run the doctor to find literal colors:

```ts
import { diagnose } from "@domphy/doctor"

const issues = diagnose(MyApp)
const colorIssues = issues.filter(i => i.rule === "raw-theme-value")

// Each issue includes a hint with the nearest themeColor() equivalent:
// { rule: "raw-theme-value", message: "Use themeColor(l, 'shift-9', 'error') instead of '#ef4444'" }
```
