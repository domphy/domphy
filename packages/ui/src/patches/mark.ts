import { PartialElement } from "@domphy/core";
import { themeSpacing, ThemeColor, themeSize, themeColor } from "@domphy/theme";

function mark(props: { accentColor?: ThemeColor } = {}): PartialElement {
    const {
        accentColor = "highlight",
    } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "mark") {
                console.warn(`"mark" primitive patch must use mark tag`);
            }
        },
        dataTone: "shift-2",
        style: {
            display: "inline-flex",
            alignItems: "center",
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", accentColor),
            backgroundColor: (listener) => themeColor(listener, "inherit", accentColor),
            height: themeSpacing(6),
            borderRadius: themeSpacing(1),
            paddingInline: themeSpacing(1.5),
        },
    };
}

export { mark };
