// Aceternity "Floating Navbar" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A slim,
// pill-shaped top navbar that floats above the page and slides out of view
// on downward scroll, then slides back in on the very next upward scroll —
// direction-based hide/reveal, not a one-way dismissal (that's stickyBanner).

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { linkButton, listItemButton } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type FloatingNavbarIconName = "home" | "info" | "grid" | "mail";

export interface FloatingNavbarItem {
  label: string;
  href?: string;
  icon?: FloatingNavbarIconName;
  onClick?: (event: MouseEvent) => void;
}

export interface FloatingNavbarProps {
  /** Nav link entries. Defaults to a 4-item marketing-site demo set. */
  items?: FloatingNavbarItem[];
  /** Trailing call-to-action button label. Defaults to "Login". */
  ctaLabel?: string;
  /** Call-to-action button href. Defaults to "#". */
  ctaHref?: string;
  onCtaClick?: (event: MouseEvent) => void;
  /**
   * Minimum absolute scroll delta (px) between two frames before a
   * direction change is honored — filters out sub-pixel scroll jitter.
   * Defaults to 4.
   */
  scrollSensitivityPx?: number;
}

const DEFAULT_ITEMS: FloatingNavbarItem[] = [
  { label: "Home", href: "#", icon: "home" },
  { label: "About", href: "#about", icon: "info" },
  { label: "Products", href: "#products", icon: "grid" },
  { label: "Contact", href: "#contact", icon: "mail" },
];

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric silhouettes, not sourced from or tracing any icon library.
// ---------------------------------------------------------------------------

const ICON_SHAPES: Record<FloatingNavbarIconName, DomphyElement[]> = {
  home: [
    { polyline: null, points: "4,12 12,5 20,12" },
    { rect: null, x: "6", y: "12", width: "12", height: "8" },
  ],
  info: [
    { circle: null, cx: "12", cy: "12", r: "9" },
    { line: null, x1: "12", y1: "11", x2: "12", y2: "16" },
    { circle: null, cx: "12", cy: "8", r: "0.8", fill: "currentColor" },
  ],
  grid: [
    { rect: null, x: "3", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "3", width: "8", height: "8", rx: "1" },
    { rect: null, x: "3", y: "13", width: "8", height: "8", rx: "1" },
    { rect: null, x: "13", y: "13", width: "8", height: "8", rx: "1" },
  ],
  mail: [
    { rect: null, x: "3", y: "5", width: "18", height: "14", rx: "2" },
    { polyline: null, points: "3,7 12,13 21,7" },
  ],
};

function navGlyph(name: FloatingNavbarIconName): DomphyElement<"svg"> {
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

function navLinkItem(item: FloatingNavbarItem): DomphyElement<"a"> {
  const children: DomphyElement[] = [];
  if (item.icon) {
    children.push({
      span: [navGlyph(item.icon)],
      style: { display: "inline-flex", width: themeSpacing(3.5), height: themeSpacing(3.5) },
    } as DomphyElement<"span">);
  }
  children.push({ span: item.label } as DomphyElement<"span">);

  const anchor: DomphyElement<"a"> = {
    a: children,
    href: item.href ?? "#",
    _key: item.label,
    $: [listItemButton({ color: "neutral" })],
    style: {
      width: "auto",
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      // `listItemButton()` already supplies `color`, but doctor's
      // `missing-color` check only inspects THIS element's own authored
      // `style` (it doesn't resolve `$` patches first) — restate it so a
      // native-style-only reader can still confirm the surface contract.
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
  if (item.onClick) anchor.onClick = item.onClick;
  return anchor;
}

/**
 * A slim floating top navbar that hides on downward scroll and reveals on
 * the very next upward scroll (direction-based, not a one-way dismissal).
 * Call with no arguments for a working 4-link demo with a "Login" CTA.
 */
function floatingNavbar(props: FloatingNavbarProps = {}): DomphyElement<"header"> {
  const items = props.items ?? DEFAULT_ITEMS;
  const ctaLabel = props.ctaLabel ?? "Login";
  const ctaHref = props.ctaHref ?? "#";
  const sensitivity = props.scrollSensitivityPx ?? 4;

  const hidden = toState(false);

  const ctaButton: DomphyElement<"a"> = {
    a: ctaLabel,
    href: ctaHref,
    $: [linkButton({ color: "primary" })],
  };
  if (props.onCtaClick) ctaButton.onClick = props.onCtaClick;

  const element: DomphyElement<"header"> = {
    header: [
      {
        nav: items.map((item) => navLinkItem(item)),
        style: {
          display: "flex",
          alignItems: "center",
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
        },
      } as DomphyElement<"nav">,
      ctaButton,
    ],
    ariaLabel: "Primary",
    dataTone: "shift-14",
    style: {
      position: "fixed",
      top: themeSpacing(4),
      insetInlineStart: "0",
      insetInlineEnd: "0",
      marginInline: "auto",
      width: "fit-content",
      zIndex: 40,
      display: "flex",
      alignItems: "center",
      borderRadius: themeSpacing(999),
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1.5),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(10)} ${themeColor(listener, "shift-4")}`,
      transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease",
      transform: (listener: Listener) =>
        hidden.get(listener) ? `translateY(calc(-100% - ${themeSpacing(8)}))` : "translateY(0)",
      opacity: (listener: Listener) => (hidden.get(listener) ? 0 : 1),
      pointerEvents: (listener: Listener) => (hidden.get(listener) ? "none" : "auto"),
    },
    _onMount: (node: ElementNode) => {
      let lastScrollY = window.scrollY;
      let scheduled = false;

      const applyScrollDirection = () => {
        scheduled = false;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY;
        if (Math.abs(delta) < sensitivity) return;
        if (delta > 0 && currentScrollY > 80) hidden.set(true);
        else if (delta < 0) hidden.set(false);
        lastScrollY = currentScrollY;
      };
      const handleScroll = () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(applyScrollDirection);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      node.addHook("Remove", () => window.removeEventListener("scroll", handleScroll));
    },
  };

  return element;
}

export { floatingNavbar };
