import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function strong(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "strong") {
                console.warn(`"strong" primitive patch must use strong tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontWeight: 700,
            color: (listener) => themeColor(listener, "shift-8", color),
        },
    };
}

export { strong };
