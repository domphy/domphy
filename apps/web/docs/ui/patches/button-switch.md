<script setup lang="ts">

import ButtonSwitch from "../../demos/patches/ButtonSwitch.ts?raw"

</script>

# Button Switch

A pill-shaped toggle switch with `role="switch"`. Clicking flips the bound `checked` state and slides the thumb. Apply to a `<button>` element whose first child is a `<span>` (used as the thumb).

The OFF state is tone-inherited (~1.4:1 against the page), so the 3:1 required by WCAG 2.1 SC 1.4.11 (Non-text Contrast) is carried by outlines: the track and the thumb each get a `"shift-7"` 1px outline, which measures 4.95:1 / 5.17:1 (track vs page) and 3.58:1 / 4.37:1 (thumb vs track) in light / dark. The control is also `width: fit-content` — a switch is a fixed-size track, and without it a flex or grid parent stretched the 48px pill to the full column while the absolutely-positioned thumb stayed at one end.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `checked` | `ValueOrState<boolean>` | `false` | Toggle state — `true` = on. |
| `color` | `ValueOrState<ThemeColor>` | `"neutral"` | Theme color tone for the unchecked (off) track. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the checked (on) track. |

<CodeEditor :code="ButtonSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/buttonSwitch.ts [buttonSwitch]
:::



