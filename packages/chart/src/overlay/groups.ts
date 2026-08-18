/**
 * Per-SVG overlay-group slots so array option.title / option.legend
 * (engine loops one call per entry) do not wipe each other.
 *
 * One wrapper `.dc-title` / `.dc-legend` holds every item as a
 * `data-index` child. Engine empty-cleanup is `querySelector(".dc-legend")`
 * (one node) or `querySelectorAll(".dc-title")` — removing the wrapper
 * drops the whole array. Auto-index: sequential calls without an explicit
 * index share one pass (0, 1, 2…). Auto slot 0 clears leftover children.
 * Engine always ends render() with renderSeriesSymbols, which calls
 * closeOverlayPass so the next render() restarts at 0.
 */

type PassState = {
  counters: Map<string, number>;
};

const passes = new WeakMap<SVGSVGElement, PassState>();

function passState(svg: SVGSVGElement): PassState {
  let state = passes.get(svg);
  if (!state) {
    state = { counters: new Map() };
    passes.set(svg, state);
  }
  return state;
}

/** Reset auto-index counters so the next renderLegend/renderTitle starts at 0. */
export function closeOverlayPass(svg: SVGSVGElement): void {
  passes.get(svg)?.counters.clear();
}

function nextSlot(svg: SVGSVGElement, className: string): number {
  const state = passState(svg);
  const slot = state.counters.get(className) ?? 0;
  state.counters.set(className, slot + 1);
  return slot;
}

function overlayRoot(svg: SVGSVGElement, className: string): SVGGElement {
  const existing = svg.querySelector(`:scope > .${className}`);
  if (existing) return existing as SVGGElement;
  const root = document.createElementNS("http://www.w3.org/2000/svg", "g");
  root.setAttribute("class", className);
  svg.appendChild(root);
  return root;
}

/**
 * Resolve the group index and remove the previous item at that slot.
 * Auto-index 0 also removes leftover higher-index items from the last pass.
 */
export function takeOverlaySlot(
  svg: SVGSVGElement,
  className: string,
  index?: number,
): { slot: number; root: SVGGElement } {
  const explicit = index !== undefined;
  const slot = explicit ? index : nextSlot(svg, className);
  const root = overlayRoot(svg, className);
  if (!explicit && slot === 0) {
    root.replaceChildren();
  } else {
    root.querySelector(`:scope > [data-index="${slot}"]`)?.remove();
  }
  return { slot, root };
}

export function stampOverlayGroup(group: SVGGElement, slot: number): void {
  group.setAttribute("data-index", String(slot));
}
