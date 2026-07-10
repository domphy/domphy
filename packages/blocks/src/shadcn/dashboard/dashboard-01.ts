// shadcn/ui "dashboard-01" — clean-room reimplementation.
//
// A full-page admin dashboard shell: a collapsible icon-nav sidebar (reused
// wholesale from sidebar07), a slim content header, four KPI summary cards,
// a range-switchable bar chart (reused from chartBarStacked), and a rich
// drag-reorderable data table (createDomphyTable + the table() patch) with
// its own toolbar, status-filter tabs, column visibility control, inline
// numeric editing, per-row actions menu and a row-editing drawer.
//
// Composition notes (deliberate simplifications vs. the full upstream spec):
//   - The sidebar is `sidebar07()` called directly with dashboard-flavored nav
//     data, per the instruction to reuse that shell wholesale. sidebar07's own
//     shell only exposes ONE nav-main group + ONE secondary (projects) group,
//     so the spec's third "secondary utility" group (pinned to the bottom via
//     margin-auto) has no slot to render into and is omitted here.
//   - sidebar07 owns its own sticky header (toggle + divider + breadcrumb
//     title). Since that header has no slot for an extra trailing action, the
//     "ghost-styled external link button" lives in its own thin utility row at
//     the top of the content pane instead of being fused into the same bar.
//   - The chart region reuses the exported `chartBarStacked()` factory as
//     directed, rather than the closer-fitting (but not-directed-to-use)
//     `chartAreaInteractive`. Since chartBarStacked's own props don't expose a
//     header-aside slot, the 7/30/90-day range control sits in a small toolbar
//     row directly above the chartBarStacked card (which itself re-renders
//     with a range-appropriate title/description/trend) rather than nested
//     inside chartBarStacked's own header.
//   - The data table's "view tabs" filter the row set by `status` using
//     table-core's own column-filtering feature (genuinely functional, not a
//     placeholder) rather than reproducing the upstream's differently-labeled,
//     mostly-inert tabs.
//   - The row drawer's mobile-vs-desktop placement is resolved once at build
//     time via `matchMedia` (the `drawer()` patch's `placement` prop is not
//     itself reactive to viewport resize).
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied. Sample data, copy, and
// numbers are original inventions for this port.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import type { Column, Row } from "@domphy/table";
import {
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@domphy/table";
import { createDomphyTable } from "@domphy/table/domphy";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import {
  button,
  buttonGhost,
  card,
  drawer,
  empty,
  formGroup,
  heading,
  icon,
  inputCheckbox,
  inputNumber,
  inputText,
  label,
  menu,
  paragraph,
  popover,
  select,
  small,
  strong,
  table as tableUI,
  tabs,
  toggleGroup,
} from "@domphy/ui";
import {
  CHART_BAR_DAILY_END_DATE,
  type ChartBarDailyPoint,
  type ChartBarTwoSeriesPoint,
  type ChartTrendDirection,
  chartBarTrendIcon,
  generateChartBarDailyData,
} from "../charts/chart-bar-shared.js";
import { chartBarStacked } from "../charts/chart-bar-stacked.js";
import {
  ICON_BAR_CHART,
  ICON_CHEVRON_RIGHT,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_MESSAGE,
  ICON_MORE,
  ICON_PLUS,
  ICON_USERS,
  sidebarIcon,
} from "../sidebar/sidebar05-08-shared.js";
import {
  type Sidebar07NavMainItem,
  type Sidebar07Project,
  type Sidebar07User,
  sidebar07,
} from "../sidebar/sidebar07.js";

// ---------------------------------------------------------------------------
// Icons — hand-authored generic line glyphs, original to this file (24x24,
// stroke=currentColor unless noted). Not sourced from any third-party icon
// set. `ICON_CHEVRON_RIGHT`/`ICON_MORE`/`ICON_PLUS` are reused from the
// sidebar shared module instead of being re-authored here.
// ---------------------------------------------------------------------------

const ICON_EXTERNAL_LINK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>';

const ICON_GRIP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="1em" height="1em"><circle cx="9" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';

const ICON_CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 9l6 6 6-6"/></svg>';

const ICON_CHECK_CIRCLE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>';

const ICON_SPINNER_ARC =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="1em" height="1em"><path d="M12 3a9 9 0 1 1-9 9"/></svg>';

const ICON_CIRCLE_DASHED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="1em" height="1em"><circle cx="12" cy="12" r="9" stroke-dasharray="4 3"/></svg>';

const ICON_STAR =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="1em" height="1em"><path d="M12 2l2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7z"/></svg>';

const ICON_CHEVRON_DOUBLE_RIGHT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M7 6l6 6-6 6"/><path d="M14 6l6 6-6 6"/></svg>';

// Visually-hidden ("sr-only") style, same recipe as this package's other
// sr-only usages (shadcn/auth/login05.ts, magicui/core/tweetCard.ts). Upstream
// shadcn's data-table cells give the row-select Checkbox / numeric inputs only
// an `aria-label` (via Radix, which isn't a native `<input>`) — this port uses
// real `<input>` elements, so each gets a matching sr-only `<label for>` too:
// `aria-label` alone satisfies accessible-name computation but not htmlhint's
// `input-requires-label` rule, which requires a real associated `<label>` tag.
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
} as const;

/** Wraps a raw inline SVG string in a themed `icon()` box, mirrored on the
 * inline axis — reuses a single chevron glyph for both "next" and "prev" /
 * "last" and "first" instead of authoring four near-identical SVGs. */
function flippedIcon(
  svg: string,
  color: ThemeColor = "neutral",
): DomphyElement<"span"> {
  return {
    span: svg,
    ariaHidden: "true",
    style: { transform: "scaleX(-1)" },
    $: [icon({ color })],
  } as unknown as DomphyElement<"span">;
}

// ---------------------------------------------------------------------------
// Sidebar data (fed into the reused `sidebar07()` shell)
// ---------------------------------------------------------------------------

const DEFAULT_NAV_MAIN: Sidebar07NavMainItem[] = [
  { title: "Dashboard", icon: ICON_GRID, href: "#", active: true },
  { title: "Analytics", icon: ICON_BAR_CHART, href: "#" },
  { title: "Team", icon: ICON_USERS, href: "#" },
  { title: "Inbox", icon: ICON_INBOX, href: "#" },
  { title: "Documentation", icon: ICON_FOLDER, href: "#" },
];

const DEFAULT_DOCUMENTS: Sidebar07Project[] = [
  { title: "Document Library", icon: ICON_FOLDER, href: "#" },
  { title: "Report Center", icon: ICON_BAR_CHART, href: "#" },
  { title: "Content Assistant", icon: ICON_MESSAGE, href: "#" },
];

const DEFAULT_USER: Sidebar07User = {
  name: "Alex Rivera",
  email: "alex@example.com",
};

// ---------------------------------------------------------------------------
// KPI metric cards
// ---------------------------------------------------------------------------

interface MetricCardData {
  label: string;
  value: string;
  badgeDelta: string;
  trendDirection: ChartTrendDirection;
  footerHeadline: string;
  footerSubtext: string;
}

const DEFAULT_METRIC_CARDS: MetricCardData[] = [
  {
    label: "Active Subscriptions",
    value: "8,492",
    badgeDelta: "+6.4%",
    trendDirection: "up",
    footerHeadline: "Subscriber growth is accelerating",
    footerSubtext: "Compared to the previous 30 days",
  },
  {
    label: "Monthly Recurring Revenue",
    value: "$42,150",
    badgeDelta: "+3.1%",
    trendDirection: "up",
    footerHeadline: "Revenue is trending upward",
    footerSubtext: "Includes upgrades and renewals",
  },
  {
    label: "Churn Rate",
    value: "2.3%",
    badgeDelta: "-0.6%",
    trendDirection: "down",
    footerHeadline: "Churn improved this quarter",
    footerSubtext: "Fewer cancellations than last period",
  },
  {
    label: "Avg. Response Time",
    value: "4.2h",
    badgeDelta: "-18%",
    trendDirection: "down",
    footerHeadline: "Faster responses this week",
    footerSubtext: "Average first-reply time across tickets",
  },
];

/** A single elevated, gradient-tinted KPI card: muted label, huge bold value,
 * a top-right trend-delta pill, and a two-line trend footer. */
function metricCard(
  data: MetricCardData,
  key: string | number,
): DomphyElement<"div"> {
  // Rendered inline with the label (not as a sibling `aside`) — `card()`'s
  // grid only carves out an "aside" column next to a "title"/"desc" pair,
  // and this KPI tile's label+value order is reversed from that (label
  // above value, whereas card()'s "title" area always renders above
  // "desc"), so both already bypass those named areas via the `content`
  // wrapper below. A standalone `aside` sibling here would span the now-
  // empty title/desc rows and float above `content` instead of sitting
  // next to the label.
  //
  // Upstream section-cards.tsx uses a uniform neutral `<Badge
  // variant="outline">` on every card: direction is conveyed only by the
  // trend-arrow glyph, never by tinting the badge (or footer icon) per
  // direction — so both stay neutral here.
  const trendBadge: DomphyElement<"span"> = {
    span: [
      chartBarTrendIcon(data.trendDirection, "neutral"),
      { span: data.badgeDelta } as unknown as DomphyElement,
    ],
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(1),
      paddingInline: themeSpacing(2),
      paddingBlock: themeSpacing(1),
      borderRadius: themeSpacing(999),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-4", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-10", "neutral"),
    },
  } as unknown as DomphyElement<"span">;

  const content: DomphyElement<"div"> = {
    div: [
      {
        div: [
          {
            small: data.label,
            $: [small({ color: "neutral" })],
          } as unknown as DomphyElement,
          trendBadge,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: themeSpacing(2),
        },
      } as unknown as DomphyElement,
      {
        h2: data.value,
        $: [heading({ color: "neutral" })],
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
  } as unknown as DomphyElement<"div">;

  const footer: DomphyElement<"footer"> = {
    footer: [
      {
        div: [
          chartBarTrendIcon(data.trendDirection, "neutral"),
          {
            strong: data.footerHeadline,
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1.5),
        },
      } as unknown as DomphyElement,
      {
        small: data.footerSubtext,
        $: [small({ color: "neutral" })],
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
  } as unknown as DomphyElement<"footer">;

  return {
    div: [content, footer],
    _key: key,
    $: [card({ color: "neutral" })],
    // `color` is already declared by the card() patch above — the doctor
    // tool inspects only this element's own inline `style`, not patch
    // contributions, so it can't see that and flags a false positive here.
    _doctorDisable: "missing-color",
    style: {
      backgroundImage: (l: Listener) =>
        `linear-gradient(to top, ${themeColor(l, "shift-1", "primary")}, transparent)`,
    },
  } as unknown as DomphyElement<"div">;
}

function metricCardGrid(cards: MetricCardData[]): DomphyElement<"section"> {
  return {
    section: cards.map((data, index) =>
      metricCard(data, `${data.label}-${index}`),
    ),
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
      gap: themeSpacing(4),
      "@media (min-width: 48em)": {
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      },
      "@media (min-width: 64em)": {
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      },
    },
  } as unknown as DomphyElement<"section">;
}

// ---------------------------------------------------------------------------
// Chart region — range-switchable, reusing chartBarStacked()
// ---------------------------------------------------------------------------

interface ChartRangePreset {
  key: string;
  label: string;
  days: number;
}

const CHART_RANGE_PRESETS: ChartRangePreset[] = [
  { key: "90d", label: "Last 3 months", days: 90 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "7d", label: "Last 7 days", days: 7 },
];

function formatShortMonthDay(dateIso: string): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildRangeSeries(
  data: ChartBarDailyPoint[],
  days: number,
): ChartBarTwoSeriesPoint[] {
  return data.slice(-days).map((point) => ({
    label: formatShortMonthDay(point.date),
    desktop: point.desktop,
    mobile: point.mobile,
  }));
}

function computeChartTrend(series: ChartBarTwoSeriesPoint[]): {
  direction: ChartTrendDirection;
  text: string;
} {
  if (series.length < 2) {
    return { direction: "up", text: "Not enough data in this range yet" };
  }
  const first = series[0].desktop + series[0].mobile;
  const last =
    series[series.length - 1].desktop + series[series.length - 1].mobile;
  const deltaPercent = first === 0 ? 0 : ((last - first) / first) * 100;
  const direction: ChartTrendDirection = deltaPercent >= 0 ? "up" : "down";
  return {
    direction,
    text: `Trending ${direction} by ${Math.abs(deltaPercent).toFixed(1)}% in this range`,
  };
}

function chartRegion(data: ChartBarDailyPoint[]): DomphyElement<"div"> {
  // Upstream chart-area-interactive uses useIsMobile() (a 768px breakpoint)
  // plus an effect that forces the range to "7d" on small screens. The range
  // control isn't otherwise reactive to viewport resize here, so mirror that
  // with a one-shot matchMedia check at build time (same approach the drawer's
  // placement uses below).
  const isMobileViewport =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches;
  const rangeKey = toState(
    isMobileViewport ? "7d" : CHART_RANGE_PRESETS[0].key,
  );

  const controlRow: DomphyElement<"div"> = {
    div: [
      {
        small: "Date range",
        $: [small({ color: "neutral" })],
      } as unknown as DomphyElement,
      {
        div: null,
        style: { "@media (max-width: 48em)": { display: "none" } },
        $: [
          toggleGroup({
            items: CHART_RANGE_PRESETS.map((preset) => ({
              label: preset.label,
              key: preset.key,
            })),
            value: rangeKey,
          }),
        ],
      } as unknown as DomphyElement,
      {
        select: CHART_RANGE_PRESETS.map((preset) => ({
          option: preset.label,
          value: preset.key,
          _key: preset.key,
        })),
        value: (l: Listener) => rangeKey.get(l),
        ariaLabel: "Select date range",
        onChange: (e: Event) =>
          rangeKey.set((e.target as HTMLSelectElement).value),
        style: {
          display: "none",
          "@media (max-width: 48em)": { display: "block" },
        },
        $: [select()],
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: themeSpacing(3),
      flexWrap: "wrap",
    },
  } as unknown as DomphyElement<"div">;

  const chartHost: DomphyElement<"div"> = {
    div: (l: Listener) => {
      const key = rangeKey.get(l);
      const preset =
        CHART_RANGE_PRESETS.find((candidate) => candidate.key === key) ??
        CHART_RANGE_PRESETS[0];
      const series = buildRangeSeries(data, preset.days);
      const trend = computeChartTrend(series);
      return [
        chartBarStacked({
          data: series,
          title: "Visitor Trends",
          subtitle: `Desktop & mobile sessions — ${preset.label.toLowerCase()}`,
          trendText: trend.text,
          trendDirection: trend.direction,
          captionText: `Showing total visitors for the ${preset.label.toLowerCase()}`,
        }),
      ];
    },
  } as unknown as DomphyElement<"div">;

  return {
    div: [controlRow, chartHost],
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(3) },
  } as unknown as DomphyElement<"div">;
}

// ---------------------------------------------------------------------------
// Data table region
// ---------------------------------------------------------------------------

type DashboardTableStatus = "Done" | "In Progress" | "Not Started";

interface DashboardTableRow {
  id: number;
  header: string;
  sectionType: string;
  status: DashboardTableStatus;
  target: number;
  limit: number;
  reviewer: string;
  favorite?: boolean;
}

const REVIEWER_ROSTER = [
  "Maria Chen",
  "Jonas Weber",
  "Priya Nair",
  "Liam Turner",
  "Sofia Ramos",
  "Noah Becker",
  "Ava Kim",
  "Ethan Brooks",
];

// Section categories offered by the drawer's Type/Category select (upstream's
// TableCellViewer has an editable Type field). Any row whose current value
// falls outside this roster is unioned in at render time.
const CATEGORY_ROSTER = [
  "Overview",
  "Analysis",
  "Finance",
  "Design",
  "Engineering",
];

const DEFAULT_TABLE_ROWS: DashboardTableRow[] = [
  {
    id: 1,
    header: "Project Brief",
    sectionType: "Overview",
    status: "Done",
    target: 24,
    limit: 20,
    reviewer: "Maria Chen",
  },
  {
    id: 2,
    header: "Market Research",
    sectionType: "Analysis",
    status: "In Progress",
    target: 18,
    limit: 15,
    reviewer: "Jonas Weber",
  },
  {
    id: 3,
    header: "Budget Forecast",
    sectionType: "Finance",
    status: "Done",
    target: 32,
    limit: 30,
    reviewer: "Priya Nair",
  },
  {
    id: 4,
    header: "Risk Assessment",
    sectionType: "Analysis",
    status: "Not Started",
    target: 12,
    limit: 10,
    reviewer: "Liam Turner",
  },
  {
    id: 5,
    header: "Design Mockups",
    sectionType: "Design",
    status: "In Progress",
    target: 20,
    limit: 18,
    reviewer: "Sofia Ramos",
  },
  {
    id: 6,
    header: "API Specification",
    sectionType: "Engineering",
    status: "Done",
    target: 40,
    limit: 40,
    reviewer: "Noah Becker",
  },
  {
    id: 7,
    header: "Marketing Plan",
    sectionType: "Overview",
    status: "Not Started",
    target: 15,
    limit: 12,
    reviewer: "Ava Kim",
  },
  {
    id: 8,
    header: "Compliance Review",
    sectionType: "Finance",
    status: "In Progress",
    target: 22,
    limit: 20,
    reviewer: "Ethan Brooks",
  },
];

// Editable status values, shared by the status cell and the drawer's status
// select. Upstream data-table.tsx distinguishes only "Done" (a green filled
// check) from everything-else (one static loader glyph, no spin); the badge
// chrome itself is a neutral outline for every status — there is no
// per-status border/text tint and no animation.
const TABLE_STATUSES: DashboardTableStatus[] = [
  "Done",
  "In Progress",
  "Not Started",
];

function statusBadge(status: DashboardTableStatus): DomphyElement<"span"> {
  const isDone = status === "Done";
  return {
    span: [
      {
        span: isDone ? ICON_CHECK_CIRCLE : ICON_SPINNER_ARC,
        ariaHidden: "true",
        style: {
          display: "inline-flex",
          width: themeSpacing(4),
          height: themeSpacing(4),
        },
        $: [icon({ color: isDone ? "success" : "neutral" })],
      } as unknown as DomphyElement,
      { span: status } as unknown as DomphyElement,
    ],
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: themeSpacing(1),
      paddingInline: themeSpacing(2),
      paddingBlock: themeSpacing(0.5),
      borderRadius: themeSpacing(999),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-4", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"span">;
}

function categoryBadge(sectionType: string): DomphyElement<"span"> {
  return {
    span: sectionType,
    style: {
      display: "inline-flex",
      paddingInline: themeSpacing(2),
      paddingBlock: themeSpacing(0.5),
      borderRadius: themeSpacing(2),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-4", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"span">;
}

/** Builds the full interactive table card: toolbar (status-filter tabs +
 * column visibility + add-section), the table itself (checkbox select, drag
 * reorder, inline-editable numeric cells, reviewer dropdown, actions menu),
 * a pagination footer, and the row-editing drawer. */
function tableRegion(initialRows: DashboardTableRow[]): DomphyElement<"div"> {
  const rows: DashboardTableRow[] = initialRows.map((row) => ({ ...row }));
  const renderTick = toState(0);
  const draggingId = toState<number | null>(null);
  const activeStatusFilter = toState<string>("all");
  const drawerOpen = toState(false);
  const drawerRow = toState<DashboardTableRow | null>(null);

  const isNarrowViewport =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 40em)").matches;

  const columnHelper = createColumnHelper<DashboardTableRow>();
  const columns = [
    columnHelper.display({ id: "drag", header: "", enableHiding: false }),
    columnHelper.display({
      id: "select",
      header: "Select",
      enableHiding: false,
    }),
    columnHelper.accessor("header", { id: "header", header: "Title" }),
    columnHelper.accessor("sectionType", {
      id: "sectionType",
      header: "Category",
    }),
    columnHelper.accessor("status", {
      id: "status",
      header: "Status",
      filterFn: "equalsString",
    }),
    columnHelper.accessor("target", { id: "target", header: "Target" }),
    columnHelper.accessor("limit", { id: "limit", header: "Limit" }),
    columnHelper.accessor("reviewer", { id: "reviewer", header: "Reviewer" }),
    columnHelper.display({ id: "actions", header: "", enableHiding: false }),
  ];

  const domphyTable = createDomphyTable<DashboardTableRow>({
    data: rows,
    columns,
    getRowId: (row) => String(row.id),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  function commitRows(): void {
    domphyTable.table.setOptions((prev) => ({ ...prev, data: [...rows] }));
    renderTick.set(renderTick.get() + 1);
  }

  function openDrawerForRow(row: DashboardTableRow): void {
    drawerRow.set(row);
    drawerOpen.set(true);
  }

  function reorderRows(sourceId: number | null, targetId: number): void {
    if (sourceId === null || sourceId === targetId) return;
    const sourceIndex = rows.findIndex((row) => row.id === sourceId);
    const targetIndex = rows.findIndex((row) => row.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [moved] = rows.splice(sourceIndex, 1);
    rows.splice(targetIndex, 0, moved);
    commitRows();
  }

  function addSection(): void {
    const nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
    const newRow: DashboardTableRow = {
      id: nextId,
      header: "New section",
      sectionType: "Overview",
      status: "Not Started",
      target: 0,
      limit: 0,
      reviewer: REVIEWER_ROSTER[0],
    };
    rows.push(newRow);
    commitRows();
    openDrawerForRow(newRow);
  }

  function duplicateRow(row: DashboardTableRow): void {
    const nextId =
      rows.reduce((max, current) => Math.max(max, current.id), 0) + 1;
    const index = rows.findIndex((candidate) => candidate.id === row.id);
    const copy: DashboardTableRow = {
      ...row,
      id: nextId,
      header: `${row.header} (copy)`,
    };
    rows.splice(index + 1, 0, copy);
    commitRows();
  }

  function toggleFavorite(row: DashboardTableRow): void {
    row.favorite = !row.favorite;
    commitRows();
  }

  function deleteRow(row: DashboardTableRow): void {
    const index = rows.findIndex((candidate) => candidate.id === row.id);
    if (index === -1) return;
    rows.splice(index, 1);
    commitRows();
  }

  function rowActionsContent(row: DashboardTableRow): DomphyElement<"div"> {
    return {
      div: null,
      style: { minWidth: themeSpacing(36) },
      $: [
        menu({
          selectable: false,
          items: [
            {
              label: "Edit",
              key: "edit",
              onClick: () => openDrawerForRow(row),
            },
            {
              label: "Duplicate",
              key: "duplicate",
              onClick: () => duplicateRow(row),
            },
            {
              label: row.favorite ? "Unfavorite" : "Favorite",
              key: "favorite",
              onClick: () => toggleFavorite(row),
            },
            {
              label: {
                span: "Delete",
                style: {
                  color: (l: Listener) => themeColor(l, "shift-9", "danger"),
                },
              } as unknown as DomphyElement,
              key: "delete",
              onClick: () => deleteRow(row),
            },
          ],
        }),
      ],
    } as unknown as DomphyElement<"div">;
  }

  function headerCellFor(
    column: Column<DashboardTableRow, unknown>,
  ): DomphyElement<"th"> {
    if (column.id === "select") {
      const selectAllId = "dashboard01-select-all";
      return {
        th: [
          {
            label: "Select all rows",
            for: selectAllId,
            style: SR_ONLY_STYLE,
          } as unknown as DomphyElement,
          {
            input: null,
            id: selectAllId,
            type: "checkbox",
            ariaLabel: "Select all rows",
            checked: domphyTable.table.getIsAllPageRowsSelected(),
            onChange: () => domphyTable.table.toggleAllPageRowsSelected(),
            _onMount: (node: ElementNode) => {
              (node.domElement as HTMLInputElement).indeterminate =
                domphyTable.table.getIsSomePageRowsSelected() &&
                !domphyTable.table.getIsAllPageRowsSelected();
            },
            _doctorDisable: "missing-color",
            $: [inputCheckbox({ accentColor: "primary" })],
          } as unknown as DomphyElement,
        ],
        _key: "select",
      } as unknown as DomphyElement<"th">;
    }
    if (column.id === "drag") {
      return {
        th: [
          {
            span: "Reorder",
            style: {
              position: "absolute",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            },
          },
        ],
        _key: "drag",
      } as unknown as DomphyElement<"th">;
    }
    return {
      th: String(column.columnDef.header ?? column.id),
      _key: column.id,
    } as unknown as DomphyElement<"th">;
  }

  function bodyCellFor(
    column: Column<DashboardTableRow, unknown>,
    row: Row<DashboardTableRow>,
  ): DomphyElement<"td"> {
    const original = row.original;
    switch (column.id) {
      case "select": {
        const rowSelectId = `dashboard01-select-${original.id}`;
        const rowSelectLabel = `Select ${original.header}`;
        return {
          td: [
            {
              label: rowSelectLabel,
              for: rowSelectId,
              style: SR_ONLY_STYLE,
            } as unknown as DomphyElement,
            {
              input: null,
              id: rowSelectId,
              type: "checkbox",
              ariaLabel: rowSelectLabel,
              checked: row.getIsSelected(),
              onChange: () => row.toggleSelected(),
              _doctorDisable: "missing-color",
              $: [inputCheckbox({ accentColor: "primary" })],
            } as unknown as DomphyElement,
          ],
          _key: "select",
        } as unknown as DomphyElement<"td">;
      }

      case "drag":
        return {
          td: [
            {
              span: ICON_GRIP,
              ariaHidden: "true",
              $: [icon({ color: "neutral" })],
            } as unknown as DomphyElement,
          ],
          _key: "drag",
          draggable: true,
          onDragStart: () => draggingId.set(original.id),
          onDragEnd: () => draggingId.set(null),
          style: { cursor: "grab", width: themeSpacing(6) },
        } as unknown as DomphyElement<"td">;

      case "header":
        return {
          td: [
            {
              button: [
                ...(original.favorite
                  ? [
                      {
                        span: ICON_STAR,
                        ariaHidden: "true",
                        $: [icon({ color: "warning" })],
                      } as unknown as DomphyElement,
                    ]
                  : []),
                { span: original.header } as unknown as DomphyElement,
              ],
              type: "button",
              onClick: () => openDrawerForRow(original),
              style: { paddingInline: 0 },
              $: [buttonGhost({ color: "primary" })],
            } as unknown as DomphyElement,
          ],
          _key: "header",
        } as unknown as DomphyElement<"td">;

      case "sectionType":
        return {
          td: [categoryBadge(original.sectionType)],
          _key: "sectionType",
        } as unknown as DomphyElement<"td">;

      case "status":
        return {
          td: [statusBadge(original.status)],
          _key: "status",
        } as unknown as DomphyElement<"td">;

      case "target":
      case "limit": {
        const numericFieldId = `dashboard01-${column.id}-${original.id}`;
        const numericFieldLabel = `${column.id === "target" ? "Target" : "Limit"} for ${original.header}`;
        return {
          td: [
            {
              label: numericFieldLabel,
              for: numericFieldId,
              style: SR_ONLY_STYLE,
            } as unknown as DomphyElement,
            {
              input: null,
              id: numericFieldId,
              type: "number",
              value: original[column.id as "target" | "limit"],
              ariaLabel: numericFieldLabel,
              onChange: (e: Event) => {
                original[column.id as "target" | "limit"] =
                  Number((e.target as HTMLInputElement).value) || 0;
                commitRows();
              },
              style: { width: themeSpacing(20) },
              $: [inputNumber({ color: "neutral" })],
            } as unknown as DomphyElement,
          ],
          _key: column.id,
          style: { textAlign: "right" },
        } as unknown as DomphyElement<"td">;
      }

      case "reviewer":
        return {
          td: [
            {
              select: REVIEWER_ROSTER.map((name) => ({
                option: name,
                value: name,
                _key: name,
              })),
              value: original.reviewer,
              ariaLabel: `Reviewer for ${original.header}`,
              onChange: (e: Event) => {
                original.reviewer = (e.target as HTMLSelectElement).value;
                commitRows();
              },
              $: [select({ color: "neutral" })],
            } as unknown as DomphyElement,
          ],
          _key: "reviewer",
        } as unknown as DomphyElement<"td">;

      case "actions":
        return {
          td: [
            {
              button: [
                {
                  span: ICON_MORE,
                  ariaHidden: "true",
                  $: [icon({ color: "neutral" })],
                } as unknown as DomphyElement,
              ],
              type: "button",
              ariaLabel: `${original.header} actions`,
              $: [
                buttonGhost({ color: "neutral" }),
                popover({
                  placement: "left-start",
                  content: rowActionsContent(original),
                }),
              ],
            } as unknown as DomphyElement,
          ],
          _key: "actions",
          style: { textAlign: "right" },
        } as unknown as DomphyElement<"td">;

      default:
        return { td: null, _key: column.id } as unknown as DomphyElement<"td">;
    }
  }

  function buildRow(row: Row<DashboardTableRow>): DomphyElement<"tr"> {
    const original = row.original;
    return {
      tr: row.getVisibleCells().map((cell) => bodyCellFor(cell.column, row)),
      _key: original.id,
      onDragOver: (e: Event) => e.preventDefault(),
      onDrop: (e: Event) => {
        e.preventDefault();
        reorderRows(draggingId.get(), original.id);
      },
      style: {
        opacity: (l: Listener) =>
          draggingId.get(l) === original.id ? "0.5" : "1",
        boxShadow: (l: Listener) =>
          draggingId.get(l) === original.id
            ? `0 ${themeSpacing(2)} ${themeSpacing(4)} ${themeColor(l, "shift-4", "neutral")}`
            : "none",
      },
    } as unknown as DomphyElement<"tr">;
  }

  function emptyStateRow(columnCount: number): DomphyElement<"tr"> {
    return {
      tr: [
        {
          td: [
            {
              div: [
                {
                  span: ICON_CIRCLE_DASHED,
                  ariaHidden: "true",
                  $: [icon({ color: "neutral" })],
                } as unknown as DomphyElement,
                {
                  p: "No rows in this view",
                  $: [paragraph({ color: "neutral" })],
                } as unknown as DomphyElement,
                {
                  small: "Try a different tab or add a new section.",
                  $: [small({ color: "neutral" })],
                } as unknown as DomphyElement,
              ],
              $: [empty({ color: "neutral" })],
            } as unknown as DomphyElement,
          ],
          colSpan: columnCount,
          _key: "empty",
        } as unknown as DomphyElement,
      ],
      _key: "empty",
    } as unknown as DomphyElement<"tr">;
  }

  const tableElement: DomphyElement<"table"> = {
    table: (l: Listener) => {
      domphyTable.version(l);
      renderTick.get(l);
      const visibleColumns = domphyTable.getVisibleLeafColumns();
      const rowsModel = domphyTable.getRowModel().rows;
      return [
        {
          thead: [
            {
              tr: visibleColumns.map((column) => headerCellFor(column)),
              _key: "header-row",
            },
          ],
          _key: "thead",
        } as unknown as DomphyElement,
        {
          tbody:
            rowsModel.length > 0
              ? rowsModel.map((row) => buildRow(row))
              : [emptyStateRow(visibleColumns.length)],
          _key: "tbody",
        } as unknown as DomphyElement,
      ];
    },
    $: [tableUI({ color: "neutral" })],
  } as unknown as DomphyElement<"table">;

  const tableScroll: DomphyElement<"div"> = {
    div: [tableElement],
    style: { overflowX: "auto" },
  } as unknown as DomphyElement<"div">;

  // ── Toolbar: status-filter tabs/select + spacer + column visibility + add ──

  const statusViews: { key: string; label: string }[] = [
    { key: "all", label: "All Items" },
    { key: "Done", label: "Done" },
    { key: "In Progress", label: "In Progress" },
    { key: "Not Started", label: "Not Started" },
  ];

  const viewSelector: DomphyElement<"div"> = {
    div: [
      {
        div: null,
        style: { "@media (max-width: 40em)": { display: "none" } },
        $: [
          tabs({
            items: statusViews.map((view) => ({
              label: view.label,
              key: view.key,
              content: { div: null, style: { display: "none" } },
            })),
            activeKey: activeStatusFilter,
          }),
        ],
      } as unknown as DomphyElement,
      {
        select: statusViews.map((view) => ({
          option: view.label,
          value: view.key,
          _key: view.key,
        })),
        value: (l: Listener) => activeStatusFilter.get(l),
        ariaLabel: "Select view",
        onChange: (e: Event) =>
          activeStatusFilter.set((e.target as HTMLSelectElement).value),
        style: {
          display: "none",
          "@media (max-width: 40em)": { display: "block" },
        },
        $: [select()],
      } as unknown as DomphyElement,
    ],
    style: { flexShrink: "0" },
  } as unknown as DomphyElement<"div">;

  const customizeColumnsContent: DomphyElement<"div"> = {
    div: (l: Listener) => {
      domphyTable.version(l);
      return domphyTable
        .getAllLeafColumns()
        .filter((column) => column.getCanHide())
        .map((column) => ({
          label: [
            {
              input: null,
              type: "checkbox",
              checked: column.getIsVisible(),
              onChange: () => column.toggleVisibility(),
              _doctorDisable: "missing-color",
              $: [inputCheckbox({ color: "neutral" })],
            } as unknown as DomphyElement,
            {
              span: String(column.columnDef.header ?? column.id),
            } as unknown as DomphyElement,
          ],
          _key: column.id,
          style: {
            display: "flex",
            alignItems: "center",
            gap: themeSpacing(2),
            paddingBlock: themeSpacing(1),
            paddingInline: themeSpacing(2),
            cursor: "pointer",
          },
        }));
    },
    style: { minWidth: themeSpacing(48) },
  } as unknown as DomphyElement<"div">;

  const toolbar: DomphyElement<"div"> = {
    div: [
      viewSelector,
      { div: null, style: { flex: "1" } } as unknown as DomphyElement,
      {
        button: [{ span: "Customize Columns" }, sidebarIcon(ICON_CHEVRON_DOWN)],
        type: "button",
        $: [
          buttonGhost({ color: "neutral" }),
          popover({
            placement: "bottom-end",
            content: customizeColumnsContent,
          }),
        ],
      } as unknown as DomphyElement,
      {
        button: [sidebarIcon(ICON_PLUS), { span: "Add Section" }],
        type: "button",
        onClick: () => addSection(),
        $: [button({ color: "primary" })],
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(3),
      flexWrap: "wrap",
    },
    _onMount: (node: ElementNode) => {
      const release = activeStatusFilter.addListener((status) => {
        domphyTable.table
          .getColumn("status")
          ?.setFilterValue(status === "all" ? undefined : status);
      });
      node.addHook("Remove", release);
    },
  } as unknown as DomphyElement<"div">;

  // ── Pagination footer ──

  function rowsPerPageControl(): DomphyElement<"div"> {
    return {
      div: [
        {
          small: "Rows per page",
          $: [small({ color: "neutral" })],
        } as unknown as DomphyElement,
        {
          select: [10, 20, 30, 40, 50].map((size) => ({
            option: String(size),
            value: String(size),
            _key: size,
          })),
          value: String(domphyTable.table.getState().pagination.pageSize),
          ariaLabel: "Rows per page",
          onChange: (e: Event) =>
            domphyTable.table.setPageSize(
              Number((e.target as HTMLSelectElement).value),
            ),
          $: [select()],
        } as unknown as DomphyElement,
      ],
      _key: "pageSize",
      style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
    } as unknown as DomphyElement<"div">;
  }

  function pageNavButtons(): DomphyElement<"div"> {
    const canPrevious = domphyTable.getCanPreviousPage();
    const canNext = domphyTable.getCanNextPage();
    const navButton = (
      label: string,
      iconElement: DomphyElement<"span">,
      onClick: () => void,
      disabled: boolean,
      key: string,
    ): DomphyElement<"button"> =>
      ({
        button: [iconElement],
        type: "button",
        ariaLabel: label,
        disabled,
        onClick,
        _key: key,
        $: [buttonGhost({ color: "neutral" })],
      }) as unknown as DomphyElement<"button">;

    return {
      div: [
        navButton(
          "First page",
          flippedIcon(ICON_CHEVRON_DOUBLE_RIGHT),
          () => domphyTable.table.firstPage(),
          !canPrevious,
          "first",
        ),
        navButton(
          "Previous page",
          flippedIcon(ICON_CHEVRON_RIGHT),
          () => domphyTable.table.previousPage(),
          !canPrevious,
          "prev",
        ),
        navButton(
          "Next page",
          sidebarIcon(ICON_CHEVRON_RIGHT),
          () => domphyTable.table.nextPage(),
          !canNext,
          "next",
        ),
        navButton(
          "Last page",
          sidebarIcon(ICON_CHEVRON_DOUBLE_RIGHT),
          () => domphyTable.table.lastPage(),
          !canNext,
          "last",
        ),
      ],
      _key: "nav",
      style: { display: "flex", alignItems: "center", gap: themeSpacing(1) },
    } as unknown as DomphyElement<"div">;
  }

  const paginationFooter: DomphyElement<"footer"> = {
    footer: (l: Listener) => {
      domphyTable.version(l);
      const pageIndex = domphyTable.table.getState().pagination.pageIndex;
      const pageCount = Math.max(1, domphyTable.getPageCount());
      const selectedCount = domphyTable.getSelectedRowModel().rows.length;
      const totalCount = domphyTable.table.getFilteredRowModel().rows.length;
      return [
        {
          small: `${selectedCount} of ${totalCount} row(s) selected.`,
          _key: "selection",
          $: [small({ color: "neutral" })],
        } as unknown as DomphyElement,
        {
          div: null,
          _key: "spacer",
          style: { flex: "1" },
        } as unknown as DomphyElement,
        rowsPerPageControl(),
        {
          small: `Page ${pageIndex + 1} of ${pageCount}`,
          _key: "pageIndicator",
          $: [small({ color: "neutral" })],
        } as unknown as DomphyElement,
        pageNavButtons(),
      ];
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(4),
      flexWrap: "wrap",
      paddingBlockStart: themeSpacing(4),
      borderTop: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-10", "neutral"),
    },
  } as unknown as DomphyElement<"footer">;

  // ── Row-editing drawer ──

  function drawerBarRow(
    label: string,
    value: number,
    max: number,
    color: ThemeColor,
    key: string,
  ): DomphyElement<"div"> {
    const percent = Math.round((value / max) * 100);
    return {
      div: [
        {
          small: `${label} — ${value}`,
          $: [small({ color: "neutral" })],
        } as unknown as DomphyElement,
        {
          div: [
            {
              div: null,
              style: {
                width: `${percent}%`,
                height: "100%",
                borderRadius: themeSpacing(2),
                backgroundColor: (l: Listener) =>
                  themeColor(l, "shift-8", color),
              },
            } as unknown as DomphyElement,
          ],
          style: {
            width: "100%",
            height: themeSpacing(3),
            borderRadius: themeSpacing(2),
            overflow: "hidden",
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
        } as unknown as DomphyElement,
      ],
      _key: key,
      style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    } as unknown as DomphyElement<"div">;
  }

  function drawerChart(row: DashboardTableRow): DomphyElement<"div"> {
    const max = Math.max(row.target, row.limit, 1);
    return {
      div: [
        drawerBarRow("Target", row.target, max, "primary", "target-bar"),
        drawerBarRow("Limit", row.limit, max, "secondary", "limit-bar"),
      ],
      _key: "chart",
      style: { display: "flex", flexDirection: "column", gap: themeSpacing(3) },
    } as unknown as DomphyElement<"div">;
  }

  function drawerHeader(row: DashboardTableRow): DomphyElement<"header"> {
    return {
      header: [
        { h3: row.header, $: [heading()] } as unknown as DomphyElement,
        {
          p: `${row.sectionType} · ${row.status}`,
          $: [paragraph({ color: "neutral" })],
        } as unknown as DomphyElement,
      ],
      _key: "header",
      style: { display: "flex", flexDirection: "column", gap: themeSpacing(1) },
    } as unknown as DomphyElement<"header">;
  }

  function drawerForm(row: DashboardTableRow): DomphyElement<"fieldset"> {
    const fieldId = (name: string) => `dashboard01-drawer-${name}-${row.id}`;
    return {
      fieldset: [
        { legend: "Section details" },
        { label: "Title", for: fieldId("title"), $: [label()] },
        {
          input: null,
          id: fieldId("title"),
          value: row.header,
          onChange: (e: Event) => {
            row.header = (e.target as HTMLInputElement).value;
            commitRows();
          },
          $: [inputText()],
        } as unknown as DomphyElement,
        { label: "Category", for: fieldId("category"), $: [label()] },
        {
          select: Array.from(
            new Set([...CATEGORY_ROSTER, row.sectionType]),
          ).map((name) => ({
            option: name,
            value: name,
            _key: name,
          })),
          id: fieldId("category"),
          value: row.sectionType,
          onChange: (e: Event) => {
            row.sectionType = (e.target as HTMLSelectElement).value;
            commitRows();
          },
          $: [select()],
        } as unknown as DomphyElement,
        { label: "Reviewer", for: fieldId("reviewer"), $: [label()] },
        {
          select: REVIEWER_ROSTER.map((name) => ({
            option: name,
            value: name,
            _key: name,
          })),
          id: fieldId("reviewer"),
          value: row.reviewer,
          onChange: (e: Event) => {
            row.reviewer = (e.target as HTMLSelectElement).value;
            commitRows();
          },
          $: [select()],
        } as unknown as DomphyElement,
        { label: "Status", for: fieldId("status"), $: [label()] },
        {
          select: TABLE_STATUSES.map((status) => ({
            option: status,
            value: status,
            _key: status,
          })),
          id: fieldId("status"),
          value: row.status,
          onChange: (e: Event) => {
            row.status = (e.target as HTMLSelectElement)
              .value as DashboardTableStatus;
            commitRows();
          },
          $: [select()],
        } as unknown as DomphyElement,
        { label: "Target", for: fieldId("target"), $: [label()] },
        {
          input: null,
          type: "number",
          id: fieldId("target"),
          value: row.target,
          onChange: (e: Event) => {
            row.target = Number((e.target as HTMLInputElement).value) || 0;
            commitRows();
          },
          $: [inputNumber()],
        } as unknown as DomphyElement,
        { label: "Limit", for: fieldId("limit"), $: [label()] },
        {
          input: null,
          type: "number",
          id: fieldId("limit"),
          value: row.limit,
          onChange: (e: Event) => {
            row.limit = Number((e.target as HTMLInputElement).value) || 0;
            commitRows();
          },
          $: [inputNumber()],
        } as unknown as DomphyElement,
      ],
      _key: "form",
      $: [formGroup({ layout: "vertical" })],
    } as unknown as DomphyElement<"fieldset">;
  }

  function drawerFooter(): DomphyElement<"footer"> {
    // Upstream DrawerFooter renders a primary `Submit` plus an outline `Done`
    // (DrawerClose). Field edits already commit live on each change, so Submit
    // just flushes + closes; Done closes without further action.
    return {
      footer: [
        {
          button: "Submit",
          type: "button",
          onClick: () => {
            commitRows();
            drawerOpen.set(false);
          },
          _key: "submit",
          $: [button({ color: "primary" })],
        } as unknown as DomphyElement,
        {
          button: "Done",
          type: "button",
          onClick: () => drawerOpen.set(false),
          _key: "done",
          $: [button({ color: "neutral" })],
        } as unknown as DomphyElement,
      ],
      _key: "footer",
      style: {
        display: "flex",
        justifyContent: "flex-end",
        gap: themeSpacing(2),
        marginBlockStart: themeSpacing(4),
      },
    } as unknown as DomphyElement<"footer">;
  }

  const rowDrawer: DomphyElement<"dialog"> = {
    dialog: (l: Listener) => {
      const row = drawerRow.get(l);
      if (!row) return [];
      return [
        drawerHeader(row),
        drawerChart(row),
        drawerForm(row),
        drawerFooter(),
      ];
    },
    $: [
      drawer({
        open: drawerOpen,
        placement: isNarrowViewport ? "bottom" : "end",
      }),
    ],
  } as unknown as DomphyElement<"dialog">;

  return {
    div: [toolbar, tableScroll, paginationFooter, rowDrawer],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(4),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-4", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-10", "neutral"),
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
    },
  } as unknown as DomphyElement<"div">;
}

// ---------------------------------------------------------------------------
// Content-pane utility header row (external link ghost button)
// ---------------------------------------------------------------------------

function dashboardUtilityRow(): DomphyElement<"div"> {
  return {
    div: [
      {
        button: [{ span: "GitHub" }, sidebarIcon(ICON_EXTERNAL_LINK)],
        type: "button",
        ariaLabel: "Open project source",
        $: [buttonGhost({ color: "neutral" })],
        // `buttonGhost()`'s own resting-state shift-6 (deliberately subtle
        // until hovered) measured too little contrast against the page
        // background here — bumped directly on this call site rather than
        // touching the shared patch's own default.
        style: { color: (l: Listener) => themeColor(l, "shift-9", "neutral") },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      justifyContent: "flex-end",
      "@media (max-width: 48em)": { display: "none" },
    },
  } as unknown as DomphyElement<"div">;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

interface Dashboard01Props {
  pageTitle?: string;
  user?: Sidebar07User;
  navMain?: Sidebar07NavMainItem[];
  documents?: Sidebar07Project[];
  metricCards?: MetricCardData[];
  chartData?: ChartBarDailyPoint[];
  tableRows?: DashboardTableRow[];
}

/**
 * shadcn/ui "dashboard-01" — a full admin dashboard shell: the icon-nav
 * sidebar (reused from `sidebar07()`), a slim content header, four KPI
 * cards, a range-switchable chart (reused from `chartBarStacked()`), and a
 * drag-reorderable data table with its own toolbar and row-editing drawer.
 * Call with no arguments for a fully working demo.
 */
function dashboard01(props: Dashboard01Props = {}): DomphyElement<"div"> {
  const {
    pageTitle = "Documents",
    user = DEFAULT_USER,
    navMain = DEFAULT_NAV_MAIN,
    documents = DEFAULT_DOCUMENTS,
    metricCards = DEFAULT_METRIC_CARDS,
    chartData = generateChartBarDailyData(90, CHART_BAR_DAILY_END_DATE),
    tableRows = DEFAULT_TABLE_ROWS,
  } = props;

  const content: DomphyElement[] = [
    dashboardUtilityRow(),
    metricCardGrid(metricCards),
    chartRegion(chartData),
    tableRegion(tableRows),
  ];

  return sidebar07({
    teams: [{ name: "Acme Inc.", plan: "Workspace" }],
    navMain,
    projects: documents,
    user,
    breadcrumbItems: [{ label: pageTitle }],
    children: content,
  });
}

export { dashboard01 };
export type {
  Dashboard01Props,
  DashboardTableRow,
  DashboardTableStatus,
  MetricCardData,
};
