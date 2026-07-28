import type {
  AttributeConfig,
  Attributes,
  ChainedCommands,
  CommandProps,
  DOMOutputSpec,
  EditorInstance,
  ExtensionConfig,
  ExtensionThis,
  InputRule,
  JSONContent,
  MarkConfig,
  MarkJSON,
  NodeConfig,
  ParseRule,
  RawCommands,
  ResolvedPosition,
  SelectionRange,
  SingleCommands,
  Transaction,
} from "../../src/types";

export type AnyConfig = ExtensionConfig<any> &
  NodeConfig<any> &
  MarkConfig<any>;

export interface CommandCall {
  name: string;
  args: unknown[];
}

export interface RecorderOptions {
  /** Transaction handed to commands that receive `CommandProps`. */
  transaction?: Transaction;
  /** Per-command return values; anything unlisted returns true. */
  results?: Record<string, boolean>;
  /** Mark configs looked up through `editor.schema.marks`. */
  marks?: Record<string, { keepOnSplit?: boolean }>;
  editable?: boolean;
  view?: { element: HTMLElement } | null;
}

export interface Recorder {
  /** Every command invoked, in order, across `commands` and `chain()`. */
  calls: CommandCall[];
  names(): string[];
  editor: EditorInstance;
  commands: SingleCommands;
  chain: () => ChainedCommands;
  transaction: Transaction;
  /** Fresh `CommandProps` to invoke a command with. */
  props(): CommandProps;
}

/** A transaction stub carrying only what the extensions actually read. */
export function createTransaction(
  config: {
    selection?: Partial<SelectionRange>;
    storedMarks?: MarkJSON[] | null;
    position?: Partial<ResolvedPosition>;
  } = {},
): Transaction {
  const selection: SelectionRange = {
    from: 1,
    to: 1,
    anchor: 1,
    head: 1,
    empty: true,
    ...config.selection,
  };
  const placeholder: JSONContent = { type: "paragraph" };
  const position: ResolvedPosition = {
    pos: selection.from,
    parent: placeholder,
    index: 0,
    parentOffset: 0,
    path: [0],
    depth: 1,
    marks: () => [],
    node: () => placeholder,
    start: () => 1,
    end: () => 1,
    ...config.position,
  };

  const transaction = {
    doc: { type: "doc", content: [] } as JSONContent,
    selection,
    storedMarks: config.storedMarks ?? null,
    docChanged: false,
    resolve: () => position,
    setStoredMarks(marks: MarkJSON[] | null) {
      transaction.storedMarks = marks;
      return transaction;
    },
  };

  return transaction as unknown as Transaction;
}

/**
 * Records the commands an extension delegates to, without an engine behind
 * them. `command` and `first` callbacks are executed so the guards inside
 * keyboard shortcuts and input rules are exercised too.
 */
export function createRecorder(options: RecorderOptions = {}): Recorder {
  const calls: CommandCall[] = [];
  const transaction = options.transaction ?? createTransaction();
  const result = (name: string) => options.results?.[name] ?? true;

  const chain = (): ChainedCommands => {
    const chained: any = new Proxy(
      {},
      {
        get: (_target, property: string) => {
          if (property === "run") {
            return () => true;
          }

          return (...args: unknown[]) => {
            calls.push({ name: property, args });

            if (property === "command") {
              (args[0] as (props: CommandProps) => boolean)(props());
            }

            return chained;
          };
        },
      },
    );

    return chained;
  };

  const commands: any = new Proxy(
    {},
    {
      get: (_target, property: string) => {
        return (...args: unknown[]) => {
          calls.push({ name: property, args });

          if (property === "command") {
            return (args[0] as (inner: CommandProps) => boolean)(props());
          }

          if (property === "first") {
            const candidates = args[0] as Array<
              (inner: CommandProps) => boolean
            >;

            for (const candidate of candidates) {
              if (candidate(props())) {
                return true;
              }
            }

            return false;
          }

          return result(property);
        };
      },
    },
  );

  const editor = {
    commands,
    chain,
    can: () => commands,
    isEditable: options.editable ?? true,
    view: options.view ?? null,
    schema: {
      marks: {
        get: (name: string) => options.marks?.[name],
      },
    },
  } as unknown as EditorInstance;

  const props = (): CommandProps => ({
    editor,
    tr: transaction,
    state: {
      doc: transaction.doc,
      selection: transaction.selection,
      storedMarks: transaction.storedMarks,
    },
    dispatch: () => undefined,
    chain,
    can: () => commands as any,
    commands,
  });

  return {
    calls,
    names: () => calls.map((call) => call.name),
    editor,
    commands,
    chain,
    transaction,
    props,
  };
}

/** An extension opened for inspection: its config bound to a synthetic `this`. */
export interface OpenExtension {
  config: AnyConfig;
  context: ExtensionThis<any>;
  options: Attributes;
  commands(): RawCommands;
  commandNames(): string[];
  shortcuts(): Record<string, (props: { editor: EditorInstance }) => boolean>;
  shortcutKeys(): string[];
  inputRules(): InputRule[];
  parseRules(): ParseRule[];
  attributes(): Record<string, AttributeConfig>;
  render(props?: {
    node?: JSONContent;
    mark?: MarkJSON;
    HTMLAttributes?: Attributes;
  }): DOMOutputSpec;
}

/**
 * Bind an extension's config hooks to an `ExtensionThis` built the way the
 * engine will: resolved options, fresh storage, the given editor.
 */
export function open(
  // Only the config is read, so this accepts an Extension/Node/Mark instance
  // without depending on their assignability to AnyExtension.
  extension: { config: unknown },
  overrides: { options?: Attributes; editor?: EditorInstance } = {},
): OpenExtension {
  const config = extension.config as AnyConfig;
  const context = {
    name: config.name,
    options: {} as Attributes,
    storage: {} as Record<string, unknown>,
    editor: overrides.editor ?? ({} as EditorInstance),
    parent: null,
  } satisfies ExtensionThis<any>;

  context.options = {
    ...(config.addOptions?.call(context) ?? {}),
    ...(overrides.options ?? {}),
  };
  context.storage = config.addStorage?.call(context) ?? {};

  return {
    config,
    context,
    options: context.options,
    commands: () => config.addCommands?.call(context) ?? {},
    commandNames: () => Object.keys(config.addCommands?.call(context) ?? {}),
    shortcuts: () => config.addKeyboardShortcuts?.call(context) ?? {},
    shortcutKeys: () =>
      Object.keys(config.addKeyboardShortcuts?.call(context) ?? {}),
    inputRules: () => config.addInputRules?.call(context) ?? [],
    parseRules: () => config.parseHTML?.call(context) ?? [],
    attributes: () => config.addAttributes?.call(context) ?? {},
    render: (props = {}) =>
      (config.renderHTML as any)?.call(context, {
        node: props.node ?? { type: config.name },
        mark: props.mark ?? { type: config.name },
        HTMLAttributes: props.HTMLAttributes ?? {},
      }),
  };
}

/** Run an input rule against text, returning the commands it would issue. */
export function applyInputRule(
  rule: InputRule,
  text: string,
  options: { from?: number; recorder?: Recorder } = {},
): { match: RegExpMatchArray | null; recorder: Recorder } {
  const recorder = options.recorder ?? createRecorder();
  const match = text.match(rule.find);

  if (match) {
    // Position 1 is the first character of a top-level textblock.
    const from = options.from ?? 1 + (match.index ?? 0);

    rule.handler({
      editor: recorder.editor,
      range: { from, to: from + match[0].length },
      match,
      chain: recorder.chain,
    });
  }

  return { match, recorder };
}
