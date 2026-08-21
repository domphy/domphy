---
title: "Loading Assets"
description: "Reactive asset loading for @domphy/three — loadAsset/preloadAsset/clearAsset, AssetResult states, error handling with errorBoundary, and loader configuration for DRACO."
---

<script setup lang="ts">

import AssetGltf from "../demos/three/AssetGltf.ts?raw"
import AssetError from "../demos/three/AssetError.ts?raw"
</script>

# Loading Assets

Domphy has no Suspense analog. `loadAsset` is the async primitive `@domphy/three` ports from `@react-three/fiber`'s `useLoader` — instead of a component suspending, you get a plain reactive `AssetResult` back immediately and read its `data`/`error` states wherever you need them.

## `loadAsset`

```ts
function loadAsset<T>(
  LoaderClass: Constructable,
  input: string | string[],
  configure?: (loader: any) => void,
): AssetResult<T>
```

| Param | Type | Description |
|---|---|---|
| `LoaderClass` | `Constructable` | Any three.js loader class (`GLTFLoader`, `TextureLoader`, ...). Instantiated once and reused for every call with that class. |
| `input` | `string \| string[]` | One url, or an array resolved in order. |
| `configure` | `(loader: any) => void` | Runs right before the loader's first `.load()` call for this call — set decoders, paths, `crossOrigin`, etc. |

### `AssetResult<T>`

| Field | Type | Description |
|---|---|---|
| `data` | `ReadableState<T \| null>` | `null` until the load resolves, then the loaded value. |
| `error` | `ReadableState<Error \| null>` | `null` unless the load fails. |
| `promise` | `Promise<T>` | The underlying load promise. |

Cache key = `LoaderClass` + `input` (an array `input` joins into one key). Call `loadAsset` as many times as you like with the same class/input — inside a reactive scene function, a render loop, wherever — you always get back the exact same `AssetResult`; the network/parse work happens once.

If the resolved value has a `.scene` that's an `Object3D` (a glTF result), `loadAsset` walks it once and assigns `nodes`/`materials`/`meshes` — named lookups onto the result itself, mirroring r3f's `useGLTF`.

A cache **hit** that passes a different `configure` than the first load does not re-run it — the first call's configuration wins. In development, `loadAsset` warns once per cache entry (`Keep the configure function referentially stable across call sites, or clearAsset() first.`).

### Rendering the result

Read `data` inside `scene`'s listener. Falsy scene children are skipped, so render a placeholder for the slot until the asset resolves:

<CodeEditor :code="AssetGltf" />

## `preloadAsset`

```ts
function preloadAsset(LoaderClass: Constructable, input: string | string[], configure?: (loader: any) => void): Promise<unknown>
```

Kicks off the same load `loadAsset` would, without handing back the reactive `AssetResult` — warm the cache before a route or page mounts:

```ts
import { preloadAsset } from "@domphy/three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

preloadAsset(GLTFLoader, "/models/Duck.glb")
```

A later `loadAsset(GLTFLoader, "/models/Duck.glb")` call hits the warmed cache and returns the same `AssetResult`, already resolved.

## `clearAsset`

```ts
function clearAsset(
  LoaderClass: Constructable,
  input?: string | string[],
  options?: { dispose?: boolean },
): void
```

| Call | Effect |
|---|---|
| `clearAsset(LoaderClass, input)` | Drops the one cached `AssetResult` for that class/input. |
| `clearAsset(LoaderClass)` | Drops every input cached for that class. |
| `clearAsset(LoaderClass, input, { dispose: true })` | Evicts and disposes GPU resources reachable from that result (geometries/textures/Object3D graphs, cycle-safe). |
| `clearAsset(LoaderClass, undefined, { dispose: true })` | Evicts every input for that class and disposes each result once (shared resources across inputs are not disposed twice). |

```ts
clearAsset(GLTFLoader, "/models/Duck.glb") // drop one cached asset
clearAsset(GLTFLoader)                      // drop everything GLTFLoader has cached
clearAsset(GLTFLoader, "/models/Duck.glb", { dispose: true }) // evict + dispose GPU
```

Eviction alone does **not** dispose GPU resources — r3f's `clear()` is the same, because other scene objects may still reference the cached geometries/textures. Pass `{ dispose: true }` only when no mounted scene still uses the asset. Only already-resolved data is disposed; a still-pending load is simply evicted. The loader instance itself is untouched. The next `loadAsset` call for that class/input reloads from scratch and returns a brand-new `AssetResult`.

## Error handling

`result.error` is a `ReadableState<Error | null>`, set when the loader's error callback fires; `result.data` stays `null`. `loadAsset` never throws synchronously, and `data`/`error` live on the `AssetResult` object, not on any DOM node — reading them inside `three()`'s own `scene` function only affects the scene tree, it never reaches `errorBoundary()` (`@domphy/ui`), which catches errors thrown inside a **core** reactive-children function (`div: (l) => [...]`), not inside `@domphy/three`'s own internal reactivity.

Route the check through the surrounding Domphy DOM instead — read `result.error` in a reactive `div` children function that wraps the `three()` mount, and throw there so `errorBoundary()` can catch it:

<CodeEditor :code="AssetError" />

## `configure` — loader setup and DRACO

`configure(loader)` runs synchronously right before the loader's first `.load()` call for every distinct `(LoaderClass, input)` pair that misses the cache — not once per loader instance. A `LoaderClass` is instantiated once and reused across every subsequent `loadAsset` call with that same class, even with a different `input`, so if two calls each pass their own `configure`, both run against the **same shared instance**. Keep `configure` idempotent (`setDRACOLoader`, `setPath`, `setCrossOrigin`, ...) so a later call doesn't need to differ from an earlier one.

```ts
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import { loadAsset } from "@domphy/three"

const result = loadAsset(GLTFLoader, "/models/compressed.glb", (loader) => {
  const draco = new DRACOLoader()
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/")
  loader.setDRACOLoader(draco)
})
```
