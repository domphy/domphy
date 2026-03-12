import { type DomphyElement } from "@domphy/core"
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme"

const App: DomphyElement<"div"> = {
  div: [
    {
      h2: "Theme Overview",
      style: {
        marginBlock: `0 0 ${themeSpacing(3)}`,
        fontSize: (listener) => themeSize(listener, "increase-1"),
      },
    },
    {
      button: "Save",
      style: {
        fontSize: (listener) => themeSize(listener, "inherit"),
        paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
        paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
        border: "none",
        backgroundColor: (listener) => themeColor(listener, "inherit", "primary"),
        color: (listener) => themeColor(listener, "shift-9", "primary"),
      },
    },
  ],
  dataTheme: "light",
  dataTone: "shift-1",
}

export default App
