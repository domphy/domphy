import { PartialElement } from "@domphy/core";
import { themeSpacing, ThemeColor, themeColor, themeDensity, themeSize } from "@domphy/theme";

function blockquote(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "inherit" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "blockquote") {
                console.warn(`"blockquote" primitive patch must use blockquote tag`);
            }
        },
        dataTone: "shift-2",
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            boxShadow: (listener) => `inset ${themeSpacing(1)} 0 0 0 ${themeColor(listener, "shift-4", color)}`,
            border: "none",
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
            margin: 0,
        },
    };
}

export { blockquote };
