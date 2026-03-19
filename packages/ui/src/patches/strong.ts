import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function strong(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "strong") {
                console.warn(`"strong" primitive patch must use strong tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontWeight: 700,
            color: (listener) => themeColor(listener, "shift-11", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener),
        },
    };
}

export { strong };
