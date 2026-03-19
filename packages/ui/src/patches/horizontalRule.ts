import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function horizontalRule(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "hr") {
                console.warn(`"horizontalRule" primitive patch must use hr tag`);
            }
        },
        style: {
            border: 0,
            height: "1px",
            marginInline: 0,
            marginTop: themeSpacing(3),
            marginBottom: themeSpacing(3),
            backgroundColor: (listener) => themeColor(listener, "shift-4", color.get(listener)),
        },
    };
}

export { horizontalRule };
