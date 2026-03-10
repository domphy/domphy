import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function unorderedList(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "ul") {
                console.warn(`"unorderedList" primitive patch must use ul tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: themeSpacing(3),
            listStyleType: "disc",
            listStylePosition: "outside",
        },
    };
}

export { unorderedList };
