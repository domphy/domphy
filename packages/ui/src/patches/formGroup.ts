import { type PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, themeSize, type ThemeColor } from "@domphy/theme";

function formGroup(props: { color?: ThemeColor; layout?: "horizontal" | "vertical" } = {}): PartialElement {
    const { color = "neutral", layout = "horizontal" } = props;

    const isVertical = layout === "vertical";

    return {
        _onInsert: (node) => {
            if (node.tagName != "fieldset") {
                console.warn(`"formGroup" patch must use fieldset tag`);
            }
        },
        style: {
            margin: 0,
            paddingInline: themeSpacing(3),
            paddingBlock: themeSpacing(3),
            border: "none",
            borderRadius: themeSpacing(2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            display: "grid",
            gridTemplateColumns: isVertical ? `minmax(0, 1fr)` : `max-content minmax(0, 1fr)`,
            columnGap: themeSpacing(4),
            rowGap: themeSpacing(3),
            alignItems: "start",
            "& > legend": {
                gridColumn: "1 / -1",
                margin: 0,
                fontSize: (listener) => themeSize(listener, "inherit"),
                fontWeight: 600,
                paddingBlock: themeSpacing(1),
                borderRadius: themeSpacing(2),
                color: (listener) => themeColor(listener, "shift-6", color),
                backgroundColor: (listener) => themeColor(listener, "inherit", color),
            },
            "& > label": {
                gridColumn: "1",
                alignSelf: "start",
                margin: 0,
                paddingBlock: isVertical ? 0 : themeSpacing(1),
            },
            "& > label:has(+ :not(legend, label, p) + p)": {
                gridRow: isVertical ? "auto" : "span 2",
            },
            "& > :not(legend, label, p)": {
                gridColumn: isVertical ? "1" : "2",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
            },
            "& > p": {
                gridColumn: isVertical ? "1" : "2",
                minWidth: 0,
                margin: 0,
                marginBlockStart: `calc(${themeSpacing(2)} * -1)`,
                fontSize: (listener) => themeSize(listener, "decrease-1"),
                color: (listener) => themeColor(listener, "shift-6", color),
            },
        },
    };
}

export { formGroup };
