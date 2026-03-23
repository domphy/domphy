import { type PartialElement, type Listener } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing,themeColorToken } from "@domphy/theme";

function select(
    props: { color?: ThemeColor; accentColor?: ThemeColor } = {}
): PartialElement {
    const { color = "neutral", accentColor = "primary" } = props;

    return {
        _onInsert: (node) => {
            if (node.tagName != "select") {
                console.warn(`"select" primitive patch must use select tag`);
            }
        },
        style: {
            appearance: "none",
            fontFamily: "inherit",
            fontSize: (listener) => themeSize(listener, "inherit"),
            lineHeight: "inherit",
            color: (listener) => themeColor(listener, "shift-9", color),
            backgroundColor: (listener) => themeColor(listener, "inherit", color),
            border: "none",
            outlineOffset: "-1px",
            outline: (listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
            borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
            paddingLeft: (listener) => themeSpacing(themeDensity(listener) * 3),
            paddingRight: (listener) => themeSpacing(themeDensity(listener) * 5),
            backgroundImage:(l: Listener)=>{
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" stroke="${themeColorToken(l, "shift-7")}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`
            return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
          } ,
            backgroundRepeat: "no-repeat",
            backgroundPosition: `right ${themeSpacing(2)} center`,
            backgroundSize: `${themeSpacing(2.5)} ${themeSpacing(1.5)}`,
            "&:not([multiple])": {
                height: (listener) => themeSpacing(6 + themeDensity(listener) * 2),
            },
            "&:hover:not([disabled]):not([aria-busy=true])": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-5", accentColor)}`,
            },
            "&:focus-visible": {
                outline: (listener) => `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", accentColor)}`,
            },
            "& optgroup": {
                color: (listener) => themeColor(listener, "shift-11", color),
            },
            "& option[disabled]": {
                color: (listener) => themeColor(listener, "shift-7", "neutral"),
            },
            "&[disabled]": {
                opacity: 0.7,
                cursor: "not-allowed",
                color: (listener) => themeColor(listener, "shift-8", "neutral"),
                outline: (listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
                backgroundColor: (listener) => themeColor(listener, "shift-2", "neutral"),
            }
        },
    };
}

export { select };
