import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function progress(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "progress") {
                console.warn(`"progress" primitive patch must use progress tag`);
            }
        },
        style: {
            appearance: "none",
            width: "100%",
            height: themeSpacing(2),
            border: 0,
            borderRadius: themeSpacing(999),
            overflow: "hidden",
            backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            "&::-webkit-progress-bar": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
                borderRadius: themeSpacing(999),
            },
            "&::-webkit-progress-value": {
                backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor),
                borderRadius: themeSpacing(999),
                transition: "width 220ms ease",
            },
            "&::-moz-progress-bar": {
                backgroundColor: (listener) => themeColor(listener, "shift-6", accentColor),
                borderRadius: themeSpacing(999),
            },
        },
    };
}

export { progress };
