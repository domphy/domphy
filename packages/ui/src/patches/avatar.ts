import { type PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function avatar(props: {
    color?: ThemeColor;
} = {}): PartialElement {
    const { color = "primary" } = props;

    return {
        dataTone: "shift-2",
        style: {
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "50%",
            flexShrink: 0,
            width: themeSpacing(9),
            height: themeSpacing(9),
            fontSize: (listener) => themeSize(listener, "inherit"),
            fontWeight: "600",
            userSelect: "none",
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            color: (listener) => themeColor(listener, "shift-11", color),
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
