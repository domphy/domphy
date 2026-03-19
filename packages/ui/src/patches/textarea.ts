import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function textarea(
    props: { color?: ValueOrState<ThemeColor>; accentColor?: ValueOrState<ThemeColor> } = {}
): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

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
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-7"),
            },
            "&:hover:not([disabled]):not([aria-busy=true])": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
            },
            "&:invalid": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
            }
        },
    };
}

export { textarea };
