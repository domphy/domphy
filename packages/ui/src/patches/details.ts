import { PartialElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing, ThemeColor } from "@domphy/theme";

function details(
    props: { color?: ThemeColor; accentColor?: ThemeColor; duration?: number } = {}
): PartialElement {
    const { color = "neutral", accentColor = "primary", duration = 240 } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "details") {
                console.warn(`"details" primitive patch must use details tag`);
            }
        },
        style: {
            fontSize: (listener) => themeSize(listener, "inherit"),
            color: (listener) => themeColor(listener, "shift-6", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
           
            overflow: "hidden",
            "& > summary": {
               backgroundColor: (listener) => themeColor(listener, "shift-1", color),
              color: (listener) => themeColor(listener, "shift-7", color),
                fontSize: (listener) => themeSize(listener, "inherit"),
                listStyle: "none",
                display: "flex",
              justifyContent:"space-between",
                alignItems: "center",
                gap: themeSpacing(2),
                cursor: "pointer",
                userSelect: "none",
                fontWeight: 500,
                paddingInline: themeSpacing(4),
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
                borderInlineEnd: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color)}`,
                borderBottom: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", color)}`,
                transform: "rotate(45deg)",
                transition: `transform ${duration}ms ease`,
            },
            "&[open] > summary::after": {
                transform: "rotate(-135deg)",
            },
            "& > summary:hover": {
                backgroundColor: (listener) => themeColor(listener, "shift-2", color),
            },
            "& > summary:focus-visible": {
                borderRadius: themeSpacing(2),
                outlineOffset: `-${themeSpacing(0.5)}`,
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "& > :not(summary)": {
                maxHeight: "0px",
                opacity: 0,
                overflow: "hidden",
                paddingInline: themeSpacing(3),
                paddingTop: 0,
                paddingBottom: 0,
                transition: `max-height ${duration}ms ease, opacity ${duration}ms ease, padding ${duration}ms ease`,
            },
            "&[open] > :not(summary)": {
                maxHeight: themeSpacing(250),
                opacity: 1,
                paddingTop: themeSpacing(1),
                paddingBottom: themeSpacing(3),
            },
        },
    };
}

export { details };
