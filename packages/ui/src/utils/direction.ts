/**
 * True when the element resolves to right-to-left text direction (inherited
 * `dir` attribute or `direction` CSS). Same technique @domphy/floating's
 * vendored floating-ui platform uses internally for RTL-aware placement
 * (packages/floating/src/dom/platform/isRTL.ts) — reading the resolved CSS
 * `direction` picks up an ancestor `dir` attribute without walking the tree.
 */
function isRTL(element: Element | null | undefined): boolean {
  if (!element || typeof getComputedStyle !== "function") return false;
  return getComputedStyle(element).direction === "rtl";
}

/**
 * Maps a horizontal arrow key to a directional step (+1 toward the end of
 * the list, -1 toward the start), mirrored when the element resolves to RTL.
 * ArrowUp/ArrowDown and Home/End are direction-agnostic and are not covered
 * here — callers keep handling those directly.
 */
function horizontalArrowStep(
  key: string,
  element: Element | null | undefined,
): 1 | -1 | 0 {
  if (key !== "ArrowRight" && key !== "ArrowLeft") return 0;
  const forward = key === "ArrowRight";
  return forward !== isRTL(element) ? 1 : -1;
}

export { horizontalArrowStep, isRTL };
