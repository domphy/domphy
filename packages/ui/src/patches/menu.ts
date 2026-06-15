import {
  merge,
  type PartialElement,
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

/**
 * Themed menu container that provides selection context (`activeKey`,
 * `selectable`) to child `menuItem` patches and lays them out vertically.
 * Sets `role="menu"`. Typically applied to a container element such as a
 * `<div>` or `<ul>`.
 *
 * @param props - Optional configuration.
 * @param props.activeKey - Currently selected item key, accepts a value or `State`. Defaults to `null`.
 * @param props.selectable - Whether items track and update the active selection. Defaults to `true`.
 * @param props.color - Background color tone for the menu. Defaults to `"neutral"`.
 * @example { div: "", $: [menu({ activeKey: 0 })] }
 */
function menu(
  props: {
    activeKey?: ValueOrState<number | string>;
    selectable?: boolean;
    color?: ThemeColor;
  } = {},
): PartialElement {
  const { color = "neutral", selectable = true } = props;

  const partial: PartialElement = {
    role: "menu",
    dataTone: "shift-17",
    _onSchedule: (node, element) => {
      const partial = {
        _context: {
          menu: {
            activeKey: toState(props.activeKey ?? null),
            selectable,
          },
        },
      };
      merge(element, partial);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      fontSize: (listener) => themeSize(listener, "inherit"),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
    },
  };
  return partial;
}

export { menu };
