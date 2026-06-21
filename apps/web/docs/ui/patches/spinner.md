<script setup lang="ts">
import CodeEditor from "../../editor/index.vue"
import Spinner from "../../demos/patches/Spinner.ts?raw"

</script>

# Spinner

Use the spinner patch on a `span` to show a circular loading indicator.

<CodeEditor :code="Spinner" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/spinner.ts [spinner]
:::

## Custom spinner variants

The built-in `spinner()` covers most cases. For more visual variety, use [svg-spinners](https://github.com/n3r4zzurr0/svg-spinners) (28+ variants, MIT).

SVG spinners cannot be dropped in as raw HTML — Domphy has no `innerHTML`. Convert them to element syntax:

1. Replace the `<style>` child with CSS-in-JS `@keyframes` entries on the first animated element.
2. Replace CSS classes with inline `style` on each element.
3. Use `hashString` (from `@domphy/core`) to generate a unique animation name — avoids collisions when the same spinner appears multiple times.
4. Add `fill: "currentColor"` on the root `<svg>` and drive color via `style.color` → `themeColor()`.

**Example — 3-dots-bounce:**

```ts
import { hashString } from "@domphy/core"
import { themeColor } from "@domphy/theme"

const kf = {
  "0%, 57.14%": { animationTimingFunction: "cubic-bezier(.33,.66,.66,1)", transform: "translate(0)" },
  "28.57%": { animationTimingFunction: "cubic-bezier(.33,0,.66,.33)", transform: "translateY(-6px)" },
  "100%": { transform: "translate(0)" },
}
const animName = hashString(JSON.stringify(kf))

export const spinnerDots = {
  svg: [
    { circle: null, cx: "4",  cy: "12", r: "3", style: { animation: `${animName} 1.05s infinite`, [`@keyframes ${animName}`]: kf } },
    { circle: null, cx: "12", cy: "12", r: "3", style: { animation: `${animName} 1.05s infinite`, animationDelay: ".1s" } },
    { circle: null, cx: "20", cy: "12", r: "3", style: { animation: `${animName} 1.05s infinite`, animationDelay: ".2s" } },
  ],
  width: "24", height: "24", viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
  fill: "currentColor",
  style: { color: (l) => themeColor(l, "shift-7", "neutral"), display: "inline-block", flexShrink: 0, verticalAlign: "middle" },
}
```

Apply the same pattern to any variant from svg-spinners — pick the CSS animation version (not SMIL), copy keyframe percentages and per-element delays.
