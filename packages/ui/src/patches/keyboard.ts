import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function keyboard(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "kbd") {
                console.warn(`"keyboard" primitive patch must use kbd tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            paddingBlock: themeSpacing(0.5),
            paddingInline: themeSpacing(1.5),
            borderRadius: themeSpacing(1),
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
        },
    };
}

export { keyboard };
