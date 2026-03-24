import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor, themeSize } from "@domphy/theme";

function paragraph(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "p") {
                console.warn(`"paragraph" primitive patch must use p tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) =>themeColor(listener, "shift-9", color.get(listener)),
            lineHeight:1.5,
            marginTop: 0,
            marginBottom: 0,
        },
    };
}

export { paragraph };
