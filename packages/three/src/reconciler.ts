import type { Handler } from "@domphy/core";
import { resolve } from "./catalog.js";
import { removeInteractivity, swapInteractivity } from "./events.js";
import { applyProps, attach, detach } from "./props.js";
import type { RootState, SceneChildren, SceneNode } from "./types.js";

// Scene-tree lifecycle: create/patch/reconcile/dispose SceneNodes over real
// three.js instances. Ported from react-three-fiber's core/reconciler.tsx
// (appendChild/removeChild/commitUpdate/swapInstances) and the instance
// creation parts of core/renderer.tsx (createInstance/handleContainerEffects),
// translated from React fiber commits to Domphy's synchronous reconcile calls
// driven directly by reconcileChildren() (no scheduler — a description arrives
// and is applied immediately, exactly like ElementList.update()).

// Convention (locked in SPEC.md's scene grammar): the FIRST own key of a scene
// description is its tag ("mesh" in `{ mesh: [...], args: [...] }`) — the
// three.js/reflection equivalent of core's "first key = HTML tag". Every
// remaining key is a prop handed to props.ts's applyProps.
function getSceneTag(description: Record<string, any>): string {
  const tag = Object.keys(description)[0];
  if (!tag) {
    throw new Error("@domphy/three: scene description is missing a tag key.");
  }
  return tag;
}

function isObject3D(value: any): boolean {
  return !!value?.isObject3D;
}

// Builds the actual three.js instance for a node: `props.object` for a
// `primitive`, else `new (resolve(tag))(...resolvedArgs)`. Mirrors r3f's
// createInstance/handleContainerEffects object construction.
function instantiate(
  tag: string,
  isPrimitive: boolean,
  props: Record<string, any>,
  resolvedArgs: any[],
): any {
  if (isPrimitive) {
    const object = props.object;
    if (!object) {
      throw new Error(`@domphy/three: primitive without "object" is invalid.`);
    }
    // Regenerate the backref for an adopted object that was previously used
    // elsewhere (r3f parity: a stale __domphy would point at a disposed node).
    if (object.__domphy) delete object.__domphy;
    return object;
  }

  const TagClass = resolve(tag);
  if (!TagClass) {
    throw new Error(
      `@domphy/three: "${tag}" is not part of the THREE namespace! Did you forget to extend()?`,
    );
  }
  return new TagClass(...resolvedArgs);
}

function attachToParent(node: SceneNode): void {
  const parent = node.parent;
  if (!parent) return;
  if (node.props.attach) {
    attach(parent, node);
  } else if (isObject3D(node.instance) && isObject3D(parent.instance)) {
    parent.instance.add(node.instance);
  }
}

function detachFromParent(node: SceneNode): void {
  const parent = node.parent;
  if (!parent) return;
  if (node.props.attach) {
    detach(parent, node);
  } else if (isObject3D(node.instance) && isObject3D(parent.instance)) {
    parent.instance.remove(node.instance);
  }
}

// ---- args resolution & reactive-args binding -------------------------------
// `args` may be a plain array (the common case — a new array from the parent's
// own reactive re-render) or `(l, root) => any[]` for a node whose args need
// to react independently of whatever created its description. The latter gets
// its OWN listener (rule-7-style: release-before-rebind, released in
// node.releases) so reading a State inside it never leaks a permanent
// subscription. Firing recomputes the array and — only on an actual shallow
// change — reconstructs the node with the same `onChange` path a normal
// patch-time args diff uses.
const resolvedArgsByNode = new WeakMap<SceneNode, any[]>();
const argsReleaseByNode = new WeakMap<SceneNode, () => void>();
const argsReleaseHookRegistered = new WeakSet<SceneNode>();

function argsEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function releaseArgsBinding(node: SceneNode): void {
  argsReleaseByNode.get(node)?.();
  argsReleaseByNode.delete(node);
}

// SPEC's scene grammar locks `args` as "an array" — anything else (an object,
// a number, ...) is an authoring mistake, not a value the constructor spread
// (`new constructor(...resolvedArgs)`) can ever meaningfully accept. Thrown
// eagerly here (both the plain-value and the function-resolved paths) so the
// failure points at the actual bad value instead of surfacing later as an
// opaque "is not iterable" from the spread.
function assertArgsArray(value: any[]): void {
  if (!Array.isArray(value)) {
    throw new Error('@domphy/three: the "args" prop must be an array!');
  }
}

function resolveArgs(
  node: SceneNode,
  rawArgs: any,
  onChange: () => void,
): any[] {
  releaseArgsBinding(node);

  if (typeof rawArgs !== "function") {
    const resolved = rawArgs ?? [];
    assertArgsArray(resolved);
    resolvedArgsByNode.set(node, resolved);
    return resolved;
  }

  let releases: Array<() => void> = [];
  const listener: Handler = (() => {
    if (node.disposed) return;
    const next = rawArgs(listener, node.root) ?? [];
    assertArgsArray(next);
    const previous = resolvedArgsByNode.get(node) ?? [];
    if (!argsEqual(previous, next)) {
      resolvedArgsByNode.set(node, next);
      onChange();
    }
  }) as Handler;
  listener.onSubscribe = (release: () => void) => releases.push(release);

  const initial = rawArgs(listener, node.root) ?? [];
  assertArgsArray(initial);
  resolvedArgsByNode.set(node, initial);

  argsReleaseByNode.set(node, () => {
    for (const release of releases) release();
    releases = [];
  });
  if (!argsReleaseHookRegistered.has(node)) {
    argsReleaseHookRegistered.add(node);
    node.releases.push(() => releaseArgsBinding(node));
  }

  return initial;
}

function reconstructOnArgsChange(node: SceneNode): void {
  reconstructSceneNode(node, () =>
    instantiate(
      node.tag,
      node.isPrimitive,
      node.props,
      resolvedArgsByNode.get(node) ?? [],
    ),
  );
}

// Phase 1 of a reconstruct: detaches the OLD instance from the scene graph
// and clears its bookkeeping, WITHOUT yet building the replacement. Split out
// from what used to be one `reconstructSceneNode` so `reconcileChildren` can
// run this for EVERY sibling that needs reconstructing this pass before any
// of them attaches a replacement (see `attachReconstructed` below for why
// interleaving detach+attach one sibling at a time is unsafe).
function detachForReconstruct(node: SceneNode): any {
  const oldInstance = node.instance;
  detachFromParent(node);
  if (oldInstance) delete oldInstance.__domphy;
  return oldInstance;
}

// Phase 2 of a reconstruct: builds the replacement instance, re-applies
// props/attach, moves the node's own children onto it, and disposes
// `oldInstance` (whatever `detachForReconstruct` returned for this SAME
// node, captured before any sibling ran ITS phase 2 — see
// `reconcileChildren`'s two-phase reused-child pass). Ported from r3f's
// swapInstances, collapsed to a single node (Domphy reconciles one node per
// call rather than batching a whole fiber commit).
function attachReconstructed(
  node: SceneNode,
  oldInstance: any,
  buildNewInstance: () => any,
): void {
  const newInstance = buildNewInstance();
  node.instance = newInstance;
  if (newInstance) newInstance.__domphy = node;

  // Move hover/capture/interactive bookkeeping onto the new instance instead
  // of dropping it — a reconstruct (args/primitive-object change) is not a
  // removal, so in-flight hover state must survive it (reference parity: r3f
  // calls `swapInteractivity` from its own `swapInstances`, not
  // `removeInteractivity`). `applyProps` below re-registers whichever
  // pointer handlers the node's current props declare directly onto
  // `newInstance` (a fresh entry in `pointerHandlersByInstance`); the swap
  // only needs to carry the root-level bookkeeping (interactive/initialHits/
  // hovered/captured) that events.ts keys off object identity.
  if (oldInstance) swapInteractivity(node.root, oldInstance, newInstance);

  applyProps(node, node.props);
  attachToParent(node);

  for (const child of node.children) {
    if (child.props.attach) {
      attach(node, child);
    } else if (isObject3D(child.instance) && isObject3D(newInstance)) {
      newInstance.add(child.instance);
    }
  }

  // Never dispose primitives (caller-owned) or a Scene (three's own API
  // refuses to be disposed) — mirrors r3f's removeChild guard exactly.
  if (node.autoDispose && !node.isPrimitive && oldInstance?.type !== "Scene") {
    disposeOnIdle(oldInstance);
  }

  node.root.invalidate();
}

// Single-node reconstruct: the composition of both phases above, used
// wherever only ONE node is involved (a standalone `patchSceneNode` call, or
// `resolveArgs`'s own reactive-args `onChange`) and the sibling-swap hazard
// two-phase reconciling guards against cannot arise.
function reconstructSceneNode(
  node: SceneNode,
  buildNewInstance: () => any,
): void {
  const oldInstance = detachForReconstruct(node);
  attachReconstructed(node, oldInstance, buildNewInstance);
}

// Decides whether a REUSED node's fresh description requires reconstructing
// the underlying instance (a primitive's `object` changed, or a non-
// primitive's `args` changed), and — as a side effect — resolves `args`
// (which may set up or release a reactive args binding; see `resolveArgs`).
// Returns the instance builder when a reconstruct is needed, else `null`
// (props should just be re-applied onto the existing instance). Shared by
// `patchSceneNode` and `reconcileChildren`'s two-phase reused-child pass so
// this decision — and its `resolveArgs` side effect — happens exactly once
// per patch.
function reconstructPlan(
  node: SceneNode,
  props: Record<string, any>,
): (() => any) | null {
  if (node.isPrimitive) {
    const nextObject = props.object;
    // `object` is a required prop on every patch, not just at creation — a
    // primitive whose description stops declaring one is an authoring
    // mistake (there is no such thing as "keep whatever object was there
    // before" for a primitive), so this must throw exactly like
    // `instantiate()` already does when it's missing at creation time.
    if (nextObject === undefined) {
      throw new Error(`@domphy/three: primitive without "object" is invalid.`);
    }
    if (nextObject !== node.instance) {
      return () => instantiate(node.tag, true, props, []);
    }
    return null;
  }

  const previousArgs = resolvedArgsByNode.get(node) ?? [];
  const nextArgs = resolveArgs(node, props.args, () =>
    reconstructOnArgsChange(node),
  );
  if (!argsEqual(previousArgs, nextArgs)) {
    return () => instantiate(node.tag, false, props, nextArgs);
  }
  return null;
}

// Reconciles a reused node's own children from its (already tag-stripped)
// description's children value — the shared tail of `patchSceneNode` and
// `reconcileChildren`'s two-phase pass.
function finishChildReconcile(
  node: SceneNode,
  childrenValue: any,
  root: RootState,
): void {
  if (typeof childrenValue === "function") {
    setupFunctionChildren(node, childrenValue, root);
  } else {
    releaseFunctionChildren(node);
    reconcileChildren(node, childrenValue, root);
  }
}

// ---- reactive children (SceneFunction) -------------------------------------
// Mirrors core ElementNode's _setupFunctionChildren: one listener re-runs the
// function and reconciles its result; release-before-rebind on every re-setup
// (patchSceneNode calls this again with a fresh closure on every reuse — see
// AGENTS.md "reused-node lifecycle"), and the BeforeRemove-equivalent release
// is registered into node.releases exactly once per node.
const childrenReleaseByNode = new WeakMap<SceneNode, () => void>();
const childrenReleaseHookRegistered = new WeakSet<SceneNode>();

function releaseFunctionChildren(node: SceneNode): void {
  childrenReleaseByNode.get(node)?.();
  childrenReleaseByNode.delete(node);
}

function setupFunctionChildren(
  node: SceneNode,
  fn: any,
  root: RootState,
): void {
  releaseFunctionChildren(node);

  let releases: Array<() => void> = [];
  const listener: Handler = (() => {
    if (node.disposed) return;
    const result = fn(listener, root);
    reconcileChildren(node, result, root);
  }) as Handler;
  listener.onSubscribe = (release: () => void) => releases.push(release);

  childrenReleaseByNode.set(node, () => {
    for (const release of releases) release();
    releases = [];
  });
  if (!childrenReleaseHookRegistered.has(node)) {
    childrenReleaseHookRegistered.add(node);
    node.releases.push(() => releaseFunctionChildren(node));
  }

  listener();
}

// Falsy entries (`null`/`undefined`/`false`) are skipped — enables
// `cond && { mesh: ... }` inside a scene array/function.
function normalizeChildren(input: SceneChildren): Record<string, any>[] {
  const list =
    input == null || input === false
      ? []
      : Array.isArray(input)
        ? input
        : [input];
  return list.filter((item): item is Record<string, any> => !!item);
}

// After a reconcile pass that added/removed/reordered children, rebuilds the
// three.js Object3D `.children` array order to match the final SceneNode
// order (attached, non-Object3D children like geometry/material are exempt —
// they have no position in `.children` at all). remove()+add() per entry
// pushes it to the tail in order, so processing every managed child in the
// desired order leaves them correctly sequenced after any untracked instance.
function syncInstanceChildOrder(node: SceneNode): void {
  if (!isObject3D(node.instance)) return;
  for (const child of node.children) {
    if (child.props.attach || !isObject3D(child.instance)) continue;
    node.instance.remove(child.instance);
    node.instance.add(child.instance);
  }
}

// Creates a scene node from a description and (if it has a parent) wires it
// into the tree: instantiate -> applyProps (may infer `attach`) -> attach to
// parent -> reconcile its own children. Mirrors r3f's createInstance +
// handleContainerEffects.
export function createSceneNode(
  description: Record<string, any>,
  parent: SceneNode | null,
  root: RootState,
): SceneNode {
  const tag = getSceneTag(description);
  const isPrimitive = tag === "primitive";
  const childrenValue = description[tag];
  const props: Record<string, any> = { ...description };
  delete props[tag];

  const node: SceneNode = {
    tag,
    instance: undefined,
    root,
    parent,
    children: [],
    key: description._key ?? null,
    props: {},
    attach: null,
    previousAttach: undefined,
    isPrimitive,
    autoDispose: !isPrimitive && props.dispose !== null,
    releases: [],
    disposed: false,
  };

  const resolvedArgs = isPrimitive
    ? []
    : resolveArgs(node, props.args, () => reconstructOnArgsChange(node));
  const instance = instantiate(tag, isPrimitive, props, resolvedArgs);
  node.instance = instance;
  instance.__domphy = node;

  applyProps(node, props);
  attachToParent(node);

  if (typeof childrenValue === "function") {
    setupFunctionChildren(node, childrenValue, root);
  } else {
    reconcileChildren(node, childrenValue, root);
  }

  root.invalidate();
  return node;
}

// Patches a REUSED node (same tag, matched by reconcileChildren) in place
// with a fresh description: reconstructs the instance when `args` (or, for a
// `primitive`, `object`) changed, else re-applies props onto the existing
// instance; then reconciles children from the new description's tag value.
export function patchSceneNode(
  node: SceneNode,
  description: Record<string, any>,
  root: RootState,
): void {
  const childrenValue = description[node.tag];
  const props: Record<string, any> = { ...description };
  delete props[node.tag];

  const build = reconstructPlan(node, props);
  if (build) {
    node.props = props;
    reconstructSceneNode(node, build);
  } else {
    applyProps(node, props);
  }

  finishChildReconcile(node, childrenValue, root);
}

// Reconciles `node.children` against a fresh children value: keyed match by
// `_key` when present, else positional match by identical tag at the same
// index (mirrors core ElementList.update — see AGENTS.md "reused-node
// lifecycle"). A match is patched in place (identity preserved); anything
// else is created; leftover unclaimed old children are disposed.
export function reconcileChildren(
  node: SceneNode,
  childrenInput: SceneChildren,
  root: RootState,
): void {
  const inputs = normalizeChildren(childrenInput);
  const oldChildren = node.children;

  const keyedOld = new Map<string | number, SceneNode>();
  for (const child of oldChildren) {
    if (child.key !== null) keyedOld.set(child.key, child);
  }

  const claimed = new Set<SceneNode>();
  const nextChildren: SceneNode[] = [];
  const reusedEntries: Array<{
    node: SceneNode;
    description: Record<string, any>;
  }> = [];
  let reordered = false;

  for (let index = 0; index < inputs.length; index++) {
    const description = inputs[index];
    const key = description._key ?? null;
    const tag = getSceneTag(description);

    let reused: SceneNode | undefined;
    if (key !== null) {
      const candidate = keyedOld.get(key);
      if (candidate && candidate.tag === tag && !claimed.has(candidate))
        reused = candidate;
    } else {
      const candidate = oldChildren[index];
      if (
        candidate &&
        candidate.key === null &&
        candidate.tag === tag &&
        !claimed.has(candidate)
      ) {
        reused = candidate;
      }
    }

    if (reused) {
      claimed.add(reused);
      if (oldChildren[index] !== reused) reordered = true;
      nextChildren.push(reused);
      reusedEntries.push({ node: reused, description });
    } else {
      nextChildren.push(createSceneNode(description, node, root));
      reordered = true;
    }
  }

  for (const child of oldChildren) {
    if (!claimed.has(child)) disposeSceneNode(child);
  }

  // Two-phase patch for every REUSED child: detach every sibling that needs
  // reconstructing (args/primitive-object change) BEFORE any of them attaches
  // its replacement. A naive one-sibling-at-a-time patch (detach+attach
  // interleaved) corrupts a simultaneous multi-sibling identity swap — e.g.
  // 4 keyed primitives trading positions in one pass — because attaching
  // sibling A's new instance (which may currently still be sibling B's OWN
  // live instance, not yet detached) clobbers B's `.__domphy` backref and
  // its `three.js` parent link before B gets its turn. Ported fix for r3f's
  // https://github.com/pmndrs/react-three-fiber/issues/3125 /
  // https://github.com/pmndrs/react-three-fiber/issues/3143.
  const pendingReconstructs: Array<{
    node: SceneNode;
    props: Record<string, any>;
    childrenValue: any;
    oldInstance: any;
    build: () => any;
  }> = [];

  for (const { node: childNode, description } of reusedEntries) {
    const childrenValue = description[childNode.tag];
    const props: Record<string, any> = { ...description };
    delete props[childNode.tag];

    const build = reconstructPlan(childNode, props);
    if (build) {
      const oldInstance = detachForReconstruct(childNode);
      pendingReconstructs.push({
        node: childNode,
        props,
        childrenValue,
        oldInstance,
        build,
      });
    } else {
      applyProps(childNode, props);
      finishChildReconcile(childNode, childrenValue, root);
    }
  }

  for (const entry of pendingReconstructs) {
    entry.node.props = entry.props;
    attachReconstructed(entry.node, entry.oldInstance, entry.build);
    finishChildReconcile(entry.node, entry.childrenValue, root);
  }

  node.children = nextChildren;
  if (reordered) syncInstanceChildOrder(node);
}

// Defers the actual dispose() call to an idle callback when one is available
// (a real browser main thread) so tearing down a large subtree in one pass
// doesn't stall a frame — mirrors r3f's `disposeOnIdle` (reconciler.tsx),
// minus the React-specific "are we inside an act() test environment" check:
// jsdom (this package's entire test suite runs under it) has no
// `requestIdleCallback`, so tests already get the synchronous fallback for
// free, exactly like r3f's own IS_REACT_ACT_ENVIRONMENT branch.
function disposeOnIdle(instance: any): void {
  if (typeof instance?.dispose !== "function") return;
  const runDispose = () => {
    try {
      instance.dispose();
    } catch {
      // Never let a misbehaving dispose() crash the reconciler.
    }
  };
  if (typeof requestIdleCallback === "function")
    requestIdleCallback(runDispose);
  else runDispose();
}

// A last-resort backstop for objects assigned onto an instance as PLAIN
// props (not `attach`-ed SceneNode children) — e.g. a texture set via
// `map: (l) => textureState.get(l)` — that disposeSceneNode's own per-node
// dispose() call never reaches, since it isn't itself a SceneNode. Ported
// from r3f's `dispose()` (core/utils.tsx): disposes the instance itself,
// then every one of its OWN enumerable properties, one level deep only (not
// recursive into descendants — those are already torn down by
// disposeSceneNode by the time this backstop runs). Reference calls this
// exactly once, on the whole scene, at full root teardown
// (`unmountComponentAtNode`) — never per removed node, since eagerly
// deep-disposing a live node's own properties on every ordinary removal
// risks disposing a texture/material still referenced elsewhere. Call this
// from patch.ts's Remove hook only.
export function disposeInstanceProperties(instance: any): void {
  if (!instance) return;
  if (instance.type !== "Scene") instance.dispose?.();
  for (const propertyKey in instance) {
    const propertyValue = instance[propertyKey];
    if (propertyValue?.type !== "Scene") propertyValue?.dispose?.();
  }
}

// Tears a node (and its whole subtree) down: releases every reactive
// subscription/event binding, detaches/removes the instance from its parent,
// recurses into children (bottom-up, same order as r3f's removeChild), then
// disposes the instance unless its own `dispose: null` (or an ancestor's,
// see below) says otherwise, or it's a primitive/Scene. Idempotent — safe to
// call twice on the same node.
//
// `parentAllowsDispose` mirrors r3f's `shouldDispose` flag threaded through
// recursive removeChild calls: once an ancestor being torn down resolves to
// "do not dispose" (its OWN `dispose: null`, or an ancestor further up that
// already suppressed it), every descendant is forced to skip disposal too —
// regardless of the descendant's OWN `dispose` prop — so `dispose: null` on
// a parent container opts its WHOLE subtree out (SPEC.md), not just that
// one node. This only applies to the recursive call a node makes into its
// OWN children (below); a lone child removed by reconcileChildren's normal
// diffing (the parent stays alive) is NOT affected by the parent's flag —
// same as r3f, where removeChild is called there without threading dispose.
export function disposeSceneNode(
  node: SceneNode,
  parentAllowsDispose = true,
): void {
  if (node.disposed) return;
  node.disposed = true;

  const shouldDispose = node.props.dispose !== null && parentAllowsDispose;

  releaseFunctionChildren(node);
  releaseArgsBinding(node);
  for (const release of node.releases.splice(0)) release();

  if (node.parent) {
    detachFromParent(node);
    const indexInParent = node.parent.children.indexOf(node);
    if (indexInParent !== -1) node.parent.children.splice(indexInParent, 1);
  }
  removeInteractivity(node.root, node.instance);

  for (const child of node.children.slice())
    disposeSceneNode(child, shouldDispose);
  node.children.length = 0;

  if (node.instance) delete node.instance.__domphy;

  if (shouldDispose && !node.isPrimitive && node.instance?.type !== "Scene") {
    disposeOnIdle(node.instance);
  }

  node.root.invalidate();
}
