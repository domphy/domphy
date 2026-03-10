import { type PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function avatar(props: {
    color?: ThemeColor;
} = {}): PartialElement {
    const { color = "primary" } = props;

    return {
        style: {
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "50%",
            flexShrink: 0,
            width: themeSpacing(8),
            height: themeSpacing(8),
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontWeight: "600",
            userSelect: "none",
            backgroundColor: (listener) => themeColor(listener, "shift-3", color),
            color: (listener) => themeColor(listener, "shift-8", color),
            "& img": {
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
            },
        },
    };
}

export { avatar };
