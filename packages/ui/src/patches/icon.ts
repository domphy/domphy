import type { PartialElement } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";
import { themeSpacing, themeColor, themeSize, type ThemeColor } from "@domphy/theme";

function icon(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    return {
        _onInsert: (node) => {
            if (node.tagName != "span") {
                console.warn(`"icon" primitive patch should use span tag`);
            }
        },
        style: {
            display: "inline-flex",
            alignItems: "center",
            verticalAlign: `calc(-1 * ${themeSpacing(0.5)})`,
            width: "1em",
            height: "1em",
            flexShrink: "0",
            fontSize: (listener) => themeSize(listener),
            backgroundColor: "transparent",
            color: (listener) => themeColor(listener, "shift-9", color.get(listener))
        },
    };
}

export { icon };
