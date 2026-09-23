// magicui "Dock" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// macOS-style row of circular icon buttons inside a floating translucent
// rounded bar (rounded-2xl, fixed height) that magnify smoothly as the cursor
// approaches — closest icon grows largest, neighbors grow progressively less
// by distance, and everything relaxes back to rest size when the cursor
// leaves. Each icon's width/height (a layout property, in pixels) is animated,
// so the flex row reflows and neighboring icons physically spread apart as one
// icon grows; a magnified icon overflows the fixed-height bar.
//
// True mass/stiffness/damping spring physics aren't implemented (Domphy has
// no bundled spring integrator); instead each icon's width/height is driven
// directly (imperative DOM writes, not Domphy reactivity — this is a
// continuous, high-frequency effect, matching the "canvas loop / marquee"
// guidance for such effects) from live cursor position, rAF-throttled, and
// eased through a CSS `cubic-bezier` transition — a visual approximation of a
// damped spring, not a literal one. The proximity falloff is piecewise-linear,
// matching motion's `useTransform` 3-point range [-distance, 0, distance].

import type { DomphyElement, Listener } from "@domphy/core";
import { behavior, type ElementNode } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { tooltip } from "@domphy/ui";

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
  /** Which edge the dock is anchored against — flips tooltip placement and each icon's grow-from origin. Defaults to "middle". */
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
  // Decorative separator with no text of its own, drawn as a border (not a
  // backgroundColor fill).
  const element = {
    div: null,
    ariaHidden: "true",
    _key: `separator-${index}`,
    style: {
      alignSelf: "stretch",
      borderInlineStart: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-4")}`,
    },
  };
  return element as DomphyElement<"div">;
}

const DOCK_BEHAVIOR_KEY = "magicui-dock";

interface DockBehaviorProps {
  magnification: number;
  proximityMultiplier: number;
  disableMagnification: boolean;
}

function attachDock(node: ElementNode, initialProps: DockBehaviorProps) {
  let props = initialProps;
  const container = node.domElement as HTMLElement | null;
  if (!container) {
    return { update() {}, destroy() {} };
  }

  let animationFrame: number | null = null;
  let pointerX: number | null = null;
  // Natural rest width (px) per icon, captured on the first magnify frame
  // while the inline width is still empty; the base for the pixel width/height
  // interpolation. Dropped again when the cursor leaves, so the next hover
  // re-measures against whatever the current viewport/density resolves to
  // (the icons shrink under `@media (max-width: 480px)`).
  const baseSizes = new WeakMap<HTMLElement, number>();

  // Queried per frame rather than kept in a registry each icon pushes into.
  // A registry has to reach the icons through their own behavior props, and
  // `cloneDescriptor()` in @domphy/core deep-clones `_behaviors` per
  // descriptor, so every icon registered into its own private copy of the
  // array and this behavior's copy stayed empty — magnification was dead
  // (measured: all 7 icons held 40px with the cursor centred on the first).
  // A handful of direct children is nothing to re-query each frame, and the
  // selector cannot go stale the way a registry can.
  const icons = () => container.querySelectorAll<HTMLElement>(":scope > a");

  const applyMagnification = () => {
    animationFrame = null;
    for (const element of icons()) {
      if (pointerX === null || props.disableMagnification) {
        element.style.width = "";
        element.style.height = "";
        baseSizes.delete(element);
        continue;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0) continue;
      let baseSize = baseSizes.get(element);
      if (baseSize === undefined) {
        baseSize = rect.width;
        baseSizes.set(element, baseSize);
      }
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(pointerX - center);
      const threshold = baseSize * props.proximityMultiplier;
      const falloff =
        threshold > 0 ? 1 - Math.min(distance, threshold) / threshold : 0;
      const size = baseSize + baseSize * (props.magnification - 1) * falloff;
      element.style.width = `${size.toFixed(2)}px`;
      element.style.height = `${size.toFixed(2)}px`;
    }
  };

  const scheduleUpdate = () => {
    if (animationFrame === null)
      animationFrame = requestAnimationFrame(applyMagnification);
  };

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

  return {
    update(next: DockBehaviorProps) {
      props = next;
    },
    destroy() {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    },
  };
}

function dockIconButton(
  item: DockItem,
  index: number,
  iconSizeUnits: number,
  anchor: DockAnchor,
  disableMagnification: boolean,
): DomphyElement<"a"> {
  const tooltipPlacement = anchor === "top" ? "bottom" : "top";

  const anchorElement: DomphyElement<"a"> = {
    a: [dockGlyph(item.icon)],
    href: item.href ?? "#",
    ariaLabel: item.label,
    _key: `icon-${index}`,
    dataTone: "shift-0",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      width: themeSpacing(iconSizeUnits),
      height: themeSpacing(iconSizeUnits),
      // Shrink icons on phones so the default 7-icon bar fits a 375px
      // viewport instead of overflowing it. The magnification rAF measures
      // the rendered size, so it adapts automatically.
      "@media (max-width: 480px)": {
        width: themeSpacing(iconSizeUnits * 0.8),
        height: themeSpacing(iconSizeUnits * 0.8),
      },
      borderRadius: "50%",
      textDecoration: () => "none",
      willChange: "width, height",
      transition:
        "width 250ms cubic-bezier(0.34, 1.56, 0.64, 1), height 250ms cubic-bezier(0.34, 1.56, 0.64, 1), background-color 150ms ease",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(disableMagnification
        ? {
            "&:hover": {
              backgroundColor: (listener: Listener) =>
                themeColor(listener, "increase-1"),
            },
          }
        : {}),
    },
    $: [tooltip({ content: item.label, placement: tooltipPlacement })],
  };
  // Only attach the event handler prop when a click handler was actually
  // provided — Domphy's event validation rejects an explicit `onClick:
  // undefined`, unlike ordinary attribute props.
  if (item.onClick) anchorElement.onClick = item.onClick;
  return anchorElement;
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
  const anchor = props.anchor ?? "middle";
  const disableMagnification = props.disableMagnification ?? false;

  const children: DomphyElement[] = entries.map((entry, index) =>
    "separator" in entry
      ? dockSeparator(index)
      : dockIconButton(
          entry,
          index,
          iconSizeUnits,
          anchor,
          disableMagnification,
        ),
  );

  return {
    nav: children,
    ariaLabel: "Application dock",
    dataTone: "shift-0",
    style: {
      position: "relative",
      display: "flex",
      // align-items positions the taller magnified icons: top anchors them to
      // the bar's top edge (grow down), bottom to the bottom (grow up), middle
      // centres them (overflow both edges) — mirrors upstream items-start/
      // center/end. Must not be `stretch`, or icons would stretch to fill.
      alignItems:
        anchor === "top"
          ? "flex-start"
          : anchor === "bottom"
            ? "flex-end"
            : "center",
      width: "fit-content",
      marginInline: "auto",
      // Fixed height (base icon + block padding on both sides), so a magnified
      // icon overflows the bar instead of stretching it taller — upstream's
      // h-[58px]. Icons overflow visibly (default overflow: visible).
      height: (listener: Listener) =>
        `calc(${themeSpacing(iconSizeUnits)} + 2 * ${themeSpacing(themeDensity(listener) * 2)})`,
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 2),
      // Tighten the bar on phones (together with the per-icon shrink above)
      // so the default 7-icon demo fits a 375px viewport.
      "@media (max-width: 480px)": {
        gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
        paddingInline: (listener: Listener) =>
          themeSpacing(themeDensity(listener) * 1.5),
      },
      // Upstream rounded-2xl (16px rounded rectangle), not a fully-rounded pill.
      borderRadius: themeSpacing(4),
      // Translucent frosted-white bar (upstream's macOS-style glassy dock):
      // the backdrop blur below only reads if the fill itself passes light.
      backgroundColor: (listener: Listener) =>
        `color-mix(in srgb, ${themeColor(listener, "inherit")} 75%, transparent)`,
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      // Soft translucent elevation shadow (upstream's subtle drop shadow),
      // not a solid mid-gray band.
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(10)} color-mix(in srgb, ${themeColor(listener, "shift-9")} 18%, transparent)`,
      backdropFilter: (_listener: Listener) => `blur(${themeSpacing(4)})`,
    },
    ...behavior<DockBehaviorProps>(DOCK_BEHAVIOR_KEY, attachDock, {
      magnification,
      proximityMultiplier,
      disableMagnification,
    }),
  };
}

export { dock };
