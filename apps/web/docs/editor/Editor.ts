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
          // Without a bounded height CodeMirror sizes .cm-editor to its
          // CONTENT, and the host's overflow:hidden clips long demos with no
          // scrollbar at all. Pinning the editor to the host makes
          // .cm-scroller the real (internal) scroll container.
          EditorView.theme({
            "&": { height: "100%" },
            ".cm-scroller": { overflow: "auto" },
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
      // CodeMirror's own `.cm-scroller` already scrolls internally — an
      // "auto" here would add a second, overlapping scrollbar.
      overflow: "hidden",
    },
  };
}
