import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeSpacing, ThemeColor, themeSize, themeColor } from "@domphy/theme";

function mark(props: { accentColor?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const accentColor = toState(props.accentColor ?? "highlight", "accentColor");

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
            color: (listener) => themeColor(listener, "shift-9", accentColor.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", accentColor.get(listener)),
            height: themeSpacing(6),
            borderRadius: themeSpacing(1),
            paddingInline: themeSpacing(1.5),
        },
    };
}

export { mark };
