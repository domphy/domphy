import { PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, themeSize, type ThemeColor } from "@domphy/theme";

function inputColor(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        type: "color",
        _onSchedule: (node, element) => {
            if (node.tagName != "input") {
                console.warn(`"inputColor" primitive patch must use input tag`);
            }
            (element as any).type = "color";
        },
        style: {
            appearance: "none",
            border: "none",
            cursor: "pointer",
            fontSize: (listener) => themeSize(listener, "inherit"),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 1),
            blockSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            inlineSize: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            backgroundColor: "transparent",
            "&::-webkit-color-swatch-wrapper": {
                margin: 0,
                padding: 0,
            },
            "&::-webkit-color-swatch": {
                borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            },
            "&:hover:not([disabled]), &:focus-visible": {
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
            },
        },
    };
}

export { inputColor };
