import type { PartialElement } from "@domphy/core";
import { toState, ValueOrState } from "@domphy/core";
import { themeColor, type ThemeColor, themeSize, themeSpacing } from "@domphy/theme";

function divider(props: {
    color?: ValueOrState<ThemeColor>;
} = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");

    return {
        role: "separator",
        _onInsert: (node) => {
            if (node.tagName !== "div") {
                console.warn(`"divider" patch should be used with <div>`)
            }
        },
        style: {
            display: "flex",
            justifyContent: "center",
            alignItems: "baseline",
            gap: themeSpacing(2),
            fontSize: (listener) => themeSize(listener, "inherit"),
            backgroundColor: (listener) => themeColor(listener),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            minHeight: "1lh",
            "&::before": {
                content: `""`,
                flex:1,
                borderColor: (listener) => themeColor(listener, "shift-4", color.get(listener)),
                borderWidth: "1px",
                borderBottomStyle: "solid",
            },
            "&::after": {
                content: `""`,
                flex:1,
                borderColor: (listener) => themeColor(listener, "shift-4", color.get(listener)),
                borderWidth: "1px",
                borderBottomStyle: "solid",
            },
        },
    };
}

export { divider };
