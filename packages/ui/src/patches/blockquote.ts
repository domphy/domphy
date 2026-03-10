import { PartialElement } from "@domphy/core";
import { themeSpacing, ThemeColor, themeColor, themeSize } from "@domphy/theme";

function blockquote(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "inherit" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "blockquote") {
                console.warn(`"blockquote" primitive patch must use blockquote tag`);
            }
        },
        dataTone: "shift-1",
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-3", color)}`,
            border: "none",
            paddingBlock: themeSpacing(2),
            paddingInline: themeSpacing(4),
            margin: 0,
        },
    };
}

export { blockquote };
