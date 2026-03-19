import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, ThemeColor, themeSize } from "@domphy/theme";

function small(props: { color?: ValueOrState<ThemeColor>} = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        dataSize:"decrease-1",
        _onInsert: (node) => {
            if (node.tagName != "small") {
                console.warn(`"small" primitive patch must use small tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
        },
    };
}

export { small };
