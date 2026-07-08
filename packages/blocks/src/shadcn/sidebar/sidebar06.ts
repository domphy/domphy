// shadcn/ui "sidebar-06" — clean-room reimplementation from the public behavior
// description only (no upstream source viewed). Nav rows never expand inline;
// clicking a top-level row opens a floating dropdown of its children instead,
// keeping the sidebar's vertical rhythm constant. Only one dropdown is open
// at a time, and its placement flips between "below" (mobile) and "beside"
// (desktop) so it never collides with the sidebar's own edge.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { button, inputText, menu, popover, small, strong } from "@domphy/ui";

/** The two placements this sidebar's dropdowns flip between (subset of
 * @domphy/floating's full `Placement` union — narrowed locally so this
 * package doesn't need a direct dependency on @domphy/floating). */
type DropdownPlacement = "right-start" | "bottom-end";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_MARK,
  ICON_MORE,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
} from "./sidebar05-08-shared.js";

/** A child row inside a top-level item's floating dropdown; navigates to
 * `href` on click (matching upstream's `<a href={item.url}>` child rows). */
type Sidebar06ChildLink = { title: string; href?: string };

/** A top-level nav row whose children live in a floating dropdown, not inline. */
type Sidebar06NavItem = {
  title: string;
  items: Sidebar06ChildLink[];
};

/** Small bordered opt-in card shown near the bottom of the sidebar content. */
type Sidebar06OptInCard = {
  title: string;
  description: string;
  buttonLabel: string;
  onSubmit?: () => void;
};

type Sidebar06Props = {
  header?: { icon?: string; title?: string; subtitle?: string };
  navItems?: Sidebar06NavItem[];
  optInCard?: Sidebar06OptInCard | null;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_NAV_ITEMS: Sidebar06NavItem[] = [
  {
    title: "Playground",
    items: [{ title: "History" }, { title: "Starred" }, { title: "Settings" }],
  },
  {
    title: "Models",
    items: [{ title: "Genesis" }, { title: "Explorer" }, { title: "Quantum" }],
  },
  {
    title: "Documentation",
    items: [
      { title: "Introduction" },
      { title: "Get Started" },
      { title: "Tutorials" },
      { title: "Changelog" },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "General" },
      { title: "Team" },
      { title: "Billing" },
      { title: "Limits" },
    ],
  },
];

const DEFAULT_OPT_IN_CARD: Sidebar06OptInCard = {
  title: "Subscribe",
  description: "Get the latest updates delivered to your inbox.",
  buttonLabel: "Subscribe",
};

/**
 * shadcn/ui "sidebar-06" — a nav where each top-level item opens a floating
 * dropdown of its children (instead of an inline accordion). Call with no
 * arguments for a fully working demo.
 */
function sidebar06(props: Sidebar06Props = {}): DomphyElement<"div"> {
  const {
    header = { icon: ICON_MARK, title: "Acme Inc", subtitle: "v1.0.0" },
    navItems = DEFAULT_NAV_ITEMS,
    optInCard = DEFAULT_OPT_IN_CARD,
    breadcrumbItems = [{ label: "Models" }, { label: "Genesis" }],
    children,
  } = props;

  const sidebarOpen = toState(true);

  // Responsive dropdown placement: below-and-trailing on mobile, beside-and-
  // leading on desktop, so the floating panel never collides with the
  // sidebar's own edge. Shared by every row's popover.
  const placement = toState<DropdownPlacement>("right-start");

  // Only one dropdown open at a time: opening any row's popover closes all
  // the others (each row owns its own `open` State, cross-wired below).
  const openStates = navItems.map(() => toState(false));
  openStates.forEach((state, index) => {
    state.addListener((value) => {
      if (!value) return;
      openStates.forEach((other, otherIndex) => {
        if (otherIndex !== index && other.get()) other.set(false);
      });
    });
  });

  const navRows: DomphyElement<"li">[] = navItems.map((item, index) => {
    const dropdownContent: DomphyElement<"div"> = {
      div: null,
      style: { minWidth: themeSpacing(40) },
      $: [
        menu({
          items: item.items.map((child, childIndex) => ({
            label: child.title,
            key: `${item.title}-${childIndex}`,
            onClick: () => {
              if (child.href) window.location.href = child.href;
            },
          })),
        }),
      ],
    } as unknown as DomphyElement<"div">;

    return {
      li: [
        {
          button: [
            { span: item.title, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
            sidebarIcon(ICON_MORE),
          ],
          type: "button",
          ariaLabel: `${item.title} menu`,
          style: {
            display: "flex",
            alignItems: "center",
            width: "100%",
            gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
            paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
            paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
            borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
            border: "none",
            cursor: "pointer",
            color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
            backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
            "&:hover": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
            },
            // Upstream: data-[state=open]:bg-sidebar-accent /
            // text-sidebar-accent-foreground — the neutral gray accent, not a
            // brand-tinted highlight.
            "&[aria-expanded=true]": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral"),
              color: (l: Listener) => themeColor(l, "shift-12", "neutral"),
            },
          },
          $: [
            popover({
              open: openStates[index],
              placement,
              content: dropdownContent,
            }),
          ],
        } as unknown as DomphyElement,
      ],
      _key: item.title ?? index,
    } as DomphyElement<"li">;
  });

  const optInCardElement: DomphyElement<"div"> | null = optInCard
    ? ({
        div: [
          { strong: optInCard.title, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
          { small: optInCard.description, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
          {
            form: [
              {
                input: null,
                type: "email",
                ariaLabel: "Email",
                placeholder: "Email",
                style: { width: "100%" },
                // inputText() hardcodes type="text" (incl. an _onSchedule that
                // re-asserts it); compose a later _onSchedule to restore the
                // email type so upstream's `type="email"` validation is kept.
                $: [
                  inputText({ color: "neutral", accentColor: "primary" }),
                  {
                    _onSchedule: (_node: ElementNode, element: HTMLInputElement) => {
                      element.type = "email";
                    },
                  },
                ],
              } as unknown as DomphyElement,
              {
                button: optInCard.buttonLabel,
                type: "submit",
                style: { width: "100%" },
                $: [button({ color: "primary" })],
              } as unknown as DomphyElement,
            ],
            // Handle submit on the form (covers both button click and
            // Enter-in-field) so the demo never triggers a real navigation.
            onSubmit: (e: Event) => {
              e.preventDefault();
              optInCard.onSubmit?.();
            },
            style: { display: "grid", gap: themeSpacing(2.5) },
          } as unknown as DomphyElement,
        ],
        dataTone: "shift-2",
        // Upstream's <SidebarFooter> wraps this card and renders as a plain
        // `<div data-slot="sidebar-footer">` (not a semantic <footer>).
        dataSlot: "sidebar-footer",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(2),
          margin: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          outline: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          outlineOffset: "-1px",
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
        },
      } as unknown as DomphyElement<"div">)
    : null;

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      {
        // Upstream wraps the brand mark + label in a clickable <a href="#">
        // inside a SidebarMenuButton size="lg" (hover accent). Mirror the
        // team-switcher helper's SidebarHeader(p-2) + menu-button(p-2, rounded)
        // structure so the hover surface is the compact rounded button, not the
        // full-width header.
        div: [
          {
            a: [
              {
                span: header.icon ?? ICON_MARK,
                dataTone: "shift-0",
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: themeSpacing(8),
                  height: themeSpacing(8),
                  flexShrink: "0",
                  borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
                  backgroundColor: (l: Listener) => themeColor(l, "inherit", "primary"),
                  color: (l: Listener) => themeColor(l, "shift-10", "primary"),
                },
              } as unknown as DomphyElement,
              {
                div: [
                  { strong: header.title ?? "Acme Inc", $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
                  { small: header.subtitle ?? "v1.0.0", $: [small({ color: "neutral" })] } as unknown as DomphyElement,
                ],
                style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: "0" },
              } as unknown as DomphyElement,
            ],
            href: "#",
            style: {
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              textDecoration: () => "none",
              overflow: "hidden",
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              "&:hover": {
                backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral"),
              },
            },
          } as unknown as DomphyElement,
        ],
        style: {
          flexShrink: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
        },
      } as unknown as DomphyElement,
      {
        nav: [{ ul: navRows, style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) } } as unknown as DomphyElement],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
      ...(optInCardElement ? [optInCardElement] : []),
      // Upstream <SidebarRail /> — thin invisible edge strip that toggles the
      // sidebar on click. Sits at the trailing edge inside the relatively-
      // positioned aside (same pattern as sidebar07).
      {
        div: null,
        ariaHidden: "true",
        onClick: () => sidebarOpen.set(!sidebarOpen.get()),
        style: {
          position: "absolute",
          insetBlock: "0",
          insetInlineEnd: "0",
          width: themeSpacing(1),
          cursor: "col-resize",
        },
      } as unknown as DomphyElement,
    ],
    dataTone: "shift-2",
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      const media = window.matchMedia("(max-width: 768px)");
      const apply = () => placement.set(media.matches ? "bottom-end" : "right-start");
      apply();
      const listener = () => apply();
      media.addEventListener("change", listener);
      node.addHook("Remove", () => media.removeEventListener("change", listener));
    },
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (sidebarOpen.get(l) ? themeSpacing(64) : "0px"),
      overflow: "hidden",
      transition: "width 0.2s linear",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      "@media (max-width: 768px)": {
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: "0",
        zIndex: "15",
        width: themeSpacing(72),
        transform: (l: Listener) => (sidebarOpen.get(l) ? "translateX(0)" : "translateX(-100%)"),
        transition: "transform 0.2s ease",
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-3", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      sidebarStickyHeader({
        onToggle: () => sidebarOpen.set(!sidebarOpen.get()),
        breadcrumbItems,
      }),
      sidebarMainContent(children),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "auto",
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement, sidebarBackdrop(sidebarOpen, () => sidebarOpen.set(false))],
    style: {
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebar06 };
export type { Sidebar06ChildLink, Sidebar06NavItem, Sidebar06OptInCard, Sidebar06Props };
