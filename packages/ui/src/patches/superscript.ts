import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function superscript(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "sup") {
                console.warn(`"superscript" primitive patch must use sup tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "decrease-1"),
            verticalAlign: "super",
            lineHeight: 0,
            color: (listener) => themeColor(listener, "shift-6", color),
        },
    };
}

export { superscript };
