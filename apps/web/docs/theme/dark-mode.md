---
title: "Dark Mode"
description: "Implement light/dark mode switching, system preference detection, persistence, and SSR-safe theming."
---

# Dark Mode

## How Domphy handles dark mode

Domphy uses the `data-theme` attribute on `<html>` (or any ancestor element) to switch between light and dark. All CSS variables are scoped to `[data-theme]` — no separate dark stylesheet is needed.

```html
<!-- Light mode -->
<html data-theme="light">

<!-- Dark mode -->
<html data-theme="dark">
```

## Reading the theme

```ts
import { toState } from "@domphy/core"

const theme = toState<"light" | "dark">(
  document.documentElement.getAttribute("data-theme") as "light" | "dark" ?? "light"
)
```

## Switching themes

```ts
function setTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t)
  localStorage.setItem("dp-theme", t)
  theme.set(t)
}

const ThemeToggle = {
  button: (l) => theme.get(l) === "dark" ? "☀ Light" : "◑ Dark",
  onClick: () => setTheme(theme.get() === "dark" ? "light" : "dark"),
}
```

## System preference detection

### `applySystemTheme()` helper

The fastest way to wire up system preference detection: one call that reads `localStorage`, falls back to the OS preference, sets `data-theme`, and listens for OS changes at runtime:

```ts
import { applySystemTheme } from "@domphy/theme"

// Call once before mounting. Reads localStorage → falls back to OS preference.
const cleanup = applySystemTheme()

// Optional: custom target element or storage key
const cleanup = applySystemTheme(document.getElementById("app")!, {
  storageKey: "my-theme",
})
```

When the user manually toggles the theme, persist their choice so `applySystemTheme()` honours it on reload:

```ts
import { toState } from "@domphy/core"
import { applySystemTheme } from "@domphy/theme"

const STORAGE_KEY = "dp-theme"
const cleanup = applySystemTheme(document.documentElement, { storageKey: STORAGE_KEY })

const theme = toState<"light" | "dark">(
  document.documentElement.getAttribute("data-theme") as "light" | "dark" ?? "light"
)

function toggleTheme() {
  const next = theme.get() === "dark" ? "light" : "dark"
  document.documentElement.setAttribute("data-theme", next)
  localStorage.setItem(STORAGE_KEY, next)
  theme.set(next)
}
```

`applySystemTheme()` returns a cleanup function — call it if you ever tear down the app:

```ts
// On SPA unmount
cleanup()
```

### Manual implementation (no helper)

If you need full control, build the same pattern by hand:

```ts
function initTheme(): "light" | "dark" {
  const saved = localStorage.getItem("dp-theme") as "light" | "dark" | null
  if (saved) return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const currentTheme = initTheme()
document.documentElement.setAttribute("data-theme", currentTheme)
const theme = toState<"light" | "dark">(currentTheme)

// Update if the system preference changes and no user choice is saved
const mql = window.matchMedia("(prefers-color-scheme: dark)")
mql.addEventListener("change", (e) => {
  if (!localStorage.getItem("dp-theme")) {
    setTheme(e.matches ? "dark" : "light")
  }
})
```

## SSR-safe initialization

Prevent flash-of-wrong-theme (FOWT) by injecting a blocking script in the HTML `<head>`:

```html
<head>
  <!-- Must run synchronously before any rendering — no defer/async -->
  <script>
    (function() {
      const saved = localStorage.getItem("dp-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute(
        "data-theme",
        saved ?? (prefersDark ? "dark" : "light")
      );
    })();
  </script>
</head>
```

`@domphy/press` (and `apps/web/html-template.ts`) injects this script automatically as `RUNTIME_SCRIPT`.

## CSS-only dark mode (no JS)

If you only need system preference (no user toggle), use media query only:

```css
/* Light is default */
:root[data-theme="light"], :root:not([data-theme]) {
  --neutral-0: #ffffff;
  --neutral-9: #111111;
}

/* Dark mode: both explicit and system preference */
:root[data-theme="dark"],
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --neutral-0: #111111;
    --neutral-9: #ffffff;
  }
}
```

## Per-component dark mode

Apply dark mode to a specific component (e.g. a code editor with forced dark background):

```ts
import { themeColor } from "@domphy/theme"

const CodeEditor = {
  div: EditorContent,
  "data-theme": "dark",   // force dark within this subtree
  style: {
    background: (l) => themeColor(l, "shift-1", "neutral"),   // near-dark edge in dark theme
    color: (l) => themeColor(l, "shift-12", "neutral"),       // near-light in dark theme
  },
}
```

## Color-scheme property

Set `color-scheme` alongside `data-theme` so the browser renders native elements (scrollbars, inputs) correctly:

```ts
function setTheme(t: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", t)
  document.documentElement.style.colorScheme = t   // native element theming
  localStorage.setItem("dp-theme", t)
}
```

Or in CSS:

```css
:root[data-theme="dark"] { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }
```

## TypeScript: typed theme state

```ts
type Theme = "light" | "dark"

const theme = toState<Theme>("light")

function toggleTheme() {
  theme.set(theme.get() === "light" ? "dark" : "light")
}
```
