---
title: "@domphy/three — Primitive Bridge"
description: "A procedural night-city skyline of 56 boxes built with plain three.js code and adopted whole via primitive, viewed from a low oblique street canyon shot, with declarative lights and fog around it."
---

# Primitive Bridge

<script setup lang="ts">
import PrimitiveBridgeDemo from "../../demos/three/primitive-bridge.ts?raw"
</script>

A 56-building skyline (one grid column left empty as a street) where every footprint, height, body color and "lit window" tint is a one-off constructor decision made once — not scene state, not something a re-render would ever touch. That makes it a bad fit for 56 individual `{ mesh: [...] }` scene nodes and a good fit for the imperative escape hatch: build a `THREE.Group` with plain three.js code, then hand the finished object to `primitive`. The camera sits low and looks down the empty column as a street canyon, at a shallow ~12° elevation rather than a flat top-down isometric shot, so the towers read at scale. Lights, fog, and the background stay declarative around it.

<CodeEditor :code="PrimitiveBridgeDemo" />

## How it works

- The whole skyline is built with plain `new THREE.Mesh(...)` / `THREE.Group.add(...)` calls, outside the scene grammar entirely — nothing about it is expressed as `{ tag: ... }` objects. See [`primitive`](/docs/three/grammar#primitive) for when to reach for this over declaring children.
- `{ primitive: [], object: city, dispose: null }` adopts the finished group as-is. `dispose: null` is written explicitly even though it's already implied for any `primitive` node — its 56 meshes and materials are owned by this module, not the reconciler, so removal from the scene must never call `.dispose()` on them.
- `object` is re-checked on every patch; swapping in a different group would reconstruct the node the same way a changed [`args`](/docs/three/grammar#args-reconstruction) does.
- `onFrame: (root, delta, self) => { self.rotation.y += delta * 0.05 }` is the `useFrame()` analog — `self` here is `city`, the adopted primitive, not a declaratively-created instance. See [Animation & Loop](/docs/three/animation).
- `{ color: null, attach: "background" }` and `{ fogExp2: null, args: [...] }` set scene-level state through the same [attach inference](/docs/three/grammar#attach-inference) (`.isFog`) a mesh child uses for its own geometry/material — they stay fully declarative even though the buildings around them don't. `FogExp2`'s density (vs. linear `Fog`'s near/far) is what fades distant towers gradually instead of hitting a hard wall.
- `onCreated: (root) => root.camera.lookAt(2.5, 2, 20)` runs once at mount to aim the camera down the street canyon — nothing here depends on `root`, so it doesn't need `args` as a function the way `orbitControls` does elsewhere.

[← Back to @domphy/three](/docs/three/)
