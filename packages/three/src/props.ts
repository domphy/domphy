import type { Handler } from "@domphy/core";
import * as THREE from "three";
import type { RootState, SceneNode } from "./types.js";

// Prop application for scene nodes: duck-typed value assignment, pierced
// ("dashed") property paths, attach/detach onto a parent instance, and the
// function-prop dispatch table (SPEC.md "Function-prop rules", 7 rules,
// exact order). Ported from react-three-fiber's core/utils.tsx
// (applyProps/attach/detach), translated from React fibers to Domphy
// SceneNode + Listener reactivity.

// Keys applyProps never assigns onto the instance directly — they carry
// reconciler/attach bookkeeping instead (args → constructor reconstruction,
// dispose/object/_key → reconciler-owned, attach → resolved by attach(),
// onUpdate → invoked after every apply, below).
const IGNORE_KEYS = new Set(["args", "dispose", "attach", "object", "_key"]);

// Rule 1: pointer events raycast through events.ts. Exact whitelist per
// SPEC.md.
export const POINTER_EVENT_KEYS = [
  "onClick",
  "onContextMenu",
  "onDoubleClick",
  "onWheel",
  "onPointerUp",
  "onPointerDown",
  "onPointerOver",
  "onPointerOut",
  "onPointerEnter",
  "onPointerLeave",
  "onPointerMove",
  "onPointerMissed",
  "onPointerCancel",
  "onLostPointerCapture",
] as const;

const POINTER_EVENT_KEY_SET: ReadonlySet<string> = new Set(POINTER_EVENT_KEYS);

// Handlers registered per instance for the raycast event system (events.ts
// reads this — see the "pointer handler storage" contract gap in the report).
const pointerHandlersByInstance = new WeakMap<
  object,
  Record<string, (event: any) => void>
>();

export function getPointerHandlers(
  instance: any,
): Record<string, (event: any) => void> | undefined {
  return pointerHandlersByInstance.get(instance);
}

// One release-callback per (node, propKey) that established a subscription
// or binding (onFrame registration, addEventListener, reactive State
// listener). A later apply of the SAME key releases the previous one before
// rebinding — mirrors ElementAttribute.set's release-before-rebind pattern.
// The final drain hook is registered into node.releases exactly once per
// node (mirrors ElementAttribute's `_removeHooked` guard) and reads whatever
// is CURRENTLY in the map at removal time, not a stale snapshot.
const subscriptionsByNode = new WeakMap<SceneNode, Map<string, () => void>>();

function getSubscriptionMap(node: SceneNode): Map<string, () => void> {
  let subscriptions = subscriptionsByNode.get(node);
  if (!subscriptions) {
    subscriptions = new Map();
    subscriptionsByNode.set(node, subscriptions);
    node.releases.push(() => {
      for (const release of subscriptions!.values()) release();
      subscriptions!.clear();
    });
  }
  return subscriptions;
}

function setKeySubscription(
  node: SceneNode,
  key: string,
  release: (() => void) | null,
): void {
  const subscriptions = getSubscriptionMap(node);
  const previous = subscriptions.get(key);
  if (previous) previous();
  if (release) subscriptions.set(key, release);
  else subscriptions.delete(key);
}

// Resolves a (possibly dashed/pierced) property path against `root`,
// e.g. "position" -> { root, key: "position", target: root.position } or
// "material-color" -> { root: root.material, key: "color", target:
// root.material.color }. Ported from utils.tsx `resolve`.
export function resolvePath(
  root: any,
  key: string,
): { root: any; key: string; target: any } {
  if (!key.includes("-")) return { root, key, target: root?.[key] };

  // The whole dashed key can itself be a literal property name.
  if (root && key in root) return { root, key, target: root[key] };

  let target = root;
  const parts = key.split("-");
  for (const part of parts) {
    if (typeof target !== "object" || target === null) {
      return { root, key, target: undefined };
    }
    key = part;
    root = target;
    target = target[key];
  }
  return { root, key, target };
}

function isColorRepresentation(value: unknown): boolean {
  return (
    value != null &&
    (typeof value === "string" ||
      typeof value === "number" ||
      (value as any).isColor === true)
  );
}

// Textures assigned onto these material slots get their colorSpace
// auto-converted to sRGB unless the root opts into `linear` output — ported
// from utils.tsx's colorMaps handling. RootState doesn't carry `linear` in
// this package's shared contract (ThreeOptions.linear lives on the option
// object consumed by patch.ts/rootState.ts), so it's read defensively; see
// the report's contract-gap note.
const SRGB_TEXTURE_SLOTS = [
  "map",
  "emissiveMap",
  "sheenColorMap",
  "specularColorMap",
  "envMap",
];

// Applies a single already-resolved value (static, or the current value of a
// reactive prop function) using three's duck-typed value interface:
// Color representation -> target.set(value); same-constructor object with
// .set/.copy -> target.copy(value); array onto a .set-able target ->
// target.fromArray/target.set(...value); number onto a .set-able target ->
// target.setScalar/target.set(value); else a direct assignment. Pierced keys
// ("position-x") resolve through resolvePath first.
export function applyStaticProp(
  node: SceneNode,
  key: string,
  value: any,
): void {
  // Ignore setting undefined props (matches r3f: a prop resolving to
  // undefined this pass — e.g. a reactive fn that returned nothing — must
  // not stomp the instance with `undefined`).
  if (value === undefined) return;

  const instance = node.instance;
  const { root, key: resolvedKey, target } = resolvePath(instance, key);

  if (target === undefined && (typeof root !== "object" || root === null)) {
    throw new Error(
      `@domphy/three: Cannot set "${key}". Ensure it is an object before setting "${resolvedKey}".`,
    );
  }

  if (target instanceof THREE.Color && isColorRepresentation(value)) {
    target.set(value);
  } else if (
    target !== null &&
    typeof target === "object" &&
    typeof target.set === "function" &&
    typeof target.copy === "function" &&
    value?.constructor &&
    target.constructor === value.constructor
  ) {
    target.copy(value);
  } else if (
    target !== null &&
    typeof target === "object" &&
    typeof target.set === "function" &&
    Array.isArray(value)
  ) {
    if (typeof target.fromArray === "function") target.fromArray(value);
    else target.set(...value);
  } else if (
    target !== null &&
    typeof target === "object" &&
    typeof target.set === "function" &&
    typeof value === "number"
  ) {
    if (typeof target.setScalar === "function") target.setScalar(value);
    else target.set(value);
  } else if (
    root instanceof THREE.ShaderMaterial &&
    resolvedKey === "uniforms" &&
    value !== null &&
    typeof value === "object"
  ) {
    // ShaderMaterial uniforms must keep a stable target reference: swapping
    // the whole `uniforms` object drops the sub-objects the compiled
    // WebGLProgram already holds onto (mrdoob/three.js#27042, #22748).
    // Merge each named uniform's `.value` in place instead of overwriting.
    if (!root.uniforms || typeof root.uniforms !== "object") root.uniforms = {};
    const uniforms = root.uniforms as Record<string, any>;
    for (const name in value) {
      const nextUniform = value[name];
      const targetUniform = uniforms[name];
      if (targetUniform) Object.assign(targetUniform, nextUniform);
      else uniforms[name] = { ...nextUniform };
    }
  } else {
    root[resolvedKey] = value;

    // Auto-convert sRGB texture parameters for built-in materials (ported
    // from utils.tsx). Best-effort: `linear` isn't part of RootState's
    // shared contract, so it's read off the root defensively.
    const linear = (node.root as any).linear as boolean | undefined;
    const assigned = root[resolvedKey];
    if (
      !linear &&
      SRGB_TEXTURE_SLOTS.includes(resolvedKey) &&
      assigned?.isTexture &&
      assigned.format === THREE.RGBAFormat &&
      assigned.type === THREE.UnsignedByteType
    ) {
      assigned.colorSpace = THREE.SRGBColorSpace;
    }
  }
}

// Rule 7: a function prop not matched by rules 1-6 is a reactive value.
// Calling it with `listener` subscribes to whatever State/Computed it reads
// (via their `.get(listener)`); each subscription's release is collected
// through `listener.onSubscribe` (the same mechanism Notifier.addListener
// uses for ElementAttribute) and stored under this (node, key) so a later
// re-apply — or node removal — releases them.
function applyReactiveProp(
  node: SceneNode,
  key: string,
  valueFunction: (listener: Handler, root: RootState) => any,
): void {
  const root = node.root;
  let releases: Array<() => void> = [];

  const listener: Handler = (() => {
    if (node.disposed) return;
    const value = valueFunction(listener, root);
    applyStaticProp(node, key, value);
    root.invalidate();
  }) as Handler;
  listener.onSubscribe = (release: () => void) => releases.push(release);

  const initialValue = valueFunction(listener, root);
  applyStaticProp(node, key, initialValue);

  setKeySubscription(node, key, () => {
    for (const release of releases) release();
    releases = [];
  });
}

// Rule 2: `onFrame` registers a per-frame callback via `root.frame()`.
// Priority comes from the sibling `onFramePriority` prop (read directly off
// the full props bag so it applies regardless of key iteration order).
function applyFrameProp(
  node: SceneNode,
  key: string,
  value: any,
  priority: unknown,
): void {
  if (typeof value !== "function") {
    setKeySubscription(node, key, null);
    return;
  }
  const instance = node.instance;
  const release = node.root.frame(
    (root, delta) => value(root, delta, instance),
    typeof priority === "number" ? priority : 0,
  );
  setKeySubscription(node, key, release);
}

// "onChange" -> "change", "onObjectChange" -> "objectChange".
function eventNameFromKey(key: string): string {
  const name = key.slice(2);
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// Rule 5: `on[A-Z]` not already assignable on the instance binds through
// EventDispatcher.addEventListener. Handler is invoked as
// `fn(event, root, instance)`.
function applyEventListenerProp(
  node: SceneNode,
  key: string,
  value: any,
): void {
  const instance = node.instance;
  if (
    typeof value !== "function" ||
    typeof instance?.addEventListener !== "function"
  ) {
    setKeySubscription(node, key, null);
    return;
  }
  const eventName = eventNameFromKey(key);
  const handler = (event: any) => value(event, node.root, instance);
  instance.addEventListener(eventName, handler);
  setKeySubscription(node, key, () =>
    instance.removeEventListener(eventName, handler),
  );
}

// Rule 6: `on: { "dragging-changed": fn }` binds each entry verbatim (no
// name derivation), same invocation shape as rule 5.
function applyEventRecordProp(
  node: SceneNode,
  key: string,
  value: Record<string, any>,
): void {
  const instance = node.instance;
  if (typeof instance?.addEventListener !== "function") return;

  const bindings: Array<() => void> = [];
  for (const eventName in value) {
    const handlerFunction = value[eventName];
    if (typeof handlerFunction !== "function") continue;
    const handler = (event: any) => handlerFunction(event, node.root, instance);
    instance.addEventListener(eventName, handler);
    bindings.push(() => instance.removeEventListener(eventName, handler));
  }
  setKeySubscription(node, key, () => {
    for (const unbind of bindings) unbind();
  });
}

// Rule 1: registers/unregisters a pointer-event handler for the raycast
// system and keeps `root.internal.interactive` (the objects events.ts walks
// during a raycast) in sync with whether the instance currently carries any
// pointer handlers at all.
function applyPointerEventProp(node: SceneNode, key: string, value: any): void {
  const instance = node.instance;
  let handlers = pointerHandlersByInstance.get(instance);
  if (!handlers) {
    handlers = {};
    pointerHandlersByInstance.set(instance, handlers);
  }
  if (typeof value === "function") handlers[key] = value;
  else delete handlers[key];

  const interactive = node.root.internal.interactive;
  const index = interactive.indexOf(instance);
  const hasHandlers = Object.keys(handlers).length > 0;
  const canReceiveEvents =
    !!node.parent && instance?.isObject3D === true && instance.raycast !== null;

  if (canReceiveEvents && hasHandlers) {
    if (index === -1) interactive.push(instance);
  } else if (index > -1) {
    interactive.splice(index, 1);
  }
}

// Memoized blank instance per zero-arg constructor — used to recover a
// property's constructor default when a prop key disappears between two
// applies of the same node (see `resetRemovedStaticProp` below). Ported from
// r3f's `diffProps`/`getMemoizedPrototype` (utils.tsx): three.js objects have
// no notion of "unset a property", so undoing a removed prop means reading
// what a fresh instance of the same class would have had.
const memoizedDefaultInstances = new Map<Function, any>();

function getMemoizedDefault(ctor: Function): any {
  if (memoizedDefaultInstances.has(ctor))
    return memoizedDefaultInstances.get(ctor);
  let instance: any = null;
  // Only zero-arg constructors can be safely default-constructed (mirrors
  // r3f's `root.constructor.length === 0` guard) — anything else is left
  // alone rather than risk throwing on an unrelated required-arg class.
  if (typeof ctor === "function" && ctor.length === 0) {
    try {
      instance = new (ctor as any)();
    } catch {
      instance = null;
    }
  }
  memoizedDefaultInstances.set(ctor, instance);
  return instance;
}

// A key that was applied on a previous pass but is entirely absent from the
// new props bag resets to its constructor default — mirrors core
// ElementNode.patch()'s "attributes present before but absent now are
// removed" (AGENTS.md's reused-node lifecycle: a patch always re-describes
// the FULL desired state, so a vanished key must be unwound, not left stuck
// at its last value).
function resetRemovedStaticProp(node: SceneNode, key: string): void {
  const { root, key: resolvedKey } = resolvePath(node.instance, key);
  if (!root || typeof root !== "object") return;
  const blank = getMemoizedDefault(root.constructor);
  if (!blank) return;
  const defaultValue = blank[resolvedKey];
  if (defaultValue === undefined) return;
  applyStaticProp(node, key, defaultValue);
}

// Undoes whatever the function-prop dispatch (rules 1/2/4/5/6) did for a key
// that has disappeared from the new props bag entirely, then — for a plain
// static/reactive key — resets it to its constructor default. Called once
// per removed key, BEFORE the main dispatch loop below (which only sees keys
// present in the new bag).
function unsetRemovedProp(node: SceneNode, key: string): void {
  const instance = node.instance;

  if (POINTER_EVENT_KEY_SET.has(key)) {
    applyPointerEventProp(node, key, undefined);
  } else if (key === "onFrame") {
    applyFrameProp(node, key, undefined, undefined);
  } else if (/^on[A-Z]/.test(key) && key in instance) {
    instance[key] = undefined;
  } else if (/^on[A-Z]/.test(key) || key === "on") {
    setKeySubscription(node, key, null);
  } else {
    setKeySubscription(node, key, null);
    resetRemovedStaticProp(node, key);
  }
}

// Applies a full (or partial) props bag onto a scene node's instance,
// dispatching function-valued props through the 7 locked rules in order,
// then everything else through the duck-typed static path. Also runs the
// SPEC's attach auto-inference (geometry/material/fog) when `attach` wasn't
// declared, stores `props` as the node's last-applied raw props, and invokes
// `onUpdate` last (r3f parity: after every props application).
export function applyProps(node: SceneNode, props: Record<string, any>): void {
  const instance = node.instance;
  const previousProps = node.props;

  for (const key in previousProps) {
    if (IGNORE_KEYS.has(key) || key === "onFramePriority" || key === "onUpdate")
      continue;
    if (key in props) continue;
    unsetRemovedProp(node, key);
  }

  // Apply every base key before any pierced ("dashed") override of that SAME
  // base key, regardless of the order the caller declared them in — e.g.
  // `{ "position-x": fn, position: [0, 1, 0] }` must always end up with
  // position-x winning. Mirrors r3f's diffProps reordering (utils.tsx),
  // which forces pierced siblings to be (re-)inserted right after their base
  // key so plain object-key iteration order can't decide the outcome.
  const propKeys = Object.keys(props);
  const isPiercedOverride = (key: string): boolean =>
    propKeys.some((base) => base !== key && key.startsWith(`${base}-`));
  const orderedKeys = [
    ...propKeys.filter((key) => !isPiercedOverride(key)),
    ...propKeys.filter((key) => isPiercedOverride(key)),
  ];

  for (const key of orderedKeys) {
    if (
      IGNORE_KEYS.has(key) ||
      key === "onFramePriority" ||
      key === "onUpdate"
    ) {
      continue;
    }
    const value = props[key];

    if (POINTER_EVENT_KEY_SET.has(key)) {
      applyPointerEventProp(node, key, value);
      continue;
    }
    if (key === "onFrame") {
      applyFrameProp(node, key, value, props.onFramePriority);
      continue;
    }
    if (
      /^on[A-Z]/.test(key) &&
      typeof value === "function" &&
      key in instance
    ) {
      instance[key] = value;
      continue;
    }
    if (/^on[A-Z]/.test(key) && typeof value === "function") {
      applyEventListenerProp(node, key, value);
      continue;
    }
    if (key === "on" && value !== null && typeof value === "object") {
      applyEventRecordProp(node, key, value);
      continue;
    }
    if (typeof value === "function") {
      applyReactiveProp(node, key, value);
      continue;
    }
    applyStaticProp(node, key, value);
  }

  // Auto-attach: only when the caller didn't declare `attach` explicitly.
  if (props.attach === undefined && instance) {
    if (instance.isBufferGeometry) props.attach = "geometry";
    else if (instance.isMaterial) props.attach = "material";
    else if (instance.isFog) props.attach = "fog";
  }

  node.props = props;
  props.onUpdate?.(instance);
}

// Checks if a dash-cased string ends with an array index ("material-0").
const ATTACH_INDEX_REGEX = /-\d+$/;

// Attaches `child.instance` onto `parent.instance` per `child.props.attach`:
// a string resolves (and pierces) a path, allocating an array first if the
// path ends in an index ("material-0"); a function runs as
// `attach(parentInstance, childInstance)` and its return value becomes the
// detach cleanup. Records `previousAttach` so detach() can restore it, and
// `child.attach` with the resolved string (null for a function/absent
// attach — SceneNode.attach only models the string case).
export function attach(parent: SceneNode, child: SceneNode): void {
  const rawAttach = child.props.attach;

  if (typeof rawAttach === "string") {
    if (ATTACH_INDEX_REGEX.test(rawAttach)) {
      const arrayKey = rawAttach.replace(ATTACH_INDEX_REGEX, "");
      const { root, key } = resolvePath(parent.instance, arrayKey);
      if (!Array.isArray(root[key])) root[key] = [];
    }
    const { root, key } = resolvePath(parent.instance, rawAttach);
    child.previousAttach = root[key];
    root[key] = child.instance;
    child.attach = rawAttach;
  } else if (typeof rawAttach === "function") {
    child.previousAttach = rawAttach(parent.instance, child.instance);
    child.attach = null;
  } else {
    child.attach = null;
  }
}

// Reverts what attach() did: a string path restores `previousAttach` (or
// deletes the key when there was none to begin with — it was never set
// before we attached); a function's return value is called as the cleanup
// `previousAttach(parentInstance, childInstance)`.
export function detach(parent: SceneNode, child: SceneNode): void {
  const rawAttach = child.props.attach;

  if (typeof rawAttach === "string") {
    const { root, key } = resolvePath(parent.instance, rawAttach);
    if (child.previousAttach === undefined) delete root[key];
    else root[key] = child.previousAttach;
  } else if (typeof rawAttach === "function") {
    child.previousAttach?.(parent.instance, child.instance);
  }

  child.previousAttach = undefined;
  child.attach = null;
}
