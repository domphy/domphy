import { PartialElement } from "@domphy/core";
import { themeColor, ThemeColor, themeSize } from "@domphy/theme";

function small(props: { color?: ThemeColor} = {}): PartialElement {
    const {
        color = "neutral",
    } = props;

    return {
        dataSize:"decrease-1",
        _onInsert: (node) => {
            if (node.tagName != "small") {
                console.warn(`"small" primitive patch must use small tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
        },
    };
}

export { small };
