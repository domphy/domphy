import { PartialElement } from "@domphy/core";
import { themeColor, ThemeColor, themeSpacing } from "@domphy/theme";

function abbreviation(props: { color?: ThemeColor; accentColor?: ThemeColor } = {}): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "abbr") {
                console.warn(`"abbreviation" primitive patch must use abbr tag`);
            }
        },
        style: {
            color: (listener) => themeColor(listener, "shift-7", color),
            textDecorationLine: "underline",
            textDecorationStyle: "dotted",
            textDecorationColor: (listener) => themeColor(listener, "shift-4", color),
            textUnderlineOffset: themeSpacing(0.72),
            cursor: "help",
            "&:hover": {
                color: (listener) => themeColor(listener, "shift-8", accentColor),
                textDecorationColor: (listener) => themeColor(listener, "shift-6", accentColor),
            },
        },
    };
}

export { abbreviation };
