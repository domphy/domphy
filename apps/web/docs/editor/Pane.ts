// Layer 4 - UI only, receives callback from parent

import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DomphyElement } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { basicSetup, EditorView } from "codemirror";

export function Pane(
  initialCode: string,
  onChange: (code: string) => void,
): DomphyElement<"div"> {
  return {
    div: [],
    _onMount: (node) => {
      new EditorView({
        doc: initialCode,
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChange(update.state.doc.toString());
          }),
        ],
        parent: node.domElement!,
      });
    },
    style: {
      borderRight: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      overflow: "auto",
      fontSize: "13px",
    },
  };
}
