import type { PartialElement } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function breadcrumb(props: {
    color?: ValueOrState<ThemeColor>;
    separator?: string;
} = {}): PartialElement {
    const { separator = "/" } = props;
    const color = toState(props.color ?? "neutral", "color");

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
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            "& > *": {
                display: "inline-flex",
                alignItems: "center",
                color: (listener) => themeColor(listener, "shift-8", color.get(listener)),
            },
            "& > *:not(:last-child)::after": {
                content: `"${separator}"`,
                color: (listener) => themeColor(listener, "shift-4", color.get(listener)),
                paddingInlineStart: themeSpacing(1),
            },
            "& > [aria-current=page]": {
                color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
                pointerEvents: "none",
            },
        },
    };
}

export { breadcrumb };
