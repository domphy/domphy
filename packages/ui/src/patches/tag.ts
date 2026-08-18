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
              themeSpacing(themeDensity(listener) * 1),
            width: (listener) => themeSpacing(themeDensity(listener) * 4),
            height: (listener) => themeSpacing(themeDensity(listener) * 4),
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
        // attach() runs from the host Mount hook, which fires BEFORE
        // render() walks children. Inserting with updateDom=true would
        // create a DOM node that render() then creates a second time.
        // First paint: list-only insert, let render() materialize it.
        // Later update(): the walk already finished, so mutate the live DOM.
        const sync = (next: TagRemoveProps, updateDom: boolean) => {
          const existing = findButton();
          if (next.removable && !existing) {
            node.children.insert(makeButton(), undefined, updateDom);
          } else if (!next.removable && existing) {
            node.children.remove(existing);
          }
        };
        sync(initial, false);
        return {
          update: (next) => sync(next, true),
        };
      },
      { removable },
    ),
    style: {
      display: "inline-flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      userSelect: "none",
      height: (listener) => themeSpacing(themeDensity(listener) * 6),
      paddingBlock: 0,
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 999),
      paddingInlineStart: (listener) =>
        themeSpacing(themeDensity(listener) * 2.5),
      paddingInlineEnd: (listener) =>
        themeSpacing(themeDensity(listener) * (removable ? 1 : 2.5)),
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
