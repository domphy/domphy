import { toState, type DomphyElement } from "@domphy/core";
import { themeSpacing, themeColor } from "@domphy/theme";
import Sortable from "sortablejs";

const items = toState([
  { id: 1, name: "Item A" },
  { id: 2, name: "Item B" },
  { id: 3, name: "Item C" },
  { id: 4, name: "Item D" },
]);

const App: DomphyElement<"ul"> = {
  ul: (listener) =>
    items.get(listener).map((item) => ({
      li: item.name,
      _key: item.id,
      style: {
        padding: themeSpacing(2),
        marginBottom: themeSpacing(1),
        borderRadius: themeSpacing(1),
        cursor: "grab",
        listStyle: "none",
        border: (l) => `1px solid ${themeColor(l, "shift-3")}`,
        backgroundColor: (l) => themeColor(l, "shift-1"),
      },
    })),
  _onMount: (node) => {
    Sortable.create(node.domElement as HTMLElement, {
      animation: 150,
      onEnd(evt) {
        // SortableJS already moved the DOM — pass false to sync logical tree only
        node.children.move(evt.oldIndex!, evt.newIndex!, false);
        const newOrder = node.children.items.map((c: any) => c.input);
        items.set(newOrder);
      },
    });
  },
  style: {
    padding: 0,
    margin: 0,
    maxWidth: themeSpacing(64),
  },
};

export default App;
