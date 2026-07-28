/**
 * `Extension`, `Node` and `Mark` — the authoring surface for extensions.
 *
 * Every config hook is invoked with `this = { name, options, storage, editor,
 * parent }`, where `parent` is the same hook taken from the config this one
 * extends. That is how `.extend()` composes and how `.configure()` layers
 * options on top of `addOptions()`.
 */

import type {
  AnyExtension,
  Attributes,
  EditorInstance,
  ExtensionConfig,
  ExtensionKind,
  ExtensionThis,
  MarkConfig,
  NodeConfig,
} from "./types.js";
import { callOrReturn, mergeDeep } from "./utils.js";

type AnyConfig = ExtensionConfig | NodeConfig | MarkConfig;

/** Resolve a config hook, walking the `.extend()` chain to build `parent`. */
export function getExtensionField<T = unknown>(
  extension: Extendable,
  field: string,
  context: Omit<ExtensionThis, "parent">,
): T | undefined {
  const value = (extension.config as unknown as Record<string, unknown>)[field];
  if (value === undefined && extension.parent) {
    return getExtensionField<T>(extension.parent, field, context);
  }
  if (typeof value === "function") {
    const parent = extension.parent
      ? getExtensionField(extension.parent, field, context)
      : null;
    return value.bind({
      ...context,
      parent: typeof parent === "function" ? parent : null,
    }) as T;
  }
  return value as T | undefined;
}

export class Extendable implements AnyExtension {
  kind: ExtensionKind = "extension";
  name: string;
  config: AnyConfig;
  parent: Extendable | null = null;

  /** Assigned by the ExtensionManager once bound to an editor. */
  editor: EditorInstance | null = null;
  storage: Record<string, unknown> = {};

  constructor(config: Partial<AnyConfig> = {}) {
    this.config = { name: "", ...config } as AnyConfig;
    this.name = this.config.name;
  }

  static create<Options = Attributes>(
    config: Partial<ExtensionConfig<Options>>,
  ): Extendable {
    return new Extendable(config as Partial<AnyConfig>);
  }

  get priority(): number {
    return this.config.priority ?? 100;
  }

  get options(): Attributes {
    const addOptions = this.resolve<() => Attributes>("addOptions", {});
    return { ...(addOptions ? callOrReturn(addOptions) : {}) };
  }

  /** Resolve a config hook bound to this extension's context. */
  resolve<T = unknown>(
    field: string,
    options: Attributes = this.options,
  ): T | undefined {
    return getExtensionField<T>(this, field, {
      name: this.name,
      options,
      storage: this.storage,
      editor: this.editor as EditorInstance,
    });
  }

  configure(options: Attributes = {}): this {
    const current = this.options;
    const extension = this.extend({
      addOptions: () => mergeDeep(current, options),
    } as Partial<AnyConfig>);
    extension.name = this.name;
    return extension;
  }

  extend(config: Partial<AnyConfig> = {}): this {
    const Constructor = this.constructor as new (
      config: Partial<AnyConfig>,
    ) => this;
    const extension = new Constructor({ ...this.config, ...config });
    extension.parent = this;
    extension.name = "name" in config && config.name ? config.name : this.name;
    return extension;
  }
}

export class Extension extends Extendable {
  override kind: ExtensionKind = "extension";

  static override create<Options = Attributes>(
    config: Partial<ExtensionConfig<Options>>,
  ): Extension {
    return new Extension(config as Partial<AnyConfig>);
  }
}

export class Node extends Extendable {
  override kind: ExtensionKind = "node";
  declare config: NodeConfig;

  static override create<Options = Attributes>(
    config: Partial<NodeConfig<Options>>,
  ): Node {
    return new Node(config as Partial<AnyConfig>);
  }
}

export class Mark extends Extendable {
  override kind: ExtensionKind = "mark";
  declare config: MarkConfig;

  static override create<Options = Attributes>(
    config: Partial<MarkConfig<Options>>,
  ): Mark {
    return new Mark(config as Partial<AnyConfig>);
  }
}
