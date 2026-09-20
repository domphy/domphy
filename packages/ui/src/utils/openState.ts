import {
  effect,
  type ReadableState,
  type State,
  toState,
  type ValueOrState,
} from "@domphy/core";

export function isWritableState<T>(
  source: ReadableState<T>,
): source is State<T> {
  return typeof (source as State<T>).set === "function";
}

/**
 * Subscribe to overlay `open`. Writable State uses `addListener` (no
 * fabricated `.set()`, existing listenerCount-on-remove tests). Computed has
 * no `addListener` — `effect()` reads `get()`.
 *
 * `emitCurrent` (default true) delivers the value once on subscribe, matching
 * first-attach `update(state.get())`. Pass false when re-subscribing on a
 * reused node so a fresh uncontrolled `toState(false)` is not a caller close.
 */
export function subscribeOpen(
  source: ReadableState<boolean>,
  onChange: (open: boolean) => void,
  emitCurrent = true,
): () => void {
  if (typeof (source as State<boolean>).addListener === "function") {
    if (emitCurrent) onChange(source.get());
    return (source as State<boolean>).addListener(onChange);
  }
  if (emitCurrent) {
    return effect(() => {
      onChange(source.get());
    });
  }
  let skipInitial = true;
  const release = effect(() => {
    const value = source.get();
    if (skipInitial) return;
    onChange(value);
  });
  skipInitial = false;
  return release;
}

export function writeOpen(
  source: ReadableState<boolean>,
  value: boolean,
): void {
  if (isWritableState(source)) source.set(value);
}

export function dismissOpen(
  source: ReadableState<boolean>,
  onDismiss?: () => void,
): void {
  onDismiss?.();
  writeOpen(source, false);
}

export function asOpenState(
  open: ValueOrState<boolean> | undefined,
): ReadableState<boolean> {
  return toState(open ?? false);
}
