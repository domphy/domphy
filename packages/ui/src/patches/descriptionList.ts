import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, themeSize, ThemeColor } from "@domphy/theme";

function descriptionList(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "dl") {
                console.warn(`"descriptionList" primitive patch must use dl tag`);
            }
        },
        style: {
            display: "grid",
            gridTemplateColumns: `minmax(${themeSpacing(24)}, max-content) 1fr`,
            columnGap: themeSpacing(4),
            margin: 0,
            "& dt": {
                margin: 0,
                fontWeight: 600,
                fontSize: (listener) => themeSize(listener, "inherit"),
                color: (listener) => themeColor(listener, "shift-10", color),
            },
            "& dd": {
                margin: 0,
                fontSize: (listener) => themeSize(listener, "inherit"),
                color: (listener) => themeColor(listener, "shift-9", color),
            },
        },
    };
}

export { descriptionList };
