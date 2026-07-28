/**
 * Schema registry: node/mark specs plus the simplified content-expression
 * engine. Expressions are a space separated sequence of `name`, `name+`,
 * `name*` or `name?` terms ("block+", "inline*", "paragraph block*").
 */

import type {
  AttributeConfig,
  Attributes,
  DOMOutputSpec,
  JSONContent,
  MarkConfig,
  MarkJSON,
  NodeConfig,
  ParseRule,
  SchemaRegistry,
} from "../types.js";

/**
 * Registry entries hold hooks already bound to their extension context, so the
 * `this` parameter of the authoring config is dropped here.
 */
export type NodeSpec = Omit<
  NodeConfig,
  "addAttributes" | "parseHTML" | "renderHTML" | "renderText"
> & {
  name: string;
  resolvedAttributes: Record<string, AttributeConfig>;
  parseHTML?: () => ParseRule[];
  renderHTML?: (props: {
    node: JSONContent;
    HTMLAttributes: Attributes;
  }) => DOMOutputSpec;
  renderText?: (props: { node: JSONContent }) => string;
};

export type MarkSpec = Omit<
  MarkConfig,
  "addAttributes" | "parseHTML" | "renderHTML"
> & {
  name: string;
  resolvedAttributes: Record<string, AttributeConfig>;
  parseHTML?: () => ParseRule[];
  renderHTML?: (props: {
    mark: MarkJSON;
    HTMLAttributes: Attributes;
  }) => DOMOutputSpec;
};

interface ContentTerm {
  base: string;
  required: boolean;
}

function parseContent(expression: string | undefined): ContentTerm[] {
  if (!expression) {
    return [];
  }
  return expression
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      const quantifier = /[+*?]$/.exec(token)?.[0] ?? "";
      return {
        base: quantifier ? token.slice(0, -1) : token,
        required: quantifier === "+" || quantifier === "",
      };
    });
}

function groupsOf(spec: NodeSpec | undefined): string[] {
  return spec?.group ? spec.group.split(/\s+/).filter(Boolean) : [];
}

export class Schema implements SchemaRegistry {
  topNodeType = "doc";
  nodes = new Map<string, NodeSpec>();
  marks = new Map<string, MarkSpec>();

  private contentCache = new Map<string, ContentTerm[]>();
  private textblockCache = new Map<string, boolean>();

  addNode(spec: NodeSpec): void {
    this.nodes.set(spec.name, spec);
    if (spec.topNode) {
      this.topNodeType = spec.name;
    }
  }

  addMark(spec: MarkSpec): void {
    this.marks.set(spec.name, spec);
  }

  isNode(name: string): boolean {
    return this.nodes.has(name);
  }

  isMark(name: string): boolean {
    return this.marks.has(name);
  }

  terms(nodeName: string): ContentTerm[] {
    const cached = this.contentCache.get(nodeName);
    if (cached) {
      return cached;
    }
    const terms = parseContent(this.nodes.get(nodeName)?.content);
    this.contentCache.set(nodeName, terms);
    return terms;
  }

  allowsContent(parentName: string, childName: string): boolean {
    return this.terms(parentName).some((term) =>
      this.matchesTerm(term.base, childName),
    );
  }

  private matchesTerm(base: string, childName: string): boolean {
    if (base === childName) {
      return true;
    }
    const child = this.nodes.get(childName);
    if (!child) {
      return false;
    }
    if (groupsOf(child).includes(base)) {
      return true;
    }
    return base === "inline" && (childName === "text" || child.inline === true);
  }

  /** A node with no content expression holds nothing (hardBreak, horizontalRule). */
  isLeaf(nodeName: string): boolean {
    return this.terms(nodeName).length === 0;
  }

  isInline(nodeName: string): boolean {
    return nodeName === "text" || this.nodes.get(nodeName)?.inline === true;
  }

  /** A block that directly holds inline content (paragraph, heading, codeBlock). */
  isTextblock(nodeName: string): boolean {
    const cached = this.textblockCache.get(nodeName);
    if (cached !== undefined) {
      return cached;
    }
    const result = this.terms(nodeName).some(
      (term) =>
        term.base === "text" ||
        this.isInline(term.base) ||
        term.base === "inline",
    );
    this.textblockCache.set(nodeName, result);
    return result;
  }

  allowsMark(nodeName: string, markName: string): boolean {
    const spec = this.nodes.get(nodeName);
    if (spec?.marks === undefined) {
      return true;
    }
    if (spec.marks === "") {
      return false;
    }
    return spec.marks.split(/\s+/).includes(markName);
  }

  /** Position of a mark in the registry — keeps serialized mark order stable. */
  markRank(markName: string): number {
    let rank = 0;
    for (const name of this.marks.keys()) {
      if (name === markName) {
        return rank;
      }
      rank += 1;
    }
    return rank;
  }

  markExcludes(markName: string, otherName: string): boolean {
    const spec = this.marks.get(markName);
    if (spec?.excludes === undefined) {
      return markName === otherName;
    }
    if (spec.excludes === "_") {
      return true;
    }
    return spec.excludes.split(/\s+/).includes(otherName);
  }

  defaultAttributes(nodeOrMarkName: string): Attributes {
    const spec =
      this.nodes.get(nodeOrMarkName) ?? this.marks.get(nodeOrMarkName);
    const attributes: Attributes = {};
    for (const [name, config] of Object.entries(
      spec?.resolvedAttributes ?? {},
    )) {
      attributes[name] = config.default ?? null;
    }
    return attributes;
  }

  /** The node type used to fill a required content term ("block" -> "paragraph"). */
  defaultTypeFor(base: string): string | null {
    if (base !== "text" && this.nodes.has(base)) {
      return base;
    }
    for (const [name, spec] of this.nodes) {
      if (name === "text" || spec.inline) {
        continue;
      }
      if (groupsOf(spec).includes(base)) {
        return name;
      }
    }
    return null;
  }

  /** Minimal content satisfying a node's required terms. */
  defaultContent(nodeName: string, depth = 0): JSONContent[] {
    if (depth > 4) {
      return [];
    }
    const content: JSONContent[] = [];
    for (const term of this.terms(nodeName)) {
      if (!term.required) {
        continue;
      }
      const type = this.defaultTypeFor(term.base);
      if (!type) {
        continue;
      }
      content.push(
        this.createNode(type, undefined, this.defaultContent(type, depth + 1)),
      );
    }
    return content;
  }

  createNode(
    nodeName: string,
    attributes?: Attributes,
    content?: JSONContent[],
  ): JSONContent {
    const node: JSONContent = {
      type: nodeName,
      attrs: { ...this.defaultAttributes(nodeName), ...attributes },
    };
    if (!this.isLeaf(nodeName)) {
      node.content = content ?? this.defaultContent(nodeName);
    }
    return node;
  }

  createMark(markName: string, attributes?: Attributes): MarkJSON {
    return {
      type: markName,
      attrs: { ...this.defaultAttributes(markName), ...attributes },
    };
  }

  /**
   * Chain of wrappers needed to place `childNames` inside `targetName`.
   * Returns ["bulletList", "listItem"] when a list needs its item wrapper.
   */
  findWrapping(targetName: string, childNames: string[]): string[] | null {
    if (!this.nodes.has(targetName)) {
      return null;
    }
    if (childNames.every((child) => this.allowsContent(targetName, child))) {
      return [targetName];
    }
    for (const [name] of this.nodes) {
      if (!this.allowsContent(targetName, name)) {
        continue;
      }
      if (childNames.every((child) => this.allowsContent(name, child))) {
        return [targetName, name];
      }
    }
    return null;
  }
}
