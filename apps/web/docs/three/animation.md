---
title: "Animation & Loop"
description: "The @domphy/three render loop — onFrame and priority takeover, frameloop modes (always/demand/never), invalidate(), and when to drive motion with onFrame vs a reactive prop."
---

# Animation & Loop

Every mounted `three()` root shares one global `requestAnimationFrame` loop. Two mechanisms put things in motion: a per-node `onFrame` callback that runs every rendered frame, and reactive props that only re-run when the `State`/`Computed` they read changes. Which one to reach for depends on whether the motion is continuous (time-based) or event-based (value-based).

## onFrame

`onFrame` is the `useFrame()` analog — a per-frame callback on any scene node:

```ts
{
  mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }],
  onFrame: (root, delta, self) => {
    self.rotation.y += delta
  },
}
```

| Arg | Type | Notes |
| --- | --- | --- |
| `root` | `RootState` | the mounted root — camera, scene, size, `invalidate()`, etc. |
| `delta` | `number` | seconds since the previous rendered frame (`THREE.Clock` delta) |
| `self` | `any` | this node's own three.js instance |

`onFrame` registers/unregisters through `root.frame(callback, priority)` behind the scenes: removing the prop, or disposing the node, unregisters it automatically — no manual cleanup needed.

### Priority

A sibling `onFramePriority` prop (default `0`) controls two things:

- **Order** — callbacks run lowest-priority first, so a higher-priority callback always runs after (and can react to) everything a lower one already did.
- **Render takeover** — as long as *any* `onFrame` on the root has `onFramePriority > 0`, the root stops calling its own `gl.render(scene, camera)` every frame. Rendering becomes that callback's job:

```ts
{
  // e.g. a primitive-wrapped EffectComposer registered via extend()
  effectComposer: [/* ... */],
  onFrame: (root, delta, self) => self.render(delta),
  onFramePriority: 1, // root no longer auto-renders — this call is now required
}
```

Use priority takeover for post-processing passes or any custom render path; leave it at `0` (the default) for ordinary per-frame updates like calling `self.update()` on `OrbitControls`.

## frameloop modes

`ThreeOptions.frameloop` (default `"always"`) controls when the shared loop actually renders a given root:

| Mode | Behavior |
| --- | --- |
| `"always"` | renders every tick of the global rAF loop, unconditionally |
| `"demand"` | renders only when `invalidate()` has been called since the last frame — an idle scene costs nothing |
| `"never"` | fully manual — the clock is stopped; only `root.advance(timestamp)` ever renders it |

```ts
three({ scene: [/* ... */], frameloop: "demand" })
```

Reactive props (see below) already call `invalidate()` for you, so a `"demand"` scene driven entirely by `State` changes needs no extra wiring. A continuous `onFrame` animation (like the `rotation.y += delta` example above) does **not** self-sustain under `"demand"` — nothing requests the next frame — so either call `root.invalidate()` at the end of that `onFrame`, or stay on `"always"` for anything that must animate every tick regardless of user input.

## invalidate()

`root.invalidate(frames?)` requests a render:

```ts
onCreated: (root) => {
  // e.g. after loading an asset outside the reactive system
  root.invalidate()
}
```

- With no argument, requests one frame (two if called from inside a currently-running `onFrame`, since that frame is already spent by the time the callback runs).
- `invalidate(frames)` with `frames > 1` schedules that many frames in a row — useful for effects that need a couple of extra passes to settle (shadow maps, temporal AA warmup).
- A no-op on a torn-down root or a `"never"`-mode root (that mode only renders through `advance()`).

In `"always"` mode `invalidate()` is harmless but redundant — the loop already renders every tick regardless.

## advance()

`root.advance(timestamp, runGlobalCallbacks?)` renders a root immediately, bypassing the frameloop/`frames` gate entirely. It's the only way a `"never"`-mode root ever renders, and is otherwise useful for deterministic stepping (tests) or driving the scene from an external clock/rAF you already own instead of the built-in loop.

```ts
three({ scene: [/* ... */], frameloop: "never" })
// elsewhere, driven by your own loop:
root.advance(performance.now())
```

## onFrame vs. reactive props

Both can move something every render, but for different reasons:

| | Reactive prop (`(l) => state.get(l)`) | `onFrame` |
| --- | --- | --- |
| Triggers on | the `State`/`Computed` it reads changing | every rendered frame |
| Cost when idle | none — nothing runs until the value changes | runs on every tick the root renders |
| Best for | UI-driven values, data updates, anything expressible as "the current value of X" | continuous per-tick math: physics, controls' `.update()`, time-based motion |
| Works well in `"demand"` mode | yes — each change is exactly one more render | only if something keeps re-invalidating (see above) |

```ts
// Reactive prop: only re-applies (and invalidates) when `spin` changes.
const spin = toState(0)
const App = {
  mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }],
  "rotation-y": (l) => spin.get(l),
}

// onFrame: runs unconditionally on every rendered frame.
const Spinning = {
  mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }],
  onFrame: (root, delta, self) => {
    self.rotation.y += delta
  },
}
```

Prefer a reactive prop when the target value already lives in a `State` (slider-controlled rotation, a color driven by app state); reach for `onFrame` when the change is inherently continuous and time-based rather than event-driven.

See [Events](/docs/three/events) for pointer event handlers.
