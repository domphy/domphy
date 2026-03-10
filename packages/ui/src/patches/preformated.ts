import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor, themeSize } from "@domphy/theme";

function preformated(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "pre") {
                console.warn(`"preformated" primitive patch must use pre tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "shift-1", color),
            border: "none",
            paddingBlock: themeSpacing(2),
            paddingInline: themeSpacing(3),
            borderRadius: themeSpacing(2),
        },
    };
}

export { preformated };
