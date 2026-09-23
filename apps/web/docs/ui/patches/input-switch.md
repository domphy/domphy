<script setup lang="ts">

import InputSwitch from "../../demos/patches/InputSwitch.ts?raw"

</script>

# Input Switch

Styles a checkbox as a toggle switch: a themed track and sliding knob that animates and recolors on checked, plus a disabled state. Apply to an `<input type="checkbox">` element — the patch sets `type: "checkbox"`.

The OFF state stays on the surface tone — only the accent (ON) track takes colour, the way Radix, shadcn/ui and MUI all paint a switch. The 3:1 required by WCAG 2.1 SC 1.4.11 (Non-text Contrast) is carried by outlines instead of by a darker fill, the same treatment `buttonSwitch` uses: a `"shift-7"` 1px outline on the track and another on the knob, measured in Chromium at 4.95:1 (light) / 5.17:1 (dark) for the track against the page and 3.58:1 / 4.37:1 for the knob against the track.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Theme color tone for the checked (on) track. |

<CodeEditor :code="InputSwitch" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/inputSwitch.ts [inputSwitch]
:::



