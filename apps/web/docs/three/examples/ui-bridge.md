---
title: "@domphy/three — UI Bridge"
description: "A DOM control panel (inputNumber/select/inputSwitch) and a torus mesh reading the same RecordState — one reactive graph across DOM and 3D."
---

# UI Bridge

<script setup lang="ts">
import UiBridgeDemo from "../../demos/three/ui-bridge.ts?raw"
</script>

A left-side `@domphy/ui` control panel (radius/tube inputs, a material-color select, a wireframe switch) drives a `three()` torus on the right through a single `RecordState`. The DOM controls and the scene graph both subscribe to it with the exact same `(l) => state.get(key, l)` contract — Domphy doesn't distinguish "a listener owned by a DOM node" from "a listener owned by a `THREE.Mesh`".

<CodeEditor :code="UiBridgeDemo" />

## How it works

- **One `RecordState`, two consumers**: `controls.get("radius", l)` is read both inside an `<input>`'s `value` function and inside the mesh's `args` function — per-key reactivity, so changing `tube` never re-runs the `color` subscription. See [Reactivity](/docs/three/grammar#function-prop-rules).
- **`args` as a function reconstructs**: the torus's `args: (l) => [radius, tube, 32, 96]` re-reads the state on every change; because `args` shallow-diffs, dragging radius/tube throws away the old `THREE.TorusGeometry` and builds a new one — see [`args` reconstruction](/docs/three/grammar#args-reconstruction).
- **`color`/`wireframe` are rule-7 reactive props**: unlike `args`, these are ordinary scene props whose value is a function — dispatched as `fn(listener, root)`, re-applied to the *same* `meshStandardMaterial` instance in place, no reconstruction. See [function-prop rules](/docs/three/grammar#function-prop-rules).
- **Controlled inputs, same as any Domphy form**: `value`/`checked` read through the listener, `onInput` writes back with `.set(...)` — the standard Domphy controlled-input pattern, just feeding a 3D scene instead of another DOM node.
- **`card()` + `formGroup()`** compose on a plain `fieldset` for the panel: `card()` places a heading/content/footer grid, `formGroup({ layout: "vertical" })` lines up each `<label>` above its control.
- **`onCreated`**: sets a fixed scene background and `camera.lookAt(0, 0, 0)` once — doctor's theme-color rules govern the DOM around the canvas, not the rendered scene itself.

[← Back to @domphy/three](/docs/three/)
