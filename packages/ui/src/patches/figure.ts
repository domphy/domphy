import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function figure(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        _onInsert: (node) => {
            if (node.tagName != "figure") {
                console.warn(`"figure" primitive patch must use figure tag`);
            }
        },
        style: {
            display: "flex",
            flexDirection: "column",
            gap: themeSpacing(2),
            marginInline: 0,
            marginTop: themeSpacing(3),
            marginBottom: themeSpacing(3),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            "& img, & svg, & video, & canvas": {
                display: "block",
                maxWidth: "100%",
                borderRadius: themeSpacing(2),
            },
            "& figcaption": {
                fontSize: (listener) => themeSize(listener, "decrease-1"),
                color: (listener) => themeColor(listener, "shift-8", color.get(listener)),
                lineHeight: 1.45,
            },
        },
    };
}

export { figure };
