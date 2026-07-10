---
title: "@domphy/three — Interactive Grid"
description: "A 5x5 grid of boxes driven by raycast pointer events and per-cell RecordState: hover lifts and tints a cube, click fires a spring-damped scale pulse."
---

# Interactive Grid

<script setup lang="ts">
import InteractiveGridDemo from "../../demos/three/interactive-grid.ts?raw"
</script>

A 5x5 grid of boxes, each one an independent interactive object: hovering lifts it toward the camera and tints it from a monochrome base to an accent hue, clicking fires a spring-damped scale pulse, and the whole wall breathes with a slow per-cell idle offset. Every cell's state — hover flag, pulse trigger — lives in one shared `RecordState`, keyed per cell, so interacting with one box never re-evaluates the other twenty-four.

<CodeEditor :code="InteractiveGridDemo" />

## How it works

- **Raycast pointer events** — `onPointerOver`/`onPointerOut` toggle each cell's `hover` flag, `onClick` bumps a `pulseId` nonce; all three are ordinary scene props dispatched through the [pointer-event whitelist](/docs/three/events#pointer-event-props).
- **Per-item state via `RecordState`** — one `RecordState<Record<string, CellState>>` holds all 25 cells; `cells.get(key, l)` inside a cell's own `color` prop subscribes only to that cell's key, so a hover never touches a sibling's material. See [`RecordState`](/docs/core/api/state#recordstatet).
- **`_key` for reconcile identity** — each grid cell carries `_key: "row-col"`, the same keyed-match semantics as core's `ElementList`, documented in the [grammar keys table](/docs/three/grammar#grammar-keys).
- **Reactive `color` (function-prop rule 7)** — `color: (l) => (cells.get(key, l).hover ? ACCENT_COLOR : BASE_COLOR)` re-applies and calls `root.invalidate()` only when that cell's own hover flag flips. See [function-prop rules](/docs/three/grammar#function-prop-rules).
- **`onFrame` spring + idle motion** — a per-cell `onFrame` closure lerps a hover lift, decays a damped-cosine pulse bump from the last `pulseId`, and adds a `Math.sin` idle bob phase-offset by grid position, all read from `root.clock`/`delta`. See [Animation & Loop](/docs/three/animation#onframe).
- **Duck-typed `position`/`scale`** — the array literal on `position` sets the cell's base XY placement once; `onFrame` then mutates `self.position.z` and `self.scale` directly every tick, the same imperative-inside-`onFrame` pattern as the [quickstart](/docs/three/#quick-start).

[← Back to @domphy/three](/docs/three/)
