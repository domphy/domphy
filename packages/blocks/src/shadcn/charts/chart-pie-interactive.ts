// shadcn/ui "charts/pie-interactive" — clean-room reimplementation.
//
// A donut chart paired with a select control that lets the user pick one
// category; the chosen category's wedge is drawn enlarged and its value
// becomes the donut's center total. Selection is a single source-of-truth
// `State<string>` that both the active-wedge radius and the center text
// read from. Implemented purely from the block's public functional/visual
// spec — no upstream source was viewed.

import type { DomphyElement, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { motion, select } from "@domphy/ui";
import {
  type PieDatum,
  DEFAULT_DONUT_INNER_RADIUS,
  DEFAULT_PIE_DATA,
  arcSlicePath,
  colorSwatch,
  createPieTooltipState,
  defaultValueFormatter,
  layoutPieSlices,
  pieCard,
  pieCardDescription,
  pieCardTitle,
  pieCenterText,
  pieChartContainer,
  resolveSliceColor,
  wedgeTooltipHandlers,
} from "./pie-chart-shared.js";

// The base ring sits well inside the 200-unit viewBox so the selected slice
// can pop outward *and* trail a detached outer arc (upstream renders the
// active sector as two stacked <Sector>s: an enlarged wedge plus a thin ring
// floating just beyond it) without either overflowing the card.
const BASE_OUTER_RADIUS = 66;
const ACTIVE_RING_GAP = 3;
const ACTIVE_RING_THICKNESS = 13;

export interface ChartPieInteractiveProps {
  data?: PieDatum[];
  title?: string;
  description?: string;
  valueFormatter?: (value: number) => string;
  innerRadius?: number;
  /** Controlled selected category key. Defaults to the first record. */
  activeKey?: string;
  onSelectionChange?: (key: string) => void;
  centerCaption?: string;
  /** Extra outer-radius (viewBox units) the selected wedge grows to. */
  activeRadiusDelta?: number;
}

/**
 * A select-driven donut chart: the chosen category's wedge grows and its
 * value fills the donut's hollow center. Call with no arguments for a fully
 * working demo.
 */
function chartPieInteractive(props: ChartPieInteractiveProps = {}): DomphyElement<"div"> {
  const {
    data = DEFAULT_PIE_DATA,
    title = "Pie Chart - Interactive",
    description = "January - June 2024",
    valueFormatter = defaultValueFormatter,
    innerRadius = DEFAULT_DONUT_INNER_RADIUS,
    activeKey,
    onSelectionChange,
    centerCaption = "Visitors",
    activeRadiusDelta = 12,
  } = props;

  const selectedKey = toState(activeKey ?? data[0]?.key ?? "");
  const slices = layoutPieSlices(data);
  const tooltipState = createPieTooltipState();
  const containerRef = { current: null as HTMLElement | null };

  const setSelection = (key: string) => {
    selectedKey.set(key);
    onSelectionChange?.(key);
  };

  // Reactive per-wedge `style.d` (not the plain `d` attribute): CSS lets
  // browsers interpolate between two `path()` values sharing the same
  // command structure — which arcSlicePath's output always does — so the
  // active wedge's enlarge/shrink reads as a quick ease-out transition
  // instead of a hard snap.
  const wedges: DomphyElement<"path">[] = slices.map((slice) => {
    const isSelected = (l: Listener) => selectedKey.get(l) === slice.datum.key;
    return {
      path: null,
      style: {
        d: (l: Listener) => {
          const outerRadius = isSelected(l) ? BASE_OUTER_RADIUS + activeRadiusDelta : BASE_OUTER_RADIUS;
          return `path("${arcSlicePath(slice, innerRadius, outerRadius, 0.018)}")`;
        },
        transition: "d 260ms ease-out",
      },
      fill: (l: Listener) => themeColor(l, "shift-9", slice.color),
      strokeWidth: (l: Listener) => (isSelected(l) ? "2.5" : "1.5"),
      stroke: (l: Listener) => themeColor(l, "inherit"),
      strokeLinejoin: "round",
      cursor: "pointer",
      _key: slice.datum.key,
      ...wedgeTooltipHandlers(slice, { containerRef, tooltipState, valueFormatter }),
    } as DomphyElement<"path">;
  });

  // One detached "pop-out" ring per slice, faded in only for the selected
  // one — the arc floats just beyond the enlarged active wedge, mirroring the
  // second stacked <Sector> in upstream's active-sector shape renderer.
  const activeRingInner = BASE_OUTER_RADIUS + activeRadiusDelta + ACTIVE_RING_GAP;
  const activeRingOuter = activeRingInner + ACTIVE_RING_THICKNESS;
  const activeRings: DomphyElement<"path">[] = slices.map((slice) => ({
    path: null,
    d: arcSlicePath(slice, activeRingInner, activeRingOuter, 0.018),
    fill: (l: Listener) => themeColor(l, "shift-9", slice.color),
    stroke: "none",
    ariaHidden: "true",
    _key: `${slice.datum.key}-active-ring`,
    style: {
      pointerEvents: "none",
      opacity: (l: Listener) => (selectedKey.get(l) === slice.datum.key ? 1 : 0),
      transition: "opacity 260ms ease-out",
    },
  }));

  const options: DomphyElement<"option">[] = data.map((datum, index) => ({
    option: datum.name,
    value: datum.key,
    // Native `<option>` elements cannot host a child swatch element — tinting
    // the option's own text color is the closest in-grammar approximation of
    // "each option carries its own color swatch" (see this block's fidelity
    // note in the port report).
    style: { color: (l: Listener) => themeColor(l, "shift-9", resolveSliceColor(datum, index)) },
    _key: datum.key,
  }));

  const centerValueText = (l: Listener) => {
    const key = selectedKey.get(l);
    const datum = data.find((record) => record.key === key) ?? data[0];
    return datum ? valueFormatter(datum.value) : "";
  };

  const selectedSwatchColor = (l: Listener) => {
    const key = selectedKey.get(l);
    const index = Math.max(
      data.findIndex((record) => record.key === key),
      0,
    );
    return resolveSliceColor(data[index] ?? { key: "", name: "", value: 0 }, index);
  };

  return pieCard([
    pieCardTitle(title, false),
    pieCardDescription(description, false),
    {
      aside: [
        colorSwatch(selectedSwatchColor),
        {
          select: options,
          value: (l: Listener) => selectedKey.get(l),
          onChange: (e: Event) => setSelection((e.target as HTMLSelectElement).value),
          ariaLabel: "Select a category",
          $: [select()],
        },
      ],
      style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
    },
    pieChartContainer(
      containerRef,
      [
        {
          g: [...wedges, ...activeRings],
          ariaHidden: "true",
          style: { transformOrigin: "100px 100px" },
          $: [
            motion({
              initial: { opacity: 0, scale: 0.7 },
              animate: { opacity: 1, scale: 1 },
              transition: { duration: 700, easing: "ease-out" },
            }),
          ],
        } as DomphyElement<"g">,
        pieCenterText(centerValueText, centerCaption),
      ],
      tooltipState,
      `${title}: ${description}`,
    ),
  ]);
}

export { chartPieInteractive };
