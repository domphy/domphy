import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DomphyElement, State } from "@domphy/core";
import { basicSetup, EditorView } from "codemirror";

/**
 * Full-bleed TypeScript editor. Fills its host — the playground is
 * responsible for giving this host a real height (tabs or split pane).
 */
export function Editor(code: State<string>): DomphyElement<"div"> {
  return {
    div: [],
    _onMount: (node) => {
      const host = node.domElement as HTMLElement;
      const view = new EditorView({
        doc: code.get(),
        extensions: [
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px",
              backgroundColor: "#0d1117",
            },
            "&.cm-focused": {
              outline: "none",
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily:
                'var(--dp-font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace)',
              lineHeight: "1.6",
              paddingInline: "4px",
            },
            ".cm-content": {
              paddingTop: "16px",
              paddingBottom: "48px",
              caretColor: "#58a6ff",
            },
            ".cm-gutters": {
              minHeight: "100%",
              backgroundColor: "#0d1117",
              borderRight: "1px solid #21262d",
              color: "#6e7681",
            },
            ".cm-activeLineGutter": {
              backgroundColor: "#161b22",
              color: "#e6edf3",
            },
            ".cm-activeLine": {
              backgroundColor: "rgba(56, 139, 253, 0.08)",
            },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
              backgroundColor: "rgba(56, 139, 253, 0.3) !important",
            },
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) code.set(update.state.doc.toString());
          }),
        ],
        parent: host,
      });
      // If the host is resized (tab switch / splitter), keep CM measuring
      // against the real box — requestMeasure on a ResizeObserver.
      if (typeof ResizeObserver === "function") {
        const ro = new ResizeObserver(() => view.requestMeasure());
        ro.observe(host);
        node.addHook("Remove", () => {
          ro.disconnect();
          view.destroy();
        });
      } else {
        node.addHook("Remove", () => view.destroy());
      }
    },
    style: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minWidth: 0,
      minHeight: 0,
      height: "100%",
      overflow: "hidden",
    },
  };
}
