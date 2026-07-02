import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { small } from "@domphy/ui";

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
];

const row = (family: string): DomphyElement<"div"> => ({
  div: [
    {
      small: family,
      $: [small()],
      style: { display: "inline-block", minWidth: themeSpacing(21) },
    } as DomphyElement<"small">,
    {
      div: Array.from({ length: 18 }, (_, i) => ({
        div: "",
        // Decorative color swatch, no text content — "missing-color" would
        // otherwise ask for a color that has nothing to apply to.
        _doctorDisable: "missing-color",
        style: {
          backgroundColor: `var(--${family}-${i})`,
          width: themeSpacing(8),
          height: themeSpacing(8),
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
    gap: themeSpacing(2),
    marginBottom: themeSpacing(1),
  },
});

const App: DomphyElement<"div"> = {
  div: families.map(row),
  dataTheme: "light",
  style: {
    padding: themeSpacing(4),
  },
};

export default App;
