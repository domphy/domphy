<script setup lang="ts">

import Drawer from "../../demos/patches/Drawer.ts?raw"

</script>

# Drawer

Use `drawer` on a `<dialog>` element to create an edge-anchored modal drawer. It slides in/out via a CSS transform transition, calls the native `showModal()`/`close()` API, locks page scroll while open, and closes on backdrop click. The browser automatically traps focus inside the open drawer and restores focus when it closes.

> **Note:** The patch automatically sets `aria-modal="true"` on the `<dialog>` element and closes the drawer via the animated state path when Escape is pressed (intercepting the native `cancel` event). Focus restoration on `close()` is handled natively by the `<dialog>` API.

The drawer surface uses a high `elevation()` box-shadow (no outline — it's edge-flush against the viewport, so a border would look out of place).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `color` | `ThemeColor` | `"neutral"` | Theme color tone for the drawer surface. |
| `open` | `ValueOrState<boolean>` | `false` | Controls whether the drawer is open. |
| `placement` | `"left" \| "right" \| "top" \| "bottom" \| "start" \| "end"` | `"end"` | Edge the drawer slides in from. |
| `size` | `string \| undefined` | `themeSpacing(80)` (left/right), `themeSpacing(64)` (top/bottom) | CSS length for the drawer's width (left/right/start/end) or height (top/bottom). |

> `"start"` and `"end"` are RTL-aware logical placements resolved at mount time from `document.dir`: `"start"` → left (LTR) / right (RTL); `"end"` → right (LTR) / left (RTL).

<CodeEditor :code="Drawer" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/drawer.ts [drawer]
:::



