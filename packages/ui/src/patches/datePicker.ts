import {
  type DomphyElement,
  type ElementNode,
  type Listener,
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { createFloating } from "../utils/floating.js";

/** A single date selection, or a `[start, end]` tuple in range mode. */
export type DatePickerValue = Date | null | [Date | null, Date | null];

export interface DatePickerProps {
  /** Controlled value: a `Date` in single mode, a `[start, end]` tuple in range mode. */
  value?: ValueOrState<DatePickerValue>;
  /** Selection mode. */
  mode?: "single" | "range";
  /** Also pick hour + minute. The chosen time applies to the selected date(s). */
  time?: boolean;
  /** Earliest selectable day (inclusive). */
  min?: Date;
  /** Latest selectable day (inclusive). */
  max?: Date;
  /** Disable arbitrary days. */
  disabledDate?: (date: Date) => boolean;
  /** BCP-47 locale for month/weekday names, first-day-of-week, and formatting. */
  locale?: string;
  /** Override the first day of the week (0 = Sunday … 6 = Saturday). */
  weekStartsOn?: number;
  /** Override the input display string. */
  format?: (value: DatePickerValue) => string;
  /** Called whenever the selection changes. */
  onChange?: (value: DatePickerValue) => void;
  /** Accent color for the selected/active days. */
  accentColor?: ValueOrState<ThemeColor>;
  /** Popover placement relative to the input. */
  placement?: ValueOrState<Placement>;
}

// --- date helpers (no third-party library) -----------------------------------

const atMidnight = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const addMonths = (date: Date, count: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + count, date.getDate());
const sameDay = (a: Date | null, b: Date | null): boolean =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const isoOf = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
const startOfWeek = (date: Date, weekStart: number): Date =>
  addDays(date, -((date.getDay() - weekStart + 7) % 7));

/** Resolves the locale's first day of week, falling back to Sunday. */
function localeWeekStart(locale: string): number {
  try {
    const localeObject = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: { firstDay: number };
      getWeekInfo?: () => { firstDay: number };
    };
    const info = localeObject.getWeekInfo?.() ?? localeObject.weekInfo;
    if (info?.firstDay) return info.firstDay % 7; // Intl uses 1=Mon … 7=Sun
  } catch {
    // unsupported locale or engine — fall through to Sunday
  }
  return 0;
}

/**
 * A native, themeable date picker patch for an `<input>`. Opens a calendar
 * popover (rendered with Domphy elements, positioned via `@domphy/floating`)
 * supporting single/range selection, optional time, min/max + disabled days,
 * localized names, and keyboard navigation. The input is read-only and shows the
 * formatted selection; compose with `inputText()` for the input's look.
 *
 * @hostTag input
 * @param props.value - Controlled value (`ValueOrState<DatePickerValue>`): a `Date`/`null` in single mode, a `[start, end]` tuple in range mode.
 * @param props.mode - Selection mode, "single" | "range". Defaults to "single".
 * @param props.time - When true, also pick hour + minute (applied to the selected date(s)). Defaults to false.
 * @param props.min - Earliest selectable day (inclusive), a `Date`.
 * @param props.max - Latest selectable day (inclusive), a `Date`.
 * @param props.disabledDate - Predicate `(date: Date) => boolean` to disable arbitrary days.
 * @param props.locale - BCP-47 locale for names/first-day-of-week/formatting. Defaults to `navigator.language` (or "en-US" in non-browser).
 * @param props.weekStartsOn - Override first day of week (0 = Sunday … 6 = Saturday). Defaults to the locale's first day.
 * @param props.format - Override the input display string, `(value: DatePickerValue) => string`.
 * @param props.onChange - Called with the new value whenever the selection changes, `(value: DatePickerValue) => void`.
 * @param props.accentColor - Accent color (`ValueOrState<ThemeColor>`) for selected/active days. Defaults to "primary".
 * @param props.placement - Popover placement (`ValueOrState<Placement>`) relative to the input. Defaults to "bottom-start".
 * @example { input: "", $: [inputText(), datePicker({ mode: "range" })] }
 */
function datePicker(props: DatePickerProps = {}): PartialElement {
  const {
    mode = "single",
    time = false,
    min,
    max,
    disabledDate,
    locale = typeof navigator !== "undefined" ? navigator.language : "en-US",
    format,
    onChange,
  } = props;

  const weekStart = props.weekStartsOn ?? localeWeekStart(locale);
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");
  const placeState = toState(props.placement ?? "bottom-start");

  const selection = toState<DatePickerValue>(
    props.value ?? (mode === "range" ? [null, null] : null),
  );
  const releaseOnChange = onChange
    ? selection.addListener((value) => onChange(value))
    : null;

  const primaryDate = ((): Date => {
    const current = selection.get();
    const base =
      mode === "range" ? (current as [Date | null, Date | null])?.[0] : current;
    return base instanceof Date ? base : new Date();
  })();

  const viewYear = toState(primaryDate.getFullYear(), "viewYear");
  const viewMonth = toState(primaryDate.getMonth(), "viewMonth");
  const focused = toState<Date>(atMidnight(primaryDate), "focused");
  const hovered = toState<Date | null>(null, "hovered");
  const hour = toState(primaryDate.getHours(), "hour");
  const minute = toState(primaryDate.getMinutes(), "minute");

  let contentElement: HTMLElement | null = null;

  // --- formatting -----------------------------------------------------------
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
  });
  const monthFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
  });
  const fullDateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
  });

  const formatOne = (date: Date | null): string =>
    date ? dateFormatter.format(date) : "";
  const formatDisplay = (value: DatePickerValue): string => {
    if (format) return format(value);
    if (mode === "range") {
      const [start, end] = (value as [Date | null, Date | null]) ?? [
        null,
        null,
      ];
      return start ? `${formatOne(start)} – ${formatOne(end)}` : "";
    }
    return formatOne(value as Date | null);
  };

  // 2023-01-01 is a Sunday, so index 0 maps to Sunday before the week-start shift.
  const weekdayNames = Array.from({ length: 7 }, (_unused, index) =>
    weekdayFormatter.format(new Date(2023, 0, 1 + ((index + weekStart) % 7))),
  );

  // --- selection logic ------------------------------------------------------
  const isDisabled = (date: Date): boolean =>
    (!!min && atMidnight(date) < atMidnight(min)) ||
    (!!max && atMidnight(date) > atMidnight(max)) ||
    (!!disabledDate && disabledDate(date));

  const withTime = (date: Date): Date => {
    if (!time) return atMidnight(date);
    const result = atMidnight(date);
    result.setHours(hour.get(), minute.get(), 0, 0);
    return result;
  };

  const selectDate = (date: Date): void => {
    if (isDisabled(date)) return;
    if (mode === "single") {
      selection.set(withTime(date));
      if (!time) instantHideRef();
      return;
    }
    const [start, end] = (selection.get() as [Date | null, Date | null]) ?? [
      null,
      null,
    ];
    if (!start || (start && end)) {
      selection.set([withTime(date), null]);
    } else if (atMidnight(date) < atMidnight(start)) {
      selection.set([withTime(date), withTime(start)]);
      if (!time) instantHideRef();
    } else {
      selection.set([start, withTime(date)]);
      if (!time) instantHideRef();
    }
  };

  const reapplyTime = (): void => {
    if (!time) return;
    if (mode === "single") {
      const current = selection.get() as Date | null;
      if (current) selection.set(withTime(current));
    } else {
      const [start, end] = (selection.get() as [Date | null, Date | null]) ?? [
        null,
        null,
      ];
      selection.set([
        start ? withTime(start) : start,
        end ? withTime(end) : end,
      ]);
    }
  };

  const inSelectedRange = (date: Date, listener?: Listener): boolean => {
    if (mode !== "range") return false;
    const [start, end] = (selection.get(listener) as [
      Date | null,
      Date | null,
    ]) ?? [null, null];
    const tail = end ?? hovered.get(listener);
    if (!start || !tail) return false;
    const low = atMidnight(start) <= atMidnight(tail) ? start : tail;
    const high = atMidnight(start) <= atMidnight(tail) ? tail : start;
    const day = atMidnight(date);
    return day >= atMidnight(low) && day <= atMidnight(high);
  };

  const isSelectedEnd = (date: Date, listener?: Listener): boolean => {
    const current = selection.get(listener);
    if (mode === "range") {
      const [start, end] = (current as [Date | null, Date | null]) ?? [
        null,
        null,
      ];
      return sameDay(date, start) || sameDay(date, end);
    }
    return sameDay(date, current as Date | null);
  };

  // --- view navigation ------------------------------------------------------
  const goToDate = (date: Date): void => {
    viewYear.set(date.getFullYear());
    viewMonth.set(date.getMonth());
  };
  const shiftMonth = (delta: number): void => {
    const next = addMonths(new Date(viewYear.get(), viewMonth.get(), 1), delta);
    goToDate(next);
  };
  const shiftYear = (delta: number): void =>
    viewYear.set(viewYear.get() + delta);

  const focusActiveCell = (): void => {
    setTimeout(() => {
      contentElement
        ?.querySelector<HTMLElement>(`[data-date="${isoOf(focused.get())}"]`)
        ?.focus();
    }, 0);
  };

  // --- floating popover ------------------------------------------------------
  const calendar = buildCalendar();
  const { show, hide, anchorPartial } = createFloating({
    open: false,
    placement: placeState,
    content: calendar,
  });
  // selectDate calls this before `createFloating` returns `hide`, so route through a ref.
  function instantHideRef(): void {
    hide();
  }

  // Move focus into the grid when the popover opens.
  anchorPartial.onClick = () => {};
  const triggerPartial: PartialElement = {
    type: "text",
    readonly: true,
    value: (listener) => formatDisplay(selection.get(listener)),
    ariaHaspopup: "dialog",
    ariaLabel: "Choose date",
    style: { cursor: "pointer" },
    onClick: (_e, node) => {
      openAndFocus(node);
    },
    onFocus: (_e, node) => {
      openAndFocus(node);
    },
    onKeyDown: (event, node) => {
      const key = (event as KeyboardEvent).key;
      if (key === "ArrowDown" || key === "Enter") {
        event.preventDefault();
        openAndFocus(node);
      }
    },
    _onMount: (node) =>
      releaseOnChange &&
      node.addHook("Remove", () => {
        releaseOnChange();
      }),
  };
  function openAndFocus(node?: ElementNode): void {
    const current = isSelectedPrimary() ?? new Date();
    focused.set(atMidnight(current));
    goToDate(current);
    show(node);
    focusActiveCell();
  }
  function isSelectedPrimary(): Date | null {
    const current = selection.get();
    if (mode === "range")
      return (current as [Date | null, Date | null])?.[0] ?? null;
    return (current as Date | null) ?? null;
  }
  merge(anchorPartial, triggerPartial);
  return anchorPartial;

  // --- calendar builder -----------------------------------------------------
  function buildCalendar(): DomphyElement<"div"> {
    const navButton = (label: string, ariaLabel: string, onClick: () => void) =>
      ({
        button: label,
        type: "button",
        ariaLabel,
        onClick,
        style: navButtonStyle(),
      }) as DomphyElement;

    const header: DomphyElement<"div"> = {
      div: [
        navButton("«", "Previous year", () => shiftYear(-1)),
        navButton("‹", "Previous month", () => shiftMonth(-1)),
        {
          div: (listener) =>
            monthFormatter.format(
              new Date(viewYear.get(listener), viewMonth.get(listener), 1),
            ),
          ariaLive: "polite",
          style: {
            flex: "1",
            textAlign: "center",
            fontWeight: "600",
            fontSize: (listener) => themeSize(listener),
          },
        },
        navButton("›", "Next month", () => shiftMonth(1)),
        navButton("»", "Next year", () => shiftYear(1)),
      ],
      style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(1),
        marginBottom: themeSpacing(2),
      },
    };

    const weekdayHeader: DomphyElement<"div"> = {
      div: weekdayNames.map((name, index) => ({
        div: name,
        style: {
          textAlign: "center",
          fontSize: (listener) => themeSize(listener, "decrease-1"),
          fontWeight: "600",
          color: (listener) => themeColor(listener, "shift-7"),
          paddingBlock: themeSpacing(1),
        },
        _key: index,
      })),
      role: "row",
      style: gridRowStyle(),
    };

    const grid: DomphyElement<"div"> = {
      div: (listener) => buildWeeks(listener),
      role: "grid",
      ariaLabel: "Calendar",
      onKeyDown: onGridKey,
      onMouseLeave: () => mode === "range" && hovered.set(null),
      style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(0.5),
      },
    };

    const children: DomphyElement[] = [header, weekdayHeader, grid];
    if (time) children.push(buildTimeRow());
    children.push(buildFooter());

    return {
      div: children,
      role: "dialog",
      ariaModal: "false",
      _onMount: (node) => {
        contentElement = node.domElement as HTMLElement;
      },
      style: {
        minWidth: themeSpacing(70),
        padding: themeSpacing(3),
        borderRadius: themeSpacing(2),
        backgroundColor: (listener) => themeColor(listener, "base"),
        color: (listener) => themeColor(listener, "shift-10"),
        border: (listener) => `1px solid ${themeColor(listener, "shift-4")}`,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
      },
    };
  }

  function buildWeeks(listener: Listener): DomphyElement[] {
    const first = new Date(viewYear.get(listener), viewMonth.get(listener), 1);
    const month = viewMonth.get(listener);
    const start = startOfWeek(first, weekStart);
    const weeks: DomphyElement[] = [];
    for (let week = 0; week < 6; week++) {
      const cells: DomphyElement[] = [];
      for (let day = 0; day < 7; day++) {
        const date = addDays(start, week * 7 + day);
        cells.push(buildDayCell(date, month, listener));
      }
      weeks.push({
        div: cells,
        role: "row",
        style: gridRowStyle(),
        _key: week,
      });
    }
    return weeks;
  }

  function buildDayCell(
    date: Date,
    month: number,
    listener: Listener,
  ): DomphyElement {
    const disabled = isDisabled(date);
    const selected = isSelectedEnd(date, listener);
    const within = inSelectedRange(date, listener);
    const outside = date.getMonth() !== month;
    const isFocused = sameDay(date, focused.get(listener));
    const isToday = sameDay(date, new Date());

    return {
      button: String(date.getDate()),
      type: "button",
      role: "gridcell",
      tabIndex: isFocused ? 0 : -1,
      ariaSelected: selected,
      ariaDisabled: disabled,
      disabled,
      ariaLabel: fullDateFormatter.format(date),
      dataDate: isoOf(date),
      onClick: () => selectDate(date),
      onMouseEnter: () => mode === "range" && hovered.set(date),
      style: {
        appearance: "none",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        aspectRatio: "1",
        borderRadius: themeSpacing(1),
        fontSize: (l: Listener) => themeSize(l),
        fontFamily: "inherit",
        opacity: disabled ? 0.35 : outside ? 0.5 : 1,
        backgroundColor: (l: Listener) =>
          selected
            ? themeColor(l, "shift-7", accentColor.get(l))
            : within
              ? themeColor(l, "shift-2", accentColor.get(l))
              : "transparent",
        color: (l: Listener) =>
          selected
            ? themeColor(l, "shift-0", accentColor.get(l))
            : themeColor(l, "shift-9"),
        outline: isToday
          ? (l: Listener) =>
              `1px solid ${themeColor(l, "shift-6", accentColor.get(l))}`
          : "none",
        outlineOffset: "-2px",
        "&:hover:not([disabled])": {
          backgroundColor: (l: Listener) =>
            selected
              ? themeColor(l, "shift-7", accentColor.get(l))
              : themeColor(l, "shift-3", accentColor.get(l)),
        },
        "&:focus-visible": {
          outline: (l: Listener) =>
            `2px solid ${themeColor(l, "shift-6", accentColor.get(l))}`,
        },
      },
      _key: isoOf(date),
    } as DomphyElement;
  }

  function buildTimeRow(): DomphyElement<"div"> {
    const numberSelect = (
      count: number,
      state: ReturnType<typeof toState<number>>,
      ariaLabel: string,
    ): DomphyElement => ({
      select: Array.from({ length: count }, (_unused, value) => ({
        option: String(value).padStart(2, "0"),
        value: String(value),
        selected: (listener) => state.get(listener) === value,
        _key: value,
      })) as DomphyElement[],
      ariaLabel,
      onChange: (event) => {
        state.set(Number((event.target as HTMLSelectElement).value));
        reapplyTime();
      },
      style: timeSelectStyle(),
    });

    return {
      div: [
        numberSelect(24, hour, "Hour"),
        { span: ":", style: { fontWeight: "600" } },
        numberSelect(60, minute, "Minute"),
      ],
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: themeSpacing(1),
        marginTop: themeSpacing(3),
      },
    };
  }

  function buildFooter(): DomphyElement<"div"> {
    const action = (label: string, onClick: () => void): DomphyElement => ({
      button: label,
      type: "button",
      onClick,
      style: {
        appearance: "none",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: (l: Listener) => themeSize(l, "decrease-1"),
        color: (l: Listener) => themeColor(l, "shift-8", accentColor.get(l)),
        padding: themeSpacing(1),
      },
    });
    return {
      div: [
        action("Today", () => {
          const today = new Date();
          focused.set(atMidnight(today));
          goToDate(today);
          focusActiveCell();
        }),
        action("Clear", () => {
          selection.set(mode === "range" ? [null, null] : null);
          hovered.set(null);
        }),
      ],
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: themeSpacing(2),
        paddingTop: themeSpacing(2),
        borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3")}`,
      },
    };
  }

  function onGridKey(event: Event): void {
    const keyboard = event as KeyboardEvent;
    const current = focused.get();
    let next: Date | null = null;
    switch (keyboard.key) {
      case "ArrowLeft":
        next = addDays(current, -1);
        break;
      case "ArrowRight":
        next = addDays(current, 1);
        break;
      case "ArrowUp":
        next = addDays(current, -7);
        break;
      case "ArrowDown":
        next = addDays(current, 7);
        break;
      case "Home":
        next = startOfWeek(current, weekStart);
        break;
      case "End":
        next = addDays(startOfWeek(current, weekStart), 6);
        break;
      case "PageUp":
        next = addMonths(current, keyboard.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(current, keyboard.shiftKey ? 12 : 1);
        break;
      case "Enter":
      case " ":
        keyboard.preventDefault();
        selectDate(current);
        return;
      default:
        return;
    }
    keyboard.preventDefault();
    focused.set(next);
    goToDate(next);
    focusActiveCell();
  }
}

// --- shared style fragments --------------------------------------------------

function gridRowStyle() {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: themeSpacing(0.5),
  };
}

function navButtonStyle() {
  return {
    appearance: "none" as const,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: (l: Listener) => themeSize(l),
    color: (l: Listener) => themeColor(l, "shift-8"),
    width: themeSpacing(7),
    height: themeSpacing(7),
    borderRadius: themeSpacing(1),
    "&:hover": {
      backgroundColor: (l: Listener) => themeColor(l, "shift-3"),
    },
  };
}

function timeSelectStyle() {
  return {
    fontFamily: "inherit",
    fontSize: (l: Listener) => themeSize(l),
    padding: themeSpacing(1),
    borderRadius: themeSpacing(1),
    border: (l: Listener) => `1px solid ${themeColor(l, "shift-4")}`,
    backgroundColor: (l: Listener) => themeColor(l, "base"),
    color: (l: Listener) => themeColor(l, "shift-9"),
  };
}

export { datePicker };
