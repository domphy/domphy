import { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function inputText(props: { color?: ThemeColor, accentColor?: ThemeColor } = {}): PartialElement {
    let {
        color = "neutral",
        accentColor = "primary",
    } = props;

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
            minWidth: themeSpacing(32),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            fontSize: (listener) => themeSize(listener, "inherit"),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-4"),
            },
            "&:not(:placeholder-shown)": {
                color: (listener) => themeColor(listener, "shift-7"),
            },
            "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {

                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
                color: (listener) => themeColor(listener, "shift-5", "neutral"),
            },
            "&:invalid:not(:placeholder-shown)": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`,
            },
            "&[data-status=error]": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "error")}`,
            },
            "&[data-status=warning]": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", "warning")}`,
            },
        },
    };
}

export { inputText };
