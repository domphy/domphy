/**
 * A control's edge line drawn as a `box-shadow` instead of an `outline`.
 *
 * Why: before Chrome 94 an outline ignores `border-radius`, so every rounded
 * control drew a square frame around itself in the embedded hosts Domphy ships
 * in (SketchUp 2022-2024 = Chrome 88). A box-shadow follows the radius in every
 * engine and, like an outline, takes no layout space (the geometry formula of
 * DESIGN rules stays exact).
 *
 * - `"inside"` (default) = the old `outline` + `outlineOffset: -1px`: the line
 *   sits on the inner edge of the box. Painted under the element's content, so
 *   use it on controls whose content stays inside their padding.
 * - `"outside"` = the line just outside the box, for containers whose children
 *   reach the edge (a card's image, a menu's highlighted row) and would paint
 *   over an inside line.
 *
 * Compose it with `focusRing()` / `elevation()` in one `boxShadow` value
 * (comma-separated): a later rule's `boxShadow` replaces an earlier one whole.
 */
function edge(
  color: string,
  width = "1px",
  placement: "inside" | "outside" = "inside",
): string {
  return `${placement === "inside" ? "inset " : ""}0 0 0 ${width} ${color}`;
}

export { edge };
