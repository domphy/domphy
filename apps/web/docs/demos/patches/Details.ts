import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { details } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      details: [
        {
          summary: "What is Domphy?",
        },
        {
          p: "Domphy is a composable UI framework focused on patches that style and extend semantic elements.",
        },
      ],
      open: true,
      $: [details()],
    },
    {
      details: [
        {
          summary: "Can I customize marker color and animation?",
        },
        {
          p: "Yes. Use accentColor and duration props in the details patch to tune marker tone and transition speed.",
        },
      ],
      $: [details({ accentColor: "secondary", duration: 320 })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
