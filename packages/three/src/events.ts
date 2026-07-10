import * as THREE from "three";
import { getPointerHandlers } from "./props.js";
import type { RootState } from "./types.js";

// Port of react-three-fiber's core/events.ts + web/events.ts — the raycast
// pointer-event system. Translated from React idioms to plain functions over
// a directly-passed RootState (no zustand store, no `store.getState()`, no
// multi-root `getRootState(obj)`/`previousRoot` traversal: SPEC.md's "State-in"
// decision passes RootState directly, and this package has no portal/nested
// -root concept, so every function below operates on exactly one root).
//
// Handler storage: reference stashes handlers on `object.__r3f.handlers`
// (populated by the reconciler). This package's props.ts already owns that
// job — `applyProps`'s pointer-event rule (rule 1) stores handlers in a
// WeakMap keyed by instance and keeps `root.internal.interactive` in sync,
// exporting `getPointerHandlers(instance)`. events.ts reads through that
// existing registry instead of re-deriving one from `instance.__domphy` (see
// the "handler storage" contract-gap note in the report).

export interface Intersection extends THREE.Intersection {
  // The object that registered the handler this intersection bubbled to —
  // differs from `.object` (the actual raycast hit) once ancestor bubbling
  // walks up the parent chain.
  eventObject: any;
}

export type DomEvent = PointerEvent | MouseEvent | WheelEvent;

export interface EventCaptureTarget {
  hasPointerCapture(pointerId: number): boolean;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
}

export interface ThreeEvent<TEvent> extends Intersection {
  intersections: Intersection[];
  unprojectedPoint: THREE.Vector3;
  pointer: THREE.Vector2;
  delta: number;
  ray: THREE.Ray;
  camera: any;
  stopped: boolean;
  stopPropagation(): void;
  nativeEvent: TEvent;
  target: EventCaptureTarget;
  currentTarget: EventCaptureTarget;
}

// Rule-1 pointer-event handler bag as stored by props.ts (a plain record of
// whichever of the 14 whitelisted keys currently have a live function).
type PointerHandlers = Record<string, ((event: any) => void) | undefined>;

function makeId(intersection: Intersection): string {
  const object = intersection.eventObject || intersection.object;
  return `${object.uuid}/${intersection.index}${(intersection as any).instanceId}`;
}

function hasAnyHandler(object: any): boolean {
  const handlers = getPointerHandlers(object) as PointerHandlers | undefined;
  return !!handlers && Object.keys(handlers).length > 0;
}

// ---- Pointer capture -------------------------------------------------------
// root.internal.captured (SPEC.md's shared contract) is a plain
// `Map<pointerId, Set<instance>>` — enough for other modules (reconciler.ts's
// removeInteractivity call on node disposal) to ask "is this instance
// captured", but not
// enough to actually honor a capture: releasing it needs the original DOM
// `target` to call `releasePointerCapture` on, and re-injecting a captured
// hit into a later intersect() pass needs the original Intersection. Since
// types.ts is locked, events.ts keeps that richer data in a private,
// root-keyed registry and mirrors instance identity into the public Set in
// lockstep (see the report's "capture map fidelity" contract gap).
interface CaptureRecord {
  intersection: Intersection;
  target: EventCaptureTarget;
}

const captureDetailsByRoot = new WeakMap<
  RootState,
  Map<number, Map<any, CaptureRecord>>
>();

function getCaptureDetails(
  root: RootState,
): Map<number, Map<any, CaptureRecord>> {
  let detailsByPointer = captureDetailsByRoot.get(root);
  if (!detailsByPointer) {
    detailsByPointer = new Map();
    captureDetailsByRoot.set(root, detailsByPointer);
  }
  return detailsByPointer;
}

function markCaptured(root: RootState, pointerId: number, object: any): void {
  let instances = root.internal.captured.get(pointerId);
  if (!instances) {
    instances = new Set();
    root.internal.captured.set(pointerId, instances);
  }
  instances.add(object);
}

// Releases one instance's capture of `pointerId`. Calls the DOM target's
// `releasePointerCapture` only once the LAST capturing instance for that
// pointer has been released — mirrors reference's
// `releaseInternalPointerCapture`.
function releaseCapture(root: RootState, pointerId: number, object: any): void {
  const detailsByPointer = getCaptureDetails(root);
  const details = detailsByPointer.get(pointerId);
  const record = details?.get(object);
  if (!record) return;

  details!.delete(object);
  const instances = root.internal.captured.get(pointerId);
  instances?.delete(object);

  if (details!.size === 0) {
    detailsByPointer.delete(pointerId);
    root.internal.captured.delete(pointerId);
    record.target.releasePointerCapture(pointerId);
  }
}

// Transfers every trace of interactivity from `object` to `newObject` — used
// by reconciler.ts when `args` changes force an instance to be reconstructed
// (SPEC.md "Reconcile semantics"). Port of core/events.ts's
// `swapInteractivity`, adapted to this package's flatter internal shape.
export function swapInteractivity(
  root: RootState,
  object: any,
  newObject: any,
): void {
  const { internal } = root;

  const interactiveIndex = internal.interactive.indexOf(object);
  if (interactiveIndex > -1) internal.interactive[interactiveIndex] = newObject;

  const initialHitIndex = internal.initialHits.indexOf(object);
  if (initialHitIndex > -1) internal.initialHits[initialHitIndex] = newObject;

  for (const [id, value] of internal.hovered) {
    if (value.eventObject === object || value.object === object) {
      internal.hovered.delete(id);
      const next = {
        ...value,
        eventObject:
          value.eventObject === object ? newObject : value.eventObject,
        object: value.object === object ? newObject : value.object,
      };
      internal.hovered.set(makeId(next), next);
    }
  }

  const detailsByPointer = getCaptureDetails(root);
  for (const [pointerId, instances] of internal.captured) {
    if (!instances.has(object)) continue;
    instances.delete(object);
    instances.add(newObject);

    const details = detailsByPointer.get(pointerId);
    const record = details?.get(object);
    if (record) {
      details!.delete(object);
      details!.set(newObject, record);
    }
  }
}

// Removes every trace of `object` from the root's interaction bookkeeping —
// used by reconciler.ts on node removal. Port of core/events.ts's
// `removeInteractivity`.
export function removeInteractivity(root: RootState, object: any): void {
  const { internal } = root;

  const interactiveIndex = internal.interactive.indexOf(object);
  if (interactiveIndex > -1) internal.interactive.splice(interactiveIndex, 1);

  const initialHitIndex = internal.initialHits.indexOf(object);
  if (initialHitIndex > -1) internal.initialHits.splice(initialHitIndex, 1);

  for (const [id, value] of internal.hovered) {
    if (value.eventObject === object || value.object === object)
      internal.hovered.delete(id);
  }

  // Force the removal from the public Set even if no matching capture-detail
  // record exists (defensive: keeps `root.internal.captured` — the shared
  // contract other modules read — consistent no matter how it got into this
  // state), releasing the DOM capture too whenever we do have that record.
  const detailsByPointer = captureDetailsByRoot.get(root);
  for (const [pointerId, instances] of internal.captured) {
    if (!instances.has(object)) continue;
    instances.delete(object);
    if (instances.size === 0) internal.captured.delete(pointerId);

    const details = detailsByPointer?.get(pointerId);
    const record = details?.get(object);
    if (record) {
      details!.delete(object);
      if (details!.size === 0) detailsByPointer!.delete(pointerId);
      record.target.releasePointerCapture(pointerId);
    }
  }
}

// ---- Raycasting -------------------------------------------------------------

// Sets up the raycaster/pointer for the current event — port of
// web/events.ts's `compute`. Reference guards this behind
// `!state.previousRoot` (multi-layer event managers); single-root here, so it
// always runs at the top of `intersect()`.
function computePointer(event: DomEvent, root: RootState): void {
  const size = root.size.get();
  root.pointer.set(
    (event.offsetX / size.width) * 2 - 1,
    -(event.offsetY / size.height) * 2 + 1,
  );
  root.raycaster.setFromCamera(root.pointer, root.camera);
}

// Returns true if an instance has a valid pointer-event registered that
// justifies raycasting it during a plain pointermove (excludes click/wheel-
// only instances) — port of core/events.ts's `filterPointerEvents`.
function filterPointerEvents(objects: any[]): any[] {
  return objects.filter((object) => {
    const handlers = getPointerHandlers(object) as PointerHandlers | undefined;
    if (!handlers) return false;
    return (
      !!handlers.onPointerMove ||
      !!handlers.onPointerOver ||
      !!handlers.onPointerEnter ||
      !!handlers.onPointerOut ||
      !!handlers.onPointerLeave
    );
  });
}

// Raycasts every registered interactive object, sorts by distance, dedupes,
// bubbles each hit up through ancestors that themselves carry handlers, and
// splices in any pointer-captured targets. Port of core/events.ts's
// `intersect`, collapsed to a single root (no `getRootState`/multi-layer
// camera-reset dance — there is exactly one raycaster/camera pair here).
export function intersect(
  root: RootState,
  event: DomEvent,
  filter?: (objects: any[]) => any[],
): Intersection[] {
  computePointer(event, root);

  const duplicates = new Set<string>();
  const intersections: Intersection[] = [];
  const eventObjects = filter
    ? filter(root.internal.interactive)
    : root.internal.interactive;

  let hits: THREE.Intersection[] = eventObjects
    .flatMap((object: any) => root.raycaster.intersectObject(object, true))
    .sort(
      (a: THREE.Intersection, b: THREE.Intersection) => a.distance - b.distance,
    )
    .filter((item: THREE.Intersection) => {
      const id = makeId(item as Intersection);
      if (duplicates.has(id)) return false;
      duplicates.add(id);
      return true;
    });

  // Userland custom intersect sort/reorder hook. SPEC.md's ThreeOptions has
  // no dedicated slot for this (reference's is `EventManager.filter`, set on
  // a per-Canvas event-manager object this package doesn't expose) — the
  // nearest available extension point is the raycaster instance itself,
  // reachable from `onCreated(root)`. See the report's "raycaster filter"
  // contract-gap note.
  const raycasterFilter = (root.raycaster as any).filter as
    | ((hits: THREE.Intersection[], root: RootState) => THREE.Intersection[])
    | undefined;
  if (raycasterFilter) hits = raycasterFilter(hits, root);

  for (const hit of hits) {
    let eventObject: any = hit.object;
    while (eventObject) {
      if (hasAnyHandler(eventObject)) {
        intersections.push({ ...hit, eventObject } as Intersection);
      }
      eventObject = eventObject.parent;
    }
  }

  if ("pointerId" in event) {
    const details = getCaptureDetails(root).get(
      (event as PointerEvent).pointerId,
    );
    if (details) {
      for (const record of details.values()) {
        if (!duplicates.has(makeId(record.intersection))) {
          intersections.push(record.intersection);
        }
      }
    }
  }

  return intersections;
}

function calculateDistance(root: RootState, event: DomEvent): number {
  const dx = event.offsetX - root.internal.initialClick[0];
  const dy = event.offsetY - root.internal.initialClick[1];
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

// Fires `onPointerMissed` on every listed object, plus the root-level one —
// port of core/events.ts's `pointerMissed`, with the root-level call folded
// in at each call site (reference does the same at its two call sites).
function pointerMissed(
  _root: RootState,
  event: MouseEvent,
  objects: any[],
): void {
  for (const object of objects) {
    (
      getPointerHandlers(object) as PointerHandlers | undefined
    )?.onPointerMissed?.(event);
  }
}

// Handles unhover: any previously-hovered object absent from the current hit
// set gets `onPointerOut`/`onPointerLeave` and is dropped from
// `internal.hovered`. Port of core/events.ts's `cancelPointer`.
function cancelPointer(root: RootState, intersections: Intersection[]): void {
  const { internal } = root;
  for (const [id, hoveredRecord] of internal.hovered) {
    const stillPresent = intersections.find(
      (hit) =>
        hit.object === hoveredRecord.object &&
        hit.index === hoveredRecord.index &&
        (hit as any).instanceId === (hoveredRecord as any).instanceId,
    );
    if (!intersections.length || !stillPresent) {
      const eventObject = hoveredRecord.eventObject;
      const handlers = getPointerHandlers(eventObject) as
        | PointerHandlers
        | undefined;
      internal.hovered.delete(id);
      if (handlers && Object.keys(handlers).length > 0) {
        const data = { ...hoveredRecord, intersections };
        handlers.onPointerOut?.(data);
        handlers.onPointerLeave?.(data);
      }
    }
  }
}

// Builds the full ThreeEvent for each hit (in nearest-first order) and calls
// `dispatch`, stopping the loop the moment a handler calls
// `event.stopPropagation()`. Port of core/events.ts's `handleIntersects`.
function handleIntersects(
  root: RootState,
  intersections: Intersection[],
  event: DomEvent,
  delta: number,
  dispatch: (event: ThreeEvent<DomEvent>) => void,
): void {
  if (!intersections.length) return;

  const localState = { stopped: false };
  for (const hit of intersections) {
    const { raycaster, pointer, camera, internal } = root;
    const unprojectedPoint = new THREE.Vector3(
      pointer.x,
      pointer.y,
      0,
    ).unproject(camera);

    const hasPointerCapture = (pointerId: number) =>
      internal.captured.get(pointerId)?.has(hit.eventObject) ?? false;

    const setPointerCapture = (pointerId: number) => {
      const target = event.target as unknown as EventCaptureTarget;
      const detailsByPointer = getCaptureDetails(root);
      let details = detailsByPointer.get(pointerId);
      if (!details) {
        details = new Map();
        detailsByPointer.set(pointerId, details);
      }
      details.set(hit.eventObject, { intersection: hit, target });
      markCaptured(root, pointerId, hit.eventObject);
      target.setPointerCapture(pointerId);
    };

    const releasePointerCapture = (pointerId: number) =>
      releaseCapture(root, pointerId, hit.eventObject);

    // Native PointerEvent props are mostly inherited getters — copy the
    // atomics (not functions, those stay reachable via `nativeEvent.fn()`).
    const extractedNativeProps: Record<string, unknown> = {};
    for (const prop in event) {
      const value = (event as any)[prop];
      if (typeof value !== "function") extractedNativeProps[prop] = value;
    }

    const threeEvent: ThreeEvent<DomEvent> = {
      ...hit,
      ...extractedNativeProps,
      pointer,
      intersections,
      stopped: localState.stopped,
      delta,
      unprojectedPoint,
      ray: raycaster.ray,
      camera,
      stopPropagation() {
        // Captured pointers may not be stopped by anyone except the
        // capturing object(s) — reference parity.
        const capturesForPointer =
          "pointerId" in event &&
          internal.captured.get((event as PointerEvent).pointerId);
        if (!capturesForPointer || capturesForPointer.has(hit.eventObject)) {
          threeEvent.stopped = localState.stopped = true;
          // Only an already-hovered handler is allowed to flush hover
          // records that sit higher (closer) than itself in the stack.
          if (
            internal.hovered.size &&
            Array.from(internal.hovered.values()).some(
              (h) => h.eventObject === hit.eventObject,
            )
          ) {
            const higher = intersections.slice(0, intersections.indexOf(hit));
            cancelPointer(root, [...higher, hit]);
          }
        }
      },
      target: { hasPointerCapture, setPointerCapture, releasePointerCapture },
      currentTarget: {
        hasPointerCapture,
        setPointerCapture,
        releasePointerCapture,
      },
      nativeEvent: event,
    } as ThreeEvent<DomEvent>;

    dispatch(threeEvent);
    if (localState.stopped) break;
  }
}

// ---- Handler dispatch -------------------------------------------------------

// The 14 whitelisted keys minus the 3 special-cased below split into two
// buckets exactly like reference: the "click-like" ones use the initial-hit
// target and report misses, everything else forwards straight through.
const CLICK_EVENT_NAMES = new Set([
  "onClick",
  "onContextMenu",
  "onDoubleClick",
]);

// Creates the pointer-event handler dispatch table bound to one root — port
// of core/events.ts's `createEvents`, plus web/events.ts's DOM
// connect/disconnect (folded into the same factory since this package has no
// separate EventManager abstraction to route through).
export function createEvents(root: RootState) {
  function handlePointer(name: string): (event: DomEvent) => void {
    if (name === "onPointerLeave" || name === "onPointerCancel") {
      return () => cancelPointer(root, []);
    }

    if (name === "onLostPointerCapture") {
      return (event: DomEvent) => {
        if (!("pointerId" in event)) return;
        const pointerId = (event as PointerEvent).pointerId;
        if (!root.internal.captured.has(pointerId)) return;
        // onLostPointerCapture fires before onPointerUp — defer the release
        // one frame so pointer-up still sees the capture, matching reference.
        requestAnimationFrame(() => {
          if (root.internal.captured.has(pointerId)) {
            root.internal.captured.delete(pointerId);
            getCaptureDetails(root).delete(pointerId);
            cancelPointer(root, []);
          }
        });
      };
    }

    return (event: DomEvent) => {
      const { internal } = root;
      internal.lastEvent = event;

      const isPointerMove = name === "onPointerMove";
      const isClickEvent = CLICK_EVENT_NAMES.has(name);
      const filter = isPointerMove ? filterPointerEvents : undefined;

      const hits = intersect(root, event, filter);
      const delta = isClickEvent ? calculateDistance(root, event) : 0;

      if (name === "onPointerDown") {
        internal.initialClick = [event.offsetX, event.offsetY];
        internal.initialHits = hits.map((hit) => hit.eventObject);
      }

      // Missed events fire first, so userland side-effect cleanup can run
      // before anything else this tick.
      if (isClickEvent && !hits.length) {
        if (delta <= 2) {
          pointerMissed(root, event as MouseEvent, internal.interactive);
          root.onPointerMissed?.(event as MouseEvent);
        }
      }

      if (isPointerMove) cancelPointer(root, hits);

      function dispatch(data: ThreeEvent<DomEvent>): void {
        const eventObject = data.eventObject;
        const handlers = getPointerHandlers(eventObject) as
          | PointerHandlers
          | undefined;
        if (!handlers || Object.keys(handlers).length === 0) return;

        if (isPointerMove) {
          if (
            handlers.onPointerOver ||
            handlers.onPointerEnter ||
            handlers.onPointerOut ||
            handlers.onPointerLeave
          ) {
            const id = makeId(data);
            const hoveredItem = internal.hovered.get(id);
            if (!hoveredItem) {
              internal.hovered.set(id, data);
              handlers.onPointerOver?.(data);
              handlers.onPointerEnter?.(data);
            } else if ((hoveredItem as ThreeEvent<DomEvent>).stopped) {
              data.stopPropagation();
            }
          }
          handlers.onPointerMove?.(data);
        } else {
          const handler = handlers[name];
          if (handler) {
            if (!isClickEvent || internal.initialHits.includes(eventObject)) {
              pointerMissed(
                root,
                event as MouseEvent,
                internal.interactive.filter(
                  (object) => !internal.initialHits.includes(object),
                ),
              );
              handler(data);
            }
          } else if (
            isClickEvent &&
            internal.initialHits.includes(eventObject)
          ) {
            pointerMissed(
              root,
              event as MouseEvent,
              internal.interactive.filter(
                (object) => !internal.initialHits.includes(object),
              ),
            );
          }
        }
      }

      handleIntersects(root, hits, event, delta, dispatch);
    };
  }

  // ---- DOM connection (web/events.ts) --------------------------------------
  // eventName -> passive. Deliberately excludes onPointerOver/Out/Enter and
  // onPointerMissed — those are derived inside the onPointerMove dispatch
  // above and native-bind onPointerMissed makes no sense (it isn't a real DOM
  // event). Touch input needs no special-case handling here: browsers already
  // report touch-originated interaction through PointerEvent, so
  // event.offsetX/offsetY (computePointer's only input) is already unified
  // across mouse/touch/pen — the "touch offset handling" concern only exists
  // for the React Native target (native/events.ts), out of scope for this
  // web-only package.
  const DOM_EVENTS: Record<string, [eventName: string, passive: boolean]> = {
    onClick: ["click", false],
    onContextMenu: ["contextmenu", false],
    onDoubleClick: ["dblclick", false],
    onWheel: ["wheel", true],
    onPointerDown: ["pointerdown", true],
    onPointerUp: ["pointerup", true],
    onPointerLeave: ["pointerleave", true],
    onPointerMove: ["pointermove", true],
    onPointerCancel: ["pointercancel", true],
    onLostPointerCapture: ["lostpointercapture", true],
  };

  let connectedCanvas: HTMLElement | null = null;
  let boundListeners: Record<string, (event: any) => void> | null = null;

  function connect(canvas: HTMLElement): void {
    disconnect();
    const listeners: Record<string, (event: any) => void> = {};
    for (const key in DOM_EVENTS) {
      const [eventName, passive] = DOM_EVENTS[key];
      const listener = handlePointer(key);
      listeners[eventName] = listener;
      canvas.addEventListener(eventName, listener as EventListener, {
        passive,
      });
    }
    boundListeners = listeners;
    connectedCanvas = canvas;
  }

  function disconnect(): void {
    if (connectedCanvas && boundListeners) {
      for (const eventName in boundListeners) {
        connectedCanvas.removeEventListener(
          eventName,
          boundListeners[eventName] as EventListener,
        );
      }
    }
    connectedCanvas = null;
    boundListeners = null;
  }

  return { handlePointer, connect, disconnect };
}
