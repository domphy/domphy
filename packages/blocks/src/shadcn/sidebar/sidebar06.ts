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
  ICON_BAR_CHART,
  ICON_FOLDER,
  ICON_GRID,
  ICON_INBOX,
  ICON_MARK,
  ICON_MORE,
  sidebarBackdrop,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
} from "./sidebar05-08-shared.js";

/** A plain-text child row inside a top-level item's floating dropdown. */
type Sidebar06ChildLink = { title: string; href?: string };

/** A top-level nav row whose children live in a floating dropdown, not inline. */
type Sidebar06NavItem = {
  title: string;
  icon?: string;
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
    icon: ICON_GRID,
    items: [{ title: "History" }, { title: "Starred" }, { title: "Settings" }],
  },
  {
    title: "Models",
    icon: ICON_INBOX,
    items: [{ title: "Genesis" }, { title: "Explorer" }, { title: "Quantum" }],
  },
  {
    title: "Documentation",
    icon: ICON_BAR_CHART,
    items: [
      { title: "Introduction" },
      { title: "Get Started" },
      { title: "Tutorials" },
      { title: "Changelog" },
    ],
  },
  {
    title: "Settings",
    icon: ICON_FOLDER,
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
          })),
        }),
      ],
    } as unknown as DomphyElement<"div">;

    return {
      li: [
        {
          button: [
            ...(item.icon ? [sidebarIcon(item.icon)] : []),
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
            "&[aria-expanded=true]": {
              backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
              color: (l: Listener) => themeColor(l, "shift-12", "primary"),
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
        div: [
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
        style: {
          display: "flex",
          alignItems: "center",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          flexShrink: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
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
      {
        footer: [
          { small: "© Acme Inc.", $: [small({ color: "neutral" })] } as unknown as DomphyElement,
        ],
        style: {
          flexShrink: "0",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-7", "neutral"),
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
