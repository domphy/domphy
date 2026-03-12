import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function inputRange(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "range",
        _onInsert: (node) => {
            if (node.tagName != "input") {
                console.warn(`"inputRange" primitive patch must use input tag`);
            }
        },
        style: {
            appearance: "none",
            width: "100%",
            margin: 0,
            padding: 0,
            height: themeSpacing(4),
            background: "transparent",
            cursor: "pointer",
            "&::-webkit-slider-runnable-track": {
                height: themeSpacing(1.5),
                borderRadius: themeSpacing(999),
                backgroundColor: (listener) => themeColor(listener, "shift-3", color),
            },
            "&::-moz-range-track": {
                height: themeSpacing(1.5),
                borderRadius: themeSpacing(999),
                backgroundColor: (listener) => themeColor(listener, "shift-3", color),
            },
            "&::-webkit-slider-thumb": {
                appearance: "none",
                width: themeSpacing(4),
                height: themeSpacing(4),
                borderRadius: themeSpacing(999),
                border: "none",
                marginTop: `calc((${themeSpacing(1.5)} - ${themeSpacing(4)}) / 2)`,
                backgroundColor: (listener) => themeColor(listener, "shift-9", accentColor),
            },
            "&::-moz-range-thumb": {
                width: themeSpacing(4),
                height: themeSpacing(4),
                borderRadius: themeSpacing(999),
                border: "none",
                backgroundColor: (listener) => themeColor(listener, "shift-9", accentColor),
            },
            "&:hover:not([disabled])::-webkit-slider-thumb": {
                backgroundColor: (listener) => themeColor(listener, "shift-10", accentColor),
            },
            "&:hover:not([disabled])::-moz-range-thumb": {
                backgroundColor: (listener) => themeColor(listener, "shift-10", accentColor),
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
                outlineOffset: themeSpacing(1),
                borderRadius: themeSpacing(2),
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
            },
        },
    };
}

export { inputRange };
