// shadcn/ui "sidebar-in-dialog" block — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed). A
// settings-style modal: a trigger opens a centered dialog that embeds its own
// compact two-pane layout — a narrow category list on the left (hidden on
// narrow dialog widths, revealed via a `@container` query so the breakpoint
// tracks the dialog's own rendered width, not the viewport) and a scrollable
// content pane on the right whose header/body swap instantly when a category
// is selected. This is a self-contained trigger+dialog pair, not a page shell
// like the other sidebar-0N blocks.

import type { DomphyElement, ElementNode, Listener, ValueOrState } from "@domphy/core";
import { toState } from "@domphy/core";
import { breadcrumb, button, dialog, icon, skeleton, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

/** One row in the settings category list. */
interface SettingsCategory {
  id: string;
  label: string;
  /** Raw inline SVG markup (24x24, stroke=currentColor), same convention as the rest of the family. */
  icon: string;
}

type SidebarInDialogProps = {
  categories?: SettingsCategory[];
  /** Category selected when the dialog first opens. Defaults to the researched default ("messages"). */
  defaultCategoryId?: string;
  /** Per-category body renderer. Defaults to 10 stacked skeleton placeholder rows. */
  renderContent?: (categoryId: string) => DomphyElement | DomphyElement[];
  /** Dialog open state — pass a `State<boolean>` for controlled usage. Defaults to closed. */
  open?: ValueOrState<boolean>;
  /** Accessible dialog title (also used as the breadcrumb root segment). */
  title?: string;
  /** Accessible dialog description (visually hidden, read by screen readers only). */
  description?: string;
  /** Content of the button that opens the dialog. */
  triggerLabel?: string;
};

// ---------------------------------------------------------------------------
// Hand-authored generic line icons (24x24, stroke=currentColor) — simple
// geometric shapes, not sourced from any icon library.
// ---------------------------------------------------------------------------

const ICON_BELL =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6z"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0"/></svg>';

const ICON_COMPASS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-6 2 2-6z"/></svg>';

const ICON_HOME =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h4v-6h2v6h4a1 1 0 0 0 1-1v-9"/></svg>';

const ICON_APPEARANCE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 8h.01M16 13h.01M8.5 14h.01"/></svg>';

const ICON_MESSAGE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 5h16v11H8l-4 4z"/></svg>';

const ICON_GLOBE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>';

const ICON_ACCESSIBILITY =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="8.5" r="1.4"/><path d="M8 11.5l4 1 4-1M12 12.5v3.5M9.7 19.5l2.3-3.5 2.3 3.5"/></svg>';

const ICON_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M5 12l5 5 9-10"/></svg>';

const ICON_AV =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1"/><rect x="17" y="14" width="4" height="6" rx="1"/></svg>';

const ICON_CONNECTED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M9 15l6-6"/><path d="M8 12l-2 2a3 3 0 0 0 4 4l2-2"/><path d="M16 12l2-2a3 3 0 0 0-4-4l-2 2"/></svg>';

const ICON_EYE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';

const ICON_SLIDERS =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><line x1="5" y1="4" x2="5" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="19" y1="4" x2="19" y2="20"/><circle cx="5" cy="9" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="7" r="2"/></svg>';

const ICON_CLOSE =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em"><path d="M6 6l12 12M18 6L6 18"/></svg>';

const DEFAULT_CATEGORIES: SettingsCategory[] = [
  { id: "notifications", label: "Notifications", icon: ICON_BELL },
  { id: "navigation", label: "Navigation", icon: ICON_COMPASS },
  { id: "home", label: "Home", icon: ICON_HOME },
  { id: "appearance", label: "Appearance", icon: ICON_APPEARANCE },
  { id: "messages", label: "Messages & media", icon: ICON_MESSAGE },
  { id: "language", label: "Language & region", icon: ICON_GLOBE },
  { id: "accessibility", label: "Accessibility", icon: ICON_ACCESSIBILITY },
  { id: "mark-read", label: "Mark as read", icon: ICON_CHECK },
  { id: "audio-video", label: "Audio & video", icon: ICON_AV },
  { id: "connected", label: "Connected accounts", icon: ICON_CONNECTED },
  { id: "privacy", label: "Privacy & visibility", icon: ICON_EYE },
  { id: "advanced", label: "Advanced", icon: ICON_SLIDERS },
];

const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

const DESCRIPTION_ID = "sidebar-in-dialog-description";

/** Ten stacked rounded placeholder blocks — stand-ins for real settings fields. */
function defaultCategoryContent(): DomphyElement<"div">[] {
  return Array.from({ length: 10 }, (_unused, index) => ({
    div: null,
    _key: `field-${index}`,
    $: [skeleton()],
    style: { height: themeSpacing(10), width: index % 3 === 2 ? "60%" : "100%" },
  })) as DomphyElement<"div">[];
}

/** A single category row: icon + label, soft-highlighted background while active. */
function categoryRow(
  category: SettingsCategory,
  activeCategoryId: ReturnType<typeof toState<string>>,
  onSelect: (id: string) => void,
): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          { span: category.icon, $: [icon({ color: "neutral" })] } as unknown as DomphyElement,
          { span: category.label, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        type: "button",
        ariaCurrent: (l: Listener) => (activeCategoryId.get(l) === category.id ? "true" : undefined),
        onClick: () => onSelect(category.id),
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
          textAlign: "left",
          transition: "background-color 100ms ease",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&[aria-current=true]": {
            backgroundColor: (l: Listener) => themeColor(l, "shift-3", "neutral"),
            color: (l: Listener) => themeColor(l, "shift-11", "neutral"),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: category.id,
  } as DomphyElement<"li">;
}

/**
 * shadcn/ui "sidebar-in-dialog" — a settings dialog with its own embedded
 * two-pane layout: a compact category list on the left, matching scrollable
 * content on the right. Category selection is a pure local state change (no
 * navigation, no content-swap animation). Call with no arguments for a fully
 * working demo (trigger button + dialog, 12 default categories).
 */
function sidebarInDialog(props: SidebarInDialogProps = {}): DomphyElement<"div"> {
  const {
    categories = DEFAULT_CATEGORIES,
    title = "Settings",
    description = "Manage your account settings and preferences.",
    triggerLabel = "Open settings",
  } = props;
  const defaultCategoryId =
    props.defaultCategoryId ?? categories.find((category) => category.id === "messages")?.id ?? categories[0]?.id ?? "";
  const renderContent = props.renderContent ?? (() => defaultCategoryContent());

  const open = toState(props.open ?? false);
  const activeCategoryId = toState(defaultCategoryId);

  const currentLabel = (l: Listener): string =>
    categories.find((category) => category.id === activeCategoryId.get(l))?.label ?? "";

  const navColumn: DomphyElement<"nav"> = {
    nav: [
      {
        ul: categories.map((category) => categoryRow(category, activeCategoryId, (id) => activeCategoryId.set(id))),
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
    ariaLabel: "Settings categories",
    style: {
      display: "none",
      flexShrink: "0",
      width: themeSpacing(56),
      overflowY: "auto",
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@container (min-width: 30em)": { display: "flex", flexDirection: "column" },
    },
  } as unknown as DomphyElement<"nav">;

  const headerBar: DomphyElement<"div"> = {
    div: [
      {
        nav: [
          { small: title, $: [small({ color: "neutral" })] } as unknown as DomphyElement,
          {
            strong: (l: Listener) => currentLabel(l),
            ariaCurrent: "page",
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
        ],
        $: [breadcrumb({ color: "neutral" })],
      } as unknown as DomphyElement,
      {
        button: { span: ICON_CLOSE, $: [icon({ color: "neutral" })] } as unknown as DomphyElement,
        type: "button",
        ariaLabel: "Close settings",
        onClick: () => open.set(false),
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: "0",
          border: "none",
          cursor: "pointer",
          width: themeSpacing(8),
          height: themeSpacing(8),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: "0",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: themeSpacing(12),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"div">;

  const bodyScroll: DomphyElement<"div"> = {
    div: categories.map((category) => ({
      div: renderContent(category.id),
      _key: category.id,
      style: {
        display: (l: Listener) => (activeCategoryId.get(l) === category.id ? "flex" : "none"),
        flexDirection: "column",
        gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      },
    })) as unknown as DomphyElement[],
    style: {
      flex: "1",
      minHeight: "0",
      overflowY: "auto",
      padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"div">;

  const contentColumn: DomphyElement<"div"> = {
    div: [headerBar, bodyScroll],
    style: { display: "flex", flexDirection: "column", flex: "1", minWidth: "0", overflow: "hidden" },
  } as unknown as DomphyElement<"div">;

  const paneRow: DomphyElement<"div"> = {
    div: [navColumn, contentColumn],
    style: { display: "flex", flexDirection: "row", flex: "1", minHeight: "0", overflow: "hidden" },
  } as unknown as DomphyElement<"div">;

  const dialogElement: DomphyElement<"dialog"> = {
    dialog: [
      { p: description, id: DESCRIPTION_ID, style: SR_ONLY_STYLE } as unknown as DomphyElement,
      paneRow,
    ],
    ariaLabel: title,
    ariaDescribedby: DESCRIPTION_ID,
    $: [dialog({ open, color: "neutral" })],
    // Scale entrance/exit layered on top of the base patch's opacity fade —
    // driven by the same `open` state, mirroring the patch's own rAF-deferred
    // opacity toggle so both properties animate together. This adds a purely
    // decorative style effect; the dialog patch itself owns all open/close
    // mechanics (single source of truth for focus trap/scroll lock/escape).
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLDialogElement;
      const update = (isOpen: boolean) => {
        if (isOpen) {
          requestAnimationFrame(() => {
            element.style.transform = "scale(1)";
          });
        } else {
          element.style.transform = "scale(0.95)";
        }
      };
      update(open.get());
      const release = open.addListener(update);
      node.addHook("Remove", () => release());
    },
    style: {
      display: "flex",
      // The base `dialog()` patch relies on the native
      // `dialog:not([open]) { display: none }` UA rule to hide the closed
      // dialog — but that rule loses to this author-origin class regardless
      // of specificity (author always beats user-agent), so forcing
      // `display: flex` unconditionally left a closed dialog fully laid out
      // (absolutely positioned, zero-opacity, but still `pointer-events:
      // auto`) and able to intercept clicks meant for whatever sits behind
      // it. Re-hiding on `:not([open])` — the same pattern sidebar05 already
      // uses for a closed `<details>` — restores that contract without
      // touching the flex layout while genuinely open (or mid-close, since
      // the patch keeps `[open]` set through the fade-out transition).
      "&:not([open])": { display: "none" },
      flexDirection: "column",
      padding: "0",
      width: "92vw",
      maxWidth: themeSpacing(190),
      height: themeSpacing(125),
      maxHeight: "88vh",
      overflow: "hidden",
      containerType: "inline-size",
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      transform: "scale(0.95)",
      transition: "opacity 180ms ease-out, transform 180ms ease-out",
    },
  } as unknown as DomphyElement<"dialog">;

  const triggerElement: DomphyElement<"button"> = {
    button: triggerLabel,
    type: "button",
    onClick: () => open.set(true),
    $: [button({ color: "primary" })],
  } as unknown as DomphyElement<"button">;

  return {
    div: [triggerElement, dialogElement],
  } as DomphyElement<"div">;
}

export { sidebarInDialog };
export type { SidebarInDialogProps, SettingsCategory };
