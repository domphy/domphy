import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize,themeSpacing,type ThemeColor } from "@domphy/theme";

function link(props: { color?: ValueOrState<ThemeColor>, accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "primary", "color");
    const accentColor = toState(props.accentColor ?? "secondary", "accentColor");
    return {
        _onInsert: (node) => {
            if (node.tagName != "a") {
                console.warn(`"link" primitive patch must use a tag`)
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            textDecoration: "none",
            "&:visited": {
                color: (listener) => themeColor(listener, "shift-9", accentColor.get(listener)),
            },
            "&:hover:not([disabled])": {
                color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
                textDecoration: "underline",
            },
            "&:focus-visible": {
                borderRadius: themeSpacing(1),
                outlineOffset:themeSpacing(1),
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
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
