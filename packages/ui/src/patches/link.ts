import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Themed hyperlink primitive: styles text color, hover underline, visited,
 * focus ring and a disabled state. Apply to an `<a>` element.
 *
 * @hostTag a
 * @param props - Optional configuration.
 * @param props.color - Base color tone for the link text. Defaults to `"primary"`.
 * @param props.accentColor - Accent color tone for visited/focus states. Defaults to `"secondary"`.
 * @example { a: "Home", href: "/", $: [link()] }
 */
function link(
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "primary", "color");
  const accentColor = toState(props.accentColor ?? "secondary", "accentColor");
  return {
    // WAI-ARIA APG: an <a> with no `href` is not a native link — it is not
    // focusable and Enter/Space do nothing, even though it visually looks
    // and (via a caller's own onClick) behaves like one. Declared ON by
    // default (satisfies both APG for the scripted/no-href case AND, since
    // it is a plain declared value doctor's `missing-required-attribute`
    // rule can see, closes the "onClick with no href/role" diagnostic) and
    // corrected away in `_onInsert` once the real host attributes are known
    // — `href` lives on the HOST, not this patch, so its presence can't be
    // read until the merge completes. (A reactive `(listener) => …`
    // attribute function does NOT work for this: `attributes.has()` is a
    // plain imperative read, not a tracked reactive dependency, so it froze
    // at whatever `href` had been set to at the function's first,
    // merge-order-dependent evaluation — measured `false` even for a host
    // that DOES declare `href: "/"`.)
    role: "link",
    tabIndex: 0,
    _onInsert: (node) => {
      if (node.tagName !== "a") {
        console.warn(`"link" primitive patch must use a tag`);
      }
      // A real `href` makes both a no-op: `<a href>` is already natively
      // focusable with an implicit role="link" — strip the redundant pair
      // rather than leave a harmless-but-confusing explicit restatement.
      // Only strip THIS patch's own default, never a caller's native
      // override: native wins over patch (AGENTS.md merge rule), so by the
      // time `_onInsert` runs, `role` already holds the caller's value if
      // one was declared (e.g. a search result row using `$: [link()]` but
      // declaring its own `role: "option"` for a listbox) — removing it
      // unconditionally here silently threw that override away.
      if (node.attributes.has("href")) {
        if (node.attributes.get("role") === "link") {
          node.attributes.remove("role");
        }
        if (node.attributes.get("tabIndex") === 0) {
          node.attributes.remove("tabIndex");
        }
      }
    },
    // `<a disabled>` is not a native navigation block — stop click/Enter.
    onClick: (event, node) => {
      const el = node.domElement;
      if (
        el?.hasAttribute("disabled") ||
        el?.getAttribute("aria-disabled") === "true"
      ) {
        event.preventDefault();
      }
    },
    onKeyDown: (event, node) => {
      if (node.attributes.has("href")) return;
      const key = (event as KeyboardEvent).key;
      if (key !== "Enter" && key !== " ") return;
      event.preventDefault();
      node.domElement?.click();
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener),
      // shift-13 (not "text"/shift-9): brand hues need extra depth for ≥4.5:1
      // on a light surface (primary orange failed at 2.57 with shift-9).
      color: (listener) =>
        themeColor(listener, "shift-13", color.get(listener)),
      textDecoration: "none",
      "&:visited": {
        color: (listener) =>
          themeColor(listener, "shift-13", accentColor.get(listener)),
      },
      "&:hover:not([disabled])": {
        color: (listener) =>
          themeColor(listener, "shift-14", color.get(listener)),
        textDecoration: "underline",
      },
      borderRadius: themeSpacing(1),
      // Kill the browser default outline so only the shared focusRing shows.
      outline: "none",
      transition: "color 140ms ease, box-shadow 140ms ease",
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      // `disabled` is not a valid attribute on `<a>`; WAI-ARIA's disabled link
      // is `role="link"` + `aria-disabled="true"` (focusable, not operable).
      // Both selectors are styled so either spelling gets the same look.
      "&[disabled], &[aria-disabled=true]": {
        opacity: 0.7,
        cursor: "not-allowed",
        pointerEvents: "none",
        color: (listener) => themeColor(listener, "muted", "neutral"),
      },
    },
  };
}

export { link };
