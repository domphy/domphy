/**
 * Every `[role=option]` under `root` that is not disabled, in DOM order.
 *
 * Lives in `utils/` rather than in one of the patch modules because
 * `patches.ts` re-exports each patch module with `export *` — an export there
 * would put this internal DOM walk in the public API. Shared by `selectList`
 * (its own listbox key model), `selectBox` (typeahead + arrow entry into the
 * panel) and `combobox` (arrow entry into the popup).
 */
function enabledOptionsIn(root: Element | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("[role=option]")).filter(
    (el) =>
      el.getAttribute("aria-disabled") !== "true" &&
      !el.hasAttribute("disabled"),
  );
}

export { enabledOptionsIn };
