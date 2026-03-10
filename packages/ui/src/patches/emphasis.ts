import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function emphasis(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "em") {
                console.warn(`"emphasis" primitive patch must use em tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontStyle: "italic",
            color: (listener) => themeColor(listener, "shift-7", color),
        },
    };
}

export { emphasis };
