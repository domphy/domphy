import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { stepItem, steps } from "@domphy/ui";

const current = toState(1);

const App: DomphyElement<"div"> = {
  div: [
    {
      ol: [
        { li: "Account", $: [stepItem()] },
        { li: "Details", $: [stepItem()] },
        { li: "Payment", $: [stepItem()] },
        { li: "Confirm", $: [stepItem()] },
      ],
      $: [steps({ current })],
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
