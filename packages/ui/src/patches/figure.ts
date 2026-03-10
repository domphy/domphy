import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function figure(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

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
            color: (listener) => themeColor(listener, "shift-6", color),
            "& img, & svg, & video, & canvas": {
                display: "block",
                maxWidth: "100%",
                borderRadius: themeSpacing(2),
            },
            "& figcaption": {
                fontSize: (listener) => themeSize(listener, "decrease-1"),
                color: (listener) => themeColor(listener, "shift-5", color),
                lineHeight: 1.45,
            },
        },
    };
}

export { figure };
