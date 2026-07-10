---
title: "Scene Grammar"
description: "The @domphy/three scene grammar — tags, args, attach, primitive, dispose: null, _key, the function-prop dispatch rules, pierced props, and extend()."
---

# Scene Grammar

A scene is a plain object tree, reconciled the same way a Domphy DOM tree is. The **first key** of a scene object is its tag — the camelCase of a `THREE` class name (`mesh` → `THREE.Mesh`, `boxGeometry` → `THREE.BoxGeometry`), or a name registered with [`extend()`](#extend-custom-classes). Every other key is a prop.

```ts
{
  mesh: [ /* children */ ],          // tag: "mesh" — value is children
  args: [1, 1, 1],                    // constructor arguments
  position: [0, 1, 0],                // duck-typed prop
  "rotation-z": (l) => spin.get(l),   // pierced, reactive prop
  _key: "a",                          // reconcile identity
}
```

There is no pre-populated class catalog — a tag resolves by reflection: your `extend()` registry first, then the live `THREE` namespace. This means the package works with whatever three.js version is installed.

## Grammar keys

| Key | Meaning |
| --- | --- |
| `<tag>` (first key) | Children: an array of scene objects, `null`, or `(l, root) => children`. Falsy entries (`null`/`undefined`/`false`) are skipped — write `cond && { mesh: ... }` freely inside an array. |
| `args` | Constructor arguments: an array, or `(l, root) => any[]` when they depend on the live root (camera, canvas). Shallow-changes reconstruct the instance — see [`args` reconstruction](#args-reconstruction). |
| `attach` | Where the child instance is attached on its parent — a dashed path (`"geometry"`, `"material-0"`, `"geometry-attributes-position"`) or a function `(parentInstance, childInstance) => cleanup`. Omit it and it's inferred — see [Attach inference](#attach-inference). |
| `dispose: null` | Opts this node's whole subtree out of auto-dispose on removal, regardless of any descendant's own `dispose` prop. |
| `raycast: null` | Sets the instance's own `.raycast` to `null` (standard three.js convention) — excludes it from pointer raycasting. |
| `_key` | Reconcile identity for this position in its parent's children — same semantics as core: keyed match wins over positional match by tag. Not DOM id / business identity. |
| `object` | The adopted `THREE` instance — only valid on a `primitive` tag. See [`primitive`](#primitive). |
| `onFramePriority` | Sibling of `onFrame` — priority > 0 callbacks take over rendering for that frame (see [Animation & Loop](./animation)). |

Every other key is either a duck-typed value prop (`position`, `intensity`, `color`, ...) or a function dispatched through the [function-prop rules](#function-prop-rules) below.

## Duck-typed props

A static (non-function) prop value is applied against the resolved target using three's own value interface, in this order:

| Value | Applied as |
| --- | --- |
| Color representation (string/number/`Color`) onto a `THREE.Color` target | `target.set(value)` |
| Same-constructor object with `.set`/`.copy` | `target.copy(value)` |
| Array onto a `.set`-able target | `target.fromArray(value)` (or `target.set(...value)`) |
| Number onto a `.set`-able target | `target.setScalar(value)` (or `target.set(value)`) |
| `ShaderMaterial.uniforms` | Merged per-named-uniform in place (keeps the stable reference the compiled program holds) |
| Anything else | Direct assignment: `root[key] = value` |

A key present in an earlier prop application but missing from the current one resets to that instance's **constructor default** (mirrors core's "attributes present before but absent now are removed").

## Pierced props

A dashed key pierces into a nested path: `"rotation-y"` → `instance.rotation.y`, `"material-color"` → `instance.material.color`. Piercing walks as many segments as the key has (`"geometry-attributes-position"` → 3 levels deep) — unless the whole dashed string is itself a literal property name on the target.

```ts
{
  mesh: [...],
  "rotation-y": (l) => spin.get(l),   // instance.rotation.y = spin.get(l)
  "material-color": "orange",         // instance.material.color.set("orange")
}
```

If a props bag declares both a base key and a pierced override of it (`{ position: [0, 1, 0], "position-x": 5 }`), the pierced key always wins, regardless of which one you wrote first.

## Function-prop rules

A prop whose value is a function is dispatched by key, in this exact order — first match wins:

| # | Match | Behavior |
| --- | --- | --- |
| 1 | Pointer event key (`onClick`, `onContextMenu`, `onDoubleClick`, `onWheel`, `onPointerUp`/`Down`/`Over`/`Out`/`Enter`/`Leave`/`Move`/`Missed`/`Cancel`, `onLostPointerCapture`) | Registered with the raycast [event system](./events): `fn(event)`. |
| 2 | `onFrame` | Registered via `root.frame(callback, priority)` — the `useFrame()` analog. Called as `fn(root, delta, self)` every rendered frame. |
| 3 | `onUpdate` | Called as `fn(instance)` after every props application (not itself a subscription). |
| 4 | `/^on[A-Z]/` **and** the key already exists on the instance | Direct property assignment — covers three's own assignable callbacks (`onBeforeRender`, `onBeforeCompile`, ...). |
| 5 | `/^on[A-Z]/`, not on the instance | `instance.addEventListener(name, fn)`, where `name` is the key minus `on` with its first letter lowercased (`onChange` → `"change"`, `onObjectChange` → `"objectChange"`). Called as `fn(event, root, instance)`. |
| 6 | `on` (value is a record) | `instance.addEventListener(exactName, fn)` per entry — no name derivation. Called as `fn(event, root, instance)`. |
| 7 | Anything else | **Reactive value.** Called as `fn(listener, root)`; whatever `State` it reads through `listener` re-invokes it on change, re-applies the resulting value, and calls `root.invalidate()`. |

```ts
{
  orbitControls: null,
  args: (l, root) => [root.camera, root.gl.domElement],   // rule: args function
  enableDamping: true,
  onFrame: (root, delta, self) => self.update(),          // rule 2
  onChange: (event, root, self) => console.log("moved"),  // rule 5 -> "change"
  on: { "dragging-changed": (e, root, self) => {} },      // rule 6, verbatim name
  "rotation-y": (l) => spin.get(l),                        // rule 7, reactive
}
```

Re-applying a key releases its previous binding first (subscription, frame registration, or event listener) — a key that disappears entirely between two applications is unwound the same way.

## `attach` inference

When `attach` isn't declared, it's inferred from the child instance's three.js flags:

| Flag | Inferred `attach` |
| --- | --- |
| `.isBufferGeometry` | `"geometry"` |
| `.isMaterial` | `"material"` |
| `.isFog` | `"fog"` |
| `.isObject3D` (none of the above) | Not attached — added via `parent.add(child)` instead |

```ts
{
  mesh: [
    { boxGeometry: null },              // attach: "geometry" inferred
    { meshStandardMaterial: null },     // attach: "material" inferred
  ],
}
```

An explicit dashed `attach` string can index into an array (`"material-0"` allocates `parent.material` as an array if needed, then sets index `0`) or pierce further (`"geometry-attributes-position"`). An `attach` function receives `(parentInstance, childInstance)` and its return value becomes the detach cleanup.

## `args` reconstruction

`args` are constructor arguments. Changing them **reconstructs** the instance: a new one is built, children are reattached onto it, the old instance is disposed (respecting `autoDispose`), and it's swapped into the parent in place — the `SceneNode` identity, `_key`, and any live subscriptions on other props survive.

```ts
{ boxGeometry: null, args: [width, height, depth] }  // resize -> new BoxGeometry
```

Pass a function when the arguments aren't known until the scene mounts (they need the live `root`):

```ts
{
  orbitControls: null,
  args: (l, root) => [root.camera, root.gl.domElement],
}
```

## `primitive`

`primitive` adopts an existing `THREE` instance instead of constructing one — for objects you built yourself, or that came from a loader.

```ts
{ primitive: [], object: existingObject3D }
```

- `object` is required and re-checked on every patch; changing it reconstructs the node the same way a changed `args` does.
- A `primitive`'s instance is **never disposed** by the reconciler (implicit `dispose: null`) — you own its lifecycle.
- Its children still reconcile and attach normally.

## `extend()` — custom classes

`extend()` registers constructors so their tags resolve the same way built-in `THREE` tags do. This is how anything outside the `three` core namespace enters user-land — `OrbitControls`, custom shader materials, drei-style helpers — without the package importing `three/addons` itself.

```ts
import { three, extend } from "@domphy/three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

extend({ OrbitControls })

const App = {
  div: null,
  style: { width: "100%", height: "420px" },
  $: [
    three({
      camera: { position: [3, 3, 3] },
      scene: [
        { mesh: [{ boxGeometry: null }, { meshStandardMaterial: null }] },
        {
          orbitControls: null,
          args: (l, root) => [root.camera, root.gl.domElement],
          enableDamping: true,
          onFrame: (root, delta, self) => self.update(),
        },
      ],
    }),
  ],
}
```

`extend({ MyClass })` registers under `MyClass`'s own name — the scene tag is its camelCase form (`myClass`). A tag your registry doesn't define, and that isn't a name on the live `THREE` namespace either, throws at scene-create time.

## Reconcile semantics

Children reconcile like core's `ElementList`: a `_key` match wins when present, else a positional match by identical tag at the same index. A match is patched in place (instance identity, subscriptions, and `_key` preserved); anything else is created; unclaimed leftovers are disposed (releasing subscriptions, detaching, then `dispose()` unless `autoDispose` says otherwise).

## Next steps

- [Events](./events) — the pointer-event whitelist from rule 1, capture, `onPointerMissed`
- [Animation & Loop](./animation) — `onFrame`/`onFramePriority`, frameloop modes, `invalidate()`
- [Loading Assets](./assets) — `loadAsset`/`preloadAsset`/`clearAsset`
