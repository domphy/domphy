---
title: "Motion & Animation"
description: "CSS transitions, keyframe animations, spring physics, and coordinating animated state changes."
---

# Motion & Animation

## CSS transitions

The simplest animations — use `transition` on any element:

```ts
import { toState } from "@domphy/core"

const open = toState(false)

const Drawer = {
  div: "Drawer content",
  style: (l) => ({
    transform: open.get(l) ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)",
  }),
}
```

For Domphy UI components, the `motion` patch applies theme-consistent transitions:

```ts
import { motion } from "@domphy/ui"

const Card = {
  div: "Content",
  $: [motion({ duration: "fast", easing: "standard" })],
}
```

## Motion constants

Use named constants to avoid magic values in transitions. These follow Material Design 3 motion guidelines:

```ts
// Define once, use everywhere
const DURATION = {
  instant:  "50ms",
  fast:     "100ms",
  medium:   "200ms",
  slow:     "300ms",
  slower:   "500ms",
} as const

const EASING = {
  standard:    "cubic-bezier(0.2, 0, 0, 1)",    // general UI changes
  decelerate:  "cubic-bezier(0, 0, 0, 1)",       // entering
  accelerate:  "cubic-bezier(0.3, 0, 1, 1)",     // leaving
  linear:      "linear",                          // continuous progress
} as const

const AnimatedBadge = {
  span: "New",
  style: {
    transition: [
      `opacity ${DURATION.fast} ${EASING.standard}`,
      `transform ${DURATION.medium} ${EASING.decelerate}`,
    ].join(", "),
  },
}
```

**Duration reference:**

| Constant | Value | Use |
|----------|-------|-----|
| `DURATION.instant` | 50ms | Hover highlights |
| `DURATION.fast` | 100ms | Tooltips, badges |
| `DURATION.medium` | 200ms | Most UI transitions |
| `DURATION.slow` | 300ms | Drawers, modals |
| `DURATION.slower` | 500ms | Page transitions |

**Easing reference (Material Design 3):**

| Constant | Curve | Use for |
|----------|-------|---------|
| `EASING.standard` | cubic-bezier(0.2, 0, 0, 1) | General UI changes |
| `EASING.decelerate` | cubic-bezier(0, 0, 0, 1) | Elements entering |
| `EASING.accelerate` | cubic-bezier(0.3, 0, 1, 1) | Elements leaving |
| `EASING.linear` | linear | Continuous progress |

## Keyframe animations

Define keyframes in a `<style>` tag in your HTML template (or inject via `@domphy/app` head config):

```ts
// In press.config.ts or app head
const head = [
  `<style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>`,
]
```

Apply via `animation` style:

```ts
const Toast = {
  div: "Saved!",
  style: {
    animation: "fadeIn 200ms cubic-bezier(0, 0, 0, 1) both",
  },
}

const Spinner = {
  div: null,
  style: {
    width: "20px",
    height: "20px",
    border: "2px solid currentColor",
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 600ms linear infinite",
  },
}
```

## Animate on state change

Trigger animations by adding/removing a CSS class reactively:

```ts
import { toState } from "@domphy/core"

const animating = toState(false)

function triggerAnimation() {
  animating.set(true)
  setTimeout(() => animating.set(false), 300)   // reset after animation
}

const Notification = {
  div: "Alert!",
  class: (l) => animating.get(l) ? "shake" : "",
  // CSS: .shake { animation: shake 300ms ease-in-out; }
}
```

## View Transitions API

Smooth cross-page transitions with the browser's View Transitions API:

```ts
import { toState } from "@domphy/core"

const route = toState("/home")

function navigate(to: string) {
  if (!document.startViewTransition) {
    route.set(to)
    return
  }
  document.startViewTransition(() => {
    route.set(to)
  })
}
```

Assign `view-transition-name` to elements that should animate between pages:

```ts
const Hero = {
  img: null,
  src: "/hero.jpg",
  style: { viewTransitionName: "hero-image" },
}
```

## List enter/exit animations

Animate list items when they're added or removed using `@domphy/dnd`'s `animations` plugin or pure CSS:

```ts
// Pure CSS approach — items fade in on creation
const ItemList = {
  ul: (l) => items.get(l).map((item) => ({
    li: item.text,
    _key: item.id,
    style: { animation: "fadeIn 150ms ease both" },
  })),
}
```

For exit animations, you need to delay removal until the animation completes:

```ts
import { toState } from "@domphy/core"

const removingIds = toState<Set<string>>(new Set())

function removeItem(id: string) {
  removingIds.set(new Set([...removingIds.get(), id]))
  setTimeout(() => {
    items.set(items.get().filter((i) => i.id !== id))
    const next = new Set(removingIds.get())
    next.delete(id)
    removingIds.set(next)
  }, 200)   // match animation duration
}

const ItemList = {
  ul: (l) => items.get(l).map((item) => ({
    li: item.text,
    _key: item.id,
    class: (l) => removingIds.get(l).has(item.id) ? "fade-out" : "fade-in",
  })),
}
```

## Reduced motion

Always respect the user's motion preference:

```ts
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

const AnimatedElement = {
  div: "Content",
  style: {
    transition: prefersReducedMotion
      ? "none"
      : "transform 250ms cubic-bezier(0.2, 0, 0, 1)",
  },
}
```

Or in CSS (preferred — automatically applies to all elements):

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Loading skeleton animation

Pulse animation for skeleton loaders while data loads:

```ts
import { skeleton } from "@domphy/ui"

const LoadingCard = {
  div: [
    { div: null, $: [skeleton()], style: { height: "20px", width: "60%" } },
    { div: null, $: [skeleton()], style: { height: "14px", marginTop: "8px" } },
    { div: null, $: [skeleton()], style: { height: "14px", width: "80%", marginTop: "4px" } },
  ],
}
```

`skeleton()` applies a shimmer animation using the theme's neutral color scale.
