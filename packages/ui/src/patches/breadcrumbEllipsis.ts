import type { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function breadcrumbEllipsis(props: {
    color?: ThemeColor;
} = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName !== "button") {
                console.warn('"breadcrumbEllipsis" patch must use button tag');
            }
        },
        ariaLabel: "More breadcrumb items",
        style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: (listener) => themeSize(listener, "inherit"),
            paddingInline: themeSpacing(1),
            border: "none",
            background: "none",
            cursor: "pointer",
            color: (listener) => themeColor(listener, "shift-8", color),
            borderRadius: themeSpacing(1),
            "&:hover": {
                color: (listener) => themeColor(listener, "shift-10", color),
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color)}`,
                outlineOffset: themeSpacing(0.5),
            },
        },
    };
}

export { breadcrumbEllipsis };
