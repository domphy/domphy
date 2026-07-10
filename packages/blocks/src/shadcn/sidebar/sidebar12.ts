// shadcn/ui "sidebar-12" — clean-room reimplementation from the public
// behavior description only (no upstream source viewed). A scheduling-app
// sidebar combining a compact month date-picker with grouped,
// checkbox-selectable calendar lists, sticky while the main content scrolls
// independently. See ./sidebar09-12-shared.ts and ./sidebar05-08-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import {
  avatar,
  icon,
  inputCheckbox,
  popover,
  small,
  strong,
} from "@domphy/ui";
import {
  ICON_CHEVRON_RIGHT,
  ICON_CHEVRONS_UPDOWN,
  ICON_PANEL_TOGGLE,
  ICON_PLUS,
  ICON_SPARKLE,
  interactiveRowStyle,
  sidebarIcon,
  verticalDivider,
} from "./sidebar09-12-shared.js";

type Sidebar12User = { name: string; email: string; avatarUrl?: string };
type Sidebar12CalendarEntry = { id: string; name: string; color: ThemeColor };
type Sidebar12CalendarGroup = {
  label: string;
  entries: Sidebar12CalendarEntry[];
};

type Sidebar12Props = {
  user?: Sidebar12User;
  selectedDate?: Date;
  groups?: Sidebar12CalendarGroup[];
  onDateChange?: (date: Date) => void;
  onCalendarToggle?: (
    groupLabel: string,
    entryId: string,
    checked: boolean,
  ) => void;
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_USER: Sidebar12User = {
  name: "Shad Cn",
  email: "shadcn@example.com",
};

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

// ---------------------------------------------------------------------------
// Account dropdown — upstream nav-user.tsx renders a user-info header plus five
// items in three separator-divided, icon-labeled groups. The shared
// renderUserFooter() only produces a plain 3-item Account/Billing/Log out menu,
// so this block builds its own footer + dropdown locally (see structured-output
// sharedFileSuspicion: the shared helper is the real root cause). Icons below
// are hand-authored generic line glyphs (24x24, stroke=currentColor), matching
// the clean-room icon style already used across this sidebar family — not
// sourced from any icon library.
// ---------------------------------------------------------------------------

const ICON_BADGE_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z"/><path d="M9 12l2 2 4-4"/></svg>';

const ICON_CREDIT_CARD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>';

const ICON_BELL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.5 21a1.5 1.5 0 0 1-3 0"/></svg>';

const ICON_LOG_OUT =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Avatar span: user image if present, otherwise two-letter initials fallback. */
function accountAvatar(user: Sidebar12User): DomphyElement<"span"> {
  return user.avatarUrl
    ? ({
        span: [
          {
            img: null,
            src: user.avatarUrl,
            alt: user.name,
          } as unknown as DomphyElement,
        ],
        $: [avatar({ color: "primary" })],
      } as unknown as DomphyElement<"span">)
    : ({
        span: initialsOf(user.name),
        $: [avatar({ color: "primary" })],
      } as unknown as DomphyElement<"span">);
}

/** Two-line label (bold name + muted email) that clips instead of wrapping. */
function twoLineLabel(title: string, caption: string): DomphyElement<"div"> {
  return {
    div: [
      {
        strong: title,
        $: [strong({ color: "neutral" })],
      } as unknown as DomphyElement,
      {
        small: caption,
        $: [small({ color: "neutral" })],
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(0.5),
      minWidth: "0",
      overflow: "hidden",
      whiteSpace: "nowrap",
    },
  } as unknown as DomphyElement<"div">;
}

type AccountMenuEntry = { icon: string; label: string };

/** Upstream nav-user.tsx dropdown groups (5 items across 3 separator-divided,
 * icon-labeled groups): [Upgrade to Pro] / [Account, Billing, Notifications] /
 * [Log out]. */
const ACCOUNT_MENU_GROUPS: AccountMenuEntry[][] = [
  [{ icon: ICON_SPARKLE, label: "Upgrade to Pro" }],
  [
    { icon: ICON_BADGE_CHECK, label: "Account" },
    { icon: ICON_CREDIT_CARD, label: "Billing" },
    { icon: ICON_BELL, label: "Notifications" },
  ],
  [{ icon: ICON_LOG_OUT, label: "Log out" }],
];

/** Account dropdown content: user-info header + separator, then the three
 * icon-labeled item groups divided by separator hairlines — mirrors upstream
 * nav-user.tsx exactly. */
function accountDropdownContent(user: Sidebar12User): DomphyElement<"div"> {
  return {
    div: [
      // Header (DropdownMenuLabel): avatar + name/email, with a bottom hairline
      // standing in for the separator between it and the first group.
      {
        div: [accountAvatar(user), twoLineLabel(user.name, user.email)],
        style: {
          display: "flex",
          alignItems: "center",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderBottom: (l: Listener) =>
            `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
      {
        div: ACCOUNT_MENU_GROUPS.map((entries, groupIndex) => ({
          div: entries.map((entry, itemIndex) => ({
            button: [
              sidebarIcon(entry.icon),
              {
                span: entry.label,
                style: { flex: "1", textAlign: "left" },
              } as unknown as DomphyElement,
            ],
            type: "button",
            role: "menuitem",
            style: interactiveRowStyle(true),
            _key: itemIndex,
          })) as unknown as DomphyElement[],
          role: "group",
          style: {
            display: "flex",
            flexDirection: "column",
            paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
            paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 1),
            // Separator hairline between groups (last group has none), matching
            // upstream's DropdownMenuSeparator between every group.
            borderBottom:
              groupIndex < ACCOUNT_MENU_GROUPS.length - 1
                ? (l: Listener) =>
                    `1px solid ${themeColor(l, "shift-3", "neutral")}`
                : undefined,
          },
          _key: groupIndex,
        })) as unknown as DomphyElement[],
        role: "menu",
        style: { display: "flex", flexDirection: "column" },
      } as unknown as DomphyElement,
    ],
    dataTone: "shift-0",
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: themeSpacing(56),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      boxShadow: (l: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(l, "shift-4", "neutral")}`,
      overflow: "hidden",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

/** Account footer trigger (avatar + name/email + chevrons) opening the
 * upstream-faithful account dropdown. Local to this block instead of the shared
 * renderUserFooter(), whose plain 3-item menu omits the header/groups/icons. */
function renderAccountFooter(user: Sidebar12User): DomphyElement<"div"> {
  return {
    div: [
      {
        button: [
          accountAvatar(user),
          twoLineLabel(user.name, user.email),
          sidebarIcon(ICON_CHEVRONS_UPDOWN),
        ],
        type: "button",
        ariaLabel: "Account menu",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          cursor: "pointer",
          overflow: "hidden",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
        },
        $: [
          popover({
            placement: "right-start",
            content: accountDropdownContent(user),
          }),
        ],
      } as unknown as DomphyElement,
    ],
    style: {
      // Header sits at the top of the aside (like upstream SidebarHeader,
      // border-b), so the hairline is a bottom border, not a top one. Upstream
      // SidebarHeader here is `h-16 border-b` — a fixed 64px height that lines
      // up with the content header, so center its trigger vertically.
      display: "flex",
      alignItems: "center",
      height: themeSpacing(16),
      boxSizing: "border-box",
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

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
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isoOf(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Compact always-visible month-grid date picker (Sunday-first, no popover). */
function monthDatePicker(
  viewMonth: State<Date>,
  selectedDate: State<Date>,
  onSelect: (date: Date) => void,
): DomphyElement<"div"> {
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });
  const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  });

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
        style: {
          flex: "1",
          textAlign: "center",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
      {
        button: "›",
        type: "button",
        ariaLabel: "Next month",
        onClick: () => viewMonth.set(addMonths(viewMonth.get(), 1)),
        style: navButtonStyle(),
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(1),
      marginBottom: themeSpacing(2),
    },
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
              color: (l: Listener) =>
                isSelected
                  ? themeColor(l, "shift-9", "primary")
                  : themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) =>
                isSelected
                  ? themeColor(l, "inherit", "primary")
                  : themeColor(l, "inherit", "neutral"),
              "&:hover:not(:disabled)": {
                backgroundColor: (l: Listener) =>
                  isSelected
                    ? themeColor(l, "inherit", "primary")
                    : themeColor(l, "shift-2", "neutral"),
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
    style: {
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
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
    "&:hover": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral"),
    },
  };
}

function gridRowStyle() {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: themeSpacing(0.5),
  };
}

/** One calendar entry row: colored square checkbox + name. */
function calendarEntryRow(
  groupLabel: string,
  entry: Sidebar12CalendarEntry,
  checked: State<boolean>,
  onToggle?: (groupLabel: string, entryId: string, checked: boolean) => void,
): DomphyElement<"li"> {
  const inputId = `sidebar12-calendar-${entry.id}`;
  return {
    li: [
      {
        label: [
          {
            input: null,
            id: inputId,
            type: "checkbox",
            checked: (l: Listener) => checked.get(l),
            onChange: (e: Event) => {
              const next = (e.target as HTMLInputElement).checked;
              checked.set(next);
              onToggle?.(groupLabel, entry.id, next);
            },
            $: [inputCheckbox({ color: "neutral", accentColor: entry.color })],
          } as unknown as DomphyElement,
          {
            span: entry.name,
            style: { flex: "1", textAlign: "left" },
          } as unknown as DomphyElement,
        ],
        htmlFor: inputId,
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
          "&:hover": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
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
  const entryStates = group.entries.map((_entry, entryIndex) =>
    toState(entryIndex < 2),
  );

  return {
    li: [
      {
        details: [
          {
            summary: [
              {
                span: group.label,
                style: { flex: "1", textAlign: "left" },
              } as unknown as DomphyElement,
              {
                span: ICON_CHEVRON_RIGHT,
                dataSlot: "chevron",
                style: { transition: "transform 150ms ease" },
                $: [icon({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              listStyle: "none",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              width: "100%",
              paddingBlock: (l: Listener) =>
                themeSpacing(themeDensity(l) * 1.5),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) =>
                themeColor(l, "inherit", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
            },
          } as unknown as DomphyElement,
          {
            ul: group.entries.map((entry, index) =>
              calendarEntryRow(
                group.label,
                entry,
                entryStates[index]!,
                onToggle,
              ),
            ),
            style: {
              listStyle: "none",
              margin: "0",
              padding: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
            },
          } as unknown as DomphyElement,
        ],
        open: groupIndex === 0,
        style: {
          "&[open] summary [data-slot=chevron]": { transform: "rotate(90deg)" },
        },
      } as unknown as DomphyElement,
      // Upstream calendars.tsx renders a <SidebarSeparator className="mx-0" />
      // after every group (including the last) — a full-width divider line
      // between/after each of the three calendar groups.
      groupSeparator(),
    ],
    _key: group.label,
  } as DomphyElement<"li">;
}

/** Full-width horizontal divider rendered after each calendar group, matching
 * upstream's per-group SidebarSeparator. Border (not backgroundColor) to stay
 * theme-safe, like verticalDivider() in the shared module. */
function groupSeparator(): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    style: {
      height: "0",
      width: "100%",
      marginBlockStart: themeSpacing(2),
      borderBlockStart: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-3", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
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
  const {
    user = DEFAULT_USER,
    groups = DEFAULT_GROUPS,
    onDateChange,
    onCalendarToggle,
    children,
  } = props;

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
    new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
      viewMonth.get(listener),
    );

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      renderAccountFooter(user),
      monthDatePicker(viewMonth, selectedDate, selectDate),
      // Upstream app-sidebar.tsx renders a single <SidebarSeparator className="mx-0" />
      // between the DatePicker and the Calendars — a full-width HORIZONTAL rule.
      // (verticalDivider() is a no-op sliver in this column stack, and the
      // header/content divider is already the renderAccountFooter border-b.)
      groupSeparator(),
      {
        ul: groups.map((group, groupIndex) =>
          calendarGroupSection(group, groupIndex, onCalendarToggle),
        ),
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
            button: [
              sidebarIcon(ICON_PLUS),
              {
                span: "New Calendar",
                style: { flex: "1", textAlign: "left" },
              } as unknown as DomphyElement,
            ],
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
              backgroundColor: (l: Listener) =>
                themeColor(l, "inherit", "neutral"),
              "&:hover": {
                backgroundColor: (l: Listener) =>
                  themeColor(l, "shift-2", "neutral"),
              },
            },
          } as unknown as DomphyElement,
        ],
        style: {
          borderTop: (l: Listener) =>
            `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement,
      // Upstream app-sidebar.tsx renders <SidebarRail /> — a thin always-present
      // edge strip that toggles the sidebar on click (same pattern as sidebar11).
      {
        div: null,
        ariaHidden: "true",
        onClick: () => {
          collapsed.set(!collapsed.get());
          mobileOpen.set(!mobileOpen.get());
        },
        style: {
          position: "absolute",
          insetBlock: "0",
          insetInlineEnd: "0",
          width: themeSpacing(1),
          cursor: "col-resize",
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
      width: (l: Listener) => (collapsed.get(l) ? "0" : themeSpacing(70)),
      overflowX: "hidden",
      transition: "width 180ms ease-out",
      borderInlineEnd: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        zIndex: "15",
        width: themeSpacing(70),
        transform: (l: Listener) =>
          mobileOpen.get(l) ? "translateX(0)" : "translateX(-100%)",
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
      {
        strong: periodLabel,
        $: [strong({ color: "neutral" })],
      } as unknown as DomphyElement,
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
        style: {
          marginInlineStart: "auto",
          display: "flex",
          alignItems: "center",
          gap: themeSpacing(1),
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: themeSpacing(16),
      flexShrink: "0",
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
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
    outline: (l: Listener) =>
      `1px solid ${themeColor(l, "shift-4", "neutral")}`,
    outlineOffset: "-1px",
    "&:hover": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
    },
  };
}

export { sidebar12 };
export type {
  Sidebar12CalendarEntry,
  Sidebar12CalendarGroup,
  Sidebar12Props,
  Sidebar12User,
};
