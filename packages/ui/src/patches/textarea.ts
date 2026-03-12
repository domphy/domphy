import { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function textarea(
    props: { color?: ThemeColor; accentColor?: ThemeColor } = {}
): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "textarea") {
                console.warn(`"textarea" primitive patch must use textarea tag`);
            }
        },
        style: {
            fontFamily: "inherit",
            lineHeight: "inherit",
            resize: "vertical",
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
            border:"none",
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-4"),
            },
            "&:hover:not([disabled]):not([aria-busy=true])": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", accentColor)}`,
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&:invalid": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-4", "error")}`,
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

export { textarea };
