import { type PartialElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing, type ThemeColor } from "@domphy/theme";

function card(props: { color?: ThemeColor } = {}): PartialElement {
    const { color = "neutral" } = props;
    return {
        style: {
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gridTemplateAreas: '"image image" "title aside" "desc aside" "content content" "footer footer"',
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 2),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            color: (listener) => themeColor(listener, "shift-7", color),
            outline: (listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
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
                color: (listener) => themeColor(listener, "shift-6", color),
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
                color: (listener) => themeColor(listener, "shift-7", color),
            },
            "& > footer": {
                gridArea: "footer",
                display: "flex",
                gap: themeSpacing(2),
                paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 2),
                paddingInline: (listener) => themeSpacing(themeDensity(listener) * 4),
                borderTop: (listener) => `1px solid ${themeColor(listener, "shift-2", color)}`,
            },
        },
    };
}

export { card };
