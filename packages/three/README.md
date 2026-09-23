# @domphy/three

Declarative three.js scene graph for [Domphy](https://domphy.com) — a 1-1
functional port of [`@react-three/fiber`](https://github.com/pmndrs/react-three-fiber)'s
core (reconciler, raycast pointer events, demand frameloop), translated from
React idioms to Domphy idioms. A scene is a plain object tree, the same way
a Domphy DOM tree is: no JSX, no virtual DOM, no build step required.

No drei port, no helper wrappers, no `extras/` subpath. This package never
imports from `three/addons` or `three/examples` — anything outside the
`three` core namespace (post-processing passes, `OrbitControls`, custom
shaders, ...) enters user-land via `extend()`.

## Install

```bash
pnpm add @domphy/three three
```

Peer dependencies: `@domphy/core` and `three >= 0.156.0`.

## Example — spinning box with orbit controls

```ts
import { toState } from "@domphy/core";
import { three, extend } from "@domphy/three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// OrbitControls lives outside the `three` core namespace, so it enters
// user-land through extend() — the package itself never imports it.
extend({ OrbitControls });

const spin = toState(0);
setInterval(() => spin.set(spin.get() + 0.01), 16);

const App = {
  div: null,
  style: { width: "600px", height: "400px" },
  $: [
    three({
      camera: { position: [3, 3, 3], lookAt: [0, 0, 0] },
      // Canvas fallback content — the accessible name a screen reader gets
      // for the scene, the way `alt` names an image.
      fallback: "An orange box you can orbit around",
      scene: [
        {
          mesh: [
            { boxGeometry: null },
            { meshStandardMaterial: null, color: "orange" },
          ],
          "rotation-y": (l) => spin.get(l), // pierced prop, reactive
        },
        { ambientLight: null, intensity: 0.5 },
        { directionalLight: null, position: [5, 5, 5] },
        {
          // args resolves lazily against the live root (camera + canvas
          // aren't known until the scene mounts), so it's a function here
          // rather than a plain array.
          orbitControls: null,
          args: (l, root) => [root.camera, root.gl.domElement],
          enableDamping: true,
          // onFrame is the useFrame() analog: called every rendered frame
          // with (root, delta, self) — self is this node's THREE instance.
          onFrame: (root, delta, self) => {
            self.update();
          },
        },
      ],
    }),
  ],
};
```

Mount `App` the same way you mount any Domphy tree (`new ElementNode(App).render(host)`).

Canvas defaults match the reference: `dpr: [1, 2]` (device resolution capped
at 2x, re-resolved when `devicePixelRatio` changes) and
`gl: { powerPreference: "high-performance", antialias: true, alpha: true }`.
`alpha: true` is why a scene with no background shows the page through the
canvas — pass `gl: { alpha: false }` for an opaque one. Full option table:
[domphy.com/docs/three](https://domphy.com/docs/three#three-options).

## JSX → Domphy

| JSX (`@react-three/fiber`) | Domphy (`@domphy/three`) |
| --- | --- |
| `<mesh position={[1, 2, 3]}>...</mesh>` | `{ mesh: [...], position: [1, 2, 3] }` |
| `<mesh onClick={handleClick} />` | `{ mesh: null, onClick: handleClick }` |
| `useFrame((state, delta) => { ... })` | `onFrame: (root, delta, self) => { ... }` on a scene node |
| `<primitive object={existingObject} />` | `{ primitive: [], object: existingObject }` |
| `extend({ MyClass }); <myClass />` | `extend({ MyClass }); { myClass: null }` |

## Scene diagnose

`@domphy/doctor` cannot see inside a `three()` option object, so the package
carries its own analyzer with the same contract shape — built for AI
self-correction: generate a scene, run `diagnose`, fix what it reports.

```ts
import { diagnose, validate } from "@domphy/three";

const options = {
  camera: { position: [3, 8, -9] },              // camera-missing-lookat
  scene: [
    { pointLight: null, intensity: 0.8 },        // legacy-light-intensity
    { boxGeometyr: null },                       // unknown-tag (error)
  ],
};
const issues = diagnose(options);
validate(options).ok; // false only when error-severity issues exist
```

Every built-in rule comes from a real silent failure: `unknown-tag` (typo'd
or unregistered tag throws at runtime), `tag-not-first` (a props-first
description makes the reconciler's first-own-key tag read throw),
`invalid-child` (props written as the tag's VALUE — `{ meshStandardMaterial:
{ color: "orange" } }` — turn "color" into a child node whose own child is
the string "orange", and the node throws at runtime),
`legacy-light-intensity` (three
r155+ physical units — a 0-1 point light is nearly invisible),
`additive-blowout` (large bright additive points stack into white blobs),
`camera-missing-lookat` (off-axis camera never aimed at its subject).
Suppress per node with `_doctorDisable: true | "rule-id" | string[]`.

See [`SPEC.md`](./SPEC.md) for the full locked scene grammar, function-prop
dispatch rules, and module map.
