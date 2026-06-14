import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { createVirtualizer } from "@domphy/virtual/domphy";

const rows = Array.from({ length: 10000 }, (_, i) => `Row #${i + 1}`);

const list = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: rows.length,
  estimateSize: () => 32,
  overscan: 10,
});

const App: DomphyElement<"div"> = {
  div: [
    {
      // total-size spacer; only visible rows are mounted, absolutely positioned
      div: (l) =>
        list.getVirtualItems(l).map((item) => ({
          div: rows[item.index],
          style: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: `${item.size}px`,
            transform: `translateY(${item.start}px)`,
            display: "flex",
            alignItems: "center",
            paddingInline: themeSpacing(3),
            boxSizing: "border-box",
            color: (cl) => themeColor(cl, "shift-9"),
            borderBottom: (cl) => `1px solid ${themeColor(cl, "shift-3")}`,
          },
          _key: item.key,
        })),
      style: {
        position: "relative",
        width: "100%",
        height: (l) => `${list.getTotalSize(l)}px`,
      },
    },
  ],
  style: {
    height: "320px",
    overflow: "auto",
    outline: (l) => `1px solid ${themeColor(l, "shift-4")}`,
    borderRadius: themeSpacing(2),
  },
  _onMount: (node) => list.setScrollElement(node.domElement as HTMLDivElement),
  _onRemove: () => list.destroy(),
};

export default App;
