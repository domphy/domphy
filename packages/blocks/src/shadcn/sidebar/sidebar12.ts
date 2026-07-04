// shadcn/ui "sidebar-12" — clean-room reimplementation from the public
// behavior description only (no upstream source viewed). A scheduling-app
// sidebar combining a compact month date-picker with grouped,
// checkbox-selectable calendar lists, sticky while the main content scrolls
// independently. See ./sidebar09-12-shared.ts and ./sidebar05-08-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, inputCheckbox, small, strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { ICON_PANEL_TOGGLE, ICON_PLUS, sidebarIcon, verticalDivider } from "./sidebar09-12-shared.js";

type Sidebar12User = { name: string; email: string; avatarUrl?: string };
type Sidebar12CalendarEntry = { id: string; name: string; color: ThemeColor };
type Sidebar12CalendarGroup = { label: string; entries: Sidebar12CalendarEntry[] };

type Sidebar12Props = {
  user?: Sidebar12User;
  selectedDate?: Date;
  groups?: Sidebar12CalendarGroup[];
  onDateChange?: (date: Date) => void;
  onCalendarToggle?: (groupLabel: string, entryId: string, checked: boolean) => void;
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_USER: Sidebar12User = { name: "Shad Cn", email: "shadcn@example.com" };

// Fixed reference date (not "today") so the zero-arg demo is deterministic —
// matches the spec's own example month/year.
const DEFAULT_DATE = new Date(2024, 9, 15);

const DEFAULT_GROUPS: Sidebar12CalendarGroup[] = [
  {
    label: "My Calendars",
    entries: [
      { id: "personal", name: "Personal", color: "primary" },
      { id: "work", name: "Work", color: "secondary" },
      { id: "family", name: "Family", color: "success" },
    ],
  },
  {
    label: "Favorites",
    entries: [
      { id: "holidays", name: "Holidays", color: "warning" },
      { id: "birthdays", name: "Birthdays", color: "error" },
    ],
  },
  {
    label: "Other",
    entries: [
      { id: "travel", name: "Travel", color: "info" },
      { id: "reminders", name: "Reminders", color: "neutral" },
      { id: "deadlines", name: "Deadlines", color: "error" },
    ],
  },
];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}
function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** User avatar + name/email header, pinned above the date picker. */
function sidebarUserHeader(user: Sidebar12User): DomphyElement<"div"> {
  const avatarChild: DomphyElement<"span"> = user.avatarUrl
    ? ({ span: [{ img: null, src: user.avatarUrl, alt: user.name } as unknown as DomphyElement], $: [avatar({ color: "primary" })] } as unknown as DomphyElement<"span">)
    : ({ span: user.name.slice(0, 1).toUpperCase(), $: [avatar({ color: "primary" })] } as unknown as DomphyElement<"span">);

  return {
    div: [
      avatarChild,
      {
        div: [
          { strong: user.name, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
          { small: user.email, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
        ],
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: "0", overflow: "hidden" },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    },
  } as unknown as DomphyElement<"div">;
}

/** Compact always-visible month-grid date picker (Sunday-first, no popover). */
function monthDatePicker(viewMonth: State<Date>, selectedDate: State<Date>, onSelect: (date: Date) => void): DomphyElement<"div"> {
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const fullDateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "full" });

  const header: DomphyElement<"div"> = {
    div: [
      {
        button: "‹",
        type: "button",
        ariaLabel: "Previous month",
        onClick: () => viewMonth.set(addMonths(viewMonth.get(), -1)),
        style: navButtonStyle(),
      } as unknown as DomphyElement,
      {
        div: (l: Listener) => monthFormatter.format(viewMonth.get(l)),
        ariaLive: "polite",
        style: { flex: "1", textAlign: "center", color: (l: Listener) => themeColor(l, "shift-9", "neutral") },
      } as unknown as DomphyElement,
      {
        button: "›",
        type: "button",
        ariaLabel: "Next month",
        onClick: () => viewMonth.set(addMonths(viewMonth.get(), 1)),
        style: navButtonStyle(),
      } as unknown as DomphyElement,
    ],
    style: { display: "flex", alignItems: "center", gap: themeSpacing(1), marginBottom: themeSpacing(2) },
  } as unknown as DomphyElement<"div">;

  const weekdayHeader: DomphyElement<"div"> = {
    // NOT `role="row"` — unlike the week rows below, this header is a
    // sibling of `grid`, not nested inside its own `role="grid"` container,
    // so `role="row"` here has no valid grid/table/rowgroup ancestor (and no
    // cell-family children either) — it failed both `aria-required-parent`
    // and `aria-required-children` once added.
    div: WEEKDAY_LABELS.map((label, index) => ({
      small: label,
      _key: index,
      style: { textAlign: "center" },
      $: [small({ color: "neutral" })],
    })) as unknown as DomphyElement[],
    style: gridRowStyle(),
  } as unknown as DomphyElement<"div">;

  const grid: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const monthStart = startOfMonth(viewMonth.get(listener));
      const month = monthStart.getMonth();
      const gridStart = addDays(monthStart, -monthStart.getDay());
      const selected = selectedDate.get(listener);
      const weeks: DomphyElement[] = [];
      for (let week = 0; week < 6; week++) {
        const cells: DomphyElement[] = [];
        for (let day = 0; day < 7; day++) {
          const date = addDays(gridStart, week * 7 + day);
          const outside = date.getMonth() !== month;
          const isSelected = sameDay(date, selected);
          cells.push({
            button: String(date.getDate()),
            type: "button",
            role: "gridcell",
            disabled: outside,
            ariaSelected: isSelected,
            ariaLabel: fullDateFormatter.format(date),
            onClick: () => onSelect(date),
            _key: isoOf(date),
            style: {
              appearance: "none",
              border: "none",
              cursor: outside ? "default" : "pointer",
              aspectRatio: "1",
              borderRadius: "50%",
              opacity: outside ? 0.4 : 1,
              color: (l: Listener) => (isSelected ? themeColor(l, "shift-9", "primary") : themeColor(l, "shift-9", "neutral")),
              backgroundColor: (l: Listener) => (isSelected ? themeColor(l, "inherit", "primary") : themeColor(l, "inherit", "neutral")),
              "&:hover:not(:disabled)": {
                backgroundColor: (l: Listener) => (isSelected ? themeColor(l, "inherit", "primary") : themeColor(l, "shift-2", "neutral")),
              },
            },
          } as unknown as DomphyElement);
        }
        weeks.push({
          div: cells,
          role: "row",
          _key: isoOf(addDays(gridStart, week * 7)),
          style: gridRowStyle(),
        } as unknown as DomphyElement);
      }
      return weeks;
    },
    role: "grid",
    ariaLabel: "Calendar",
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
  } as unknown as DomphyElement<"div">;

  return {
    div: [header, weekdayHeader, grid],
    style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 3), color: (l: Listener) => themeColor(l, "shift-9", "neutral") },
  } as unknown as DomphyElement<"div">;
}

function navButtonStyle() {
  return {
    appearance: "none" as const,
    border: "none",
    background: "none",
    cursor: "pointer",
    width: themeSpacing(7),
    height: themeSpacing(7),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral") },
  };
}

function gridRowStyle() {
  return { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: themeSpacing(0.5) };
}

/** One calendar entry row: colored square checkbox + name. */
function calendarEntryRow(
  groupLabel: string,
  entry: Sidebar12CalendarEntry,
  checked: State<boolean>,
  onToggle?: (groupLabel: string, entryId: string, checked: boolean) => void,
): DomphyElement<"li"> {
  return {
    li: [
      {
        label: [
          {
            input: null,
            type: "checkbox",
            checked: (l: Listener) => checked.get(l),
            onChange: (e: Event) => {
              const next = (e.target as HTMLInputElement).checked;
              checked.set(next);
              onToggle?.(groupLabel, entry.id, next);
            },
            $: [inputCheckbox({ color: "neutral", accentColor: entry.color })],
          } as unknown as DomphyElement,
          { span: entry.name, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          cursor: "pointer",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: entry.id,
  } as DomphyElement<"li">;
}

/** A collapsible calendar group: label + chevron trigger, list of checkbox rows.
 * Matches the reference's defaults: only the first group starts expanded, and
 * only each group's first two entries start checked. */
function calendarGroupSection(
  group: Sidebar12CalendarGroup,
  groupIndex: number,
  onToggle?: (groupLabel: string, entryId: string, checked: boolean) => void,
): DomphyElement<"li"> {
  const entryStates = group.entries.map((_entry, entryIndex) => toState(entryIndex < 2));

  return {
    li: [
      {
        details: [
          {
            summary: [{ span: group.label, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement],
            style: {
              listStyle: "none",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              width: "100%",
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
            },
          } as unknown as DomphyElement,
          {
            ul: group.entries.map((entry, index) => calendarEntryRow(group.label, entry, entryStates[index]!, onToggle)),
            style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
          } as unknown as DomphyElement,
        ],
        open: groupIndex === 0,
      } as unknown as DomphyElement,
    ],
    _key: group.label,
  } as DomphyElement<"li">;
}

/** Tall placeholder day-grid demonstrating the sidebar's independent scroll. */
function eventGridPlaceholder(): DomphyElement<"div"> {
  const cells = Array.from({ length: 35 }, (_unused, index) => ({
    div: String((index % 31) + 1),
    _key: index,
    dataTone: "shift-2",
    style: {
      minHeight: themeSpacing(24),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      padding: themeSpacing(1),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  })) as unknown as DomphyElement[];

  return {
    div: cells,
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
    },
  } as unknown as DomphyElement<"div">;
}

/**
 * Scheduling-app sidebar: user header, compact month date-picker, grouped
 * checkbox calendar lists — sticky while the main content scrolls
 * independently. Call with no arguments for a fully working demo.
 */
function sidebar12(props: Sidebar12Props = {}): DomphyElement<"div"> {
  const { user = DEFAULT_USER, groups = DEFAULT_GROUPS, onDateChange, onCalendarToggle, children } = props;

  const initialDate = props.selectedDate ?? DEFAULT_DATE;
  const selectedDate = toState(initialDate);
  const viewMonth = toState(startOfMonth(initialDate));
  const collapsed = toState(false);
  const mobileOpen = toState(false);

  const selectDate = (date: Date) => {
    selectedDate.set(date);
    onDateChange?.(date);
  };
  const periodLabel = (listener: Listener) =>
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(viewMonth.get(listener));

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      sidebarUserHeader(user),
      verticalDivider(),
      monthDatePicker(viewMonth, selectedDate, selectDate),
      verticalDivider(),
      {
        ul: groups.map((group, groupIndex) => calendarGroupSection(group, groupIndex, onCalendarToggle)),
        style: {
          listStyle: "none",
          margin: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(2),
          flex: "1",
        },
      } as unknown as DomphyElement,
      {
        div: [
          {
            button: [sidebarIcon(ICON_PLUS), { span: "New Calendar", style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement],
            type: "button",
            style: {
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              border: "none",
              cursor: "pointer",
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
            },
          } as unknown as DomphyElement,
        ],
        style: {
          borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      position: "sticky",
      top: "0",
      height: "100dvh",
      overflowY: "auto",
      width: (l: Listener) => (collapsed.get(l) ? "0px" : themeSpacing(70)),
      overflowX: "hidden",
      transition: "width 180ms ease-out",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        zIndex: "15",
        width: themeSpacing(70),
        transform: (l: Listener) => (mobileOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 180ms ease-out",
      },
    },
  } as unknown as DomphyElement<"aside">;

  const headerElement: DomphyElement<"header"> = {
    header: [
      {
        button: [sidebarIcon(ICON_PANEL_TOGGLE)],
        type: "button",
        ariaLabel: "Toggle sidebar",
        onClick: () => {
          collapsed.set(!collapsed.get());
          mobileOpen.set(!mobileOpen.get());
        },
        style: {
          appearance: "none",
          border: "none",
          background: "none",
          cursor: "pointer",
          color: (l: Listener) => themeColor(l, "shift-8", "neutral"),
        },
      } as unknown as DomphyElement,
      verticalDivider(),
      { strong: periodLabel, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
      {
        div: [
          {
            button: "Today",
            type: "button",
            onClick: () => {
              viewMonth.set(startOfMonth(initialDate));
              selectDate(initialDate);
            },
            style: todayButtonStyle(),
          } as unknown as DomphyElement,
          {
            button: "‹",
            type: "button",
            ariaLabel: "Previous period",
            onClick: () => viewMonth.set(addMonths(viewMonth.get(), -1)),
            style: navButtonStyle(),
          } as unknown as DomphyElement,
          {
            button: "›",
            type: "button",
            ariaLabel: "Next period",
            onClick: () => viewMonth.set(addMonths(viewMonth.get(), 1)),
            style: navButtonStyle(),
          } as unknown as DomphyElement,
        ],
        style: { marginInlineStart: "auto", display: "flex", alignItems: "center", gap: themeSpacing(1) },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: themeSpacing(16),
      flexShrink: "0",
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"header">;

  const mainContent: DomphyElement[] = children
    ? Array.isArray(children)
      ? children
      : [children]
    : [eventGridPlaceholder()];

  const mainElement: DomphyElement<"main"> = {
    main: [headerElement, ...mainContent],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement],
    dataTone: "shift-0",
    style: {
      display: "flex",
      alignItems: "flex-start",
      minHeight: "100dvh",
      position: "relative",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function todayButtonStyle() {
  return {
    appearance: "none" as const,
    border: "none",
    cursor: "pointer",
    paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
    paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    outline: (l: Listener) => `1px solid ${themeColor(l, "shift-4", "neutral")}`,
    outlineOffset: "-1px",
    "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
  };
}

export { sidebar12 };
export type { Sidebar12CalendarEntry, Sidebar12CalendarGroup, Sidebar12Props, Sidebar12User };
