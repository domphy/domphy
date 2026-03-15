import { PartialElement } from "@domphy/core";
import { themeColor, themeSize,themeSpacing,type ThemeColor } from "@domphy/theme";

function link(props: { color?: ThemeColor, accentColor?: ThemeColor } = {}): PartialElement {
    let {
        color = "primary",
        accentColor = "secondary",
    } = props
    return {
        _onInsert: (node) => {
            if (node.tagName != "a") {
                console.warn(`"link" primitive patch must use a tag`)
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color),
            textDecoration: "none",
            "&:visited": {
                color: (listener) => themeColor(listener, "shift-9", accentColor),
            },
            "&:hover:not([disabled])": {
                color: (listener) => themeColor(listener, "shift-10", color),
                textDecoration: "underline",
            },
            "&:focus-visible": {
                borderRadius: themeSpacing(1),
                outlineOffset:themeSpacing(1),
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
            }
        },
    };
}

export { link };
