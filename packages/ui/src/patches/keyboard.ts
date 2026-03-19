import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function keyboard(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "kbd") {
                console.warn(`"keyboard" primitive patch must use kbd tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            paddingBlock: themeSpacing(0.5),
            paddingInline: themeSpacing(1.5),
            borderRadius: themeSpacing(1),
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
        },
    };
}

export { keyboard };
