---
title: "Typography"
description: "Type scale, font tokens, responsive text, fluid sizing, and pairing with the theme tone system."
---

# Typography

## Type scale

Domphy theme includes an 8-step type scale (size 0–7, matching `@domphy/theme`'s size system):

| Step | Default | Use case |
|------|---------|----------|
| 0 | 11px | Captions, legal text, badges |
| 1 | 12px | Helper text, timestamps |
| 2 | 14px | Body text (small) |
| **3** | **16px** | **Body text (default)** |
| 4 | 18px | Lead text, secondary headings |
| 5 | 20px | H3, section headers |
| 6 | 24px | H2, card titles |
| 7 | 32px | H1, page titles |

Access via `themeSize`:

```ts
import { themeSize } from "@domphy/theme"

const Caption = {
  span: "Posted 3 days ago",
  style: { fontSize: themeSize(1) },   // "12px" (or rem equivalent)
}
```

## Font tokens

Override the theme's font stack at any scope:

```ts
import { themeApply } from "@domphy/theme"

// Global font setup (in app root)
document.documentElement.style.setProperty("--font-sans", "'Inter', system-ui, sans-serif")
document.documentElement.style.setProperty("--font-mono", "'JetBrains Mono', monospace")
```

Or via theme configuration:

```ts
import { themeApply } from "@domphy/theme"

themeApply(document.documentElement, {
  fontSans: "'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  fontSerif: "'Lora', Georgia, serif",
})
```

In elements, reference font tokens:

```ts
const MonoText = {
  code: "const x = 1",
  style: { fontFamily: "var(--font-mono)" },
}
```

## Typography patch

Apply the full typography treatment (size + weight + line-height + color) with the `typography` patch:

```ts
import { typography } from "@domphy/ui"

const Article = {
  article: [
    { h1: "Title", $: [typography({ size: 7, weight: "bold" })] },
    { p: "Body text.", $: [typography({ size: 3 })] },
    { small: "Caption", $: [typography({ size: 1, tone: "shift-3" })] },
  ],
}
```

## Responsive text

Scale text size based on viewport width using CSS `clamp()`:

```ts
const Hero = {
  h1: "Welcome",
  style: {
    // Scales from 24px at 320px viewport to 48px at 1280px
    fontSize: "clamp(1.5rem, 3vw + 0.5rem, 3rem)",
    lineHeight: "1.1",
  },
}
```

Or define size steps per breakpoint with CSS media queries in a `<style>` block:

```css
h1 { font-size: 1.75rem; }
@media (min-width: 768px) { h1 { font-size: 2.25rem; } }
@media (min-width: 1280px) { h1 { font-size: 3rem; } }
```

## Line height

Line height affects readability. Theme defaults:

| Use | Line height |
|-----|------------|
| Headings (tight) | 1.1–1.2 |
| Body text | 1.5–1.6 |
| Dense UI (captions, labels) | 1.25 |
| Code | 1.75 |

```ts
const Body = {
  p: "Readable paragraph text.",
  style: {
    fontSize: themeSize(3),
    lineHeight: "1.6",
  },
}
```

## Font weight

```ts
const weights = {
  thin:       100,
  extralight: 200,
  light:      300,
  regular:    400,   // body
  medium:     500,   // labels, buttons
  semibold:   600,   // subheadings
  bold:       700,   // headings
  extrabold:  800,
  black:      900,
}

const Heading = {
  h2: "Section",
  style: { fontWeight: weights.semibold },
}
```

## Prose / content regions

For user-generated or markdown-rendered content, apply the `paragraph` patch to set consistent spacing and line-height across all text elements:

```ts
import { paragraph } from "@domphy/ui"

const Content = {
  article: markdownBody,   // rendered markdown elements
  $: [paragraph()],        // applies body typography to all text children
}
```

## Vertical rhythm

Consistent spacing between text blocks using `themeSpacing`:

```ts
import { themeSpacing } from "@domphy/theme"

const TextBlock = {
  div: [
    { h2: "Section Title" },
    { p: "First paragraph." },
    { p: "Second paragraph." },
  ],
  style: {
    "& h2": { marginBottom: themeSpacing(2) },
    "& p + p": { marginTop: themeSpacing(3) },
  },
}
```

## Letter spacing

Fine-tune tracking for display text or all-caps labels:

```ts
const Eyebrow = {
  span: "CATEGORY",
  style: {
    fontSize: themeSize(0),
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
}
```

## Font loading

Preload critical fonts in your HTML head for zero-layout-shift:

```ts
// In press.config.ts or app head config
const head = [
  `<link rel="preconnect" href="https://fonts.googleapis.com">`,
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`,
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">`,
]
```

Or self-host with `@font-face`:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-display: swap;
}
```

## Pairing with tone

Text color inherits from the tone system — use `themeColor` for accessible text:

```ts
import { themeColor } from "@domphy/theme"

const Muted = {
  span: "Secondary info",
  style: {
    color: (l) => themeColor(l, "base", "neutral"),   // base neutral text color
    fontSize: themeSize(2),
  },
}
```

See the [Tone guide](/docs/theme/tone) for the full color-role model.
