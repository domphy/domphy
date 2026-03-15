import type { PartialElement } from "@domphy/core";
import { themeSpacing, themeColor, themeSize, type ThemeColor } from "@domphy/theme";

function icon(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;
    return {
        _onInsert: (node) => {
            if (node.tagName != "span") {
                console.warn(`"icon" primitive patch should use span tag`);
            }
        },
        style: {
            display: "inline-flex",
            alignItems: "center",
            verticalAlign: "middle",
            width: themeSpacing(6),
            height: themeSpacing(6),
            fontSize: (listener) => themeSize(listener),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color)
        },
    };
}

export { icon };
