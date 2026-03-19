import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function label(props: { color?: ValueOrState<ThemeColor>; accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

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
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            cursor: "pointer",
            "&:focus-within": {
                color: (listener) => themeColor(listener, "shift-10", accentColor.get(listener)),
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
