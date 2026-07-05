// shadcn/ui "charts/line-interactive" block — clean-room reimplementation.
//
// A wider, footer-less card whose header doubles as a two-option toggle:
// clicking a stat tile switches which daily series is plotted (recoloring
// the line to match) while the other tile's total stays visible for
// comparison. The plot itself is dense (~90 daily points), uses
// horizontal-only gridlines, a bottom axis with abbreviated date labels that
// auto-thin to avoid overlap, and keeps a vertical cursor guide line while
// hovering (unlike the simpler recipes, which suppress it).
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
  DAILY_VISITOR_DATA,
  type DailyPoint,
  computeYDomain,
  hiddenLabelYAxis,
} from "./chart-line-shared.js";

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
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatShortDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Props for {@link chartLineInteractive}. */
export interface ChartLineInteractiveProps {
  title?: string;
  description?: string;
  data?: DailyPoint[];
  initialSeries?: SeriesKey;
  desktopLabel?: string;
  desktopColor?: ThemeColor;
  mobileLabel?: string;
  mobileColor?: ThemeColor;
}

/**
 * shadcn/ui "charts/line-interactive" — a dense daily line chart whose
 * header stat tiles double as a series switcher. Call with no arguments for
 * a fully working demo.
 */
function chartLineInteractive(props: ChartLineInteractiveProps = {}): DomphyElement<"div"> {
  const {
    title = "Line Chart - Interactive",
    description = "Showing daily visitors for the last 3 months",
    data = DAILY_VISITOR_DATA,
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

  const categories = data.map((point) => point.date);
  const totals: Record<SeriesKey, number> = {
    desktop: data.reduce((sum, point) => sum + point.desktop, 0),
    mobile: data.reduce((sum, point) => sum + point.mobile, 0),
  };
  const yDomain = computeYDomain([
    ...data.map((point) => point.desktop),
    ...data.map((point) => point.mobile),
  ]);

  const activeSeriesKey = toState<SeriesKey>(initialSeries);

  const tooltipFormatter = (params: TooltipParams | TooltipParams[]): string => {
    const point = Array.isArray(params) ? params[0] : params;
    if (!point) return "";
    const day = data[point.dataIndex];
    const dateLabel = day ? formatLongDate(day.date) : "";
    const swatch = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${point.color};margin-right:6px;"></span>`;
    return (
      `<div>${escapeHtml(dateLabel)}</div>` +
      `<div style="margin-top:2px;">${swatch}Views: ${escapeHtml(String(point.value ?? ""))}</div>`
    );
  };

  function buildOption(activeKey: SeriesKey): ChartOption {
    const meta = seriesMeta[activeKey];
    const values = data.map((point) => point[activeKey]);
    return {
      grid: { left: 12, right: 12, top: 16, bottom: 28 },
      xAxis: {
        type: "category",
        data: categories,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { formatter: (value) => formatShortDate(String(value)) },
      },
      yAxis: hiddenLabelYAxis(yDomain),
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line" },
        formatter: tooltipFormatter,
      },
      series: [
        {
          type: "line",
          name: meta.label,
          data: values,
          smooth: true,
          smoothMonotone: "x",
          showSymbol: false,
          lineStyle: { width: 2 },
          color: meta.color,
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
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      { duration: 500, easing: "ease-out", fill: "both" },
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
        // Same shift-11 bump as chart-bar-interactive.ts's statTile — a
        // shift-9 attempt still measured ~4.24:1 (need 4.5:1).
        {
          small: meta.label,
          $: [small({ color: "neutral" })],
          style: { color: (l: Listener) => themeColor(l, "shift-11", "neutral") },
        } as DomphyElement<"small">,
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
      "@media (min-width: 640px)": {
        width: "auto",
      },
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
    style: { position: "relative", width: "100%", height: "300px" },
    _onMount(node) {
      plotElement = node.domElement as HTMLElement;
      sweepReveal();
    },
  } as DomphyElement<"div">;

  return {
    div: [
      { h3: title, $: [heading()] } as DomphyElement<"h3">,
      { p: description, $: [paragraph({ color: "neutral" })] } as DomphyElement<"p">,
      asideElement,
      { div: [plotWrapper] } as DomphyElement<"div">,
    ],
    $: [card({ color: "neutral" })],
    style: {
      width: "100%",
      maxWidth: themeSpacing(220),
      "@media (max-width: 640px)": {
        gridTemplateColumns: "1fr",
        gridTemplateAreas: '"image" "title" "aside" "desc" "content" "footer"',
      },
    },
  } as DomphyElement<"div">;
}

export { chartLineInteractive };
