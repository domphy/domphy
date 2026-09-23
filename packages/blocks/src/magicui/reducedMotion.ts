// Shared reduced-motion gate for the Magic UI effect blocks.
//
// WCAG 2.2.2 (Pause, Stop, Hide, Level A) requires that any motion which
// starts automatically, lasts more than five seconds, and is presented in
// parallel with other content can be paused by the user. Every Magic UI
// effect that loops forever — CSS `animation: … infinite` or a self-
// rescheduling rAF/timer loop — falls under it, so all of them honour the
// OS-level `prefers-reduced-motion: reduce` signal.

/**
 * Style fragment to spread into the SAME style object that declares an
 * `animation: … infinite` shorthand.
 *
 * `animation-play-state: paused` rather than `animation: none`: it freezes the
 * loop while still applying the keyframe the element is currently at, which
 * preserves the composed look of stacks whose members differ only by a
 * (possibly negative) `animation-delay` — orbiting circles keep their angular
 * spread, staggered rings keep their staggered scale — instead of collapsing
 * them all onto one identical resting frame.
 *
 * Provenance: this is the pattern already used by `retroGrid.ts` (the one
 * block that shipped with a reduced-motion gate); it is lifted here so the
 * remaining effect blocks share one definition.
 */
export const REDUCED_MOTION_PAUSE = {
  "@media (prefers-reduced-motion: reduce)": {
    animationPlayState: "paused",
  },
} as const;

/**
 * SSR-safe read of the OS reduce-motion preference, for the JS-driven loops
 * (canvas/rAF) that no CSS media query can reach. Returns `false` wherever
 * `matchMedia` is unavailable (server render, old test runtimes), i.e. the
 * loops keep their normal behavior rather than silently going static.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
