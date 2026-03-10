import { type DomphyElement } from '@domphy/core'
import { figure } from "@domphy/ui"
import { themeColor, themeSpacing } from "@domphy/theme"

const App: DomphyElement<"figure"> = {
    figure: [
        {
            svg: [
                {
                    circle: null,
                    cx: "50",
                    cy: "50",
                    r: "42",
                    fill: "none",
                    strokeWidth: "8",
                    style: {
                        stroke: (listener) => themeColor(listener, "shift-3", "neutral"),
                    },
                },
                {
                    circle: null,
                    cx: "50",
                    cy: "50",
                    r: "42",
                    fill: "none",
                    strokeWidth: "8",
                    strokeLinecap: "round",
                    strokeDasharray: "264",
                    strokeDashoffset: "74",
                    style: {
                        stroke: (listener) => themeColor(listener, "shift-6", "primary"),
                    },
                },
            ],
            viewBox: "0 0 100 100",
            role: "img",
            ariaLabel: "Completion chart",
            style: {
                width: "100%",
                maxWidth: themeSpacing(40),
                backgroundColor: (listener) => themeColor(listener, "shift-1", "neutral"),
                padding: themeSpacing(3),
                borderRadius: themeSpacing(2),
            },
        },
        {
            figcaption: "Figure 1. Circular completion chart with context-aware colors.",
        },
    ],
    $: [figure()],
}

export default App
