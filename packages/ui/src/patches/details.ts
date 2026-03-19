import { PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function details(
    props: { color?: ValueOrState<ThemeColor>; accentColor?: ValueOrState<ThemeColor>; duration?: number } = {}
): PartialElement {
    const { duration = 240 } = props;
    const color = toState(props.color ?? "neutral", "color");
    const accentColor = toState(props.accentColor ?? "primary", "accentColor");

    return {
        _onInsert: (node) => {
            if (node.tagName != "details") {
                console.warn(`"details" primitive patch must use details tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),

            overflow: "hidden",
            "& > summary": {
               backgroundColor: (listener) => themeColor(listener, "shift-2", color.get(listener)),
              color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
                fontSize: (listener) => themeSize(listener, "inherit"),
                listStyle: "none",
                display: "flex",
              justifyContent:"space-between",
                alignItems: "center",
                gap: themeSpacing(2),
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 500,
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
              height: themeSpacing(10),
            },
            "& > summary::-webkit-details-marker": {
                display: "none",
            },
            "& > summary::marker": {
                content: `""`,
            },
            "& > summary::after": {
                content: `""`,
                width: themeSpacing(2),
                height: themeSpacing(2),
                flexShrink: 0,
                marginTop: `-${themeSpacing(0.5)}`,
                borderInlineEnd: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-9", color.get(listener))}`,
                borderBottom: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-9", color.get(listener))}`,
                transform: "rotate(45deg)",
                transition: `transform ${duration}ms ease`,
            },
            "&[open] > summary::after": {
                transform: "rotate(-135deg)",
            },
            "& > summary:hover": {
                backgroundColor: (listener) => themeColor(listener, "shift-3", color.get(listener)),
            },
            "& > summary:focus-visible": {
                borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
                outlineOffset: `-${themeSpacing(0.5)}`,
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor.get(listener))}`,
            },
            "& > :not(summary)": {
                maxHeight: "0px",
                opacity: 0,
                overflow: "hidden",
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
                paddingTop: 0,
                paddingBottom: 0,
                transition: `max-height ${duration}ms ease, opacity ${duration}ms ease, padding ${duration}ms ease`,
            },
            "&[open] > :not(summary)": {
                maxHeight: themeSpacing(250),
                opacity: 1,
                paddingTop: (listener) => themeSpacing(themeDensity(listener) * 1),
                paddingBottom: (listener) => themeSpacing(themeDensity(listener) * 3),
            },
        },
    };
}

export { details };
