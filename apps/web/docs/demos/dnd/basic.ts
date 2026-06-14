import { type DomphyElement, toState } from "@domphy/core";
import { dragDrop } from "@domphy/dnd";
import { themeColor, themeSpacing } from "@domphy/theme";

const items = toState([
  { id: 1, label: "🍎 Apple" },
  { id: 2, label: "🍌 Banana" },
  { id: 3, label: "🍒 Cherry" },
  { id: 4, label: "🍇 Grape" },
  { id: 5, label: "🍊 Orange" },
]);

const App: DomphyElement<"div"> = {
  div: [
    { p: "Drag to reorder:" },
    {
      ul: (l) =>
        items.get(l).map((item) => ({
          li: item.label,
          _key: item.id,
          style: {
            padding: themeSpacing(3),
            marginBlock: themeSpacing(1),
            borderRadius: themeSpacing(2),
            backgroundColor: (cl) => themeColor(cl, "shift-2"),
            color: (cl) => themeColor(cl, "shift-9"),
            outline: (cl) => `1px solid ${themeColor(cl, "shift-4")}`,
            cursor: "grab",
            userSelect: "none",
          },
        })),
      $: [dragDrop(items)],
      style: { listStyle: "none", padding: "0", margin: "0" },
    },
    {
      p: (l) =>
        `Order: ${items
          .get(l)
          .map((i) => i.id)
          .join(", ")}`,
      dataSize: "decrease-1",
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
    maxWidth: themeSpacing(70),
  },
};

export default App;
