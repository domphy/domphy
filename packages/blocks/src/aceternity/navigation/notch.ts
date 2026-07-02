// Aceternity "Notch" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// floating, dock-like pill pinned to a viewport edge that groups several
// dropdown-style selectors ("groups") into one compact control bar — a
// "macOS dock meets segmented settings switcher".
//
// Cross-group exclusivity (only one group's panel open at a time), the
// per-option sliding highlight, and outside-click/Escape dismissal are all
// hand-rolled against a single `openGroupId` state rather than the `popover()`
// ui patch — `popover()` owns its open/close lifecycle internally (including
// floating-ui position tracking) and doesn't expose a way to force-close one
// group's panel from a sibling group's click handler, which this component
// needs. Each panel is instead anchored with plain CSS (`position: relative`
// on the wrapper, `position: absolute` on the panel) since it only ever
// needs to sit directly above/below its own trigger — no viewport flip logic
// required.

import type { DomphyElement, ElementNode, Listener, State, ValueOrState } from "@domphy/core";
import { RecordState, toState } from "@domphy/core";
import { motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type NotchIconName = "display" | "sound" | "wifi" | "battery" | "moon" | "bluetooth";

export interface NotchOption {
  id: string;
  label: string;
  icon?: NotchIconName;
}

export interface NotchGroup {
  id: string;
  label: string;
  icon?: NotchIconName;
  options: NotchOption[];
  /** Fired with the newly chosen option id whenever this group's own selection changes. */
  onChange?: (optionId: string) => void;
}

export type NotchPosition = "top" | "bottom";
export type NotchAlign = "start" | "center" | "end";

export interface NotchProps {
  /** Group definitions. Defaults to a 3-group display/sound/network demo. */
  groups?: NotchGroup[];
  /** Controlled selection map (groupId -> optionId). Pass your own `RecordState` to read/drive it externally. */
  selected?: RecordState<Record<string, string>>;
  /** Initial per-group selection for the uncontrolled case. Falls back to each group's first option. */
  defaultSelected?: Record<string, string>;
  /** Which viewport edge the bar is pinned against — also flips which way panels open. Defaults to "top". */
  position?: NotchPosition;
  /** Horizontal alignment along the pinned edge. Defaults to "center". */
  align?: NotchAlign;
  /** Distance from the pinned edge, in `themeSpacing` units. Defaults to 4 (~16px). */
  offsetUnits?: number;
  /** Accent color for the selected-option highlight. Defaults to "primary". */
  accentColor?: ThemeColor;
  /** Toggles the dotted dividers between groups. Defaults to true. */
  showDividers?: boolean;
  /** Whether picking an option closes its panel automatically. Defaults to true. */
  closeOnSelect?: boolean;
  /** Fired on any group's selection change, after that group's own `onChange`. */
  onChange?: (groupId: string, optionId: string) => void;
  /** Plays a slide+fade mount entrance animation. Defaults to true. */
  animateOnMount?: ValueOrState<boolean>;
}

const ROW_HEIGHT_UNITS = 9;
const PANEL_GAP_UNITS = 2;

const DEFAULT_GROUPS: NotchGroup[] = [
  {
    id: "display",
    label: "Display",
    icon: "display",
    options: [
      { id: "auto", label: "Auto" },
      { id: "light", label: "Light" },
      { id: "dark", label: "Dark" },
    ],
  },
  {
    id: "sound",
    label: "Sound",
    icon: "sound",
    options: [
      { id: "on", label: "On" },
      { id: "muted", label: "Muted" },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: "wifi",
    options: [
      { id: "home", label: "Home Wi-Fi" },
      { id: "office", label: "Office Wi-Fi" },
      { id: "off", label: "Off" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric silhouettes, not sourced from or tracing any icon library or
// platform's trademarked glyphs.
// ---------------------------------------------------------------------------

const ICON_SHAPES: Record<NotchIconName, DomphyElement[]> = {
  display: [
    { rect: null, x: "3", y: "4", width: "18", height: "12", rx: "2" },
    { line: null, x1: "8", y1: "20", x2: "16", y2: "20" },
    { line: null, x1: "12", y1: "16", x2: "12", y2: "20" },
  ],
  sound: [
    { path: null, d: "M4 9v6h4l5 4V5L8 9H4z" },
    { path: null, d: "M17 8c1.5 1.5 1.5 6.5 0 8" },
  ],
  wifi: [
    { path: null, d: "M2 9c6-5 14-5 20 0" },
    { path: null, d: "M5.5 13c4-3.5 9-3.5 13 0" },
    { path: null, d: "M9 17c2-1.5 4-1.5 6 0" },
    { circle: null, cx: "12", cy: "20", r: "0.8", fill: "currentColor" },
  ],
  battery: [
    { rect: null, x: "3", y: "7", width: "16", height: "10", rx: "2" },
    { line: null, x1: "21", y1: "10", x2: "21", y2: "14" },
    { rect: null, x: "5", y: "9", width: "9", height: "6", fill: "currentColor" },
  ],
  moon: [{ path: null, d: "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" }],
  bluetooth: [{ polyline: null, points: "7,7 17,17 12,21 12,3 17,7 7,17" }],
};

function notchGlyph(name: NotchIconName): DomphyElement<"svg"> {
  return {
    svg: ICON_SHAPES[name],
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: "img",
    ariaHidden: "true",
    style: { width: "100%", height: "100%" },
  } as DomphyElement<"svg">;
}

function notchIconBox(name: NotchIconName): DomphyElement<"span"> {
  return {
    span: [notchGlyph(name)],
    style: {
      display: "inline-flex",
      flexShrink: "0",
      width: themeSpacing(4),
      height: themeSpacing(4),
    },
  };
}

/** Hairline dotted vertical divider between adjacent groups. */
function notchDivider(index: number): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors the shadcn sidebar
  // family's `verticalDivider()`). Purely decorative — no text of its own.
  const element = {
    div: null,
    ariaHidden: "true",
    _key: `divider-${index}`,
    _doctorDisable: "missing-color",
    style: {
      alignSelf: "stretch",
      borderInlineStart: (listener: Listener) => `1px dotted ${themeColor(listener, "shift-5")}`,
    },
  };
  return element as DomphyElement<"div">;
}

/** Sliding accent bar that tracks the currently selected option's row index. */
function notchHighlightBar(
  group: NotchGroup,
  selection: RecordState<Record<string, string>>,
  accentColor: ThemeColor,
): DomphyElement<"div"> {
  const element = {
    div: null,
    ariaHidden: "true",
    _key: "highlight",
    // Edge-anchor the bar's own tiny surface (dataTone-surface-contract) so
    // its background can stay "inherit" instead of a fixed shifted tone
    // (tone-background-inherit) while still reading as an accent fill.
    dataTone: "shift-3",
    style: {
      position: "absolute",
      insetInlineStart: themeSpacing(1),
      insetInlineEnd: themeSpacing(1),
      zIndex: 0,
      height: themeSpacing(ROW_HEIGHT_UNITS),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      transform: (listener: Listener) => {
        const optionIndex = group.options.findIndex(
          (option) => option.id === selection.get(group.id, listener),
        );
        return `translateY(calc(${Math.max(optionIndex, 0)} * ${themeSpacing(ROW_HEIGHT_UNITS)}))`;
      },
      transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", accentColor),
      color: (listener: Listener) => themeColor(listener, "shift-9", accentColor),
    },
  };
  return element as DomphyElement<"div">;
}

function notchOptionRow(
  group: NotchGroup,
  option: NotchOption,
  selection: RecordState<Record<string, string>>,
  openGroupId: State<string | null>,
  closeOnSelect: boolean,
  onChange?: (groupId: string, optionId: string) => void,
): DomphyElement<"li"> {
  const isSelected = (listener: Listener) => selection.get(group.id, listener) === option.id;

  const rowChildren: DomphyElement[] = [];
  if (option.icon) rowChildren.push(notchIconBox(option.icon));
  rowChildren.push({ span: option.label } as DomphyElement<"span">);

  return {
    li: [
      {
        button: rowChildren,
        role: "option",
        ariaSelected: (listener: Listener) => isSelected(listener) || undefined,
        onClick: () => {
          selection.set(group.id, option.id);
          group.onChange?.(option.id);
          onChange?.(group.id, option.id);
          if (closeOnSelect) openGroupId.set(null);
        },
        style: {
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          width: "100%",
          border: "none",
          background: "none",
          appearance: "none",
          cursor: "pointer",
          textAlign: "left",
          height: themeSpacing(ROW_HEIGHT_UNITS),
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
          paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
          borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
          fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
          color: (listener: Listener) => themeColor(listener, isSelected(listener) ? "shift-12" : "shift-9"),
          transition: "color 150ms ease",
        },
      } as DomphyElement<"button">,
    ],
    _key: option.id,
  };
}

function notchGroupTrigger(
  group: NotchGroup,
  selection: RecordState<Record<string, string>>,
  openGroupId: State<string | null>,
): DomphyElement<"button"> {
  const triggerChildren: DomphyElement[] = [];
  if (group.icon) triggerChildren.push(notchIconBox(group.icon));
  triggerChildren.push({
    span: (listener: Listener) => {
      const selectedId = selection.get(group.id, listener);
      const selectedOption = group.options.find((option) => option.id === selectedId);
      return selectedOption?.label ?? group.label;
    },
  } as DomphyElement<"span">);

  return {
    button: triggerChildren,
    ariaHaspopup: "listbox",
    ariaLabel: group.label,
    ariaExpanded: (listener: Listener) => openGroupId.get(listener) === group.id,
    onClick: () => {
      openGroupId.set(openGroupId.get() === group.id ? null : group.id);
    },
    style: {
      display: "flex",
      alignItems: "center",
      border: "none",
      background: "none",
      appearance: "none",
      cursor: "pointer",
      whiteSpace: "nowrap",
      borderRadius: themeSpacing(999),
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      transition: "background-color 150ms ease",
      "&:hover": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1") },
      "&[aria-expanded=true]": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1") },
    },
  };
}

function notchGroupPanel(
  group: NotchGroup,
  selection: RecordState<Record<string, string>>,
  openGroupId: State<string | null>,
  accentColor: ThemeColor,
  closeOnSelect: boolean,
  position: NotchPosition,
  onChange?: (groupId: string, optionId: string) => void,
): DomphyElement<"div"> {
  const isOpen = (listener: Listener) => openGroupId.get(listener) === group.id;
  const listChildren: DomphyElement[] = [notchHighlightBar(group, selection, accentColor)];
  for (const option of group.options) {
    listChildren.push(notchOptionRow(group, option, selection, openGroupId, closeOnSelect, onChange));
  }

  // Closed-state resting offset (scale-down + a small nudge back toward the
  // pinned edge it grew from), computed once since `position` is static.
  const closedTranslate =
    position === "top" ? `calc(-1 * ${themeSpacing(1)})` : themeSpacing(1);

  return {
    div: [
      {
        ul: listChildren,
        role: "listbox",
        ariaLabel: `${group.label} options`,
        style: {
          position: "relative",
          listStyle: "none",
          margin: "0",
          padding: "0",
          display: "flex",
          flexDirection: "column",
        },
      } as DomphyElement<"ul">,
    ],
    role: "presentation",
    _key: `panel-${group.id}`,
    dataTone: "shift-16",
    style: {
      position: "absolute",
      insetInlineStart: "0",
      top: position === "top" ? `calc(100% + ${themeSpacing(PANEL_GAP_UNITS)})` : undefined,
      bottom: position === "bottom" ? `calc(100% + ${themeSpacing(PANEL_GAP_UNITS)})` : undefined,
      zIndex: 30,
      minWidth: themeSpacing(44),
      overflow: "hidden",
      transformOrigin: position === "top" ? "top center" : "bottom center",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(3)} ${themeSpacing(12)} ${themeColor(listener, "shift-4")}`,
      opacity: (listener: Listener) => (isOpen(listener) ? 1 : 0),
      visibility: (listener: Listener) => (isOpen(listener) ? "visible" : "hidden"),
      pointerEvents: (listener: Listener) => (isOpen(listener) ? "auto" : "none"),
      transform: (listener: Listener) =>
        isOpen(listener) ? "scale(1) translateY(0)" : `scale(0.95) translateY(${closedTranslate})`,
      transition: "opacity 150ms ease, transform 150ms ease, visibility 150ms",
    },
  };
}

function notchGroupWrapper(
  group: NotchGroup,
  selection: RecordState<Record<string, string>>,
  openGroupId: State<string | null>,
  accentColor: ThemeColor,
  closeOnSelect: boolean,
  position: NotchPosition,
  onChange?: (groupId: string, optionId: string) => void,
): DomphyElement<"div"> {
  return {
    div: [
      notchGroupTrigger(group, selection, openGroupId),
      notchGroupPanel(group, selection, openGroupId, accentColor, closeOnSelect, position, onChange),
    ],
    _key: group.id,
    style: { position: "relative", display: "flex" },
  };
}

/**
 * A floating dock-like control pill pinned to a viewport edge, grouping
 * several dropdown selectors ("groups") behind compact icon+label triggers.
 * Only one group's panel is open at a time; picking an option slides an
 * accent highlight to the new row and (by default) closes the panel. Call
 * with no arguments for a working display/sound/network demo.
 */
function notch(props: NotchProps = {}): DomphyElement<"nav"> {
  const groups = props.groups ?? DEFAULT_GROUPS;
  const position = props.position ?? "top";
  const align = props.align ?? "center";
  const offsetUnits = props.offsetUnits ?? 4;
  const accentColor = props.accentColor ?? "primary";
  const showDividers = props.showDividers ?? true;
  const closeOnSelect = props.closeOnSelect ?? true;
  const animateOnMount = toState(props.animateOnMount ?? true);

  const initialSelection: Record<string, string> = {};
  for (const group of groups) {
    initialSelection[group.id] = props.defaultSelected?.[group.id] ?? group.options[0]?.id ?? "";
  }
  const selection = props.selected ?? new RecordState<Record<string, string>>(initialSelection);
  const openGroupId = toState<string | null>(null);

  const children: DomphyElement[] = [];
  groups.forEach((group, index) => {
    if (showDividers && index > 0) children.push(notchDivider(index));
    children.push(
      notchGroupWrapper(group, selection, openGroupId, accentColor, closeOnSelect, position, props.onChange),
    );
  });

  const alignStyle: Record<string, string> =
    align === "start"
      ? { insetInlineStart: themeSpacing(offsetUnits) }
      : align === "end"
        ? { insetInlineEnd: themeSpacing(offsetUnits) }
        : { insetInlineStart: "0", insetInlineEnd: "0", marginInline: "auto" };

  const element: DomphyElement<"nav"> = {
    nav: children,
    ariaLabel: "Quick settings",
    dataTone: "shift-14",
    $: animateOnMount.get()
      ? [
          motion({
            initial: { opacity: 0, y: position === "top" ? -16 : 16, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
          }),
        ]
      : [],
    style: {
      position: "fixed",
      [position]: themeSpacing(offsetUnits),
      ...alignStyle,
      zIndex: 40,
      width: "fit-content",
      display: "flex",
      alignItems: "center",
      borderRadius: themeSpacing(999),
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(10)} ${themeColor(listener, "shift-4")}`,
      backdropFilter: (listener: Listener) => `blur(${themeSpacing(4)})`,
    },
    _onMount: (node: ElementNode) => {
      const element_ = node.domElement as HTMLElement | null;
      if (!element_) return;

      const handleOutsideClick = (event: MouseEvent) => {
        if (!element_.contains(event.target as Node)) openGroupId.set(null);
      };
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === "Escape") openGroupId.set(null);
      };

      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("keydown", handleKeydown);
      node.addHook("Remove", () => {
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleKeydown);
      });
    },
  };

  return element;
}

export { notch };
