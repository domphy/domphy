import { type DomphyElement } from "@domphy/core"

const families = [
  "neutral",
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "attention",
  "error",
  "danger",
  "highlight",
]

const row = (family: string): DomphyElement<"div"> => ({
  div: [
    {
      span: family,
      style: {
        fontFamily: "monospace",
        fontSize: "0.75rem",
        display: "inline-block",
        minWidth: "84px",
        paddingTop: "4px",
      },
    },
    {
      div: Array.from({ length: 18 }, (_, i) => ({
        div: "",
        style: {
          backgroundColor: `var(--${family}-${i})`,
          width: "32px",
          height: "32px",
          flexShrink: "0",
        },
        title: `--${family}-${i}`,
      })),
      style: {
        display: "flex",
      },
    },
  ],
  style: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
  },
})

const App: DomphyElement<"div"> = {
  div: families.map(row),
  dataTheme: "light",
  style: {
    padding: "16px",
    fontFamily: "system-ui, sans-serif",
  },
}

export default App
