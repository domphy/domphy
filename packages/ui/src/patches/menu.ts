import { PartialElement, merge } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function menu(props: {
  activeKey?: ValueOrState<number | string>;
  color?: ThemeColor;
} = {}): PartialElement {
  const { color = "neutral" } = props;

  let partial: PartialElement = {
    role: "menu",
    dataTone:"shift-11",
    _onSchedule: (node, element) => {
      let partial = {
        _context: {
          menu: {
            activeKey: toState(props.activeKey || 0),
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
