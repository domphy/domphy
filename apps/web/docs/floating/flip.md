---
title: "flip & autoPlacement"
description: "Keep the floating element in view by flipping to the opposite side or picking the best placement automatically."
---

# flip

`flip` changes the placement to the opposite side when the preferred placement would overflow the clipping boundary. For `"top"` it tries `"bottom"`, for `"left"` it tries `"right"`, and so on. If neither fits, it uses the placement with the smallest overflow.

```ts
import { computePosition, offset, flip } from "@domphy/floating"

computePosition(reference, floating, {
  placement: "top",
  middleware: [offset(8), flip()],
})
```

## How It Works

`flip` checks overflow on the current placement. If any measured side overflows, it tries the next placement from its list until it finds one that fits. The resolved `placement` in the return value tells you which one was used:

```ts
const { x, y, placement } = await computePosition(reference, floating, {
  placement: "top",
  middleware: [offset(8), flip()],
})
// placement is "bottom" if there was not enough room above
```

## Fallback Placements

Control which placements are tried when the preferred one overflows:

```ts
flip({
  // Try these in order before giving up
  fallbackPlacements: ["top", "right", "bottom-start"],
})
```

The list is tried in order. The first that fits (no overflow) wins. The initial `placement` is always tried first — do not repeat it in `fallbackPlacements`.

## Fallback Strategy

When no placement fits completely, `fallbackStrategy` decides the winner:

```ts
// "bestFit" (default): use the placement with the smallest total overflow
flip({ fallbackStrategy: "bestFit" })

// "initialPlacement": return to the original requested placement
flip({ fallbackStrategy: "initialPlacement" })
```

## Fallback Axis Side Direction

Allow `flip` to try placements on the perpendicular axis as a last resort:

```ts
// For "bottom", after exhausting "top", try "left" then "right"
flip({ fallbackAxisSideDirection: "start" })
flip({ fallbackAxisSideDirection: "end" })
```

`"start"` and `"end"` control which side of the perpendicular axis is tried first.

## Alignment Flipping

For aligned placements (`"top-start"`, `"top-end"`), `flip` by default also tries the opposite alignment when the cross axis overflows. Disable this:

```ts
flip({ flipAlignment: false })
```

## Padding

Add space between the floating element and the clipping boundary before overflow is detected:

```ts
flip({ padding: 8 })

// Per-side
flip({ padding: { top: 8, right: 4, bottom: 8, left: 4 } })
```

## Cross Axis Check

By default `flip` checks both the main axis and cross axis overflow. Control this separately:

```ts
flip({
  mainAxis: true,       // check the side the floating element is on (default)
  crossAxis: true,      // check the alignment axis (default)
})

// Only flip on the main axis, ignore cross-axis overflow
flip({ crossAxis: false })

// Only check cross-axis for alignment flipping, not full flip
flip({ crossAxis: "alignment" })
```

## Dynamic Options

Pass a function to derive options from the current middleware state:

```ts
flip((state) => ({
  // More fallbacks for small floating elements
  fallbackPlacements:
    state.rects.floating.height < 80
      ? ["top", "right", "left"]
      : ["top"],
}))
```

## Storing Resolved Placement

Store the resolved placement in state so other elements (arrow, CSS class) can react:

```ts
import { toState } from "@domphy/core"
import type { Placement } from "@domphy/floating"

const placement = toState<Placement>("bottom")

function update() {
  computePosition(reference, floating, {
    placement: "bottom",
    middleware: [offset(8), flip(), shift()],
  }).then(({ x, y, placement: resolved }) => {
    Object.assign(floating.style, { left: `${x}px`, top: `${y}px` })
    placement.set(resolved as Placement)
  })
}
```

---

# autoPlacement

`autoPlacement` is an alternative to `flip`. Instead of flipping a preferred placement to its opposite, it picks the placement with the most available space from all allowed placements. Use it when you have no strong preference and want the best possible fit.

```ts
import { computePosition, offset, autoPlacement } from "@domphy/floating"

computePosition(reference, floating, {
  // no preferred placement — let autoPlacement decide
  middleware: [offset(8), autoPlacement()],
})
```

## Options

```ts
autoPlacement({
  // only allow certain placements to be chosen
  allowedPlacements: ["top", "bottom", "right"],

  // prefer a specific alignment ("start", "end", or null for centered)
  alignment: "start",

  // also try the opposite alignment if preferred doesn't fit
  autoAlignment: true,  // default true

  // check space on the cross axis too when scoring placements
  crossAxis: false,     // default false
})
```

## Constraint: No flip + autoPlacement Together

Do not use `flip` and `autoPlacement` in the same middleware array — they use incompatible selection strategies and conflict with each other:

```ts
// Bad — do not do this
middleware: [flip(), autoPlacement()]

// Good — pick one
middleware: [flip()]
middleware: [autoPlacement()]
```

## TypeScript

```ts
import type { FlipOptions, AutoPlacementOptions } from "@domphy/floating"

const flipConfig: FlipOptions = {
  fallbackPlacements: ["bottom", "right"],
  fallbackStrategy: "bestFit",
  padding: 8,
}

const autoConfig: AutoPlacementOptions = {
  allowedPlacements: ["top", "bottom"],
  alignment: "start",
}
```
