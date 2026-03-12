import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function horizontalRule(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "hr") {
                console.warn(`"horizontalRule" primitive patch must use hr tag`);
            }
        },
        style: {
            border: 0,
            height: "1px",
            marginInline: 0,
            marginTop: themeSpacing(3),
            marginBottom: themeSpacing(3),
            backgroundColor: (listener) => themeColor(listener, "shift-4", color),
        },
    };
}

export { horizontalRule };
