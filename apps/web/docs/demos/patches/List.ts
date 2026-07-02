import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { list, listItem, listItemButton, paragraph } from "@domphy/ui";

const selected = toState<string | null>(null);

const items = ["Inbox", "Sent", "Drafts", "Trash"];

const App: DomphyElement<"div"> = {
  div: [
    {
      ul: items.map(
        (label): DomphyElement<"li"> => ({
          li: {
            button: label,
            onClick: () => selected.set(label),
            $: [listItemButton()],
          } as any,
          ariaSelected: (l) => (selected.get(l) === label ? "true" : undefined),
          $: [listItem()],
          // Text color is set by the button child (listItemButton()) — the
          // li itself carries no text.
          _doctorDisable: "missing-color",
        }),
      ),
      $: [list()],
      style: { width: "200px" },
    },
    {
      p: (l) => `Selected: ${selected.get(l) ?? "none"}`,
      $: [paragraph()],
    },
  ],
  style: { display: "flex", gap: themeSpacing(8), alignItems: "flex-start" },
};

export default App;
