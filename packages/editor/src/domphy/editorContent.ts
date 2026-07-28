import {
  type BehaviorInstance,
  behavior,
  type ElementNode,
  type PartialElement,
  toState,
  type ValueOrState,
} from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import type { EditorInstance } from "../types";

type EditorContentProps = {
  editor: EditorInstance;
};

// One behavior instance per host element: `attach` mounts the editor's view
// into the real DOM node exactly once, and every later generation of the patch
// factory (a reactive ancestor re-rendering the host) routes its fresh props
// into that SAME instance through `update` instead of mounting a second view
// onto the same element. `destroy` unmounts once, when the host leaves the DOM.
function attachEditorContent(
  node: ElementNode,
  initialProps: EditorContentProps,
): BehaviorInstance<EditorContentProps> {
  let { editor } = initialProps;
  const host = node.domElement as HTMLElement;

  editor.mount(host);

  return {
    update(props) {
      if (props.editor === editor) return;
      // Swapping to a different Editor instance on a live host: detach the old
      // view before the new one takes the element, otherwise both keep their
      // `beforeinput`/selection listeners on it.
      editor.unmount();
      editor = props.editor;
      editor.mount(host);
    },
    destroy() {
      editor.unmount();
    },
  };
}

/**
 * Attaches an {@link EditorInstance} to the host element and styles the
 * editing surface with theme tokens.
 *
 * The host MUST declare `null` content — `{ div: null, $: [editorContent(e)] }`
 * — never `[]`. An empty array declares a children set, which makes
 * reconciliation prune inside the contenteditable and fight the editor's own
 * view; `null` means "no children declared", so the editor-owned subtree is
 * left alone.
 *
 * Typography inside the editable area is intentionally left to the theme and
 * the browser's own tag defaults — the content is real `p`/`h1`-`h6`/`strong`/
 * `em` markup, so it inherits the document type scale. Only structural rhythm
 * (block margins, list indent, quote/code chrome) is declared here.
 *
 * @hostTag div
 * @param editor - The editor to mount into this element.
 * @param props.color - Theme color for the surface text and outline. Optional, accepts a value or state. Defaults to `"neutral"`.
 * @param props.accentColor - Theme color for the focus ring. Optional, accepts a value or state. Defaults to `"primary"`.
 * @param props.minHeight - Minimum editing height in theme spacing units. Optional. Defaults to `40` (10em).
 * @example { div: null, $: [editorContent(editor)] }
 */
function editorContent(
  editor: EditorInstance,
  props: {
    color?: ValueOrState<ThemeColor>;
    accentColor?: ValueOrState<ThemeColor>;
    minHeight?: number;
  } = {},
): PartialElement {
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");
  const { minHeight = 40 } = props;

  return {
    ...behavior<EditorContentProps>("dp-editor", attachEditorContent, {
      editor,
    }),
    style: {
      minHeight: themeSpacing(minHeight),
      paddingInline: (listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      outlineOffset: "-1px",
      outline: (listener) =>
        `1px solid ${themeColor(listener, "border-strong", color.get(listener))}`,
      transition: "outline-color 140ms ease, box-shadow 140ms ease",
      "&:focus-within": {
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-5", accentColor.get(listener))}`,
        // Ring-offset focus ring, same shape as @domphy/ui's shared helper: a
        // surface-tone gap then an accent halo, layered as box-shadow so it
        // composes with the resting outline instead of replacing it.
        boxShadow: (listener) =>
          `0 0 0 2px ${themeColor(listener, "surface", color.get(listener))}, 0 0 0 4px ${themeColor(listener, "shift-9", accentColor.get(listener))}`,
      },
      "& p, & h1, & h2, & h3, & h4, & h5, & h6, & ul, & ol, & blockquote, & pre":
        {
          marginBlock: themeSpacing(3),
        },
      "& > *:first-child": {
        marginBlockStart: 0,
      },
      "& > *:last-child": {
        marginBlockEnd: 0,
      },
      "& ul, & ol": {
        paddingInlineStart: themeSpacing(6),
      },
      "& li": {
        marginBlock: themeSpacing(1),
      },
      "& blockquote": {
        paddingInlineStart: themeSpacing(3),
        marginInline: 0,
        borderInlineStart: (listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "border-strong", color.get(listener))}`,
        color: (listener) => themeColor(listener, "muted", color.get(listener)),
      },
      "& code": {
        paddingInline: themeSpacing(1),
        paddingBlock: themeSpacing(0.5),
        borderRadius: themeSpacing(1),
        backgroundColor: (listener) =>
          themeColor(listener, "surface", color.get(listener)),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
      },
      "& pre": {
        padding: themeSpacing(3),
        borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
        overflowX: "auto",
        backgroundColor: (listener) =>
          themeColor(listener, "surface", color.get(listener)),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
      },
      // A code block's own surface already carries the tone — the inline
      // `code` chrome nested inside it would double it up.
      "& pre code": {
        padding: 0,
        backgroundColor: (listener) =>
          themeColor(listener, "inherit", color.get(listener)),
      },
      "& hr": {
        border: "none",
        blockSize: themeSpacing(0.25),
        backgroundColor: (listener) =>
          themeColor(listener, "border", color.get(listener)),
        color: (listener) => themeColor(listener, "text", color.get(listener)),
      },
      "& a": {
        color: (listener) => themeColor(listener, "shift-9", "primary"),
      },
    },
  };
}

export { editorContent };
export type { EditorContentProps };
