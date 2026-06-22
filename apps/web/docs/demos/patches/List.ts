import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { list, listItem, listItemButton, paragraph } from "@domphy/ui";

const selected = toState<string | null>(null);

const items = ["Inbox", "Sent", "Drafts", "Trash"];

const App: DomphyElement<"div"> = {
  div: [
    {
      ul: items.map((label) => ({
        li: {
          button: label,
          ariaSelected: (l: unknown) =>
            selected.get(l as Parameters<typeof selected.get>[0]) === label
              ? "true"
              : undefined,
          onClick: () => selected.set(label),
          $: [listItemButton()],
        },
        $: [listItem()],
      })),
      $: [list()],
      style: { width: "200px" },
    },
    {
      p: (l) => `Selected: ${selected.get(l) ?? "none"}`,
      $: [paragraph()],
    },
  ],
  style: { display: "flex", gap: "2rem", alignItems: "flex-start" },
};

export default App;
