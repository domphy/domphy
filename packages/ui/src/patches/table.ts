import { type PartialElement, type DomphyElement } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing, themeSize } from "@domphy/theme";

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
            color: (listener) => themeColor(listener, "shift-6", color),
            width: "100%",
            borderCollapse: "collapse",
            "& caption": {
                captionSide: "bottom"
            },
            "& th, & thead td": {
                textAlign: "left",
                fontWeight: 500,
                paddingInline: themeSpacing(3),
                paddingBlock: themeSpacing(1),
                color: (listener) => themeColor(listener, "shift-7", color),
                backgroundColor: (listener) => themeColor(listener, "inherit"),
            },
            "& td": {
                textAlign: "left",
                paddingInline: themeSpacing(3),
                paddingBlock: themeSpacing(1),
                color: (listener) => themeColor(listener, "shift-6", color),
                boxShadow: (listener) => `inset 0 1px 0 ${themeColor(listener, "shift-3", color)}`,
                fontSize: (listener) => themeSize(listener, "inherit"),
            },
            "& tfoot th, & tfoot td": {
                textAlign: "left",
                fontWeight: 500,
                paddingInline: themeSpacing(3),
                paddingBlock: themeSpacing(1),
                color: (l) => themeColor(l, "shift-7", color),
                backgroundColor: (l) => themeColor(l, "inherit"),
                boxShadow: (l) => `inset 0 -1px 0 ${themeColor(l, "shift-3", color)}`
            },
            "& tr": {
                backgroundColor: (listener) => themeColor(listener, "inherit"),
            },

            "& tbody tr:hover": {
                backgroundColor: (listener) => themeColor(listener, "shift-2") + "!important",
            }
        },
    };
}

export { table };
