<script setup lang="ts">

import Toast from "../../demos/patches/Toast.ts?raw"

</script>

# Toast

Portal a transient notification into a fixed-position corner stack. The toast animates in on mount (opacity + slide) and out before removal — Domphy holds the DOM until the exit transition finishes via `_onBeforeRemove`. No host-tag restriction; apply to any `<div>`.

<CodeEditor :code="Toast" />

::: details Customization
!!!include(snippets/customization.md)!!!
:::

::: details Formulas
!!!include(snippets/formulas.md)!!!
:::

::: code-group
<<< ../../../../../packages/ui/src/patches/toast.ts [toast]
:::

## Props

```ts
toast({
  position?: ToastPosition,  // default "top-center"
  color?: ThemeColor,        // default "neutral"
})
```

`ToastPosition` is one of:

```
"top-left" | "top-center" | "top-right"
"bottom-left" | "bottom-center" | "bottom-right"
```

## Usage

Insert the toast element as a child of the root node, then remove it after a delay:

```ts
import { button, toast } from "@domphy/ui"

const App = {
  div: [{
    button: "Show Toast",
    $: [button()],
    onClick: (_e, node) => {
      const toastEle = {
        div: "Saved successfully",
        $: [toast({ position: "bottom-right" })],
      }
      const toastNode = node.getRoot().children.insert(toastEle)
      setTimeout(() => toastNode.remove(), 3000)
    },
  }],
}
```

## Position

Each distinct `position` value gets one shared overlay container (`id="domphy-toast-<position>"`). Multiple toasts with the same position stack in the same overlay; different positions render in independent overlays.

- `top-*` positions stack top-to-bottom (newest at bottom of stack).
- `bottom-*` positions stack bottom-to-top (newest at top of stack).
- `*-center` aligns items to `center`; `*-left` to `start`; `*-right` to `end`.

## Color

Uses the `ThemeColor` system. The toast surface uses `dataTone: "shift-17"` (the inverted branch), so `"neutral"` renders as a near-black surface in light mode. Pass any theme color to tint the surface:

```ts
{ div: "Error!", $: [toast({ color: "danger", position: "top-right" })] }
```

## Animation

The enter/exit uses CSS transitions on `opacity` and `translateY`. On mount a `requestAnimationFrame` flips the visible state from `false` to `true`, triggering the transition. On `_onBeforeRemove` the state resets to `false` and removal is deferred until the `transform` transition ends.
