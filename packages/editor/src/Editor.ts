/**
 * The Editor: state container, transaction dispatcher and event hub.
 *
 * `stateVersion` is the Domphy reactivity bridge — reading it with a listener
 * subscribes that listener to every transaction, so a UI can write
 * `(l) => { editor.stateVersion.get(l); return editor.isActive("bold") }`.
 */

import { toState } from "@domphy/core";

import { CommandManager } from "./CommandManager.js";
import { generalCommands } from "./commands/index.js";
import { Extension } from "./Extendable.js";
import { ExtensionManager } from "./ExtensionManager.js";
import { History } from "./history.js";
import { runInputRules } from "./inputRules.js";
import { getMarkAttributes, getNodeAttributes, isActive } from "./isActive.js";
import { contentSize, endPosition, startPosition } from "./model/position.js";
import type { Schema } from "./model/schema.js";
import { generateHTML, parseHTML } from "./serialize/html.js";
import { createDocument, toJSON } from "./serialize/json.js";
import { generateText } from "./serialize/text.js";
import { createSelection, EditorTransaction } from "./Transaction.js";
import type {
  AnyExtension,
  Attributes,
  CanCommands,
  ChainedCommands,
  Content,
  EditorEventName,
  EditorInstance,
  EditorOptions,
  EditorStateLike,
  JSONContent,
  SelectionRange,
  SingleCommands,
  Transaction,
} from "./types.js";
import { EditorView } from "./view/index.js";

type EventCallback = (...args: unknown[]) => void;

function selectionEquals(left: SelectionRange, right: SelectionRange): boolean {
  return left.anchor === right.anchor && left.head === right.head;
}

/**
 * Whether a change continues the run of typing before it.
 *
 * Only single-character edits at a collapsed caret keep collapsing into the
 * open undo step. Anything else — toggling a mark over a selection, a
 * structural command, a paste — becomes its own step even when it happens
 * within the grouping delay, so undo after bolding does not also erase the
 * sentence that was typed a moment earlier.
 */
function continuesTyping(
  before: SelectionRange,
  after: SelectionRange,
): boolean {
  if (!before.empty || !after.empty) {
    return false;
  }
  const delta = after.from - before.from;
  return delta === 0 || delta === 1 || delta === -1;
}

export class Editor implements EditorInstance {
  options: EditorOptions;
  state: EditorStateLike;
  extensionManager: ExtensionManager;
  history: History;
  view: EditorView | null = null;
  isFocused = false;
  isDestroyed = false;
  readonly stateVersion = toState(0, "editorStateVersion");

  private readonly commandManager: CommandManager;
  private readonly listeners = new Map<EditorEventName, Set<EventCallback>>();
  private editable: boolean;
  /**
   * Set by a dispatch carrying the `appendNextToHistoryGroup` meta: the next
   * document change joins the open history group instead of starting its own.
   * Used when one user gesture (Enter autolinking a URL) is applied as two
   * transactions (mark, then splitBlock) but must undo in a single step.
   */
  private appendNextToHistoryGroup = false;

  constructor(options: EditorOptions = {}) {
    this.options = { ...options };
    this.editable = options.editable ?? true;

    const builtInCommands = Extension.create({
      name: "commands",
      addCommands: () => generalCommands,
    });
    const extensions: AnyExtension[] = [
      builtInCommands,
      ...(options.extensions ?? []),
    ];
    this.extensionManager = new ExtensionManager(extensions, this);

    const undoRedoOptions = this.extensionManager.extensions.find(
      (extension) => extension.name === "undoRedo",
    )?.options;
    this.history = new History(
      (undoRedoOptions?.depth as number) ?? 100,
      (undoRedoOptions?.newGroupDelay as number) ?? 500,
    );

    const doc = this.createDocument(options.content ?? null);
    const start = startPosition(this.schema, doc);
    this.state = {
      doc,
      selection: createSelection(start, start),
      storedMarks: null,
    };
    this.commandManager = new CommandManager(this);

    if (options.element) {
      this.mount(options.element);
    }

    this.emit("create");
    this.extensionManager.emit("onCreate");
    options.onCreate?.({ editor: this });

    if (
      options.autofocus !== undefined &&
      options.autofocus !== null &&
      options.autofocus !== false
    ) {
      this.commands.focus(options.autofocus);
    }
  }

  get schema(): Schema {
    return this.extensionManager.schema;
  }

  get isEditable(): boolean {
    return this.editable;
  }

  get isEmpty(): boolean {
    const children = this.state.doc.content ?? [];
    return (
      children.length <= 1 &&
      generateText(this.schema, this.state.doc, "") === ""
    );
  }

  get commands(): SingleCommands {
    return this.commandManager.commands;
  }

  chain(): ChainedCommands {
    return this.commandManager.chain();
  }

  can(): CanCommands {
    return this.commandManager.can();
  }

  // -------------------------------------------------------------------------
  // Transactions
  // -------------------------------------------------------------------------

  createTransaction(): Transaction {
    return new EditorTransaction(
      this.schema,
      this.state.doc,
      this.state.selection,
      this.state.storedMarks,
    );
  }

  dispatch(tr: Transaction): void {
    if (this.isDestroyed) {
      return;
    }
    const previous = this.state;
    const docChanged = tr.doc !== previous.doc;
    const selectionChanged = !selectionEquals(tr.selection, previous.selection);

    if (docChanged && tr.getMeta("addToHistory") !== false) {
      this.history.record(
        previous,
        Date.now(),
        continuesTyping(previous.selection, tr.selection) ||
          this.appendNextToHistoryGroup,
      );
    }

    if (docChanged) {
      this.appendNextToHistoryGroup =
        tr.getMeta("appendNextToHistoryGroup") === true;
    }

    this.state = {
      doc: tr.doc,
      selection: tr.selection,
      storedMarks: tr.storedMarks,
    };

    if (docChanged) {
      this.view?.render();
    } else if (selectionChanged) {
      this.view?.syncSelection();
    }

    if (tr.getMeta("focus")) {
      this.view?.focus();
    }
    if (tr.getMeta("blur")) {
      this.view?.blur();
    }
    if (tr.getMeta("scrollIntoView")) {
      this.view?.scrollSelectionIntoView();
    }

    if (
      docChanged ||
      selectionChanged ||
      tr.storedMarks !== previous.storedMarks
    ) {
      this.stateVersion.set(this.stateVersion.get() + 1);
    }

    if (docChanged && !tr.getMeta("preventUpdate")) {
      this.emit("update", { editor: this, transaction: tr });
      this.extensionManager.emit("onUpdate");
      this.options.onUpdate?.({ editor: this, transaction: tr });
    }
    if (selectionChanged) {
      this.emit("selectionUpdate");
      this.extensionManager.emit("onSelectionUpdate");
      this.options.onSelectionUpdate?.({ editor: this });
    }
  }

  /** Selection-only update coming from the DOM — no history, no re-render. */
  setSelectionRange(selection: SelectionRange): void {
    if (this.isDestroyed || selectionEquals(selection, this.state.selection)) {
      return;
    }
    this.state = { ...this.state, selection, storedMarks: null };
    this.stateVersion.set(this.stateVersion.get() + 1);
    this.emit("selectionUpdate");
    this.extensionManager.emit("onSelectionUpdate");
    this.options.onSelectionUpdate?.({ editor: this });
  }

  /** Typing entry point: input rules get first refusal on the inserted text. */
  insertTextWithRules(text: string): void {
    const { from, to } = this.state.selection;
    if (
      runInputRules({
        editor: this,
        rules: this.extensionManager.inputRules,
        from,
        to,
        text,
      })
    ) {
      return;
    }
    const tr = this.createTransaction();
    tr.insertText(text, from, to);
    this.dispatch(tr);
  }

  // -------------------------------------------------------------------------
  // Content
  // -------------------------------------------------------------------------

  createDocument(content: Content): JSONContent {
    return createDocument(this.schema, content, (html) =>
      parseHTML(this.schema, html),
    );
  }

  getJSON(): JSONContent {
    return toJSON(this.schema, this.state.doc);
  }

  getHTML(): string {
    return generateHTML(this.schema, this.state.doc);
  }

  getText(options?: { blockSeparator?: string }): string {
    return generateText(
      this.schema,
      this.state.doc,
      options?.blockSeparator ?? "\n\n",
    );
  }

  isActive(
    nameOrAttributes: string | Attributes,
    attributes?: Attributes,
  ): boolean {
    const name = typeof nameOrAttributes === "string" ? nameOrAttributes : null;
    const attrs =
      typeof nameOrAttributes === "string"
        ? (attributes ?? {})
        : nameOrAttributes;
    return isActive(this.schema, this.state, name, attrs);
  }

  getAttributes(nameOrType: string): Attributes {
    if (this.schema.isNode(nameOrType)) {
      return getNodeAttributes(this.schema, this.state, nameOrType);
    }
    if (this.schema.isMark(nameOrType)) {
      return getMarkAttributes(this.schema, this.state, nameOrType);
    }
    return {};
  }

  /** Total token size of the document content — the maximum valid position. */
  get docSize(): number {
    return contentSize(this.schema, this.state.doc);
  }

  get selectionBounds(): { start: number; end: number } {
    return {
      start: startPosition(this.schema, this.state.doc),
      end: endPosition(this.schema, this.state.doc),
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  mount(element: HTMLElement): void {
    this.unmount();
    this.view = new EditorView(this, element);
    this.options.element = element;
    this.view.render();
    // Extensions needing the host element bind here rather than in onCreate:
    // the createEditor() flow mounts after construction, so onCreate fires
    // while `this.view` is still null.
    this.extensionManager.emit("onMount");
  }

  unmount(): void {
    this.view?.destroy();
    this.view = null;
  }

  setEditable(editable: boolean, emitUpdate = true): void {
    this.editable = editable;
    this.view?.setEditable(editable);
    this.stateVersion.set(this.stateVersion.get() + 1);
    if (emitUpdate) {
      // No document change here, so hand listeners an empty draft to read meta from.
      const transaction = this.createTransaction();
      this.emit("update", { editor: this, transaction });
      this.options.onUpdate?.({ editor: this, transaction });
    }
  }

  setOptions(options: Partial<EditorOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.editable !== undefined) {
      this.setEditable(options.editable, false);
    }
    if (options.element && options.element !== this.view?.element) {
      this.mount(options.element);
    }
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.emit("destroy");
    this.extensionManager.emit("onDestroy");
    this.options.onDestroy?.();
    this.unmount();
    this.history.clear();
    this.listeners.clear();
    this.isDestroyed = true;
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  on(event: EditorEventName, callback: EventCallback): void {
    const callbacks = this.listeners.get(event) ?? new Set<EventCallback>();
    callbacks.add(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: EditorEventName, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: EditorEventName, ...args: unknown[]): void {
    for (const callback of this.listeners.get(event) ?? []) {
      callback(...args);
    }
  }

  handleFocus(event: FocusEvent): void {
    this.isFocused = true;
    this.stateVersion.set(this.stateVersion.get() + 1);
    this.emit("focus", event);
    this.extensionManager.emit("onFocus");
    this.options.onFocus?.({ editor: this, event });
  }

  handleBlur(event: FocusEvent): void {
    this.isFocused = false;
    this.stateVersion.set(this.stateVersion.get() + 1);
    this.emit("blur", event);
    this.extensionManager.emit("onBlur");
    this.options.onBlur?.({ editor: this, event });
  }
}
