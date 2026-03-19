import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function orderedList(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "ol") {
                console.warn(`"orderedList" primitive patch must use ol tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            marginTop: 0,
            marginBottom: 0,
            paddingLeft: themeSpacing(3),
            listStyleType: "decimal",
            listStylePosition: "outside",
        },
    };
}

export { orderedList };
