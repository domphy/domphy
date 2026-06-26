<script setup lang="ts">

import Motion from "../../demos/patches/Motion.ts?raw"
</script>

# Motion

Declarative animation in one patch — the Domphy equivalent of `framer-motion`'s `<motion.div animate={…}>`. Describe the target keyframe; the patch animates to it with the Web Animations API. Enter, exit, and reactive re-animation are wired through Domphy's native lifecycle (`_onMount`, `_onBeforeRemove`), so there is no `<AnimatePresence>` wrapper and **no dependency** — just the browser's WAAPI.

<CodeEditor :code="Motion" />

## Props

```ts
motion({
  initial?: MotionKeyframe,                 // start state, applied before the enter animation
  animate?: MotionKeyframe | State<MotionKeyframe>, // target; pass a State to re-animate on change
  exit?: MotionKeyframe,                     // animated to right before removal
  transition?: {
    duration?: number,    // ms, default 300
    delay?: number,       // ms, default 0
    easing?: string,      // CSS easing, default "ease"
    iterations?: number,  // default 1
  },
})
```

A `MotionKeyframe` uses shorthands `x` / `y` (px), `scale`, `rotate` (deg) — composed into one `transform` — plus any raw CSS property (`opacity`, `backgroundColor`, …):

```ts
{ x: 100, scale: 1.2, opacity: 1 }  // -> transform: translateX(100px) scale(1.2); opacity: 1
```

## Enter

`initial` → `animate` plays on mount:

```ts
{ div: "Card", $: [motion({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } })] }
```

## Exit

`exit` plays before the node is removed — Domphy holds the DOM until the animation finishes (via `_onBeforeRemove`), then removes it. Put the element behind reactive children so it can unmount:

```ts
{
  div: (l) => visible.get(l) ? [{
    div: "Toast",
    $: [motion({ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } })],
    _key: "toast",
  }] : [],
}
```

## Reactive animate

Pass a `State` as `animate` and the element re-animates to the new keyframe whenever the state changes — the declarative `animate={value}` pattern:

```ts
const pos = toState({ x: 0 })

{ div: "Box", $: [motion({ animate: pos })] }
// later:
pos.set({ x: 160 }) // smoothly animates across
```

## Scope

`motion` covers the declarative `animate` / `initial` / `exit` core. Reorder/layout (FLIP) animations are handled by [`transitionGroup`](./transition-group); hover/tap use CSS `:hover` / `:active`; scroll- and drag-driven animation compose from `IntersectionObserver` / pointer events with the same WAAPI inside any lifecycle hook.

> No-op when the Web Animations API is unavailable (e.g. very old runtimes / non-DOM SSR) — the element simply renders without animating.
