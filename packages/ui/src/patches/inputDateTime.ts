import { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

type InputDateTimeMode = "date" | "time" | "week" | "month" | "datetime-local";

function inputDateTime(
    props: { mode?: InputDateTimeMode; color?: ThemeColor; accentColor?: ThemeColor } = {}
): PartialElement {
    const { mode = "datetime-local", color = "neutral", accentColor = "primary" } = props;

    return {
        type: mode,
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputDateTime" primitive patch must use input tag`);
            }
            (element as any).type = mode;
        },
        style: {
            fontFamily: "inherit",
            fontSize: (listener) => themeSize(listener, "inherit"),
            lineHeight: "inherit",
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            "&::-webkit-calendar-picker-indicator": {
                cursor: "pointer",
                opacity: 0.85,
            },
            "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
            },
            "&:invalid": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "error")}`,
            },
        },
    };
}

export { inputDateTime };
