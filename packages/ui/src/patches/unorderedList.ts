import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function unorderedList(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "ul") {
                console.warn(`"unorderedList" primitive patch must use ul tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: themeSpacing(3),
            listStyleType: "disc",
            listStylePosition: "outside",
        },
    };
}

export { unorderedList };
