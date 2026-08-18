import { behavior, type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { menu } from "@domphy/ui";

const open = toState(false);
const x = toState(0);
const y = toState(0);

const contextMenu: DomphyElement<"div"> = {
  div: null,
  $: [
    menu({
      selectable: false,
      items: [
        { label: "Cut", onClick: () => open.set(false) },
        { label: "Copy", onClick: () => open.set(false) },
        { label: "Paste", onClick: () => open.set(false) },
      ],
    }),
    // Document-level dismiss must survive a reactive parent re-rendering
    // this node: _onMount would only fire for the first generation.
    behavior(
      "context-menu-dismiss",
      (node) => {
        const close = (e: MouseEvent) => {
          if (!node.domElement!.contains(e.target as Node)) open.set(false);
        };
        document.addEventListener("click", close);
        return {
          destroy: () => document.removeEventListener("click", close),
        };
      },
      {},
    ),
  ],
  style: {
    position: "fixed",
    left: (listener) => `${x.get(listener)}px`,
    top: (listener) => `${y.get(listener)}px`,
    zIndex: 50,
    minWidth: "10rem",
    display: (listener) => (open.get(listener) ? "flex" : "none"),
    pointerEvents: (listener) => (open.get(listener) ? "auto" : "none"),
  },
  // Text color is set by the menuitem buttons the menu() patch renders —
  // the outer container itself carries no text.
  _doctorDisable: "missing-color",
};

const App: DomphyElement<"div"> = {
  div: [{ p: "Right-click anywhere in this area" }, contextMenu],
  style: {
    padding: themeSpacing(8),
    userSelect: "none",
    minHeight: "8rem",
    border: "2px dashed currentColor",
    borderRadius: "0.5rem",
    cursor: "context-menu",
  },
  onContextMenu: (e: MouseEvent) => {
    e.preventDefault();
    x.set(e.clientX);
    y.set(e.clientY);
    open.set(true);
  },
};

export default App;
