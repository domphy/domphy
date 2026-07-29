/**
 * Shared type contract for @domphy/editor.
 *
 * Tiptap-compatible public surface over a self-contained engine (no ProseMirror).
 * Positions are ProseMirror-style token positions: entering a non-leaf node
 * costs 1, each text character costs 1, a leaf node costs 1, leaving a node
 * costs 1. This keeps `from`/`to`, `isActive`, and command semantics
 * source-compatible with tiptap.
 */

// ---------------------------------------------------------------------------
// Document model (tiptap JSON shape)
// ---------------------------------------------------------------------------

export type Attributes = Record<string, unknown>;

export interface MarkJSON {
  type: string;
  attrs?: Attributes;
}

export interface JSONContent {
  type?: string;
  attrs?: Attributes;
  content?: JSONContent[];
  marks?: MarkJSON[];
  text?: string;
}

/** Editor content input: HTML string, a JSON node, or a list of JSON nodes. */
export type Content = string | JSONContent | JSONContent[] | null;

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export interface SelectionRange {
  /** Ordered lower bound (min of anchor/head). */
  from: number;
  /** Ordered upper bound (max of anchor/head). */
  to: number;
  anchor: number;
  head: number;
  empty: boolean;
}

/** A resolved position inside the document. */
export interface ResolvedPosition {
  pos: number;
  /** The parent node containing this position. */
  parent: JSONContent;
  /** Child index inside the parent at this position. */
  index: number;
  /** Offset into the parent's content (characters for textblocks). */
  parentOffset: number;
  /** Path of child indexes from the doc root down to `parent`. */
  path: number[];
  /** Marks active at this position (marks of the text node before/at it). */
  marks(): MarkJSON[];
  /** Depth of `parent` (doc = 0). */
  depth: number;
  /** Ancestor node at the given depth (0 = doc, depth = parent). */
  node(depth: number): JSONContent;
  /** Position just before the parent node's content starts. */
  start(depth?: number): number;
  /** Position just after the parent node's content ends. */
  end(depth?: number): number;
}

export interface EditorStateLike {
  doc: JSONContent;
  selection: SelectionRange;
  storedMarks: MarkJSON[] | null;
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/**
 * A mutable draft of the next editor state. Commands mutate the transaction;
 * the editor applies it once (single history entry, single render).
 */
export interface Transaction {
  doc: JSONContent;
  selection: SelectionRange;
  storedMarks: MarkJSON[] | null;
  /** True when any step changed the document. */
  docChanged: boolean;

  setSelection(anchor: number, head?: number): Transaction;
  /** Replace [from, to) with nodes/text. Content may be inline or block. */
  replaceRange(from: number, to: number, content: JSONContent[]): Transaction;
  insertText(text: string, from?: number, to?: number): Transaction;
  delete(from: number, to: number): Transaction;
  addMark(from: number, to: number, mark: MarkJSON): Transaction;
  removeMark(from: number, to: number, markType: string): Transaction;
  setStoredMarks(marks: MarkJSON[] | null): Transaction;
  /** Add one mark to the stored mark set (marks applied to the next insert). */
  addStoredMark(mark: MarkJSON): Transaction;
  /** Drop one mark type from the stored mark set. */
  removeStoredMark(markType: string): Transaction;
  /** Change the type/attrs of the textblock(s) covering the range. */
  setBlockType(
    from: number,
    to: number,
    type: string,
    attrs?: Attributes,
  ): Transaction;
  /** Update attrs of the node at the given position (block or inline). */
  setNodeAttributes(pos: number, attrs: Attributes): Transaction;
  /** Wrap the block range in a node of the given type. */
  wrap(from: number, to: number, type: string, attrs?: Attributes): Transaction;
  /** Lift the block range out of its parent wrapper. */
  lift(from: number, to: number): Transaction;
  /**
   * Split the textblock at the position (Enter behaviour). `depth` splits that
   * many enclosing levels — `2` splits the list item around the paragraph.
   */
  split(pos: number, depth?: number): Transaction;
  /**
   * Escape hatch for structural edits the named steps do not cover (list
   * sinking, history restore). Returning null leaves the draft untouched.
   */
  transform(fn: (doc: JSONContent) => JSONContent | null): Transaction;
  /** Feasibility checks used by `can()` — pure, never mutate the draft. */
  canWrap(from: number, to: number, type: string): boolean;
  canLift(from: number, to: number): boolean;
  canSplit(pos: number, depth?: number): boolean;
  setMeta(key: string, value: unknown): Transaction;
  getMeta(key: string): unknown;

  resolve(pos: number): ResolvedPosition;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface CommandProps {
  editor: EditorInstance;
  tr: Transaction;
  state: EditorStateLike;
  /** Undefined in `can()` dry runs — commands must not mutate `tr` without it. */
  dispatch: ((tr: Transaction) => void) | undefined;
  chain: () => ChainedCommands;
  can: () => CanCommands;
  commands: SingleCommands;
}

export type Command = (props: CommandProps) => boolean;

export type RawCommands = Record<string, (...args: never[]) => Command>;

/** Commands invoked directly: apply immediately, return success boolean. */
export type SingleCommands = {
  [name: string]: (...args: unknown[]) => boolean;
} & TypedCommands<boolean>;

/** Commands collected into one transaction; `run()` applies them. */
export type ChainedCommands = {
  [name: string]: (...args: unknown[]) => ChainedCommands;
} & TypedCommands<ChainedCommands> & { run(): boolean };

/** Dry-run commands: report feasibility without mutating state. */
export type CanCommands = {
  [name: string]: (...args: unknown[]) => boolean;
} & TypedCommands<boolean> & { chain(): ChainedCommands };

/**
 * The generic command set the engine implements. Extension commands
 * (toggleBold, setHeading, ...) delegate to these, exactly like tiptap.
 */
export interface TypedCommands<R> {
  setContent(content: Content, options?: { emitUpdate?: boolean }): R;
  insertContent(content: Content): R;
  insertContentAt(
    position: number | { from: number; to: number },
    content: Content,
  ): R;
  setMark(markType: string, attrs?: Attributes): R;
  /**
   * `extendEmptyMarkRange` makes a cursor inside the mark operate on the whole
   * mark range — what link-like marks want, and what tiptap's Link passes.
   */
  toggleMark(
    markType: string,
    attrs?: Attributes,
    options?: { extendEmptyMarkRange?: boolean },
  ): R;
  unsetMark(markType: string, options?: { extendEmptyMarkRange?: boolean }): R;
  setNode(nodeType: string, attrs?: Attributes): R;
  toggleNode(nodeType: string, toggleType: string, attrs?: Attributes): R;
  updateAttributes(nodeOrMarkType: string, attrs: Attributes): R;
  clearNodes(): R;
  wrapIn(nodeType: string, attrs?: Attributes): R;
  toggleWrap(nodeType: string, attrs?: Attributes): R;
  lift(nodeType: string, attrs?: Attributes): R;
  toggleList(listType: string, itemType: string, attrs?: Attributes): R;
  splitListItem(itemType: string): R;
  sinkListItem(itemType: string): R;
  liftListItem(itemType: string): R;
  splitBlock(options?: { keepMarks?: boolean }): R;
  exitCode(): R;
  setTextSelection(position: number | { from: number; to: number }): R;
  selectAll(): R;
  deleteSelection(): R;
  deleteRange(range: { from: number; to: number }): R;
  focus(position?: FocusPosition): R;
  blur(): R;
  scrollIntoView(): R;
  setMeta(key: string, value: unknown): R;
  command(fn: Command): R;
  first(commands: Command[] | ((props: CommandProps) => Command[])): R;
  undo(): R;
  redo(): R;
}

// ---------------------------------------------------------------------------
// Extensions
// ---------------------------------------------------------------------------

export type ExtensionKind = "extension" | "node" | "mark";

export interface ParseRule {
  tag?: string;
  attrs?: Attributes;
  getAttrs?: (element: HTMLElement) => Attributes | false | null;
  /** Higher wins when multiple rules match. */
  priority?: number;
}

/** DOM output spec: ["p", attrs, 0] — 0 is the content hole; ["br", attrs] for leaves. */
export type DOMOutputSpec = string | [string, ...unknown[]];

export interface AttributeConfig {
  default?: unknown;
  rendered?: boolean;
  renderHTML?: (attrs: Attributes) => Attributes | null;
  parseHTML?: (element: HTMLElement) => unknown;
  keepOnSplit?: boolean;
}

/** `this` binding for every extension config hook. */
export interface ExtensionThis<Options = Attributes> {
  name: string;
  options: Options;
  storage: Record<string, unknown>;
  editor: EditorInstance;
  parent: (() => unknown) | null;
}

export interface InputRule {
  /** Anchored to the text before the cursor within the current textblock. */
  find: RegExp;
  handler: (props: {
    editor: EditorInstance;
    range: { from: number; to: number };
    match: RegExpMatchArray;
    chain: () => ChainedCommands;
  }) => void;
}

export interface ExtensionConfig<Options = Attributes> {
  name: string;
  priority?: number;
  addOptions?: (this: ExtensionThis<Options>) => Options;
  addStorage?: (this: ExtensionThis<Options>) => Record<string, unknown>;
  addCommands?: (this: ExtensionThis<Options>) => RawCommands;
  addKeyboardShortcuts?: (
    this: ExtensionThis<Options>,
  ) => Record<string, (props: { editor: EditorInstance }) => boolean>;
  addInputRules?: (this: ExtensionThis<Options>) => InputRule[];
  addExtensions?: (this: ExtensionThis<Options>) => AnyExtension[];
  onCreate?: (this: ExtensionThis<Options>) => void;
  onUpdate?: (this: ExtensionThis<Options>) => void;
  onSelectionUpdate?: (this: ExtensionThis<Options>) => void;
  onFocus?: (this: ExtensionThis<Options>) => void;
  onBlur?: (this: ExtensionThis<Options>) => void;
  onDestroy?: (this: ExtensionThis<Options>) => void;
}

export interface NodeConfig<Options = Attributes>
  extends ExtensionConfig<Options> {
  topNode?: boolean;
  /** Simplified content expression: "block+", "inline*", "text*", "listItem+", "paragraph block*". */
  content?: string;
  /** "" disables marks inside this node. Undefined allows all inline marks. */
  marks?: string;
  group?: string;
  inline?: boolean;
  atom?: boolean;
  selectable?: boolean;
  defining?: boolean;
  code?: boolean;
  addAttributes?: (
    this: ExtensionThis<Options>,
  ) => Record<string, AttributeConfig>;
  parseHTML?: (this: ExtensionThis<Options>) => ParseRule[];
  renderHTML?: (
    this: ExtensionThis<Options>,
    props: { node: JSONContent; HTMLAttributes: Attributes },
  ) => DOMOutputSpec;
  renderText?: (
    this: ExtensionThis<Options>,
    props: { node: JSONContent },
  ) => string;
  /**
   * Custom DOM renderer for this node (tiptap addNodeView analogue, plain DOM
   * — no framework). The returned instance owns its subtree; the view treats
   * it as an imperative island: `update` receives the next node JSON on
   * re-render (return false to force a rebuild), `contentDOM` (contentful
   * nodes only) is where the editor renders children.
   */
  addNodeView?: (
    this: ExtensionThis<Options>,
  ) => (props: NodeViewProps) => NodeViewInstance;
}

export interface NodeViewProps {
  node: JSONContent;
  editor: EditorInstance;
  /** True while the node is the current selection target (atom nodes). */
  selected: boolean;
  /** Patch this node's attrs in place (single transaction). */
  updateAttributes(attributes: Attributes): void;
  /** Current document position of the node (recomputed per render). */
  getPos(): number;
}

export interface NodeViewInstance {
  dom: HTMLElement;
  /** Where child content renders; omit for atom/leaf views. */
  contentDOM?: HTMLElement | null;
  /** Return false to have the editor rebuild the view from scratch. */
  update?(node: JSONContent): boolean | undefined;
  selectNode?(): void;
  deselectNode?(): void;
  destroy?(): void;
}

export interface MarkConfig<Options = Attributes>
  extends ExtensionConfig<Options> {
  keepOnSplit?: boolean;
  inclusive?: boolean | ((this: ExtensionThis<Options>) => boolean);
  /** "_" excludes every other mark (used by code). */
  excludes?: string;
  code?: boolean;
  exitable?: boolean;
  addAttributes?: (
    this: ExtensionThis<Options>,
  ) => Record<string, AttributeConfig>;
  parseHTML?: (this: ExtensionThis<Options>) => ParseRule[];
  renderHTML?: (
    this: ExtensionThis<Options>,
    props: { mark: MarkJSON; HTMLAttributes: Attributes },
  ) => DOMOutputSpec;
}

export interface AnyExtension {
  kind: ExtensionKind;
  name: string;
  priority: number;
  options: Attributes;
  config: ExtensionConfig | NodeConfig | MarkConfig;
  configure(options?: Attributes): AnyExtension;
  extend(
    config: Partial<ExtensionConfig | NodeConfig | MarkConfig>,
  ): AnyExtension;
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

export type FocusPosition = "start" | "end" | "all" | number | boolean | null;

export interface EditorOptions {
  element?: HTMLElement | null;
  content?: Content;
  extensions?: AnyExtension[];
  editable?: boolean;
  autofocus?: FocusPosition;
  onCreate?: (props: { editor: EditorInstance }) => void;
  /** `transaction` carries meta set via setMeta — usable as a loop guard. */
  onUpdate?: (props: {
    editor: EditorInstance;
    transaction: Transaction;
  }) => void;
  onSelectionUpdate?: (props: { editor: EditorInstance }) => void;
  onFocus?: (props: { editor: EditorInstance; event: FocusEvent }) => void;
  onBlur?: (props: { editor: EditorInstance; event: FocusEvent }) => void;
  onDestroy?: () => void;
  /**
   * View-event hooks (tiptap editorProps.handle* analogue). Return true to
   * mark the event handled: the editor then skips its own processing.
   * onKeyDown runs BEFORE the keymap.
   */
  onPaste?: (event: ClipboardEvent, editor: EditorInstance) => boolean;
  onDrop?: (event: DragEvent, editor: EditorInstance) => boolean;
  onKeyDown?: (event: KeyboardEvent, editor: EditorInstance) => boolean;
}

/**
 * Public editor surface (tiptap-compatible subset).
 * The concrete class lives in Editor.ts; interfaces reference this shape so
 * extensions and the Domphy adapter never import the class circularly.
 */
export interface EditorInstance {
  readonly options: EditorOptions;
  readonly state: EditorStateLike;
  readonly isEditable: boolean;
  readonly isEmpty: boolean;
  readonly isDestroyed: boolean;
  isFocused: boolean;
  /**
   * Reactivity bridge: a Domphy-compatible version counter. Reading it with a
   * listener subscribes the listener to every editor transaction.
   * Implemented with @domphy/core toState in the Domphy adapter-facing layer.
   */
  readonly stateVersion: {
    get(listener?: unknown): number;
    set(value: number): void;
  };

  readonly commands: SingleCommands;
  chain(): ChainedCommands;
  can(): CanCommands;

  isActive(name: string, attrs?: Attributes): boolean;
  isActive(attrs: Attributes): boolean;
  getAttributes(nameOrType: string): Attributes;
  getJSON(): JSONContent;
  getHTML(): string;
  getText(options?: { blockSeparator?: string }): string;

  setEditable(editable: boolean, emitUpdate?: boolean): void;
  setOptions(options: Partial<EditorOptions>): void;
  mount(element: HTMLElement): void;
  unmount(): void;
  destroy(): void;

  on(event: EditorEventName, callback: (...args: unknown[]) => void): void;
  off(event: EditorEventName, callback: (...args: unknown[]) => void): void;

  /** Internal engine access (schema registry, view). Not part of tiptap API. */
  readonly schema: SchemaRegistry;
  readonly extensionManager: ExtensionManagerLike;
  readonly view: EditorViewLike | null;
}

export type EditorEventName =
  | "create"
  | "update"
  | "selectionUpdate"
  | "focus"
  | "blur"
  | "destroy";

export interface SchemaRegistry {
  topNodeType: string;
  nodes: Map<
    string,
    NodeConfig & {
      name: string;
      resolvedAttributes: Record<string, AttributeConfig>;
    }
  >;
  marks: Map<
    string,
    MarkConfig & {
      name: string;
      resolvedAttributes: Record<string, AttributeConfig>;
    }
  >;
  isNode(name: string): boolean;
  isMark(name: string): boolean;
  /** True when `child` (node name or group) satisfies the parent's content expression. */
  allowsContent(parentName: string, childName: string): boolean;
}

export interface ExtensionManagerLike {
  extensions: AnyExtension[];
  commands: RawCommands;
  keyboardShortcuts: Record<
    string,
    (props: { editor: EditorInstance }) => boolean
  >;
  inputRules: InputRule[];
}

export interface EditorViewLike {
  element: HTMLElement;
  /** Re-render the document into the host and restore the DOM selection. */
  render(): void;
  /** Map the current DOM selection back into a model SelectionRange, or null. */
  readSelection(): SelectionRange | null;
  /**
   * Viewport coordinates of the caret at model position `pos` (defaults to
   * the current selection head) — for anchoring floating UI like slash menus.
   * Null when the position cannot be resolved to a DOM location.
   */
  coordsAtPos(pos?: number): DOMRect | null;
  destroy(): void;
}
