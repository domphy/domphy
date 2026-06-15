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
