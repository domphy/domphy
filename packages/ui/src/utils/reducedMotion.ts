/**
 * True when the user has asked for reduced motion (WCAG 2.3.3 Animation from
 * Interactions). Shared by every animating patch — `motion()` swaps the
 * keyframe in directly and `transitionGroup()` skips its FLIP capture.
 * Returns false where `matchMedia` is missing (SSR, jsdom without a stub).
 */
function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export { prefersReducedMotion };
