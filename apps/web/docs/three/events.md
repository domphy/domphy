---
title: "Events"
description: "Raycast pointer events in @domphy/three — the pointer-event prop whitelist, the ThreeEvent shape, stopPropagation, pointer capture, onPointerMissed, and excluding an object from raycasting."
---

# Events

`@domphy/three` raycasts pointer events against the scene instead of relying on the DOM: any node whose props include one of the whitelisted `onPointer*`/`onClick`/... keys gets raycast on every canvas pointer interaction, and the matching handler receives a `ThreeEvent`, not a raw DOM event. Ported 1-1 from `@react-three/fiber`'s event system — same raycast-through-scene model, translated to plain function props.

## Pointer event props

| Prop | Fires on |
| --- | --- |
| `onPointerDown` | native `pointerdown` |
| `onPointerUp` | native `pointerup` |
| `onPointerMove` | native `pointermove` |
| `onPointerCancel` | native `pointercancel` |
| `onLostPointerCapture` | native `lostpointercapture` |
| `onWheel` | native `wheel` |
| `onClick` | native `click`, only when the pointer moved ≤2px between down and up |
| `onContextMenu` | native `contextmenu`, same ≤2px rule |
| `onDoubleClick` | native `dblclick`, same ≤2px rule |
| `onPointerOver` / `onPointerEnter` | derived from `pointermove` — fires once when an object is newly hit |
| `onPointerOut` / `onPointerLeave` | derived from `pointermove` (or `pointerleave`/`pointercancel`) — fires once when a previously-hit object stops being hit |
| `onPointerMissed` | fires when a click-type event hits nothing (see below) |

Attach any of these like any other scene prop:

```ts
{
  mesh: [{ boxGeometry: null }, { meshStandardMaterial: { color: "orange" } }],
  onClick: (event) => console.log("hit at", event.point),
  onPointerOver: (event) => event.eventObject.scale.setScalar(1.2),
  onPointerOut: (event) => event.eventObject.scale.setScalar(1),
}
```

Only mounted `Object3D` instances are ever raycast — attaching a handler to a `BufferGeometry` or `Material` node is a no-op.

## The `ThreeEvent` shape

Every handler receives one argument, `ThreeEvent<PointerEvent | MouseEvent | WheelEvent>` (exported as a type):

| Field | Type | Notes |
| --- | --- | --- |
| `distance`, `point`, `object`, `face`, `faceIndex`, `uv`, `instanceId`, ... | — | the raw `THREE.Intersection` fields from the raycast hit |
| `eventObject` | `any` | the object whose handler this event bubbled to — differs from `object` once the event bubbles past the hit object's ancestors |
| `intersections` | `Intersection[]` | every hit for this pointer this tick, nearest-first |
| `pointer` | `THREE.Vector2` | pointer position in NDC space |
| `unprojectedPoint` | `THREE.Vector3` | `pointer` unprojected into world space through the current camera |
| `ray` | `THREE.Ray` | the raycaster's ray for this tick |
| `camera` | current camera | `root.camera` |
| `delta` | `number` | pixels travelled since `pointerdown` — only meaningful on `onClick`/`onContextMenu`/`onDoubleClick` |
| `stopped` | `boolean` | `true` once `stopPropagation()` has taken effect |
| `stopPropagation()` | `() => void` | see below |
| `nativeEvent` | `PointerEvent \| MouseEvent \| WheelEvent` | the original DOM event |
| `target`, `currentTarget` | `EventCaptureTarget` | `{ hasPointerCapture, setPointerCapture, releasePointerCapture }` — see Capture below |

Every enumerable data property of the native event (`clientX`, `button`, `shiftKey`, `pointerId`, ...) is also copied directly onto the `ThreeEvent`, so `event.clientX` and `event.nativeEvent.clientX` both work.

## stopPropagation

A single pointer interaction can raycast through several interactive objects and, for one hit, bubble up through every ancestor that also declares a handler (nearest object/ancestor first). Calling `event.stopPropagation()` inside a handler stops that entire tick's dispatch immediately — not just this object's own ancestors, but every remaining hit, including unrelated objects farther behind:

```ts
onClick: (event) => {
  event.stopPropagation() // nothing else receives this click this tick
}
```

## Pointer capture

`target`/`currentTarget` (identical on every event — there is no real DOM-style target/currentTarget split here) expose the standard pointer-capture trio:

```ts
onPointerDown: (event) => {
  event.target.setPointerCapture(event.pointerId)
},
onPointerUp: (event) => {
  event.target.releasePointerCapture(event.pointerId)
},
```

While an object holds capture for a pointer id, that object's intersection is force-included in every later raycast for that pointer even if the ray no longer actually hits it (drag-to-rotate, drag handles, ...), and **only the capturing object can `stopPropagation()`** for that pointer — every other object's `stopPropagation()` call is silently ignored until capture is released.

## onPointerMissed

Two independent hooks fire when a click-type event (`onClick`/`onContextMenu`/`onDoubleClick`) hits nothing:

- **Per-object**: any interactive object's own `onPointerMissed` prop.
- **Root-level**: `ThreeOptions.onPointerMissed` on `three({ onPointerMissed: (event) => ... })`, receiving the raw `MouseEvent`.

```ts
three({
  scene: [/* ... */],
  onPointerMissed: (event) => console.log("clicked empty space"),
})
```

Both only fire when the pointer travelled ≤2px between `pointerdown` and the click (a drag doesn't count as a miss). A click that DOES land on an object also fires `onPointerMissed` on every *other* interactive object that wasn't hit on the original `pointerdown` — clicking object A tells every other currently-interactive object "you weren't clicked" on the same tick.

## Excluding an object from raycasting

Set `raycast: null` on any node to remove it from ray intersection entirely — it's assigned straight onto `Object3D.raycast` (three's own opt-out convention):

```ts
{ mesh: [/* ... */], raycast: null } // never hit, never blocks objects behind it
```

- On an object that itself declares pointer-event props, `raycast: null` additionally deregisters it as an interactive target — its own handlers stop firing.
- On a plain (non-interactive) descendant of an interactive object, e.g. a decorative helper mesh, it keeps that descendant from ever being the nearest hit reported to the ancestor's handlers, without touching the ancestor's own interactivity.

## Opting out of events entirely

`three({ events: false, scene: [/* ... */] })` skips the pointer-event system altogether — no DOM listeners are bound to the canvas, and every `onClick`/`onPointer*` prop in the scene is inert. Use this for a purely decorative canvas (background scenes, hero animations) to skip the per-frame raycast cost.

See [Animation & Loop](/docs/three/animation) for `onFrame` and the render loop.
