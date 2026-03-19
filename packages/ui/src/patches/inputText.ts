import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function inputText(props: { color?: ValueOrState<ThemeColor>, accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

    return {
        type: "text",
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputText" primitive patch must use input tag and text type`);
            }
            (element as any).type = "text";
        },
        style: {
            fontFamily: "inherit",
            lineHeight: "inherit",
            minWidth: themeSpacing(10),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            fontSize: (listener) => themeSize(listener, "inherit"),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-7"),
            },
            "&:not(:placeholder-shown)": {
                color: (listener) => themeColor(listener, "shift-10"),
            },
            "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {

                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
            },
            "&:invalid:not(:placeholder-shown)": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
            },
            "&[data-status=error]": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
            },
            "&[data-status=warning]": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "warning")}`,
            },
        },
    };
}

export { inputText };
