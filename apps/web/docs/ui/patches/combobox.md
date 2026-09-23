<script setup lang="ts">

import Combobox from "../../demos/patches/Combobox.ts?raw"

</script>

# Combobox

Use `combobox` on a `div` element. It displays selected values as removable tags and an input field. The dropdown `content` is supplied by the caller — typically built with `selectList` and `selectItem`, which provide their own context-based state flow (context is a feature of those patches, not of `combobox` itself).

`combobox` gives the dropdown panel a default surface (background, `"border-strong"` outline, density-scaled radius, medium `elevation()` shadow) so it's usable without the caller styling `content` itself — `selectList`/`selectItem` (or any custom content) render on top of that surface.

The default filter input is `role="combobox"` with `aria-expanded`, `aria-controls` (the floating list id), `aria-haspopup="listbox"` and `aria-autocomplete="list"` — the WAI-ARIA APG [Combobox with List Autocomplete](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) pattern. Typed filter text is kept — the input is not forced back to `""`.

Keyboard: ArrowDown from the input opens the popup (if closed) and moves focus to its first `[role=option]`; ArrowUp moves to the last. Once focus is inside a `selectList` panel its own listbox keyboard model takes over (arrows, Home/End, Enter/Space). Escape dismisses the popup from anywhere and returns focus to the input. The popup opens on click, on typing and on ArrowDown — not on plain focus, which would make Escape un-dismissable.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `DomphyElement` | — | **Required.** The floating popover element (e.g. a `selectList`). |
| `value` | `ValueOrState<string \| number \| Array<string \| number \| null \| undefined> \| null \| undefined>` | — | Selected value(s). |
| `options` | `Array<{ label: string; value: string }>` | `[]` | Available options used to render selected-value tags. |
| `multiple` | `boolean` | `false` | When true, the popover stays open after each selection. |
| `open` | `ValueOrState<boolean>` | `false` | Controls whether the popover is open. Accepts a boolean, `State`, or `Computed`/`ReadableState`. When read-only, pass `onDismiss`. |
| `onDismiss` | `() => void` | — | Called when the popover requests close. Required to close when `open` is read-only. |
| `placement` | `ValueOrState<Placement>` | `"bottom"` | Floating popover placement relative to the host. |
| `color` | `ThemeColor` | `"neutral"` | Color tone for the control surface and input. |
| `input` | `DomphyElement` | — | Custom input element; when omitted a default `<input>` is created. |

<CodeEditor :code="Combobox" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/combobox.ts [combobox]
:::



