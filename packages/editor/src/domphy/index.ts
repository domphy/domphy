import type { Listener } from "@domphy/core";
import { Editor } from "../Editor";
import type { Attributes, EditorInstance, EditorOptions } from "../types";

/**
 * Creates an editor without mounting it.
 *
 * The DOM host is supplied later by the {@link editorContent} patch, which owns
 * the mount/unmount lifecycle of the element it is applied to. Passing
 * `element` here would mount twice.
 *
 * @example
 * const editor = createEditor({ extensions: [starterKit()], content: "<p>Hi</p>" })
 * const App = { div: null, $: [editorContent(editor)] }
 */
function createEditor(options: EditorOptions = {}): EditorInstance {
  return new Editor({ ...options, element: null });
}

/**
 * Reader functions that re-evaluate on every editor transaction.
 *
 * `editor.stateVersion` is a Domphy `State` bumped once per transaction, so
 * reading it with a listener subscribes that listener to the editor. This is
 * the whole reactivity bridge — anything else you need can be written inline:
 *
 * ```ts
 * const isBold = (l) => { editor.stateVersion.get(l); return editor.isActive("bold") }
 * ```
 *
 * `editorState()` just names the two shapes that show up in every toolbar.
 */
function editorState(editor: EditorInstance) {
  const track = (listener: Listener) => {
    editor.stateVersion.get(listener);
  };

  return {
    /** Reactive `editor.isActive(...)` — for toolbar button active states. */
    isActive:
      (name: string, attrs?: Attributes) =>
      (listener: Listener): boolean => {
        track(listener);
        return editor.isActive(name, attrs);
      },
    /** Reactive read of anything else on the editor (`can()`, `getText()`, `isEmpty`, ...). */
    read:
      <T>(readEditor: (editor: EditorInstance) => T) =>
      (listener: Listener): T => {
        track(listener);
        return readEditor(editor);
      },
  };
}

export type { BubbleMenuProps } from "./bubbleMenu";
export { bubbleMenu } from "./bubbleMenu";
export type { EditorContentProps } from "./editorContent";
export { editorContent } from "./editorContent";
export { createEditor, editorState };
