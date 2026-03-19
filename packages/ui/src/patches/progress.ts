import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function progress(props: { color?: ValueOrState<ThemeColor>; accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

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
            backgroundColor: (listener) => themeColor(listener, "shift-3", color.get(listener)),
            "&::-webkit-progress-bar": {
                backgroundColor: (listener) => themeColor(listener, "shift-3", color.get(listener)),
                borderRadius: themeSpacing(999),
            },
            "&::-webkit-progress-value": {
                backgroundColor: (listener) => themeColor(listener, "shift-9", accentColor.get(listener)),
                borderRadius: themeSpacing(999),
                transition: "width 220ms ease",
            },
            "&::-moz-progress-bar": {
                backgroundColor: (listener) => themeColor(listener, "shift-9", accentColor.get(listener)),
                borderRadius: themeSpacing(999),
            },
        },
    };
}

export { progress };
