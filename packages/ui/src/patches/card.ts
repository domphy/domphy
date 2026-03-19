import { type PartialElement, toState, ValueOrState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, type ThemeColor } from "@domphy/theme";

function card(props: { color?: ValueOrState<ThemeColor> } = {}): PartialElement {
    const color = toState(props.color ?? "neutral", "color");
    return {
        style: {
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gridTemplateAreas: '"image image" "title aside" "desc aside" "content content" "footer footer"',
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
            backgroundColor: (listener) => themeColor(listener, "inherit", color.get(listener)),
            color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color.get(listener))}`,
            outlineOffset: "-1px",
            overflow: "hidden",
            "& > img": {
                gridArea: "image",
                width: "100%",
                height: "auto",
                display: "block",
            },
            "& > :is(h1,h2,h3,h4,h5,h6)": {
                gridArea: "title",
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
                fontWeight: "600",
                margin: 0
            },
            "& > p": {
                gridArea: "desc",
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
                color: (listener) => themeColor(listener, "shift-9", color.get(listener)),
                margin: 0
            },
            "& > aside": {
                gridArea: "aside",
                alignSelf: "center",
                padding: (listener) => themeSpacing(themeDensity(listener) * 2),
                height: "auto",
            },
            "& > div": {
                gridArea: "content",
                padding: (listener) => themeSpacing(themeDensity(listener) * 4),
                color: (listener) => themeColor(listener, "shift-10", color.get(listener)),
            },
            "& > footer": {
                gridArea: "footer",
                display: "flex",
                gap: themeSpacing(2),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
                borderTop: (listener) => `1px solid ${themeColor(listener, "shift-3", color.get(listener))}`,
            },
        },
    };
}

export { card };
