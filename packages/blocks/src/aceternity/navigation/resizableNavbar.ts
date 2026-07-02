// Aceternity "Resizable Navbar" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// sticky top navbar that continuously interpolates its own width/margin/
// border-radius against the raw scroll offset — shrinking from a full-width
// flat bar into a narrower, more rounded floating pill as the page scrolls,
// never fully hiding. A separate mobile header + collapsible link panel
// covers narrow viewports.
//
// Distinct from floatingNavbar: this reacts to a continuous scroll *offset*
// (0..1 progress), not scroll *direction* — floatingNavbar hides/reveals on
// down/up deltas, this one only ever resizes in place.

import type { DomphyElement, ElementNode, Listener, State, ValueOrState } from "@domphy/core";
import { toState } from "@domphy/core";
import { buttonGhost, linkButton, listItemButton, strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface ResizableNavItem {
  label: string;
  href?: string;
}

export type ResizableNavButtonVariant = "primary" | "secondary" | "dark" | "gradient";

export interface ResizableNavButton {
  label: string;
  href?: string;
  onClick?: (event: MouseEvent) => void;
  /** Visual treatment. Defaults to "primary" for the first button, "secondary" style choices are left to the caller. */
  variant?: ResizableNavButtonVariant;
}

export interface ResizableNavbarProps {
  /** Nav link entries, shared by the desktop bar and the mobile panel. Defaults to a 4-item marketing-site demo set. */
  items?: ResizableNavItem[];
  /** Brand/logo text. Defaults to "Acme". */
  logoLabel?: string;
  /** Trailing action buttons. Defaults to a "Login" + "Book a call" pair. */
  buttons?: ResizableNavButton[];
  /** Renders the desktop row. Defaults to true. */
  showDesktop?: boolean;
  /** Renders the mobile header + panel. Defaults to true. */
  showMobile?: boolean;
  /** Mobile menu open state — pass your own `State` to control it externally. Defaults to false. */
  mobileOpen?: ValueOrState<boolean>;
  onMobileOpenChange?: (open: boolean) => void;
  /** Scroll distance (px) over which the bar fully shrinks into its pill shape. Defaults to 240. */
  shrinkDistancePx?: number;
}

const DEFAULT_ITEMS: ResizableNavItem[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const DEFAULT_BUTTONS: ResizableNavButton[] = [
  { label: "Login", href: "#login", variant: "secondary" },
  { label: "Book a call", href: "#book", variant: "primary" },
];

const MOBILE_MEDIA_QUERY = "(max-width: 61.9375em)";

const MENU_SHAPE: DomphyElement[] = [
  { line: null, x1: "4", y1: "7", x2: "20", y2: "7" },
  { line: null, x1: "4", y1: "12", x2: "20", y2: "12" },
  { line: null, x1: "4", y1: "17", x2: "20", y2: "17" },
];

const CLOSE_SHAPE: DomphyElement[] = [
  { line: null, x1: "5", y1: "5", x2: "19", y2: "19" },
  { line: null, x1: "19", y1: "5", x2: "5", y2: "19" },
];

function rawGlyph(shape: DomphyElement[]): DomphyElement<"svg"> {
  return {
    svg: shape,
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

/** Linear interpolation, clamping `t` to [0, 1]. */
function lerp(t: number, from: number, to: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return from + (to - from) * clamped;
}

function brandLogo(label: string): DomphyElement<"strong"> {
  return { strong: label, $: [strong()], style: { flexShrink: "0" } };
}

function resizableButton(entry: ResizableNavButton): DomphyElement<"a"> {
  const variant = entry.variant ?? "primary";
  const element: DomphyElement<"a"> = { a: entry.label, href: entry.href ?? "#", _key: entry.label };
  if (entry.onClick) element.onClick = entry.onClick;

  if (variant === "gradient") {
    element.$ = [linkButton({ color: "primary" })];
    element.style = {
      backgroundImage: (listener: Listener) =>
        `linear-gradient(135deg, ${themeColor(listener, "shift-2", "primary")}, ${themeColor(listener, "shift-2", "secondary")})`,
      color: (listener: Listener) => themeColor(listener, "shift-11", "primary"),
      outline: "none",
    };
    return element;
  }

  if (variant === "dark") {
    element.$ = [linkButton({ color: "neutral" })];
    element.dataTone = "shift-16";
    element.style = {
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    };
    return element;
  }

  const colorByVariant: Record<"primary" | "secondary", ThemeColor> = {
    primary: "primary",
    secondary: "neutral",
  };
  element.$ = [linkButton({ color: colorByVariant[variant] })];
  return element;
}

function desktopBar(
  items: ResizableNavItem[],
  logoLabel: string,
  buttons: ResizableNavButton[],
  progress: State<number>,
): DomphyElement<"nav"> {
  return {
    nav: [
      brandLogo(logoLabel),
      {
        div: items.map((item) => ({
          a: item.label,
          href: item.href ?? "#",
          _key: item.label,
          $: [listItemButton({ color: "neutral" })],
          style: { width: "auto" },
        })),
        style: { display: "flex", alignItems: "center", gap: themeSpacing(1) },
      } as DomphyElement<"div">,
      {
        div: buttons.map((entry) => resizableButton(entry)),
        style: {
          display: "flex",
          alignItems: "center",
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
        },
      } as DomphyElement<"div">,
    ],
    ariaLabel: "Primary",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginInline: "auto",
      width: (listener: Listener) => `${lerp(progress.get(listener), 100, 86)}%`,
      maxWidth: themeSpacing(240),
      marginTop: (listener: Listener) => themeSpacing(lerp(progress.get(listener), 0, 3)),
      borderRadius: (listener: Listener) => themeSpacing(lerp(progress.get(listener), 0, 999)),
      paddingBlock: (listener: Listener) =>
        themeSpacing(lerp(progress.get(listener), themeDensity(listener) * 3, themeDensity(listener) * 1.5)),
      paddingInline: (listener: Listener) =>
        themeSpacing(lerp(progress.get(listener), themeDensity(listener) * 5, themeDensity(listener) * 4)),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) =>
        `1px solid ${themeColor(listener, progress.get(listener) > 0.05 ? "shift-3" : "inherit")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        progress.get(listener) > 0.05
          ? `0 ${themeSpacing(2)} ${themeSpacing(10)} ${themeColor(listener, "shift-4")}`
          : "none",
      transition:
        "width 200ms ease, margin 200ms ease, border-radius 200ms ease, padding 200ms ease, box-shadow 200ms ease",
      [`@media ${MOBILE_MEDIA_QUERY}`]: { display: "none" },
    },
  };
}

function mobilePanel(
  items: ResizableNavItem[],
  logoLabel: string,
  mobileOpenState: State<boolean>,
  onMobileOpenChange?: (open: boolean) => void,
): DomphyElement<"div"> {
  const toggle = () => {
    const next = !mobileOpenState.get();
    mobileOpenState.set(next);
    onMobileOpenChange?.(next);
  };

  return {
    div: [
      {
        div: [
          brandLogo(logoLabel),
          {
            button: [{ span: [rawGlyph(MENU_SHAPE)], style: { display: "inline-flex", width: themeSpacing(5), height: themeSpacing(5) } }],
            ariaLabel: "Toggle menu",
            ariaExpanded: (listener: Listener) => mobileOpenState.get(listener),
            onClick: toggle,
            $: [buttonGhost()],
          } as DomphyElement<"button">,
        ],
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" },
      } as DomphyElement<"div">,
      {
        ul: items.map((item) => ({
          li: [{ a: item.label, href: item.href ?? "#", $: [listItemButton({ color: "neutral" })] }],
          _key: item.label,
        })),
        role: "menu",
        style: {
          listStyle: "none",
          margin: "0",
          padding: "0",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          maxHeight: (listener: Listener) => (mobileOpenState.get(listener) ? themeSpacing(120) : "0em"),
          opacity: (listener: Listener) => (mobileOpenState.get(listener) ? 1 : 0),
          transition: "max-height 250ms ease, opacity 200ms ease",
        },
      } as DomphyElement<"ul">,
    ],
    dataTone: "shift-1",
    style: {
      display: "none",
      flexDirection: "column",
      width: "100%",
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      borderBottom: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      [`@media ${MOBILE_MEDIA_QUERY}`]: { display: "flex" },
    },
  };
}

/**
 * A sticky top navbar that continuously narrows into a rounded floating
 * pill as the page scrolls, plus a mobile header with a collapsible link
 * panel. Call with no arguments for a working 4-link demo.
 */
function resizableNavbar(props: ResizableNavbarProps = {}): DomphyElement<"header"> {
  const items = props.items ?? DEFAULT_ITEMS;
  const logoLabel = props.logoLabel ?? "Acme";
  const buttons = props.buttons ?? DEFAULT_BUTTONS;
  const showDesktop = props.showDesktop ?? true;
  const showMobile = props.showMobile ?? true;
  const shrinkDistancePx = props.shrinkDistancePx ?? 240;
  const mobileOpenState = toState(props.mobileOpen ?? false);
  const progress = toState(0);

  const sections: DomphyElement[] = [];
  if (showDesktop) sections.push(desktopBar(items, logoLabel, buttons, progress));
  if (showMobile) sections.push(mobilePanel(items, logoLabel, mobileOpenState, props.onMobileOpenChange));

  return {
    header: sections,
    style: {
      position: "sticky",
      top: "0",
      zIndex: 40,
      width: "100%",
      display: "flex",
      flexDirection: "column",
    },
    _onMount: (node: ElementNode) => {
      let scheduled = false;
      const applyScrollProgress = () => {
        scheduled = false;
        const clamped = Math.max(0, Math.min(1, window.scrollY / shrinkDistancePx));
        progress.set(clamped);
      };
      const handleScroll = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(applyScrollProgress);
      };

      applyScrollProgress();
      window.addEventListener("scroll", handleScroll, { passive: true });
      node.addHook("Remove", () => window.removeEventListener("scroll", handleScroll));
    },
  };
}

export { resizableNavbar };
