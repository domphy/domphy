import {
  type DomphyElement,
  type Listener,
  merge,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import type { Placement } from "@domphy/floating";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { elevation } from "../utils/elevation.js";
import { createFloating, floatingPanelId } from "../utils/floating.js";

// `aria-haspopup` must name the role the popup ACTUALLY has — a trigger that
// says "dialog" while it opens a `role=menu` panel is an ARIA contract break
// (axe `aria-allowed-attr` passes it, but a screen reader announces the wrong
// kind of popup and readers that pre-announce "menu" say "dialog"). The
// popover's own panel chrome is `role=dialog`, but content that already owns a
// surface keeps its own role: `menu()` is `role=menu`, `selectList()` is
// `role=listbox`. Only these five values are legal for aria-haspopup.
const HASPOPUP_ROLES = new Set(["dialog", "grid", "listbox", "menu", "tree"]);
type HaspopupRole = "dialog" | "grid" | "listbox" | "menu" | "tree";

// Mirrors core's own precedence: patches merge in `$` order (later wins) and
// the element's own keys win over all of them.
function panelHaspopup(content: DomphyElement): HaspopupRole {
  let role: unknown;
  for (const patch of content.$ ?? []) {
    const declared = (patch as { role?: unknown } | null)?.role;
    if (typeof declared === "string") role = declared;
  }
  const own = (content as { role?: unknown }).role;
  if (typeof own === "string") role = own;
  if (typeof role !== "string") return "dialog";
  // Aliases with no aria-haspopup value of their own.
  if (role === "alertdialog" || role === "menubar") {
    return role === "menubar" ? "menu" : "dialog";
  }
  if (role === "treegrid") return "grid";
  // Anything else (a bare card, `command()`'s role=group) has no matching
  // value; "dialog" is what the popover's own chrome would have given it.
  return HASPOPUP_ROLES.has(role) ? (role as HaspopupRole) : "dialog";
}

function contentOwnsSurface(content: DomphyElement): boolean {
  const record = content as DomphyElement & { dataTone?: string };
  if (typeof record.dataTone === "string") return true;
  const patches = content.$;
  if (!patches) return false;
  return patches.some(
    (patch) =>
      patch != null &&
      typeof (patch as { dataTone?: unknown }).dataTone === "string",
  );
}

/**
 * Floating popover primitive. Attaches to its host as the anchor/trigger and
 * shows a floating `content` element (with `role="dialog"`) on click or hover,
 * positioned via `@domphy/floating`. Returns the anchor partial, which merges
 * trigger wiring (haspopup/expanded, focus/blur dismissal). Apply to the
 * trigger element you want the popover anchored to.
 *
 * @param props - Configuration.
 * @param props.openOn - Interaction that opens the popover: `"click"` or `"hover"`. Defaults to `"click"`.
 * @param props.open - Open state (`ValueOrState<boolean>`), including `Computed`/`ReadableState`. When the source is read-only, pass `onDismiss` so Escape/outside click can close. Defaults to `false`.
 * @param props.onDismiss - Called when the panel requests close. Optional. Required to close when `open` is a read-only `Computed`/`ReadableState`.
 * @param props.placement - Floating placement (e.g. `"bottom"`, `"top-start"`), value or `State`. Defaults to `"bottom"`.
 * @param props.content - The floating content element to display.
 * @example { button: "Open", $: [popover({ openOn: "click", content: { div: "Hi" } })] }
 */
function popover(props: {
  openOn?: "click" | "hover";
  open?: ValueOrState<boolean>;
  onDismiss?: () => void;
  placement?: ValueOrState<Placement>;
  content: DomphyElement;
}): PartialElement {
  const { open = false, placement = "bottom", openOn = "click" } = props;

  const openState = toState(open);
  const placeState = toState(placement);

  const { show, hide, anchorPartial } = createFloating({
    kind: "popover",
    open: openState,
    onDismiss: props.onDismiss,
    placement: placeState,
    content: props.content,
    // Hovering the panel itself (not just the trigger) must keep it open —
    // handled generically inside floating.ts's behavior instance.
    keepOpenOnContentHover: openOn === "hover",
  });

  // Page-matching card (shift-0), same as menu/selectList/dialog — not the
  // inverted tooltip/toast surface (shift-17). A dark shift-14 panel wrapping
  // a light menu is the menubar recipe (`popover` + `menu`) rendered as two
  // stacked cards.
  const popoverPartial: PartialElement = {
    role: "dialog",
    dataTone: "shift-0",
    style: {
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      color: (l: Listener) => themeColor(l, "text"),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      outline: (l: Listener) => `1px solid ${themeColor(l, "border-strong")}`,
      outlineOffset: "-1px",
      boxShadow: elevation("medium"),
    },
  };

  // Content that already owns a surface (`menu()`, `card()`, an authored
  // dataTone) must keep it: stamping this partial on top overwrites
  // `role=menu` with `role=dialog` and comma-joins a second box-shadow
  // (merge concatenates boxShadow).
  if (!contentOwnsSurface(props.content)) {
    props.content.$ ||= [];
    props.content.$.push(popoverPartial);
  }

  const triggerPartial: PartialElement = {
    // Read AFTER the popoverPartial push above, so unstyled content that got
    // the popover's own `role=dialog` chrome resolves to "dialog" too.
    ariaHaspopup: panelHaspopup(props.content),
    ariaExpanded: (listener) => openState.get(listener),
    // Declared as a reactive attribute (listener.elementNode is the anchor) so
    // it is present from first render — before the panel's first show() — and
    // is re-declared on every patch: attributes set imperatively (the old
    // _onMount attributes.set) are stripped by patch() on ancestor re-render.
    ariaControls: (listener) =>
      listener?.elementNode
        ? floatingPanelId("popover", listener.elementNode)
        : undefined,
    onMouseEnter: (_e, node) => openOn === "hover" && show(node),
    onMouseLeave: (_e, node) => openOn === "hover" && hide(node),
    onClick: (_e, node) => {
      if (openOn === "click") {
        if (openState.get()) {
          hide(node);
        } else {
          show(node);
        }
      }
    },
    onKeyDown: (e, node) => {
      if ((e as KeyboardEvent).key === "Escape" && openState.get()) hide(node);
    },
    onFocus: (_e, node) => openOn === "hover" && show(node),
    onBlur: (e, node) => {
      // Docs: focus has no effect when openOn is click — only hover-mode
      // blur dismisses (and even then, not when focus moved INTO the panel).
      if (openOn !== "hover") return;
      const related = (e as FocusEvent).relatedTarget as Node | null;
      const root = node.getRoot().domElement as Element;
      // Tabbing from the trigger INTO the panel must not close the popover.
      // The id is deterministic and selector-safe ([a-z0-9-] only — nodeId is
      // a letter + hex hash), so this lookup works for every generation —
      // the old factory-scope `popoverId` was null in any generation whose
      // content _onInsert had never run, letting the guard fall through.
      const floatingEl = root.querySelector(
        `#${floatingPanelId("popover", node)}`,
      );
      if (related && floatingEl?.contains(related)) return;
      hide(node);
    },
  };
  merge(anchorPartial, triggerPartial);

  return anchorPartial;
}

export { popover };
