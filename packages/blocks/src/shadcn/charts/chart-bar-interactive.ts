// shadcn/ui "chart-bar" (interactive recipe) — clean-room reimplementation.
//
// A wide, footer-less card whose header doubles as a two-option toggle:
// each tab shows a series name plus its full-dataset running total, and
// clicking a tab swaps which daily series is plotted as thin vertical bars.
// The x-axis shows abbreviated date labels (auto-thinned by the engine for
// density), only horizontal gridlines are drawn, and hovering shows a
// shaded cursor column behind the hovered day.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { card, heading, paragraph, small } from "@domphy/ui";
import { chart } from "@domphy/chart";
import type { ChartOption, TooltipParams } from "@domphy/chart";
import {
  CHART_BAR_DAILY_DATA,
  chartBarValueDomain,
  type ChartBarDailyPoint,
} from "./chart-bar-shared.js";

type SeriesKey = "desktop" | "mobile";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLongDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

// @domphy/chart's axis renderer never reads `axisLabel.formatter` (verified
// against packages/chart/src/overlay/axes.ts — only the raw tick string is
// drawn) — so category tick text is pre-formatted here rather than supplied
// through that (currently inert) hook.
function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

export interface ChartBarInteractiveProps {
  title?: string;
  subtitle?: string;
  data?: ChartBarDailyPoint[];
  initialSeries?: SeriesKey;
  desktopLabel?: string;
  desktopColor?: ThemeColor;
  mobileLabel?: string;
  mobileColor?: ThemeColor;
}

/**
 * shadcn/ui "chart-bar" interactive recipe — a dense daily bar chart whose
 * header stat tiles double as a series switcher. Call with no arguments for
 * a fully working demo.
 */
function chartBarInteractive(props: ChartBarInteractiveProps = {}): DomphyElement<"div"> {
  const {
    title = "Bar Chart - Interactive",
    subtitle = "Showing daily visitors for the last 3 months",
    data = CHART_BAR_DAILY_DATA,
    initialSeries = "desktop",
    desktopLabel = "Desktop",
    desktopColor = "primary",
    mobileLabel = "Mobile",
    mobileColor = "secondary",
  } = props;

  const seriesMeta: Record<SeriesKey, { label: string; color: ThemeColor }> = {
    desktop: { label: desktopLabel, color: desktopColor },
    mobile: { label: mobileLabel, color: mobileColor },
  };

  // Category tick text is pre-formatted (see formatShortDate note above);
  // the tooltip resolves the full long-form date from the SAME index
  // against the original `data` array, independent of tick label content.
  const categories = data.map((point) => formatShortDate(point.date));
  const totals: Record<SeriesKey, number> = {
    desktop: data.reduce((sum, point) => sum + point.desktop, 0),
    mobile: data.reduce((sum, point) => sum + point.mobile, 0),
  };
  const [, domainMax] = chartBarValueDomain([...data.map((p) => p.desktop), ...data.map((p) => p.mobile)]);

  const activeSeriesKey = toState<SeriesKey>(initialSeries);

  const tooltipFormatter = (parametersInput: TooltipParams | TooltipParams[]): string => {
    const point = Array.isArray(parametersInput) ? parametersInput[0] : parametersInput;
    if (!point) return "";
    const day = data[point.dataIndex];
    const dateLabel = day ? formatLongDate(day.date) : "";
    return `<strong>${escapeHtml(dateLabel)}</strong><br>${escapeHtml(String(point.value ?? ""))}`;
  };

  function buildOption(activeKey: SeriesKey): ChartOption {
    const meta = seriesMeta[activeKey];
    return {
      grid: { left: 12, right: 12, top: 16, bottom: 28 },
      xAxis: {
        type: "category",
        data: categories,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: true },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: domainMax,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: true },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: tooltipFormatter,
      },
      series: [
        {
          type: "bar",
          name: meta.label,
          color: meta.color,
          data: data.map((point) => point[activeKey]),
        },
      ],
    };
  }

  // A plain State (not computed()) — @domphy/chart's chart() patch subscribes
  // via `.addListener`, which only a real State instance exposes.
  const optionState = toState<ChartOption>(buildOption(initialSeries));

  let plotElement: HTMLElement | null = null;
  function sweepReveal(): void {
    if (!plotElement || typeof plotElement.animate !== "function") return;
    plotElement.animate(
      [{ clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)" }],
      { duration: 550, easing: "ease-out", fill: "both" },
    );
  }

  function selectSeries(key: SeriesKey): void {
    if (activeSeriesKey.get() === key) return;
    activeSeriesKey.set(key);
    optionState.set(buildOption(key));
    sweepReveal();
  }

  function statTile(key: SeriesKey): DomphyElement<"button"> {
    const meta = seriesMeta[key];
    return {
      button: [
        { small: meta.label, $: [small({ color: "neutral" })] } as DomphyElement<"small">,
        { h4: totals[key].toLocaleString("en-US"), $: [heading({ color: "neutral" })] } as DomphyElement<"h4">,
      ],
      type: "button",
      dataActive: (listener: Listener) => (activeSeriesKey.get(listener) === key ? "true" : "false"),
      onClick: () => selectSeries(key),
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: themeSpacing(0.5),
        flex: "1",
        cursor: "pointer",
        border: "none",
        backgroundColor: "transparent",
        paddingBlock: themeSpacing(3),
        paddingInline: themeSpacing(4),
        textAlign: "left",
        "&[data-active=true]": {
          backgroundColor: (listener: Listener) => themeColor(listener, "increase-1", "neutral"),
        },
      },
    } as DomphyElement<"button">;
  }

  const asideElement: DomphyElement<"aside"> = {
    aside: [statTile("desktop"), statTile("mobile")],
    style: {
      display: "flex",
      width: "100%",
      "@media (min-width: 640px)": { width: "auto" },
      "& > button + button": {
        borderInlineStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      },
    },
  } as DomphyElement<"aside">;

  const plotWrapper: DomphyElement<"div"> = {
    div: [
      {
        div: null,
        style: { position: "absolute", inset: "0" },
        $: [chart(optionState)],
      } as DomphyElement<"div">,
    ],
    style: { position: "relative", width: "100%", height: themeSpacing(72) },
    _onMount(node) {
      plotElement = node.domElement as HTMLElement;
      sweepReveal();
    },
  } as DomphyElement<"div">;

  return {
    div: [
      { h3: title, $: [heading()] } as DomphyElement<"h3">,
      { p: subtitle, $: [paragraph({ color: "neutral" })] } as DomphyElement<"p">,
      asideElement,
      { div: [plotWrapper] } as DomphyElement<"div">,
    ],
    $: [card({ color: "neutral" })],
    style: {
      width: "100%",
      "@media (max-width: 640px)": {
        gridTemplateColumns: "1fr",
        gridTemplateAreas: '"image" "title" "aside" "desc" "content" "footer"',
      },
    },
  } as DomphyElement<"div">;
}

export { chartBarInteractive };
