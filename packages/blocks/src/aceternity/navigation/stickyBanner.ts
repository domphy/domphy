// Aceternity "Sticky Banner" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A slim,
// accent-colored announcement strip pinned to the very top of the page. With
// `hideOnScroll` on, it slides away for good once the scroll offset passes a
// small threshold (~40px) — a one-way, scroll-triggered dismissal, not a
// direction-based toggle (that's floatingNavbar).

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { link, paragraph, strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface StickyBannerProps {
  /** Announcement message text. Defaults to a generic release-note demo string. */
  message?: string;
  /** Inline call-to-action link label. Defaults to "Read announcement". */
  ctaLabel?: string;
  ctaHref?: string;
  onCtaClick?: (event: MouseEvent) => void;
  /**
   * Enables the auto-hide-on-scroll behavior: once scrolled past ~40px, the
   * banner slides up and stays hidden (it does not reappear on scrolling
   * back up). Defaults to false — the banner stays put like an ordinary
   * sticky header unless a caller opts in.
   */
  hideOnScroll?: boolean;
  /**
   * Background/accent color family. The saturated purple seen in Aceternity's
   * own demo is just example styling, not a documented default — this block
   * defaults to the theme's own "primary" family instead of a hardcoded hue.
   */
  accentColor?: ThemeColor;
}

const SCROLL_HIDE_THRESHOLD_PX = 40;

/**
 * A slim, accent-colored announcement banner pinned to the top of the page.
 * Call with no arguments for a working demo message + CTA link.
 */
function stickyBanner(props: StickyBannerProps = {}): DomphyElement<"div"> {
  const message =
    props.message ?? "New: real-time collaboration is now available on every plan.";
  const ctaLabel = props.ctaLabel ?? "Read announcement";
  const ctaHref = props.ctaHref ?? "#";
  const hideOnScroll = props.hideOnScroll ?? false;
  const accentColor = props.accentColor ?? "primary";

  const hidden = toState(false);

  const ctaLink: DomphyElement<"a"> = {
    a: [{ strong: ctaLabel, $: [strong({ color: accentColor })] } as DomphyElement<"strong">],
    href: ctaHref,
    $: [link({ color: accentColor, accentColor })],
  };
  if (props.onCtaClick) ctaLink.onClick = props.onCtaClick;

  const element: DomphyElement<"div"> = {
    div: [{ p: message, $: [paragraph({ color: accentColor })], style: { margin: "0" } }, ctaLink],
    role: "note",
    dataTone: "shift-15",
    style: {
      position: "sticky",
      top: "0",
      zIndex: 50,
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
      textAlign: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", accentColor),
      color: (listener: Listener) => themeColor(listener, "shift-9", accentColor),
      transition: "transform 200ms ease, opacity 200ms ease",
      transform: (listener: Listener) =>
        hideOnScroll && hidden.get(listener)
          ? `translateY(calc(-100% - ${themeSpacing(4)}))`
          : "translateY(0)",
      opacity: (listener: Listener) => (hideOnScroll && hidden.get(listener) ? 0 : 1),
      pointerEvents: (listener: Listener) => (hideOnScroll && hidden.get(listener) ? "none" : "auto"),
    },
    _onMount: (node: ElementNode) => {
      if (!hideOnScroll) return;

      let lastScrollY = window.scrollY;
      let scheduled = false;
      const checkScrollThreshold = () => {
        scheduled = false;
        const currentScrollY = window.scrollY;
        const delta = Math.abs(currentScrollY - lastScrollY);
        lastScrollY = currentScrollY;
        // A delta this large in a single frame can only come from a
        // *programmatic* jump (an anchor-link/`scrollIntoView` navigation,
        // the browser restoring scroll position, …) — never an actual
        // scroll-wheel/trackpad/touch gesture. Resync silently instead of
        // latching hidden: a user who just landed somewhere new hasn't
        // expressed any scroll intent, so hiding the banner out from under a
        // jump they didn't initiate is wrong (mirrors floatingNavbar's
        // identical guard in `applyScrollDirection`).
        if (delta > window.innerHeight) return;
        // One-way: once past the threshold it latches hidden and never
        // re-checks (matches the documented behavior — no reappear on
        // scrolling back up).
        if (currentScrollY > SCROLL_HIDE_THRESHOLD_PX) hidden.set(true);
      };
      const handleScroll = () => {
        if (scheduled || hidden.get()) return;
        scheduled = true;
        requestAnimationFrame(checkScrollThreshold);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      node.addHook("Remove", () => window.removeEventListener("scroll", handleScroll));
    },
  };

  return element;
}

export { stickyBanner };
