import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeSpacing, themeColor, themeSize, ThemeColor } from "@domphy/theme";

function code(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        dataTone: "shift-2",
        _onInsert: (node) => {
            if (node.tagName != "code") {
                console.warn(`"code" primitive patch must use code tag`);
            }
        },
        style: {
            display: "inline-flex",
            alignItems: "center",
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            height: themeSpacing(6),
            paddingInline: themeSpacing(1.5),
            borderRadius: themeSpacing(1),
        },
    };
}

export { code };
