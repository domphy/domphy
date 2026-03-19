import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, ThemeColor, themeSize, themeSpacing } from "@domphy/theme";

function abbreviation(props: { color?: ValueOrState<ThemeColor>; accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

    return {
        _onInsert: (node) => {
            if (node.tagName != "abbr") {
                console.warn(`"abbreviation" primitive patch must use abbr tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
            textDecorationLine: "underline",
            textDecorationStyle: "dotted",
            textDecorationColor: (listener) => themeColor(listener, "shift-7", color.get(listener)),
            textUnderlineOffset: themeSpacing(0.72),
            cursor: "help",
            "&:hover": {
                color: (listener) => themeColor(listener, "shift-11", accentColor.get(listener)),
                textDecorationColor: (listener) => themeColor(listener, "shift-9", accentColor.get(listener)),
            },
        },
    };
}

export { abbreviation };
