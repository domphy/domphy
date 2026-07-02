// magicui "Dock" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// macOS-style row of circular icon buttons inside a floating translucent
// pill that magnify smoothly as the cursor approaches — closest icon grows
// largest, neighbors grow progressively less by distance, and everything
// relaxes back to rest size when the cursor leaves.
//
// True mass/stiffness/damping spring physics aren't implemented (Domphy has
// no bundled spring integrator); instead each icon's `transform` is driven
// directly (imperative DOM writes, not Domphy reactivity — this is a
// continuous, high-frequency effect, matching the "canvas loop / marquee"
// guidance for such effects) from live cursor position, rAF-throttled, and
// eased through a bouncy CSS `cubic-bezier` transition so the icon overshoots
// slightly before settling — a visual approximation of a damped spring, not
// a literal one.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { tooltip } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export type DockIconName =
  | "home"
  | "search"
  | "chat"
  | "gallery"
  | "settings"
  | "globe"
  | "mail";

export interface DockItem {
  icon: DockIconName;
  label: string;
  href?: string;
  onClick?: (event: MouseEvent) => void;
}

export type DockEntry = DockItem | { separator: true };

export type DockAnchor = "top" | "middle" | "bottom";

export interface DockProps {
  /** Icon buttons (and optional `{ separator: true }` group dividers). Defaults to a 7-icon demo dock. */
  items?: DockEntry[];
  /** Icon diameter, in `themeSpacing` units. Defaults to 10 (~40px at the base font size). */
  iconSizeUnits?: number;
  /** Max scale multiplier reached at closest cursor proximity. Defaults to 1.5. */
  magnification?: number;
  /** Proximity falloff width, as a multiple of the icon's own rendered size. Defaults to 3.5 (~140px at 40px icons). */
  proximityMultiplier?: number;
  /** Which edge the dock is anchored against — flips tooltip placement and each icon's grow-from origin. Defaults to "bottom". */
  anchor?: DockAnchor;
  /** Disables the magnification effect entirely, falling back to static icons. Defaults to false. */
  disableMagnification?: boolean;
}

const DEFAULT_ITEMS: DockEntry[] = [
  { icon: "home", label: "Home", href: "#" },
  { icon: "search", label: "Search", href: "#" },
  { icon: "chat", label: "Messages", href: "#" },
  { icon: "gallery", label: "Gallery", href: "#" },
  { icon: "settings", label: "Settings", href: "#" },
  { separator: true },
  { icon: "globe", label: "Website", href: "#" },
  { icon: "mail", label: "Mail", href: "#" },
];

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric silhouettes, not sourced from or tracing any icon library or
// platform's trademarked logo.
// ---------------------------------------------------------------------------

const ICON_SHAPES: Record<DockIconName, DomphyElement[]> = {
  home: [
    { polyline: null, points: "4,12 12,5 20,12" },
    { rect: null, x: "6", y: "12", width: "12", height: "8" },
  ],
  search: [
    { circle: null, cx: "10", cy: "10", r: "6" },
    { line: null, x1: "15", y1: "15", x2: "20", y2: "20" },
  ],
  chat: [
    {
      path: null,
      d: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
    },
  ],
  gallery: [
    { rect: null, x: "3", y: "4", width: "18", height: "14", rx: "2" },
    { circle: null, cx: "8", cy: "10", r: "1.5" },
    { polyline: null, points: "3,17 9,12 14,16 21,10" },
  ],
  settings: [
    { circle: null, cx: "12", cy: "12", r: "3" },
    { circle: null, cx: "12", cy: "12", r: "8" },
  ],
  globe: [
    { circle: null, cx: "12", cy: "12", r: "9" },
    { line: null, x1: "3", y1: "12", x2: "21", y2: "12" },
    { path: null, d: "M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" },
  ],
  mail: [
    { rect: null, x: "3", y: "5", width: "18", height: "14", rx: "2" },
    { polyline: null, points: "3,7 12,13 21,7" },
  ],
};

function dockGlyph(name: DockIconName): DomphyElement<"svg"> {
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
    style: { width: "55%", height: "55%" },
  } as DomphyElement<"svg">;
}

/** Hairline vertical divider between logical icon groups. */
function dockSeparator(index: number): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors the shadcn sidebar
  // family's `verticalDivider()`). Decorative separator with no text of its
  // own, drawn as a border (not a backgroundColor fill).
  const element = {
    div: null,
    ariaHidden: "true",
    _key: `separator-${index}`,
    _doctorDisable: "missing-color",
    style: {
      alignSelf: "stretch",
      borderInlineStart: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4")}`,
    },
  };
  return element as DomphyElement<"div">;
}

interface DockIconRef {
  element: HTMLElement;
}

function dockIconButton(
  item: DockItem,
  index: number,
  iconSizeUnits: number,
  anchor: DockAnchor,
  iconRefs: DockIconRef[],
): DomphyElement<"a"> {
  const tooltipPlacement = anchor === "top" ? "bottom" : "top";
  const transformOrigin =
    anchor === "top" ? "center top" : anchor === "bottom" ? "center bottom" : "center center";

  const anchorElement: DomphyElement<"a"> = {
    a: [dockGlyph(item.icon)],
    href: item.href ?? "#",
    ariaLabel: item.label,
    _key: `icon-${index}`,
    dataTone: "shift-16",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      width: themeSpacing(iconSizeUnits),
      height: themeSpacing(iconSizeUnits),
      borderRadius: "50%",
      textDecoration: () => "none",
      transformOrigin,
      willChange: "transform",
      transition: "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      "&:hover": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1") },
    },
    $: [tooltip({ content: item.label, placement: tooltipPlacement })],
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement | null;
      if (element) iconRefs.push({ element });
    },
    _onRemove: (node: ElementNode) => {
      const element = node.domElement as HTMLElement | null;
      const index_ = iconRefs.findIndex((ref) => ref.element === element);
      if (index_ >= 0) iconRefs.splice(index_, 1);
    },
  };
  // Only attach the event handler prop when a click handler was actually
  // provided — Domphy's event validation rejects an explicit `onClick:
  // undefined`, unlike ordinary attribute props.
  if (item.onClick) anchorElement.onClick = item.onClick;
  return anchorElement;
}

/** Smoothstep falloff — smoother than linear, cheap to compute per frame. */
function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * A floating macOS-style dock: a row of circular icon buttons that magnify
 * as the cursor approaches them, with optional group separators and
 * hover tooltips. Call with no arguments for a working 7-icon demo.
 */
function dock(props: DockProps = {}): DomphyElement<"nav"> {
  const entries = props.items ?? DEFAULT_ITEMS;
  const iconSizeUnits = props.iconSizeUnits ?? 10;
  const magnification = props.magnification ?? 1.5;
  const proximityMultiplier = props.proximityMultiplier ?? 3.5;
  const anchor = props.anchor ?? "bottom";
  const disableMagnification = props.disableMagnification ?? false;

  const iconRefs: DockIconRef[] = [];
  let animationFrame: number | null = null;
  let pointerX: number | null = null;

  const applyMagnification = () => {
    animationFrame = null;
    for (const ref of iconRefs) {
      if (pointerX === null || disableMagnification) {
        ref.element.style.transform = "";
        continue;
      }
      const rect = ref.element.getBoundingClientRect();
      if (rect.width === 0) continue;
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(pointerX - center);
      const threshold = rect.width * proximityMultiplier;
      const falloff = smoothstep(1 - distance / threshold);
      const scale = 1 + (magnification - 1) * falloff;
      ref.element.style.transform = scale > 1.001 ? `scale(${scale.toFixed(3)})` : "";
    }
  };

  const scheduleUpdate = () => {
    if (animationFrame === null) animationFrame = requestAnimationFrame(applyMagnification);
  };

  const children: DomphyElement[] = entries.map((entry, index) =>
    "separator" in entry
      ? dockSeparator(index)
      : dockIconButton(entry, index, iconSizeUnits, anchor, iconRefs),
  );

  return {
    nav: children,
    ariaLabel: "Application dock",
    dataTone: "shift-14",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "fit-content",
      marginInline: "auto",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      borderRadius: themeSpacing(999),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(10)} ${themeColor(listener, "shift-4")}`,
      backdropFilter: (listener: Listener) => `blur(${themeSpacing(4)})`,
    },
    _onMount: (node: ElementNode) => {
      const container = node.domElement as HTMLElement | null;
      if (!container) return;

      const handlePointerMove = (event: PointerEvent) => {
        pointerX = event.clientX;
        scheduleUpdate();
      };
      const handlePointerLeave = () => {
        pointerX = null;
        scheduleUpdate();
      };

      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      });
    },
  };
}

export { dock };
