import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor, themeSize } from "@domphy/theme";

function paragraph(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "p") {
                console.warn(`"paragraph" primitive patch must use p tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
            lineHeight:1.5,
            marginTop: 0,
            marginBottom: 0,
        },
    };
}

export { paragraph };
