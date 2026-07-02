// createFloating — Popper.js-equivalent imperative manager for @domphy/floating.
//
// Wraps `computePosition` + `autoUpdate` into a stateful handle so callers do
// not have to manage the cleanup function themselves or re-implement the
// "call computePosition on every autoUpdate tick" loop.
//
// Intentionally framework-agnostic: no @domphy/core dependency. Wire it to
// any lifecycle system — Domphy `_onMount`/`_onBeforeRemove`, vanilla JS, or
// plain event listeners.

import {computePosition as computePositionCore} from '@floating-ui/core';
import type {MiddlewareData, Placement, Strategy} from '@floating-ui/core';

import {autoUpdate} from './autoUpdate.js';
import {platform} from './platform.js';
import type {
  AutoUpdateOptions,
  ComputePositionConfig,
  FloatingElement,
  ReferenceElement,
} from './types.js';

/**
 * The position result from the most recent `computePosition` call. Mirrors
 * the shape returned by `computePosition` for easy destructuring.
 */
export interface FloatingPosition {
  /** Left offset in pixels — apply as `style.left`. */
  x: number;
  /** Top offset in pixels — apply as `style.top`. */
  y: number;
  /**
   * The resolved placement after all middleware ran. May differ from the
   * preferred placement when `flip` or `autoPlacement` changed it.
   */
  placement: Placement;
  /**
   * CSS position strategy. Matches the `strategy` option passed to
   * `computePosition` and must match `style.position` on the floating element.
   */
  strategy: Strategy;
  /** Per-middleware output (arrow offsets, hide flags, size data, …). */
  middlewareData: MiddlewareData;
}

/**
 * Stateful floating-element manager returned by `createFloating`.
 *
 * Popper.js equivalences:
 * - `connect(reference, floating)` → `createPopper(reference, popper, options)`
 * - `disconnect()`                 → `popper.destroy()`
 * - `onUpdate(callback)`           → subscribe to position state changes
 * - `position`                     → equivalent of `popper.state`
 */
export interface FloatingHandle {
  /**
   * Wire the reference and floating DOM elements together and start
   * `autoUpdate`. Call this once both elements are in the DOM (e.g. from a
   * Domphy `_onMount` lifecycle hook). Calling `connect` while already
   * connected first tears down the previous auto-update.
   */
  connect(
    reference: ReferenceElement,
    floating: FloatingElement,
    updateOptions?: AutoUpdateOptions,
  ): void;
  /**
   * Stop `autoUpdate` and release element references. Call from
   * `_onBeforeRemove` — or when the floating element is hidden if it stays
   * mounted and you want to pause updates.
   */
  disconnect(): void;
  /**
   * The last computed position, or `null` before the first `computePosition`
   * call completes.
   */
  readonly position: FloatingPosition | null;
  /**
   * Subscribe to position updates. The callback is called synchronously
   * after each `computePosition` resolves with the new position. Returns an
   * unsubscribe function — call it to remove the listener.
   *
   * Typical Domphy usage: call `onUpdate` once and write the `x`/`y` values
   * to the floating element's style inside the callback.
   */
  onUpdate(callback: (position: FloatingPosition) => void): () => void;
}

/**
 * Create a stateful floating-element manager. Equivalent to `createPopper()`
 * from Popper.js, but built on the Floating UI primitives vendored by
 * `@domphy/floating`.
 *
 * ```ts
 * import { createFloating, offset, flip, shift } from "@domphy/floating"
 *
 * const handle = createFloating({
 *   placement: "bottom",
 *   middleware: [offset(8), flip(), shift()],
 *   strategy: "fixed",
 * })
 *
 * // In _onMount (once both elements are available):
 * handle.connect(referenceEl, floatingEl)
 * handle.onUpdate(({ x, y }) => {
 *   Object.assign(floatingEl.style, { left: `${x}px`, top: `${y}px` })
 * })
 *
 * // In _onBeforeRemove:
 * handle.disconnect()
 * ```
 */
export function createFloating(
  config: Partial<ComputePositionConfig> = {},
): FloatingHandle {
  let cleanupAutoUpdate: (() => void) | null = null;
  let currentReference: ReferenceElement | null = null;
  let currentFloating: FloatingElement | null = null;
  let position: FloatingPosition | null = null;
  const listeners = new Set<(position: FloatingPosition) => void>();

  function runUpdate(): void {
    if (!currentReference || !currentFloating) return;
    const reference = currentReference;
    const floating = currentFloating;

    // Mirror the cache strategy from computePosition in dom/index.ts: one Map
    // per update call so middleware can de-dupe expensive ancestor lookups
    // within the same computation without leaking between calls.
    const cache = new Map<ReferenceElement, Array<Element>>();
    const mergedOptions = {platform, ...config};
    const platformWithCache = {...mergedOptions.platform, _c: cache};

    computePositionCore(reference, floating, {
      ...mergedOptions,
      platform: platformWithCache,
    })
      .then((result) => {
        // Guard against a late-resolving promise after disconnect() — or a
        // connect() to a different pair — happened while this call was in
        // flight. Identity (not just nullity) check avoids a stale
        // computation for an old reference/floating pair overwriting a
        // newer one.
        if (currentReference !== reference || currentFloating !== floating) {
          return;
        }
        position = result as FloatingPosition;
        for (const listener of listeners) {
          try {
            listener(position);
          } catch (error) {
            console.error(error);
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }

  return {
    connect(reference, floating, updateOptions) {
      // Tear down any prior auto-update before wiring new elements.
      cleanupAutoUpdate?.();
      currentReference = reference;
      currentFloating = floating;
      runUpdate();
      cleanupAutoUpdate = autoUpdate(
        reference,
        floating,
        runUpdate,
        updateOptions,
      );
    },

    disconnect() {
      cleanupAutoUpdate?.();
      cleanupAutoUpdate = null;
      currentReference = null;
      currentFloating = null;
    },

    get position() {
      return position;
    },

    onUpdate(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
