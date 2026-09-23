import {
  behavior,
  type DomphyElement,
  ElementNode,
  type PartialElement,
  rawHtml,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

const xSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6.707 5.293l5.293 5.292l5.293 -5.292a1 1 0 0 1 1.414 1.414l-5.292 5.293l5.292 5.293a1 1 0 0 1 -1.414 1.414l-5.293 -5.292l-5.293 5.292a1 1 0 1 1 -1.414 -1.414l5.292 -5.293l-5.292 -5.293a1 1 0 0 1 1.414 -1.414" /></svg>`;

// Compact-chip chrome was bare `themeSpacing(U)` (catalog snapshots). Default
// density is 1.5 (`light.densities[2]`, density.ts origin index 2). n = U / 1.5
// keeps those pixels at default while dataDensity still scales. Height 6U must
// stay below selectBox/combobox minHeight `(6 + 2d)U` or the chip fills the trigger.
const DEFAULT_DENSITY = 1.5;
const TAG_HEIGHT = 6 / DEFAULT_DENSITY;
const TAG_PAD_INLINE = 2.5 / DEFAULT_DENSITY;
const TAG_PAD_END_REMOVABLE = 1 / DEFAULT_DENSITY;
const TAG_REMOVE = 4 / DEFAULT_DENSITY;
const TAG_REMOVE_RADIUS = 1 / DEFAULT_DENSITY;

type TagRemoveProps = { removable: boolean };

/**
 * Styles an inline chip/tag (rounded, bordered, optional remove button).
 * No host tag check; typically applied to a `<span>`. When `removable` is true,
 * a close button is inserted that removes the host node on click or Enter/Space.
 *
 * @hostTag span
 * @param props.color - Theme color for the chip background/border/text. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @param props.removable - When true, renders a remove (x) button that removes the tag on click or Enter/Space. Optional. Defaults to `false`.
 * @example { span: "Label", $: [tag({ removable: true })] }
 */
function tag(
  props: { color?: ValueOrState<ThemeColor>; removable?: boolean } = {},
): PartialElement {
  const { removable = false } = props;
  const color = toState(props.color ?? "neutral", "color");

  return {
    dataTone: "shift-2",
    // _onInit would miss/orphan the button when a reused node is re-patched
    // with a flipped `removable`. behavior() attaches once and routes later
    // generations through update().
    ...behavior<TagRemoveProps>(
      "tag-remove",
      (node, initial) => {
        const removeHost = () => node.remove();
        const makeButton = (): DomphyElement<"span"> => ({
          span: rawHtml(xSvg),
          _key: "tag-remove",
          onClick: (e) => {
            (e as Event).stopPropagation();
            removeHost();
          },
          onKeyDown: (e) => {
            const event = e as KeyboardEvent;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            removeHost();
          },
          tabindex: 0,
          role: "button",
          ariaLabel: "Remove",
          style: {
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
            borderRadius: (listener) =>
              themeSpacing(themeDensity(listener) * TAG_REMOVE_RADIUS),
            width: (listener) =>
              themeSpacing(themeDensity(listener) * TAG_REMOVE),
            height: (listener) =>
              themeSpacing(themeDensity(listener) * TAG_REMOVE),
            flexShrink: 0,
            transition: "background-color 140ms ease, box-shadow 140ms ease",
            "&:hover": {
              backgroundColor: (listener) =>
                themeColor(listener, "shift-4", color.get(listener)),
            },
            "&:focus-visible": {
              boxShadow: (listener) => focusRing(listener, color.get(listener)),
            },
          },
        });
        const findButton = () =>
          node.children.items.find(
            (item) => item instanceof ElementNode && item.key === "tag-remove",
          ) ?? null;
        // attach() runs from the host Mount hook, which fires bottom-up: the
        // children walk has already finished by then (both on a fresh render
        // and on hydration), so the button always has to be materialized here.
        // The list-only insert this used to do on first paint relied on the
        // old top-down Mount and left the button DOM-less after hydration.
        const sync = (next: TagRemoveProps) => {
          const existing = findButton();
          if (next.removable && !existing) {
            node.children.insert(makeButton());
          } else if (!next.removable && existing) {
            node.children.remove(existing);
          }
        };
        sync(initial);
        return {
          update: sync,
        };
      },
      { removable },
    ),
    style: {
      display: "inline-flex",
      // A chip hugs its label. Measured in Chromium: inside a `stack()` the
      // pill stretched to the full 1232px column (shadcn's badge carries the
      // same `w-fit` for this reason) — `inline-flex` is blockified by a
      // flex/grid parent.
      width: "fit-content",
      alignItems: "center",
      whiteSpace: "nowrap",
      userSelect: "none",
      height: (listener) => themeSpacing(themeDensity(listener) * TAG_HEIGHT),
      paddingBlock: 0,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 999),
      paddingInlineStart: (listener) =>
        themeSpacing(themeDensity(listener) * TAG_PAD_INLINE),
      paddingInlineEnd: (listener) =>
        themeSpacing(
          themeDensity(listener) *
            (removable ? TAG_PAD_END_REMOVABLE : TAG_PAD_INLINE),
        ),
      gap: themeSpacing(1.5),
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
    },
  };
}

export { tag };
