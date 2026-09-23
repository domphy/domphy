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

The `light` theme is the default: `themeCSS()` emits it on `:root` as well as on `[data-theme="light"]`, so omitting the attribute entirely renders the light theme rather than an unstyled page. `[data-theme="dark"]` overrides it — same specificity, later in the stylesheet.

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

Blocked storage is handled: a sandboxed `<iframe>` without `allow-same-origin`, blocked third-party cookies, or Safari private mode make `localStorage` **throw** on read (`SecurityError`), not return `null`. `applySystemTheme()` catches that and falls back to the OS preference instead of taking app startup down with it.

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
  color-scheme: light;
  --neutral-0: #ffffff;
  --neutral-9: #111111;
}

/* Explicit opt-in */
:root[data-theme="dark"] {
  color-scheme: dark;
  --neutral-0: #111111;
  --neutral-9: #ffffff;
}

/* System preference, unless the user explicitly chose light */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --neutral-0: #111111;
    --neutral-9: #ffffff;
  }
}
```

An `@media` rule cannot appear *inside* a selector list — it has to be its own top-level block, as above.

## Per-component dark mode

Apply dark mode to a specific component (e.g. a code editor with forced dark background):

```ts
import { themeColor } from "@domphy/theme"

const CodeEditor = {
  div: EditorContent,
  dataTheme: "dark",   // force dark within this subtree (resolvers walk dataTheme)
  style: {
    background: (l) => themeColor(l, "shift-1", "neutral"),   // near-dark edge in dark theme
    color: (l) => themeColor(l, "shift-12", "neutral"),       // near-light in dark theme
  },
}
```

## Color-scheme property

Native UI — scrollbars, `<select>`, `<input type="date">`, range tracks, spellcheck underlines — follows the CSS `color-scheme` property, not custom properties. Without it a dark page still renders white scrollbars and white form controls.

`themeCSS()` emits it for you, in every theme block:

```css
:root,
[data-theme="light"] { color-scheme: light; --neutral-0: #ffffff; … }
[data-theme="dark"]  { color-scheme: dark;  --neutral-0: #000000; … }
```

The value is derived from the theme's `direction` — `"lighten"` (a theme that lightens away from its edge, i.e. dark-based) emits `dark`, `"darken"` emits `light` — so a custom theme registered with `setTheme()` gets the right one automatically. Because it ships in the same stylesheet as the tokens, SSR output is already correct and there is no flash of light chrome before hydration.

Nothing to call: setting `data-theme` is enough. Set `style.colorScheme` by hand only to override the derived value for one subtree.

## TypeScript: typed theme state

```ts
type Theme = "light" | "dark"

const theme = toState<Theme>("light")

function toggleTheme() {
  theme.set(theme.get() === "light" ? "dark" : "light")
}
```
