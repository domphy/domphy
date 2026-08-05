import { type DomphyElement, toState } from "@domphy/core";
import { generateRamp, themeSpacing } from "@domphy/theme";
import { heading, row, small, stack } from "@domphy/ui";

const base = toState("#4a7ff4");

const App: DomphyElement<"div"> = {
  div: [
    { h2: "18-step ramp from one anchor color", $: [heading()] },
    {
      div: [
        { small: "Base color", $: [small()] },
        {
          input: null,
          type: "color",
          value: (l) => base.get(l),
          onInput: (e) => base.set((e.target as HTMLInputElement).value),
          style: {
            width: themeSpacing(12),
            height: themeSpacing(8),
            padding: "0",
            border: "none",
            background: "none",
            cursor: "pointer",
          },
        },
        { small: (l) => base.get(l), $: [small()] },
      ],
      $: [row()],
    },
    {
      div: (l) =>
        generateRamp(base.get(l), 18).map((hex, index) => ({
          div: [
            {
              div: null,
              // Swatch colors ARE the data here — generated hexes, not theme
              // tokens — so the raw-theme-value info rule is silenced on
              // purpose (documented inline suppression).
              _doctorDisable: "raw-theme-value",
              style: {
                height: themeSpacing(12),
                borderRadius: themeSpacing(1),
                backgroundColor: hex,
              },
            },
            { small: String(index), $: [small()], dataSize: "decrease-2" },
          ],
          _key: hex,
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: themeSpacing(1),
            flex: "1",
          },
        })),
      style: { display: "flex", gap: themeSpacing(1) },
    },
    {
      small:
        "generateRamp(base, 18) builds a WCAG-span-optimized ramp via warped Oklab interpolation — the same generator behind generateTheme().",
      $: [small()],
    },
  ],
  $: [stack()],
};

export default App;
