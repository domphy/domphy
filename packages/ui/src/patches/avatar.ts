import { type PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, type ThemeColor } from "@domphy/theme";

function avatar(props: {
    color?: ValueOrState<ThemeColor>;
} = {}): PartialElement {
    const color = toState(props.color ?? "primary", "color");

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
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            color: (listener) => themeColor(listener, "shift-11", color.get(listener)),
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
