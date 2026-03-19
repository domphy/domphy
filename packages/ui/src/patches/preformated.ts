import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, ThemeColor, themeSize } from "@domphy/theme";

function preformated(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        dataTone: "shift-2",
        _onInsert: (node) => {
            if (node.tagName != "pre") {
                console.warn(`"preformated" primitive patch must use pre tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            border: "none",
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
            paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
        },
    };
}

export { preformated };
