import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function subscript(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "sub") {
                console.warn(`"subscript" primitive patch must use sub tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "decrease-1"),
            verticalAlign: "sub",
            lineHeight: 0,
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
        },
    };
}

export { subscript };
