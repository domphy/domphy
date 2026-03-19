import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, ThemeColor } from "@domphy/theme";

function emphasis(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "em") {
                console.warn(`"emphasis" primitive patch must use em tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontStyle: "italic",
            color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
        },
    };
}

export { emphasis };
