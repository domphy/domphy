import type {
  BehaviorInstance,
  ElementNode,
  PartialElement,
  State,
} from "@domphy/core";
import { behavior } from "@domphy/core";
import {
  animations,
  dragAndDrop,
  type ParentConfig,
  parents,
  tearDown,
} from "@formkit/drag-and-drop";

// FormKit's tearDown() only aborts the parent-level listeners — it leaves the
// entry in the exported `parents` registry and never disconnects the
// MutationObserver it created at setup (no observer handle is exposed
// upstream). The orphaned observer keeps firing remapNodes() against the stale
// registry entry — on a detached parent after removal, and TWICE per mutation
// after a tearDown+re-register cycle (old observer + new observer). Deleting
// the registry entry neutralizes the orphan: remapNodes() no-ops on an
// unknown parent. (The observer/target cycle itself is GC-able once detached.)
function tearDownFully(parent: HTMLElement): void {
  tearDown(parent);
  parents.delete(parent);
}

export interface DragDropConfig<T> extends Partial<ParentConfig<T>> {
  /** Enable sort animations. Default: true. */
  animated?: boolean;
}

/**
 * Props routed into the per-node behavior instance. Internal to the package —
 * `dragDrop()` and `multiList()` both declare the same behavior key so a node
 * switching between the two across generations reuses one instance.
 */
export interface DragDropBehaviorProps<T> {
  values: State<T[]>;
  config: DragDropConfig<T>;
  group?: string;
}

// Shared frozen default so `dragDrop(state)` (no config argument) passes a
// referentially stable config across generations — otherwise every re-render
// of a reactive parent would look like a config change and force a pointless
// FormKit tear-down/re-register cycle.
const DEFAULT_CONFIG = Object.freeze({}) as DragDropConfig<any>;

// Behavior key shared by dragDrop() and multiList() — one drag concern per
// element, so re-declaring the same key from a later generation routes fresh
// props into the existing instance via update().
const DND_BEHAVIOR_KEY = "domphy:dnd";

// Shallow own-key comparison with Object.is on values. Config is a flat bag
// of scalars/functions/arrays; a deep compare would be wrong for functions
// and plugin instances. Inline array literals (e.g. `plugins: [...]`) are
// referentially fresh per generation and will re-register — hoist them to a
// module-level const if that matters.
function configEquals<T>(a: DragDropConfig<T>, b: DragDropConfig<T>): boolean {
  if (a === b) return true;
  const aKeys = Object.keys(a) as (keyof DragDropConfig<T>)[];
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

/**
 * Per-node FormKit registration, attached via `behavior()` so it runs exactly
 * once per real DOM node no matter how many times a reactive parent re-runs
 * the `dragDrop()`/`multiList()` factory. Later generations' props arrive via
 * `update()`; when the bound State instance, group, or config actually
 * changed, the registration is torn down and re-created against the new
 * props.
 */
export function attachDragDrop<T>(
  node: ElementNode,
  initialProps: DragDropBehaviorProps<T>,
): BehaviorInstance<DragDropBehaviorProps<T>> {
  let props = initialProps;
  const parent = node.domElement as HTMLElement | null;
  let disposed = false;
  // Whether dragAndDrop() has completed registration for `parent`. tearDown()
  // is only valid on a registered parent — this flag guards destroy() for
  // nodes removed before the deferred registration ran.
  let registered = false;
  let outerFrame: number | null = null;
  let innerFrame: number | null = null;

  const cancelFrames = () => {
    if (outerFrame !== null) {
      cancelAnimationFrame(outerFrame);
      outerFrame = null;
    }
    if (innerFrame !== null) {
      cancelAnimationFrame(innerFrame);
      innerFrame = null;
    }
  };

  const register = () => {
    if (!parent) return;
    if (registered) {
      tearDownFully(parent);
      registered = false;
    }
    const { values, group } = props;
    const { animated = true, ...rest } = props.config;
    const plugins = animated
      ? [animations(), ...(rest.plugins ?? [])]
      : (rest.plugins ?? []);
    const setValues = (next: T[]) => values.set(next);
    dragAndDrop<T>({
      parent,
      getValues: () => values.get(),
      setValues,
      config: { ...rest, ...(group !== undefined ? { group } : {}), plugins },
    });
    registered = true;
  };

  // Domphy fires Mount before rendering children, so dragAndDrop() would see
  // 0 DOM children at attach time. Double-rAF defers until after paint. The
  // handles are kept so destroy() (and a re-schedule from update()) can
  // cancel a pending registration instead of only flagging it — a cancelled
  // frame can never register a torn-down parent.
  const scheduleRegister = () => {
    cancelFrames();
    outerFrame = requestAnimationFrame(() => {
      outerFrame = null;
      innerFrame = requestAnimationFrame(() => {
        innerFrame = null;
        if (disposed) return;
        register();
      });
    });
  };

  scheduleRegister();

  return {
    update: (nextProps) => {
      const changed =
        nextProps.values !== props.values ||
        nextProps.group !== props.group ||
        !configEquals(nextProps.config, props.config);
      props = nextProps;
      // Re-register with the new binding. If the initial registration is
      // still pending, scheduleRegister() simply replaces it — the frames
      // always read the LATEST props, so no stale registration can land.
      if (changed && !disposed) scheduleRegister();
    },
    destroy: () => {
      disposed = true;
      cancelFrames();
      if (parent && registered) {
        tearDownFully(parent);
        registered = false;
      }
    },
  };
}

/**
 * Domphy adapter for `@formkit/drag-and-drop`. Apply to the list container via
 * `$`; it wires FormKit's drag engine to a Domphy `State<T[]>` — reorders update
 * the state and the keyed children re-render.
 *
 * Animations are enabled by default. Pass `animated: false` to disable.
 *
 * ```ts
 * const items = toState([{ id: 1, label: "A" }, { id: 2, label: "B" }])
 * const App = {
 *   ul: (l) => items.get(l).map((it) => ({ li: it.label, _key: it.id })),
 *   $: [dragDrop(items)],
 * }
 * ```
 *
 * Reused-node safety: the FormKit registration lives in a `behavior()`
 * instance, so when a reactive parent re-renders and this factory re-runs on
 * the SAME DOM node, the new `values`/`config` are routed into the live
 * instance (re-registering if the State instance or config changed) instead
 * of being silently dropped.
 *
 * With a drag handle:
 * ```ts
 * dragDrop(items, { dragHandle: ".drag-handle" })
 * ```
 *
 * Cross-list transfer with a named group:
 * ```ts
 * dragDrop(listA, { group: "shared" })
 * dragDrop(listB, { group: "shared" })
 * ```
 */
export function dragDrop<T>(
  values: State<T[]>,
  config: DragDropConfig<T> = DEFAULT_CONFIG,
): PartialElement {
  return behavior<DragDropBehaviorProps<T>>(DND_BEHAVIOR_KEY, attachDragDrop, {
    values,
    config,
  });
}
