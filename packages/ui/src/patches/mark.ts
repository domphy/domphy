import { PartialElement } from "@domphy/core";
import { themeSpacing, ThemeColor, ElementTone, themeSize, themeColor } from "@domphy/theme";

function mark(props: { accentColor?: ThemeColor; tone?: ElementTone } = {}): PartialElement {
    const {
        accentColor = "highlight",
        tone = "shift-1",
    } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "mark") {
                console.warn(`"mark" primitive patch must use mark tag`);
            }
        },
        dataTone: tone,
        style: {
            display: "inline-flex",
            alignItems: "center",
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", accentColor),
            backgroundColor: (listener) => themeColor(listener, "inherit", accentColor),
            height: themeSpacing(6),
            borderRadius: themeSpacing(1),
            paddingInline: themeSpacing(1.5),
        },
    };
}

export { mark };
