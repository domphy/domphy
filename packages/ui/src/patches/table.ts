import { type PartialElement, type DomphyElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSpacing, themeSize } from "@domphy/theme";

function table(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "table") {
                console.warn(`"table" primitive patch must use table tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            width: "100%",
            borderCollapse: "collapse",
            "& caption": {
                captionSide: "bottom"
            },
            "& th, & thead td": {
                textAlign: "left",
                fontWeight: 500,
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
                color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
                backgroundColor: (listener) => themeColor(listener, "inherit"),
            },
            "& td": {
                textAlign: "left",
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
                color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
                boxShadow: (listener) => `inset 0 1px 0 ${themeColor(listener, "shift-4", color.get(listener))}`,
                fontSize: (listener) => themeSize(listener, "inherit"),
            },
            "& tfoot th, & tfoot td": {
                textAlign: "left",
                fontWeight: 500,
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
                color: (l) => themeColor(l, "shift-10", color.get(l)),
                backgroundColor: (l) => themeColor(l, "inherit"),
                boxShadow: (l) => `inset 0 -1px 0 ${themeColor(l, "shift-4", color.get(l))}`
            },
            "& tr": {
                backgroundColor: (listener) => themeColor(listener, "inherit"),
            },

            "& tbody tr:hover": {
                backgroundColor: (listener) => themeColor(listener, "shift-3") + "!important",
            }
        },
    };
}

export { table };
