/**
 * Resolves the extension list into everything the editor needs: the schema
 * registry, the merged command set, the keyboard shortcut map and the input
 * rules — all in priority order (higher priority first, default 100).
 */

import type { Extendable } from "./Extendable.js";
import { normalizeShortcut } from "./keymap.js";
import type { MarkSpec, NodeSpec } from "./model/schema.js";
import { Schema } from "./model/schema.js";
import type {
  AnyExtension,
  AttributeConfig,
  EditorInstance,
  ExtensionManagerLike,
  InputRule,
  MarkConfig,
  NodeConfig,
  RawCommands,
} from "./types.js";

type ShortcutHandler = (props: { editor: EditorInstance }) => boolean;

function flatten(extensions: AnyExtension[]): Extendable[] {
  const result: Extendable[] = [];
  for (const extension of extensions as Extendable[]) {
    result.push(extension);
    const addExtensions =
      extension.resolve<() => AnyExtension[]>("addExtensions");
    if (addExtensions) {
      result.push(...flatten(addExtensions()));
    }
  }
  return result;
}

function resolveExtensions(extensions: AnyExtension[]): Extendable[] {
  const flattened = flatten(extensions);
  const sorted = flattened
    .map((extension, index) => ({ extension, index }))
    .sort(
      (left, right) =>
        right.extension.priority - left.extension.priority ||
        left.index - right.index,
    )
    .map((entry) => entry.extension);
  const seen = new Set<string>();
  return sorted.filter((extension) => {
    if (seen.has(extension.name)) {
      return false;
    }
    seen.add(extension.name);
    return true;
  });
}

export class ExtensionManager implements ExtensionManagerLike {
  extensions: Extendable[];
  schema: Schema;
  commands: RawCommands;
  keyboardShortcuts: Record<string, ShortcutHandler>;
  inputRules: InputRule[];
  splittableMarks: string[];

  constructor(extensions: AnyExtension[], editor: EditorInstance) {
    this.extensions = resolveExtensions(extensions);

    for (const extension of this.extensions) {
      extension.editor = editor;
      const addStorage =
        extension.resolve<() => Record<string, unknown>>("addStorage");
      extension.storage = addStorage ? { ...addStorage() } : {};
    }

    this.schema = this.buildSchema();
    this.commands = this.buildCommands();
    this.keyboardShortcuts = this.buildKeyboardShortcuts();
    this.inputRules = this.buildInputRules();
    this.splittableMarks = this.extensions
      .filter(
        (extension) =>
          extension.kind === "mark" &&
          (extension.config as MarkConfig).keepOnSplit !== false,
      )
      .map((extension) => extension.name);
  }

  private buildSchema(): Schema {
    const schema = new Schema();
    for (const extension of this.extensions) {
      if (extension.kind !== "node" && extension.kind !== "mark") {
        continue;
      }
      const options = extension.options;
      const addAttributes = extension.resolve<
        () => Record<string, AttributeConfig>
      >("addAttributes", options);
      const spec = {
        ...(extension.config as NodeConfig & MarkConfig),
        name: extension.name,
        resolvedAttributes: addAttributes ? addAttributes() : {},
        parseHTML: extension.resolve("parseHTML", options),
        renderHTML: extension.resolve("renderHTML", options),
        renderText: extension.resolve("renderText", options),
      };
      if (extension.kind === "node") {
        schema.addNode(spec as unknown as NodeSpec);
      } else {
        schema.addMark(spec as unknown as MarkSpec);
      }
    }
    return schema;
  }

  private buildCommands(): RawCommands {
    let commands: RawCommands = {};
    for (const extension of this.extensions) {
      const addCommands = extension.resolve<() => RawCommands>("addCommands");
      if (addCommands) {
        commands = { ...commands, ...addCommands() };
      }
    }
    return commands;
  }

  private buildKeyboardShortcuts(): Record<string, ShortcutHandler> {
    const collected = new Map<string, ShortcutHandler[]>();
    for (const extension of this.extensions) {
      const addKeyboardShortcuts = extension.resolve<
        () => Record<string, ShortcutHandler>
      >("addKeyboardShortcuts");
      if (!addKeyboardShortcuts) {
        continue;
      }
      for (const [key, handler] of Object.entries(addKeyboardShortcuts())) {
        const normalized = normalizeShortcut(key);
        const handlers = collected.get(normalized) ?? [];
        handlers.push(handler);
        collected.set(normalized, handlers);
      }
    }
    const result: Record<string, ShortcutHandler> = {};
    for (const [key, handlers] of collected) {
      result[key] = (props) =>
        handlers.some((handler) => handler(props) === true);
    }
    return result;
  }

  private buildInputRules(): InputRule[] {
    const rules: InputRule[] = [];
    for (const extension of this.extensions) {
      const addInputRules =
        extension.resolve<() => InputRule[]>("addInputRules");
      if (addInputRules) {
        rules.push(...addInputRules());
      }
    }
    return rules;
  }

  /** Run a lifecycle hook (`onCreate`, `onUpdate`, …) on every extension. */
  emit(
    hook:
      | "onCreate"
      | "onUpdate"
      | "onSelectionUpdate"
      | "onFocus"
      | "onBlur"
      | "onDestroy",
  ): void {
    for (const extension of this.extensions) {
      extension.resolve<() => void>(hook)?.();
    }
  }
}
