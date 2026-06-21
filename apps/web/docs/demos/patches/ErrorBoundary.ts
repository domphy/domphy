import { type DomphyElement, toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { button, errorBoundary, paragraph } from "@domphy/ui";

const shouldThrow = toState(false);

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Trigger Error",
      $: [button({ color: "danger" })],
      onClick: () => shouldThrow.set(true),
    },
    {
      div: (l) => {
        if (shouldThrow.get(l)) throw new Error("Something went wrong!");
        return [{ p: "Content loaded successfully.", $: [paragraph()] }];
      },
      $: [
        errorBoundary({
          fallback: (error, reset) => ({
            div: [
              {
                p: `Error: ${error instanceof Error ? error.message : String(error)}`,
                $: [paragraph()],
                style: { color: (cl) => themeColor(cl, "shift-9", "danger") },
              },
              {
                button: "Reset",
                $: [button()],
                onClick: () => {
                  shouldThrow.set(false);
                  reset();
                },
              },
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(2),
              padding: themeSpacing(3),
              borderRadius: themeSpacing(1),
              backgroundColor: (cl) => themeColor(cl, "shift-2", "danger"),
            },
          }),
          onError: (error) => console.error("[errorBoundary]", error),
        }),
      ],
      style: { minHeight: themeSpacing(8) },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    alignItems: "start",
    gap: themeSpacing(4),
  },
};

export default App;
