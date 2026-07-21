import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DomphyElement, State } from "@domphy/core";
import { basicSetup, EditorView } from "codemirror";

export function Editor(code: State<string>): DomphyElement<"div"> {
  return {
    div: [],
    _onMount: (node) => {
      new EditorView({
        doc: code.get(),
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          // Pin editor to host height so .cm-scroller is the real scroll
          // container (content-sized editor + overflow:hidden = no scrollbar).
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "13.5px",
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily:
                "var(--dp-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)",
              lineHeight: "1.55",
            },
            ".cm-content": {
              paddingTop: "12px",
              paddingBottom: "24px",
            },
            ".cm-gutters": {
              minHeight: "100%",
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) code.set(update.state.doc.toString());
          }),
        ],
        parent: node.domElement!,
      });
    },
    style: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      // CodeMirror's own `.cm-scroller` already scrolls internally.
      overflow: "hidden",
    },
  };
}
