import type { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function breadcrumb(props: {
    color?: ThemeColor;
    separator?: string;
} = {}): PartialElement {
    const { color = "neutral", separator = "/" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName !== "nav") console.warn('"breadcrumb" patch must use nav tag');
        },
        ariaLabel: "breadcrumb",
        style: {
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            fontSize: (listener) => themeSize(listener, "inherit"),
            gap: themeSpacing(1),
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            "& > *": {
                display: "inline-flex",
                alignItems: "center",
                color: (listener) => themeColor(listener, "shift-5", color),
            },
            "& > *:not(:last-child)::after": {
                content: `"${separator}"`,
                color: (listener) => themeColor(listener, "shift-3", color),
                paddingInlineStart: themeSpacing(1),
            },
            "& > [aria-current=page]": {
                color: (listener) => themeColor(listener, "shift-7", color),
                pointerEvents: "none",
            },
        },
    };
}

export { breadcrumb };
