import { type PartialElement } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

function select(
    props: { color?: ThemeColor; accentColor?: ThemeColor } = {}
): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "select") {
                console.warn(`"select" primitive patch must use select tag`);
            }
        },
        style: {
            fontFamily: "inherit",
            fontSize: (listener) => themeSize(listener, "inherit"),
            lineHeight: "inherit",
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            borderRadius: themeSpacing(2),
            paddingBlock: themeSpacing(1),
            paddingLeft: themeSpacing(3),
            paddingRight: themeSpacing(1),
            "&:not([multiple])": {
                height: themeSpacing(8),
            },
            "&:hover:not([disabled]):not([aria-busy=true])": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", accentColor)}`,
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "& optgroup": {
                color: (listener) => themeColor(listener, "shift-8", color),
            },
            "& option[disabled]": {
                color: (listener) => themeColor(listener, "shift-4", "neutral"),
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-5", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
            }
        },
    };
}

export { select };
