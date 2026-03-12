import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

const Headinghift: Record<string, string> = {
    h6: "decrease-1",
    h5: "inherit",
    h4: "increase-1",
    h3: "increase-2",
    h2: "increase-3",
    h1: "increase-4",
}

function heading(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (!["h1", "h2", "h3", "h4", "h5", "h6"].includes(node.tagName)) {
                console.warn(`"heading" primitive patch must use heading tags [h1...h6]`);
            }
        },
        style: {
            color: (listener) => themeColor(listener, "shift-11", color),
            marginTop: 0,
            marginBottom: themeSpacing(2),
            fontSize: (listener) => {
                const offset = Headinghift[listener.elementNode.tagName] || "inherit";
                return themeSize(listener, offset);
            },
        },
    };
}

export { heading };
