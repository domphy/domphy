import { type PartialElement, type DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSpacing, themeSize } from "@domphy/theme";

function table(props: { color?: ThemeColor } = {}): PartialElement {
    const {
        color = "neutral",
    } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "table") {
                console.warn(`"table" primitive patch must use table tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
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
                color: (listener) => themeColor(listener, "shift-10", color),
                backgroundColor: (listener) => themeColor(listener, "inherit"),
            },
            "& td": {
                textAlign: "left",
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
                color: (listener) => themeColor(listener, "shift-9", color),
                boxShadow: (listener) => `inset 0 1px 0 ${themeColor(listener, "shift-4", color)}`,
                fontSize: (listener) => themeSize(listener, "inherit"),
            },
            "& tfoot th, & tfoot td": {
                textAlign: "left",
                fontWeight: 500,
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
                color: (l) => themeColor(l, "shift-10", color),
                backgroundColor: (l) => themeColor(l, "inherit"),
                boxShadow: (l) => `inset 0 -1px 0 ${themeColor(l, "shift-4", color)}`
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
