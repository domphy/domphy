import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function inputNumber(props: { color?: ValueOrState<ThemeColor>, accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

    return {
        type: "number",
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputNumber" primitive patch must use input tag`);
            }
            (element as any).type = "number";
        },
        style: {
            fontFamily: "inherit",
            lineHeight: "inherit",
            minWidth: themeSpacing(10),
            paddingInlineStart: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingInlineEnd: (listener) => themeSpacing(themeDensity(listener) * 1.5),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            fontSize: (listener) => themeSize(listener, "inherit"),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
                opacity: 1,
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
        },
    };
}

export { inputNumber };
