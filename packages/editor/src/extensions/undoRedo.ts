import { Extension } from "../Extendable";

export interface UndoRedoOptions {
  /** How many history entries are kept before the oldest are dropped. */
  depth: number;
  /** Idle time in milliseconds after which edits start a new history group. */
  newGroupDelay: number;
}

/**
 * History keymap and configuration.
 *
 * `undo()` and `redo()` are generic engine commands, so this extension only
 * contributes the options the history stack reads and the shortcuts that
 * invoke them — registering commands of the same name here would recurse.
 */
export const UndoRedo = Extension.create<UndoRedoOptions>({
  name: "undoRedo",

  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500,
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-z": ({ editor }) => editor.commands.undo(),
      "Shift-Mod-z": ({ editor }) => editor.commands.redo(),
      "Mod-y": ({ editor }) => editor.commands.redo(),
    };
  },
});
