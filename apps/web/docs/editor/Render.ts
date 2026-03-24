import { DomphyElement, State } from '@domphy/core'
import { themeSpacing, themeColor } from "@domphy/theme"

export const Render = (element: DomphyElement, checked: State<boolean>, hasGrid: State<boolean>): DomphyElement<"div"> => {
    return {
        div: [element],
        dataTheme: (listener) => checked.get(listener) ? "dark" : "light",
        style: {
            color: (listener) => themeColor(listener, "shift-9"),
            backgroundColor: (listener) => themeColor(listener),
            padding: themeSpacing(9),
            overflow:"auto",
            height: "100%",
            "&::before": {
                content: '""',
                position: "absolute",
                pointerEvents: "none",
                inset: 0,
                backgroundImage: (listener) => hasGrid.get(listener) ? `linear-gradient(to bottom,rgba(255, 124, 124, 0.3) 0.5px, transparent 0.5px)` : "none",
                backgroundSize: `1px ${themeSpacing(9)}`,
            },
            "&::after": {
                content: '""',
                position: "absolute",
                pointerEvents: "none",
                inset: 0,
                backgroundImage: (listener) => hasGrid.get(listener) ? `linear-gradient(to bottom,rgba(255, 122, 122, 0.3) 0.5px, transparent 0.5px)` : "none",
                backgroundSize: `1px ${themeSpacing(1)}`,
            }

        }
    }
}