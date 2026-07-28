/**
 * The contenteditable host.
 *
 * Rendering is a full rebuild of the host's children followed by restoring the
 * DOM selection from the model — no diffing. Native editing is intercepted in
 * `beforeinput`, applied to the model, then re-rendered. Composition (IME) is
 * the exception: the browser edits the DOM and we read the affected block back
 * on `compositionend`.
 */

import type { Editor } from "../Editor.js";
import { eventDescriptors } from "../keymap.js";
import {
  childrenOf,
  contentSize,
  nodeSize,
  nodesBetween,
  resolveInternal,
} from "../model/position.js";
import type { Schema } from "../model/schema.js";
import { replaceAtPath } from "../model/tree.js";
import { parseDOMContent, renderedAttributes } from "../serialize/html.js";
import type {
  Attributes,
  DOMOutputSpec,
  EditorViewLike,
  JSONContent,
  MarkJSON,
  SelectionRange,
} from "../types.js";

const VOID_TAGS = new Set([
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

interface TextSpan {
  node: Text;
  from: number;
  to: number;
}

interface BlockEntry {
  element: HTMLElement;
  path: number[];
  name: string;
  from: number;
  to: number;
}

function isAttributeBag(value: unknown): value is Attributes {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderSpec(
  spec: DOMOutputSpec,
  document: Document,
): { dom: Node; contentDOM: HTMLElement | null } {
  if (typeof spec === "string") {
    return { dom: document.createTextNode(spec), contentDOM: null };
  }
  const [tag, ...rest] = spec;
  const attrs = isAttributeBag(rest[0]) ? (rest.shift() as Attributes) : {};
  const dom = document.createElement(String(tag));
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }
    dom.setAttribute(name, value === true ? "" : String(value));
  }
  let contentDOM: HTMLElement | null = null;
  for (const part of rest) {
    if (part === 0) {
      contentDOM = dom;
    } else if (Array.isArray(part)) {
      const child = renderSpec(part as DOMOutputSpec, document);
      dom.appendChild(child.dom);
      contentDOM = child.contentDOM ?? contentDOM;
    }
  }
  if (!contentDOM && rest.length === 0 && !VOID_TAGS.has(String(tag))) {
    contentDOM = dom;
  }
  return { dom, contentDOM };
}

export class EditorView implements EditorViewLike {
  element: HTMLElement;

  private spans: TextSpan[] = [];
  private blocks: BlockEntry[] = [];
  private composing = false;
  private applyingSelection = false;

  constructor(
    private readonly editor: Editor,
    element: HTMLElement,
  ) {
    this.element = element;
    element.setAttribute(
      "contenteditable",
      editor.isEditable ? "true" : "false",
    );
    element.setAttribute("role", "textbox");
    element.setAttribute("aria-multiline", "true");
    if (!element.hasAttribute("tabindex")) {
      element.setAttribute("tabindex", "0");
    }
    element.addEventListener("beforeinput", this.onBeforeInput);
    element.addEventListener("keydown", this.onKeyDown);
    element.addEventListener("paste", this.onPaste);
    element.addEventListener("focus", this.onFocus);
    element.addEventListener("blur", this.onBlur);
    element.addEventListener("compositionstart", this.onCompositionStart);
    element.addEventListener("compositionend", this.onCompositionEnd);
    element.ownerDocument.addEventListener(
      "selectionchange",
      this.onSelectionChange,
    );
    this.render();
  }

  private get schema(): Schema {
    return this.editor.schema as Schema;
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  render(): void {
    if (this.composing) {
      return;
    }
    const document = this.element.ownerDocument;
    this.spans = [];
    this.blocks = [];
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    let position = 0;
    const children = childrenOf(this.editor.state.doc);
    for (let index = 0; index < children.length; index++) {
      this.renderNode(
        children[index],
        position,
        this.element,
        [index],
        document,
      );
      position += nodeSize(this.schema, children[index]);
    }
    this.syncSelection();
  }

  private renderNode(
    node: JSONContent,
    pos: number,
    target: Node,
    path: number[],
    document: Document,
  ): void {
    const name = node.type ?? "";
    if (name === "text") {
      const text = node.text ?? "";
      const textNode = document.createTextNode(text);
      this.spans.push({ node: textNode, from: pos, to: pos + text.length });
      let dom: Node = textNode;
      const marks = [...(node.marks ?? [])].sort(
        (left, right) =>
          this.schema.markRank(left.type) - this.schema.markRank(right.type),
      );
      for (let index = marks.length - 1; index >= 0; index--) {
        const wrapper = renderSpec(this.markSpec(marks[index]), document);
        (wrapper.contentDOM ?? (wrapper.dom as HTMLElement)).appendChild(dom);
        dom = wrapper.dom;
      }
      target.appendChild(dom);
      return;
    }

    const { dom, contentDOM } = renderSpec(this.nodeSpec(node), document);
    if (contentDOM) {
      const children = childrenOf(node);
      let childPosition = pos + 1;
      for (let index = 0; index < children.length; index++) {
        this.renderNode(
          children[index],
          childPosition,
          contentDOM,
          [...path, index],
          document,
        );
        childPosition += nodeSize(this.schema, children[index]);
      }
      if (this.schema.isTextblock(name) && children.length === 0) {
        // An empty block needs a placeholder to be reachable by the caret.
        contentDOM.appendChild(document.createElement("br"));
      }
      this.blocks.push({
        element: contentDOM,
        path,
        name,
        from: pos + 1,
        to: pos + 1 + contentSize(this.schema, node),
      });
    }
    target.appendChild(dom);
  }

  private nodeSpec(node: JSONContent): DOMOutputSpec {
    const name = node.type ?? "";
    const spec = this.schema.nodes.get(name);
    const attributes = renderedAttributes(this.schema, name, node.attrs);
    return (
      spec?.renderHTML?.({ node, HTMLAttributes: attributes }) ?? [
        name,
        attributes,
        0,
      ]
    );
  }

  private markSpec(mark: MarkJSON): DOMOutputSpec {
    const spec = this.schema.marks.get(mark.type);
    const attributes = renderedAttributes(this.schema, mark.type, mark.attrs);
    return (
      spec?.renderHTML?.({ mark, HTMLAttributes: attributes }) ?? [
        mark.type,
        attributes,
        0,
      ]
    );
  }

  // -------------------------------------------------------------------------
  // Selection mapping
  // -------------------------------------------------------------------------

  private domAt(pos: number): { node: Node; offset: number } | null {
    for (const span of this.spans) {
      if (pos >= span.from && pos < span.to) {
        return { node: span.node, offset: pos - span.from };
      }
    }
    for (let index = this.spans.length - 1; index >= 0; index--) {
      if (this.spans[index].to === pos) {
        return {
          node: this.spans[index].node,
          offset: pos - this.spans[index].from,
        };
      }
    }
    for (const block of this.blocks) {
      if (pos >= block.from && pos <= block.to) {
        return { node: block.element, offset: 0 };
      }
    }
    return null;
  }

  private firstSpanIn(node: Node): TextSpan | undefined {
    return this.spans.find(
      (span) => node === span.node || node.contains(span.node),
    );
  }

  private lastSpanIn(node: Node): TextSpan | undefined {
    for (let index = this.spans.length - 1; index >= 0; index--) {
      const span = this.spans[index];
      if (node === span.node || node.contains(span.node)) {
        return span;
      }
    }
    return undefined;
  }

  private positionFromDOM(node: Node | null, offset: number): number | null {
    if (!node) {
      return null;
    }
    if (node.nodeType === 3) {
      const span = this.spans.find((entry) => entry.node === node);
      return span ? span.from + Math.min(offset, span.to - span.from) : null;
    }
    const child = node.childNodes[offset];
    if (child) {
      const span = this.firstSpanIn(child);
      if (span) {
        return span.from;
      }
    }
    const previous = node.childNodes[offset - 1];
    if (previous) {
      const span = this.lastSpanIn(previous);
      if (span) {
        return span.to;
      }
    }
    const block = this.blocks.find((entry) => entry.element === node);
    return block ? block.from : null;
  }

  readSelection(): SelectionRange | null {
    const domSelection = this.element.ownerDocument.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      return null;
    }
    if (
      !domSelection.anchorNode ||
      !this.element.contains(domSelection.anchorNode)
    ) {
      return null;
    }
    const anchor = this.positionFromDOM(
      domSelection.anchorNode,
      domSelection.anchorOffset,
    );
    const head = this.positionFromDOM(
      domSelection.focusNode,
      domSelection.focusOffset,
    );
    if (anchor === null || head === null) {
      return null;
    }
    return {
      anchor,
      head,
      from: Math.min(anchor, head),
      to: Math.max(anchor, head),
      empty: anchor === head,
    };
  }

  /** Write the model selection back into the DOM. */
  syncSelection(): void {
    const document = this.element.ownerDocument;
    if (document.activeElement !== this.element) {
      return;
    }
    const domSelection = document.getSelection();
    if (!domSelection) {
      return;
    }
    const { anchor, head } = this.editor.state.selection;
    const anchorDOM = this.domAt(anchor);
    const headDOM = this.domAt(head);
    if (!anchorDOM || !headDOM) {
      return;
    }
    this.applyingSelection = true;
    try {
      domSelection.setBaseAndExtent(
        anchorDOM.node,
        anchorDOM.offset,
        headDOM.node,
        headDOM.offset,
      );
    } catch {
      // jsdom and some browsers reject exotic ranges — leave the DOM selection alone.
    } finally {
      this.applyingSelection = false;
    }
  }

  focus(): void {
    this.element.focus();
    this.syncSelection();
  }

  blur(): void {
    this.element.blur();
  }

  scrollSelectionIntoView(): void {
    const target = this.domAt(this.editor.state.selection.head);
    const element =
      target?.node.nodeType === 3
        ? target.node.parentElement
        : (target?.node as HTMLElement | undefined);
    element?.scrollIntoView?.({ block: "nearest" });
  }

  setEditable(editable: boolean): void {
    this.element.setAttribute("contenteditable", editable ? "true" : "false");
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private captureSelection(): void {
    const selection = this.readSelection();
    if (selection) {
      this.editor.setSelectionRange(selection);
    }
  }

  private onSelectionChange = (): void => {
    if (this.applyingSelection || this.composing) {
      return;
    }
    if (this.element.ownerDocument.activeElement !== this.element) {
      return;
    }
    const selection = this.readSelection();
    if (selection) {
      this.editor.setSelectionRange(selection);
    }
  };

  private onFocus = (event: FocusEvent): void => {
    this.editor.handleFocus(event);
  };

  private onBlur = (event: FocusEvent): void => {
    this.editor.handleBlur(event);
  };

  private onCompositionStart = (): void => {
    this.composing = true;
  };

  private onCompositionEnd = (): void => {
    this.composing = false;
    this.resyncFromDOM();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.editor.isEditable || this.composing) {
      return;
    }
    this.captureSelection();
    for (const descriptor of eventDescriptors(event)) {
      const handler =
        this.editor.extensionManager.keyboardShortcuts[descriptor];
      if (handler?.({ editor: this.editor })) {
        event.preventDefault();
        return;
      }
    }
  };

  private onPaste = (event: ClipboardEvent): void => {
    if (!this.editor.isEditable) {
      return;
    }
    event.preventDefault();
    this.captureSelection();
    const html = event.clipboardData?.getData("text/html");
    const text = event.clipboardData?.getData("text/plain");
    if (html) {
      this.editor.commands.insertContent(html);
    } else if (text) {
      this.editor.commands.insertContent(text);
    }
  };

  private onBeforeInput = (event: InputEvent): void => {
    if (!this.editor.isEditable) {
      event.preventDefault();
      return;
    }
    const type = event.inputType;
    if (type === "insertCompositionText") {
      // Let the browser own composition; the model is resynced on compositionend.
      return;
    }
    this.captureSelection();

    switch (type) {
      case "insertText":
      case "insertReplacementText": {
        event.preventDefault();
        const text =
          event.data ?? event.dataTransfer?.getData("text/plain") ?? "";
        if (text) {
          this.editor.insertTextWithRules(text);
        }
        break;
      }
      case "insertParagraph":
        event.preventDefault();
        this.editor.commands.splitBlock();
        break;
      case "insertLineBreak":
        event.preventDefault();
        if (this.editor.extensionManager.commands.setHardBreak) {
          (
            this.editor.commands as Record<
              string,
              (...args: unknown[]) => boolean
            >
          ).setHardBreak();
        } else {
          this.editor.commands.splitBlock();
        }
        break;
      case "deleteContentBackward":
      case "deleteWordBackward":
      case "deleteSoftLineBackward":
        event.preventDefault();
        this.deleteBackward();
        break;
      case "deleteContentForward":
      case "deleteWordForward":
      case "deleteSoftLineForward":
        event.preventDefault();
        this.deleteForward();
        break;
      case "deleteByCut":
      case "deleteContent":
        event.preventDefault();
        this.editor.commands.deleteSelection();
        break;
      default:
        // Formatting and paste are handled by shortcuts / the paste listener.
        event.preventDefault();
    }
  };

  private deleteBackward(): void {
    const editor = this.editor;
    const { from, empty } = editor.state.selection;
    if (!empty) {
      editor.commands.deleteSelection();
      return;
    }
    const $from = resolveInternal(this.schema, editor.state.doc, from);
    if ($from.parentOffset > 0) {
      editor.commands.deleteRange({ from: from - 1, to: from });
      return;
    }
    const previousEnd = this.previousTextblockEnd(from);
    if (previousEnd !== null) {
      editor.commands.deleteRange({ from: previousEnd, to: from });
    }
  }

  private deleteForward(): void {
    const editor = this.editor;
    const { from, empty } = editor.state.selection;
    if (!empty) {
      editor.commands.deleteSelection();
      return;
    }
    const $from = resolveInternal(this.schema, editor.state.doc, from);
    if (from < $from.end()) {
      editor.commands.deleteRange({ from, to: from + 1 });
      return;
    }
    const nextStart = this.nextTextblockStart(from);
    if (nextStart !== null) {
      editor.commands.deleteRange({ from, to: nextStart });
    }
  }

  private textblockRanges(): { from: number; to: number }[] {
    const doc = this.editor.state.doc;
    const ranges: { from: number; to: number }[] = [];
    nodesBetween(
      this.schema,
      doc,
      0,
      contentSize(this.schema, doc),
      (node, pos) => {
        if (this.schema.isTextblock(node.type ?? "")) {
          ranges.push({
            from: pos + 1,
            to: pos + 1 + contentSize(this.schema, node),
          });
          return false;
        }
        return undefined;
      },
    );
    return ranges;
  }

  private previousTextblockEnd(pos: number): number | null {
    const ranges = this.textblockRanges();
    const index = ranges.findIndex((range) => range.from === pos);
    return index > 0 ? ranges[index - 1].to : null;
  }

  private nextTextblockStart(pos: number): number | null {
    const ranges = this.textblockRanges();
    const index = ranges.findIndex((range) => range.to === pos);
    return index >= 0 && index < ranges.length - 1
      ? ranges[index + 1].from
      : null;
  }

  /** Read the block the caret sits in back out of the DOM (after IME input). */
  private resyncFromDOM(): void {
    const domSelection = this.element.ownerDocument.getSelection();
    const anchorNode = domSelection?.anchorNode ?? null;
    const block = anchorNode
      ? this.blocks.find((entry) => entry.element.contains(anchorNode))
      : undefined;
    if (!block || !domSelection) {
      this.render();
      return;
    }
    const content = parseDOMContent(this.schema, block.element, block.name);
    const offset = textOffsetIn(
      block.element,
      domSelection.anchorNode,
      domSelection.anchorOffset,
    );
    this.editor.commands.command(({ tr }) => {
      tr.transform((doc) => {
        const node = blockAtPath(doc, block.path);
        return node
          ? replaceAtPath(doc, block.path, { ...node, content })
          : null;
      });
      tr.setSelection(block.from + offset);
      return true;
    });
  }

  destroy(): void {
    this.element.removeEventListener("beforeinput", this.onBeforeInput);
    this.element.removeEventListener("keydown", this.onKeyDown);
    this.element.removeEventListener("paste", this.onPaste);
    this.element.removeEventListener("focus", this.onFocus);
    this.element.removeEventListener("blur", this.onBlur);
    this.element.removeEventListener(
      "compositionstart",
      this.onCompositionStart,
    );
    this.element.removeEventListener("compositionend", this.onCompositionEnd);
    this.element.ownerDocument.removeEventListener(
      "selectionchange",
      this.onSelectionChange,
    );
    this.element.setAttribute("contenteditable", "false");
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
    this.spans = [];
    this.blocks = [];
  }
}

function blockAtPath(doc: JSONContent, path: number[]): JSONContent | null {
  let node: JSONContent | undefined = doc;
  for (const index of path) {
    node = node?.content?.[index];
    if (!node) {
      return null;
    }
  }
  return node ?? null;
}

function textOffsetIn(
  root: Element,
  node: Node | null,
  offset: number,
): number {
  if (!node) {
    return 0;
  }
  let total = 0;
  const walk = (current: Node): boolean => {
    if (current === node) {
      total += current.nodeType === 3 ? offset : 0;
      return true;
    }
    if (current.nodeType === 3) {
      total += current.textContent?.length ?? 0;
      return false;
    }
    for (const child of Array.from(current.childNodes)) {
      if (walk(child)) {
        return true;
      }
    }
    return false;
  };
  for (const child of Array.from(root.childNodes)) {
    if (walk(child)) {
      break;
    }
  }
  return total;
}
