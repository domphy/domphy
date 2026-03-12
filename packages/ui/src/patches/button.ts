import { type PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, type ThemeColor, } from "@domphy/theme";

function button(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "button") {
                console.warn(`"button" primitive patch must use button tag`);
            }
        },
        style: {
            appearance: "none",
            fontSize: (listener) => themeSize(listener, "inherit"),
            // Single-line bounded control: block/radius = 1D, inline = 3D.
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            width: "fit-content",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            userSelect: "none",
            fontFamily: "inherit",
            lineHeight: "inherit",
            border: "none",
            outlineOffset: "-1px",
            outlineWidth: "1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "&:hover:not([disabled]):not([aria-busy=true])": {
                color: (listener) => themeColor(listener, "shift-10", color),
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&:focus-visible": {
                boxShadow: (listener) => `inset 0 0 0 ${themeSpacing(0.5)} ${themeColor(listener, "shift-6", color)}`,
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
            },
            "&[aria-busy=true]": {
                opacity: 0.7,
                cursor: "wait",
                pointerEvents: "none",
            },
        },
    };
}

export { button };
