import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function orderedList(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "ol") {
                console.warn(`"orderedList" primitive patch must use ol tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color),
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: themeSpacing(3),
            listStyleType: "decimal",
            listStylePosition: "outside",
        },
    };
}

export { orderedList };
