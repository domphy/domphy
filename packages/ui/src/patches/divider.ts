import type { PartialElement } from "@domphy/core";
import { themeColor, type ThemeColor, themeSize, themeSpacing } from "@domphy/theme";

function divider(props: {
    color?: ThemeColor;
} = {}): PartialElement {
    const {
        color = "neutral",
    } = props;

    return {
        role: "separator",
        _onInsert: (node) => {
            if (node.tagName !== "div") {
                console.warn(`"divider" patch should be used with <div>`)
            }
        },
        style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "baseline",
            gap: themeSpacing(2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            minHeight: "1lh",
            "&::before": {
                content: `""`,
                flex:1,
                borderColor: (listener) => themeColor(listener, "shift-3", color),
                borderWidth: "1px",
                borderBottomStyle: "solid",
            },
            "&::after": {
                content: `""`,
                flex:1,
                borderColor: (listener) => themeColor(listener, "shift-3", color),
                borderWidth: "1px",
                borderBottomStyle: "solid",
            },
        },
    };
}

export { divider };
