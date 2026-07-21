import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { steps } from "@domphy/ui";

const current = toState(1);

const App: DomphyElement<"div"> = {
  div: [
    {
      ol: null,
      $: [
        steps({
          current,
          items: [
            { label: "Account" },
            { label: "Details" },
            { label: "Payment" },
            { label: "Confirm" },
          ],
        }),
      ],
    },
    {
      div: [
        {
          button: "Back",
          onClick: () => {
            const val = current.get();
            if (val > 0) current.set(val - 1);
          },
        },
        {
          button: "Next",
          onClick: () => {
            const val = current.get();
            if (val < 3) current.set(val + 1);
          },
        },
      ],
      style: {
        display: "flex",
        gap: themeSpacing(2),
        marginTop: themeSpacing(4),
      },
    },
  ],
};

export default App;
