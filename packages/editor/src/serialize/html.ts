/**
 * HTML serialization and parsing.
 *
 * `generateHTML` builds a string directly so it runs in Node without a DOM
 * (SSR). `parseHTML` needs `DOMParser`, the same limitation tiptap's
 * `generateJSON` has server-side.
 */

import { addMarkToSet } from "../model/marks.js";
import { childrenOf } from "../model/position.js";
import type { Schema } from "../model/schema.js";
import type {
  Attributes,
  DOMOutputSpec,
  JSONContent,
  MarkJSON,
  ParseRule,
} from "../types.js";
import { hydrateContent } from "./json.js";

/**
 * HTML tags that never have a closing tag (or children). Shared by the HTML
 * serializer and the view's DOM-output-spec renderer.
 */
export const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderedAttributes(
  schema: Schema,
  typeName: string,
  attrs: Attributes | undefined,
): Attributes {
  const spec = schema.nodes.get(typeName) ?? schema.marks.get(typeName);
  const source = attrs ?? {};
  const result: Attributes = {};
  for (const [name, config] of Object.entries(spec?.resolvedAttributes ?? {})) {
    if (config.rendered === false) {
      continue;
    }
    if (config.renderHTML) {
      Object.assign(result, config.renderHTML(source) ?? {});
      continue;
    }
    const value = source[name];
    if (value !== undefined && value !== null) {
      result[name] = value;
    }
  }
  return result;
}

function isAttributeBag(value: unknown): value is Attributes {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function attributesToHTML(attrs: Attributes): string {
  let html = "";
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }
    html +=
      value === true
        ? ` ${name}`
        : ` ${name}="${escapeAttribute(String(value))}"`;
  }
  return html;
}

/** Turn a DOM output spec into an HTML string, dropping `inner` into the hole. */
export function specToHTML(spec: DOMOutputSpec, inner: string): string {
  if (typeof spec === "string") {
    return escapeText(spec);
  }
  const [tag, ...rest] = spec;
  const attrs = isAttributeBag(rest[0]) ? (rest.shift() as Attributes) : {};
  const open = `<${tag}${attributesToHTML(attrs)}>`;
  if (VOID_TAGS.has(tag)) {
    return open;
  }
  let children = "";
  let filledHole = false;
  for (const part of rest) {
    if (part === 0) {
      children += inner;
      filledHole = true;
    } else if (Array.isArray(part)) {
      children += specToHTML(part as DOMOutputSpec, inner);
      filledHole = true;
    } else if (typeof part === "string") {
      // Literal text child: ["div", attrs, "Page break"].
      children += escapeText(part);
      filledHole = true;
    }
  }
  if (!filledHole) {
    children = inner;
  }
  return `${open}${children}</${tag}>`;
}

function sortedMarks(
  schema: Schema,
  marks: MarkJSON[] | undefined,
): MarkJSON[] {
  return [...(marks ?? [])].sort(
    (left, right) => schema.markRank(left.type) - schema.markRank(right.type),
  );
}

function markSpecFor(schema: Schema, mark: MarkJSON): DOMOutputSpec {
  const spec = schema.marks.get(mark.type);
  const attributes = renderedAttributes(schema, mark.type, mark.attrs);
  return (
    spec?.renderHTML?.({ mark, HTMLAttributes: attributes }) ?? [
      mark.type,
      attributes,
      0,
    ]
  );
}

function nodeSpecFor(schema: Schema, node: JSONContent): DOMOutputSpec {
  const name = node.type ?? "";
  const spec = schema.nodes.get(name);
  const attributes = renderedAttributes(schema, name, node.attrs);
  return (
    spec?.renderHTML?.({ node, HTMLAttributes: attributes }) ?? [
      name,
      attributes,
      0,
    ]
  );
}

function renderNodeHTML(schema: Schema, node: JSONContent): string {
  const name = node.type ?? "";
  if (name === "text") {
    let html = escapeText(node.text ?? "");
    const marks = sortedMarks(schema, node.marks);
    for (let index = marks.length - 1; index >= 0; index--) {
      html = specToHTML(markSpecFor(schema, marks[index]), html);
    }
    return html;
  }
  const inner = childrenOf(node)
    .map((child) => renderNodeHTML(schema, child))
    .join("");
  return specToHTML(nodeSpecFor(schema, node), inner);
}

/** Serialize a document's content to an HTML string. */
export function generateHTML(schema: Schema, doc: JSONContent): string {
  return childrenOf(doc)
    .map((child) => renderNodeHTML(schema, child))
    .join("");
}

export interface CompiledRule extends ParseRule {
  kind: "node" | "mark";
  name: string;
}

const rulesCache = new WeakMap<Schema, CompiledRule[]>();

/** Parse rules for a schema, compiled once per schema. */
export function parseRulesFor(schema: Schema): CompiledRule[] {
  let rules = rulesCache.get(schema);
  if (!rules) {
    rules = compileParseRules(schema);
    rulesCache.set(schema, rules);
  }
  return rules;
}

export function compileParseRules(schema: Schema): CompiledRule[] {
  const rules: CompiledRule[] = [];
  for (const [name, spec] of schema.nodes) {
    for (const rule of spec.parseHTML?.() ?? []) {
      rules.push({ ...rule, kind: "node", name });
    }
  }
  for (const [name, spec] of schema.marks) {
    for (const rule of spec.parseHTML?.() ?? []) {
      rules.push({ ...rule, kind: "mark", name });
    }
  }
  return rules.sort(
    (left, right) => (right.priority ?? 50) - (left.priority ?? 50),
  );
}

function matchRule(
  rules: CompiledRule[],
  element: Element,
): { rule: CompiledRule; attrs: Attributes } | null {
  for (const rule of rules) {
    if (!rule.tag) {
      continue;
    }
    let matches = false;
    try {
      matches = element.matches(rule.tag);
    } catch {
      matches = element.tagName.toLowerCase() === rule.tag.toLowerCase();
    }
    if (!matches) {
      continue;
    }
    const derived = rule.getAttrs?.(element as HTMLElement);
    if (derived === false) {
      continue;
    }
    return { rule, attrs: { ...rule.attrs, ...(derived ?? {}) } };
  }
  return null;
}

function attributesFromElement(
  schema: Schema,
  name: string,
  element: Element,
  ruleAttrs: Attributes,
): Attributes {
  const spec = schema.nodes.get(name) ?? schema.marks.get(name);
  const attrs: Attributes = { ...schema.defaultAttributes(name), ...ruleAttrs };
  for (const [attrName, config] of Object.entries(
    spec?.resolvedAttributes ?? {},
  )) {
    if (config.parseHTML) {
      const value = config.parseHTML(element as HTMLElement);
      if (value !== null && value !== undefined) {
        attrs[attrName] = value;
      }
      continue;
    }
    if (config.rendered !== false && element.hasAttribute(attrName)) {
      attrs[attrName] = element.getAttribute(attrName);
    }
  }
  return attrs;
}

function parseChildren(
  schema: Schema,
  rules: CompiledRule[],
  parent: Node,
  marks: MarkJSON[],
  inTextblock: boolean,
  preserveWhitespace: boolean,
  stripTrailingBreak = false,
): JSONContent[] {
  const result: JSONContent[] = [];
  const childNodes = Array.from(parent.childNodes);
  for (let childIndex = 0; childIndex < childNodes.length; childIndex++) {
    const child = childNodes[childIndex];
    if (child.nodeType === 3) {
      const raw = child.textContent ?? "";
      if (preserveWhitespace) {
        if (raw) {
          result.push(
            marks.length > 0
              ? { type: "text", text: raw, marks }
              : { type: "text", text: raw },
          );
        }
        continue;
      }
      const text = raw.replace(/\s+/g, " ");
      if (!text || (!inTextblock && !text.trim())) {
        continue;
      }
      result.push(
        marks.length > 0
          ? { type: "text", text, marks }
          : { type: "text", text },
      );
      continue;
    }
    if (child.nodeType !== 1) {
      continue;
    }
    const element = child as Element;
    if (
      stripTrailingBreak &&
      element.tagName === "BR" &&
      childNodes
        .slice(childIndex + 1)
        .every(
          (sibling) =>
            sibling.nodeType === 3 && !/\S/.test(sibling.textContent ?? ""),
        )
    ) {
      // A lone <br> at the end of a textblock in a live editing DOM is the
      // caret placeholder browsers (and this editor's own renderer) insert —
      // not content. Reading it back would manufacture a hardBreak.
      continue;
    }
    const match = matchRule(rules, element);
    if (!match) {
      result.push(
        ...parseChildren(
          schema,
          rules,
          element,
          marks,
          inTextblock,
          preserveWhitespace,
        ),
      );
      continue;
    }
    const { rule, attrs: ruleAttrs } = match;
    const attrs = attributesFromElement(schema, rule.name, element, ruleAttrs);
    if (rule.kind === "mark") {
      const nextMarks = addMarkToSet(schema, marks, { type: rule.name, attrs });
      result.push(
        ...parseChildren(
          schema,
          rules,
          element,
          nextMarks,
          inTextblock,
          preserveWhitespace,
        ),
      );
      continue;
    }
    if (schema.isLeaf(rule.name)) {
      result.push({ type: rule.name, attrs });
      continue;
    }
    const isTextblock = schema.isTextblock(rule.name);
    const isCode = schema.nodes.get(rule.name)?.code === true;
    result.push({
      type: rule.name,
      attrs,
      content: parseChildren(
        schema,
        rules,
        element,
        isTextblock ? marks : [],
        isTextblock,
        preserveWhitespace || isCode,
      ),
    });
  }
  return result;
}

/**
 * Parse the children of a live DOM element into content for `parentName`.
 *
 * This is the DOM-read path (IME resync), not the HTML-paste path: when
 * reading a textblock, a trailing `<br>` is treated as the caret placeholder
 * and dropped. Pass `stripTrailingBreak: false` when the current model block
 * already ends in a leaf node — then that `<br>` is real content.
 */
export function parseDOMContent(
  schema: Schema,
  element: Element,
  parentName: string,
  rules = parseRulesFor(schema),
  stripTrailingBreak = true,
): JSONContent[] {
  const isTextblock = schema.isTextblock(parentName);
  const nodes = parseChildren(
    schema,
    rules,
    element,
    [],
    isTextblock,
    schema.nodes.get(parentName)?.code === true,
    isTextblock && stripTrailingBreak,
  );
  return hydrateContent(schema, nodes, parentName);
}

/** Parse an HTML string into a document. Requires a DOM (`DOMParser`). */
export function parseHTML(
  schema: Schema,
  html: string,
  rules = parseRulesFor(schema),
): JSONContent {
  const parser = typeof DOMParser === "undefined" ? null : new DOMParser();
  if (!parser) {
    throw new Error(
      "@domphy/editor: parsing HTML requires a DOM environment (DOMParser). Pass JSON content instead.",
    );
  }
  const document = parser.parseFromString(`<body>${html}</body>`, "text/html");
  const nodes = parseChildren(schema, rules, document.body, [], false, false);
  const top = schema.topNodeType;
  return {
    type: top,
    attrs: schema.defaultAttributes(top),
    content: hydrateContent(schema, nodes, top),
  };
}
