import { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function inputSearch(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "search",
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputSearch" primitive patch must use input tag`);
            }
            (element as any).type = "search";
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
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            minWidth: themeSpacing(32),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            "&::placeholder": {
                color: (listener) => themeColor(listener, "shift-4", color),
            },
            "&::-webkit-search-decoration": {
                display: "none",
            },
            "&::-webkit-search-cancel-button": {
                cursor: "pointer",
            },
            "&:hover:not([disabled]):not([aria-busy=true]), &:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-5", "neutral"),
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
            },
        },
    };
}

export { inputSearch };
