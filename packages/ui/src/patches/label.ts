import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function label(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "label") {
                console.warn(`"label" primitive patch must use label tag`);
            }
        },
        style: {
            display: "inline-flex",
            alignItems: "center",
            gap: themeSpacing(2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
            cursor: "pointer",
            "&:focus-within": {
                color: (listener) => themeColor(listener, "shift-10", accentColor),
            },
            "&[aria-disabled=true]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
            },
        },
    };
}

export { label };
