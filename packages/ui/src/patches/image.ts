import { PartialElement } from "@domphy/core";
import { themeColor, themeSpacing, ThemeColor } from "@domphy/theme";

function image(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;

    return {
        dataTone: "shift-2",
        _onInsert: (node) => {
            if (node.tagName != "img") {
                console.warn(`"image" primitive patch must use img tag`);
            }
        },
        style: {
            display: "block",
            width: "100%",
            maxWidth: "100%",
            height: "auto",
            objectFit: "cover",
            borderRadius: themeSpacing(2),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
        },
    };
}

export { image };
