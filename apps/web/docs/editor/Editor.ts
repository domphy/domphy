import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DomphyElement, State } from "@domphy/core";
import { themeColor } from "@domphy/theme";
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
          // THIS THEME MUST STAY AHEAD OF `oneDark`. EditorView mounts theme
          // StyleModules with `.reverse()` (@codemirror/view, its single
          // StyleModule.mount call), so the EARLIEST theme in this array is
          // written LAST into the sheet and wins every equal-specificity
          // clash — the opposite of normal CSS intuition. While this sat
          // after oneDark, every rule below that oneDark also declares was
          // dead code: the editor painted oneDark's #282c34 instead of the
          // #0d1117 surface these colors are contrast-checked against, and
          // axe flagged 3 token/gutter colors at 3.86-4.43:1.
          EditorView.theme({
            "&": {
              height: "100%",
              fontSize: "14px",
              backgroundColor: "#0d1117",
            },
            // Focus ring: the design-system focusRing() box-shadow pattern
            // cannot be used here — every playground wrapper up to
            // .dp-playground clips with overflow:hidden (an outer box-shadow
            // would be invisible), and an inset box-shadow would paint UNDER
            // the editor's opaque children (gutters/content). An outline
            // paints above descendants and ignores ancestor clipping; the
            // negative offset keeps it inside the editor bounds. shift-9 is
            // the same accent tone focusRing() uses for its halo, and the
            // themeColor() var reference follows site theme flips.
            "&.cm-focused": {
              outline: `2px solid ${themeColor(node, "shift-9", "primary")}`,
              outlineOffset: "-2px",
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
              // GitHub Primer dark `--fgColor-muted`. The Primer
              // `--fgColor-subtle` (#6e7681) this used to carry is only
              // 4.12:1 on #0d1117 and 3.77:1 on the #161b22 active-line
              // gutter — both under WCAG AA 4.5:1 for 14px text. #8b949e
              // measures 6.15:1 and 5.62:1 on those two backgrounds.
              color: "#8b949e",
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
          basicSetup,
          javascript({ typescript: true }),
          oneDark,
          // Name the editable region — axe aria-input-field-name.
          // contentAttributes is a Facet: set values with .of(), not a call.
          // tabindex makes the tab stop EXPLICIT: .cm-scroller scrolls
          // horizontally below ~600px, and axe's scrollable-region-focusable
          // looks for a focusable descendant using isNativelyFocusable, whose
          // nodeName switch has no contenteditable branch (axe-core 4.12.1).
          // .cm-content is already tabbable via contenteditable, so this
          // changes no focus order — it just states the tab stop in markup.
          EditorView.contentAttributes.of({
            "aria-label": "Code editor",
            tabindex: "0",
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
