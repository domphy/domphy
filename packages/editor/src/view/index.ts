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
  textBetween,
} from "../model/position.js";
import type { Schema } from "../model/schema.js";
import { replaceAtPath } from "../model/tree.js";
import {
  parseDOMContent,
  renderedAttributes,
  VOID_TAGS,
} from "../serialize/html.js";
import type {
  Attributes,
  DOMOutputSpec,
  EditorViewLike,
  JSONContent,
  MarkJSON,
  NodeViewInstance,
  NodeViewProps,
  SelectionRange,
} from "../types.js";
import { rootOf, selectionFor } from "../utils.js";

/** `white-space` values that keep a trailing space selectable. `pre-line` collapses spaces, so it is not one. */
const WHITESPACE_PRESERVING = new Set(["pre", "pre-wrap", "break-spaces"]);

/** Letters, numbers and underscore — the unit word deletion keeps together. */
const WORD_CHAR = /[\p{L}\p{N}_]/u;
const WHITESPACE = /\s/;

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

interface NodeViewEntry {
  instance: NodeViewInstance;
  name: string;
  node: JSONContent;
  pos: number;
  selected: boolean;
}

function isAttributeBag(value: unknown): value is Attributes {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Accept the drag, so the browser delivers a `drop` event. */
function allowDrop(event: DragEvent): void {
  event.preventDefault();
}

/**
 * The modifier that turns a drag into a copy, per platform — the same split
 * prosemirror-view's `dragCopyModifier` makes.
 */
function dragCopies(event: DragEvent): boolean {
  const platform =
    typeof navigator === "undefined" ? "" : navigator.platform || "";
  return /Mac|iP(hone|[oa]d)/.test(platform) ? event.altKey : event.ctrlKey;
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
  let sawChild = false;
  for (const part of rest) {
    if (part === 0) {
      contentDOM = dom;
      sawChild = true;
    } else if (Array.isArray(part)) {
      const child = renderSpec(part as DOMOutputSpec, document);
      dom.appendChild(child.dom);
      contentDOM = child.contentDOM ?? contentDOM;
      sawChild = true;
    } else if (typeof part === "string") {
      // Literal text child: ["div", attrs, "Page break"].
      dom.appendChild(document.createTextNode(part));
      sawChild = true;
    }
  }
  if (!sawChild && !VOID_TAGS.has(String(tag))) {
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

  /**
   * The range this view handed to the drag currently in flight, and whether
   * dropping it should move it (prosemirror-view's `Dragging`). Null while no
   * drag started inside this editor — a drop then carries foreign content.
   */
  private dragging: { from: number; to: number; move: boolean } | null = null;

  /**
   * Live node-view instances, keyed by child-index path + node type.
   *
   * ponytail: identity is positional. Rendering is a full rebuild, so an
   * instance is reused when a node of the same type sits at the same path as
   * last render — enough for the common case (attrs change in place). Inserting
   * a sibling before it hands the instance to its neighbour; `update()`
   * returning false rebuilds. Upgrade to a real keyed diff only if that shows.
   */
  private nodeViews = new Map<string, NodeViewEntry>();
  private previousNodeViews = new Map<string, NodeViewEntry>();
  private reusedNodeViews = new Set<NodeViewEntry>();
  private nodeViewFactories = new Map<
    string,
    ((props: NodeViewProps) => NodeViewInstance) | null
  >();

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
    // role=textbox needs an accessible name (axe aria-input-field-name) —
    // supply a default, but never override a name the host already carries.
    if (
      !element.hasAttribute("aria-label") &&
      !element.hasAttribute("aria-labelledby")
    ) {
      element.setAttribute("aria-label", "Rich text editor");
    }
    if (!element.hasAttribute("tabindex")) {
      element.setAttribute("tabindex", "0");
    }
    // Under a collapsing `white-space` a trailing space is not rendered, so the
    // browser clamps the caret back in front of it and the next keystroke is
    // typed before the space instead of after it. Editing needs a value that
    // keeps the space real; a host that already picked one of those keeps it.
    if (!WHITESPACE_PRESERVING.has(element.style.whiteSpace)) {
      element.style.whiteSpace = "pre-wrap";
    }
    element.addEventListener("beforeinput", this.onBeforeInput);
    element.addEventListener("keydown", this.onKeyDown);
    element.addEventListener("paste", this.onPaste);
    element.addEventListener("dragstart", this.onDragStart);
    element.addEventListener("dragend", this.onDragEnd);
    // prosemirror-view: `editHandlers.dragover = editHandlers.dragenter =
    // e => e.preventDefault()`. Without it the element is not a drop target
    // and no `drop` event is ever delivered.
    element.addEventListener("dragover", allowDrop);
    element.addEventListener("dragenter", allowDrop);
    element.addEventListener("drop", this.onDrop);
    element.addEventListener("focus", this.onFocus);
    element.addEventListener("blur", this.onBlur);
    element.addEventListener("compositionstart", this.onCompositionStart);
    element.addEventListener("compositionend", this.onCompositionEnd);
    element.ownerDocument.addEventListener(
      "selectionchange",
      this.onSelectionChange,
    );
    // The first render is driven by Editor.mount, once editor.view is assigned:
    // node views are entitled to reach editor.view while they are being built.
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
    this.previousNodeViews = this.nodeViews;
    this.nodeViews = new Map();
    const reused = new Set<NodeViewEntry>();
    this.reusedNodeViews = reused;
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
    for (const entry of this.previousNodeViews.values()) {
      if (!reused.has(entry)) {
        entry.instance.destroy?.();
      }
    }
    this.previousNodeViews = new Map();
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

    const { dom, contentDOM } = this.nodeViewFactory(name)
      ? this.mountNodeView(node, pos, path)
      : renderSpec(this.nodeSpec(node), document);
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

  /** Resolved node-view factory for a node type, or null. Resolved once. */
  private nodeViewFactory(
    name: string,
  ): ((props: NodeViewProps) => NodeViewInstance) | null {
    const cached = this.nodeViewFactories.get(name);
    if (cached !== undefined) {
      return cached;
    }
    const factory = this.schema.nodes.get(name)?.addNodeView?.() ?? null;
    this.nodeViewFactories.set(name, factory);
    return factory;
  }

  private mountNodeView(
    node: JSONContent,
    pos: number,
    path: number[],
  ): { dom: HTMLElement; contentDOM: HTMLElement | null } {
    const name = node.type ?? "";
    const key = `${path.join(".")}:${name}`;
    let entry = this.previousNodeViews.get(key);

    if (entry) {
      entry.node = node;
      entry.pos = pos;
      if (entry.instance.update?.(node) === false) {
        entry.instance.destroy?.();
        // Drop it from the previous map so the post-render sweep does not
        // destroy it a second time.
        this.previousNodeViews.delete(key);
        entry = undefined;
      }
    }

    if (!entry) {
      const factory = this.nodeViewFactory(name) as (
        props: NodeViewProps,
      ) => NodeViewInstance;
      const created: Partial<NodeViewEntry> = {
        name,
        node,
        pos,
        selected: false,
      };
      created.instance = factory({
        node,
        editor: this.editor,
        selected: false,
        getPos: () => created.pos as number,
        updateAttributes: (attributes) => {
          this.editor.commands.command(({ tr }) => {
            tr.setNodeAttributes(created.pos as number, attributes);
            return true;
          });
        },
      });
      entry = created as NodeViewEntry;
    }

    this.nodeViews.set(key, entry);
    this.reusedNodeViews.add(entry);
    this.syncNodeViewSelection(entry);
    return {
      dom: entry.instance.dom,
      contentDOM: entry.instance.contentDOM ?? null,
    };
  }

  /**
   * ponytail: `selected` means the selection covers the node. We have no
   * NodeSelection, so clicking an atom does not select it — a range that spans
   * it does. Add NodeSelection if node views need click-to-select.
   */
  private syncNodeViewSelection(entry: NodeViewEntry): void {
    const { from, to } = this.editor.state.selection;
    const size = nodeSize(this.schema, entry.node);
    const selected = from <= entry.pos && to >= entry.pos + size;
    if (selected === entry.selected) {
      return;
    }
    entry.selected = selected;
    if (selected) {
      entry.instance.selectNode?.();
    } else {
      entry.instance.deselectNode?.();
    }
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

  /** True when the editable itself holds focus within its own root. */
  private get hasFocus(): boolean {
    return rootOf(this.element).activeElement === this.element;
  }

  readSelection(): SelectionRange | null {
    const domSelection = selectionFor(this.element);
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

  coordsAtPos(pos?: number): DOMRect | null {
    const position = pos ?? this.editor.state.selection.head;
    // Prefer the live DOM selection when the caller asks for the current
    // caret: the browser's own range rect is the most accurate answer.
    if (pos === undefined) {
      const domSelection = selectionFor(this.element);
      if (
        domSelection &&
        domSelection.rangeCount > 0 &&
        domSelection.anchorNode &&
        this.element.contains(domSelection.anchorNode)
      ) {
        const range = domSelection.getRangeAt(0).cloneRange();
        range.collapse(false);
        if (typeof range.getBoundingClientRect === "function") {
          return range.getBoundingClientRect();
        }
      }
    }
    const target = this.domAt(position);
    if (!target) {
      return null;
    }
    const range = this.element.ownerDocument.createRange();
    try {
      range.setStart(target.node, target.offset);
      range.collapse(true);
    } catch {
      // A position that maps to a node the DOM refuses as a range boundary.
      return null;
    }
    if (typeof range.getBoundingClientRect === "function") {
      return range.getBoundingClientRect();
    }
    // No Range geometry (jsdom) — fall back to the boundary element's rect.
    const boundary =
      target.node.nodeType === 3
        ? target.node.parentElement
        : (target.node as HTMLElement);
    return boundary?.getBoundingClientRect() ?? null;
  }

  /** Write the model selection back into the DOM. */
  syncSelection(): void {
    // Node views track selection even when the host is not focused.
    for (const entry of this.nodeViews.values()) {
      this.syncNodeViewSelection(entry);
    }
    if (!this.hasFocus) {
      return;
    }
    const domSelection = selectionFor(this.element);
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
    if (!this.hasFocus) {
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
    if (this.editor.options.onKeyDown?.(event, this.editor)) {
      return;
    }
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
    if (this.editor.options.onPaste?.(event, this.editor)) {
      return;
    }
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
      this.insertPlainText(text);
    }
  };

  /**
   * Insert clipboard `text/plain` as literal text — never as HTML.
   *
   * `insertContent(string)` parses its argument as HTML (tiptap does too), so
   * handing it `text/plain` would turn typed-out markup into real markup and
   * fold every newline into a space. ProseMirror's clipboard parser instead
   * builds one block per line as an *open* slice, so the first line merges into
   * the block holding the caret and only the later lines split it; the split is
   * reproduced here with `splitBlock`. One chain, so one undo step.
   */
  private insertPlainText(
    text: string,
    at = this.editor.state.selection.from,
    initial = this.editor.chain(),
  ): void {
    const parentName = resolveInternal(this.schema, this.editor.state.doc, at)
      .parent.type;
    // Newlines are ordinary content inside a code block — never a split.
    const lines =
      parentName && this.schema.nodes.get(parentName)?.code === true
        ? [text]
        : text.split(/\r\n?|\n/);
    let chain = initial;
    lines.forEach((line, index) => {
      if (index > 0) {
        chain = chain.splitBlock();
      }
      if (line) {
        chain = chain.insertContent([{ type: "text", text: line }]);
      }
    });
    chain.run();
  }

  /**
   * Remember the dragged range so a drop inside this editor can MOVE it
   * (prosemirror-view's `handlers.dragstart` building a `Dragging`).
   *
   * The clipboard payload itself is left to the browser: a drag out of a
   * contenteditable already carries `text/html` and `text/plain` for the
   * selected DOM, which is the same markup this view rendered.
   */
  private onDragStart = (event: DragEvent): void => {
    this.dragging = null;
    if (!this.editor.isEditable) {
      return;
    }
    const { from, to, empty } = this.editor.state.selection;
    if (empty) {
      return;
    }
    // Only a drag that grabbed the selection moves it; grabbing anything else
    // (an image, a node view) leaves the selection where it is.
    const origin = this.posAtCoords(event.clientX, event.clientY);
    if (origin === null || origin < from || origin > to) {
      return;
    }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copyMove";
    }
    this.dragging = { from, to, move: !dragCopies(event) };
  };

  private onDragEnd = (): void => {
    this.dragging = null;
  };

  /**
   * prosemirror-view's `handleDrop`: drop at the caret the pointer is over,
   * moving the dragged range when the drag started in this editor and the
   * copy modifier is not held.
   *
   * The `onDrop` option still runs first and still wins — a file drop, which
   * has no text payload, is left entirely to it (this handler only cancels
   * the browser's own DOM edit, which would desync the model).
   */
  private onDrop = (event: DragEvent): void => {
    const dragging = this.dragging;
    this.dragging = null;
    if (this.editor.options.onDrop?.(event, this.editor)) {
      return;
    }
    // The browser must never edit the contenteditable itself: it would rewrite
    // the DOM behind the model.
    event.preventDefault();
    if (!this.editor.isEditable) {
      return;
    }
    const html = event.dataTransfer?.getData("text/html");
    const text = event.dataTransfer?.getData("text/plain");
    if (!html && !text) {
      return;
    }
    const dropAt = this.posAtCoords(event.clientX, event.clientY);
    if (dropAt === null) {
      return;
    }
    const move = dragging !== null && dragging.move;
    // Dropping a moved range back inside itself is a no-op, not a delete
    // followed by a re-insert at the same place.
    if (move && dragging && dropAt >= dragging.from && dropAt <= dragging.to) {
      return;
    }
    this.captureSelection();
    let chain = this.editor.chain();
    let insertAt = dropAt;
    if (move && dragging) {
      chain = chain.deleteRange({ from: dragging.from, to: dragging.to });
      if (dropAt > dragging.to) {
        insertAt = dropAt - (dragging.to - dragging.from);
      }
    }
    if (html) {
      // `replaceRange` leaves the caret after the inserted content, which is
      // where prosemirror-view puts it too (`selectionBetween`).
      chain.insertContentAt(insertAt, html).run();
    } else {
      this.insertPlainText(
        text ?? "",
        insertAt,
        chain.setTextSelection(insertAt),
      );
    }
    this.editor.commands.focus();
  };

  /**
   * The model position under a viewport point. Uses the standard
   * `caretPositionFromPoint`, falling back to WebKit/Blink's older
   * `caretRangeFromPoint` (the only one Chrome had before 128).
   */
  private posAtCoords(clientX: number, clientY: number): number | null {
    const owner = this.element.ownerDocument as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    let container: Node | null = null;
    let offset = 0;
    const caret = owner.caretPositionFromPoint?.(clientX, clientY);
    if (caret) {
      container = caret.offsetNode;
      offset = caret.offset;
    } else {
      const range = owner.caretRangeFromPoint?.(clientX, clientY);
      if (range) {
        container = range.startContainer;
        offset = range.startOffset;
      }
    }
    if (!container || !this.element.contains(container)) {
      return null;
    }
    return this.positionFromDOM(container, offset);
  }

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
        // ProseMirror's baseKeymap runs `newlineInCode` before `splitBlock`:
        // inside a `code` textblock Enter is a literal newline, not a split.
        if (!this.insertNewlineInCode()) {
          this.editor.commands.splitBlock();
        }
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
        event.preventDefault();
        this.deleteBackward();
        break;
      case "deleteWordBackward":
        event.preventDefault();
        this.deleteWordBackward();
        break;
      case "deleteSoftLineBackward":
        event.preventDefault();
        this.deleteSoftLineBackward();
        break;
      case "deleteContentForward":
        event.preventDefault();
        this.deleteForward();
        break;
      case "deleteWordForward":
        event.preventDefault();
        this.deleteWordForward();
        break;
      case "deleteSoftLineForward":
        event.preventDefault();
        this.deleteSoftLineForward();
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

  /**
   * ProseMirror's `newlineInCode`: Enter inside a `code` textblock inserts a
   * newline instead of splitting the block. Returns false elsewhere.
   */
  private insertNewlineInCode(): boolean {
    const { from, to } = this.editor.state.selection;
    const doc = this.editor.state.doc;
    const parent = resolveInternal(this.schema, doc, from).parent;
    const parentName = parent.type;
    if (!parentName || this.schema.nodes.get(parentName)?.code !== true) {
      return false;
    }
    // `$head.sameParent($anchor)`: a selection reaching out of the code block
    // is a plain split for ProseMirror, not a newline.
    if (resolveInternal(this.schema, doc, to).parent !== parent) {
      return false;
    }
    this.editor.insertTextWithRules("\n");
    return true;
  }

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
      return;
    }
    // ProseMirror's joinBackward: "If there is no node before this, try to
    // lift" — Backspace at the start of the first list item outdents it.
    editor.commands.command(({ tr, dispatch }) => {
      const range = tr.selection;
      if (!tr.canLift(range.from, range.to)) {
        return false;
      }
      if (dispatch) {
        tr.lift(range.from, range.to);
      }
      return true;
    });
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

  /**
   * Text of the caret's textblock around the caret. Leaf nodes (hardBreak)
   * count as one "\n" so character offsets map 1:1 onto model positions.
   */
  private caretText(direction: "before" | "after"): {
    text: string;
    from: number;
  } | null {
    const editor = this.editor;
    const { from, empty } = editor.state.selection;
    if (!empty) {
      return null;
    }
    const $from = resolveInternal(this.schema, editor.state.doc, from);
    const range =
      direction === "before"
        ? ([$from.start(), from] as const)
        : ([from, $from.end()] as const);
    return {
      text: textBetween(
        this.schema,
        editor.state.doc,
        range[0],
        range[1],
        "",
        () => "\n",
      ),
      from,
    };
  }

  /**
   * Ctrl/Cmd+Backspace semantics (pinned by tests): skip the whitespace run
   * touching the caret, then delete one maximal run — word characters when the
   * run starts on one, otherwise a punctuation run. At a block boundary it
   * degrades to a plain Backspace (joining blocks).
   */
  private deleteWordBackward(): void {
    const caret = this.caretText("before");
    if (!caret) {
      this.editor.commands.deleteSelection();
      return;
    }
    const { text, from } = caret;
    let index = text.length;
    while (index > 0 && WHITESPACE.test(text[index - 1])) {
      index -= 1;
    }
    const isWord = index > 0 && WORD_CHAR.test(text[index - 1]);
    while (
      index > 0 &&
      WORD_CHAR.test(text[index - 1]) === isWord &&
      !WHITESPACE.test(text[index - 1])
    ) {
      index -= 1;
    }
    if (index === text.length) {
      this.deleteBackward();
      return;
    }
    this.editor.commands.deleteRange({
      from: from - (text.length - index),
      to: from,
    });
  }

  /** Forward mirror of {@link deleteWordBackward}. */
  private deleteWordForward(): void {
    const caret = this.caretText("after");
    if (!caret) {
      this.editor.commands.deleteSelection();
      return;
    }
    const { text, from } = caret;
    let index = 0;
    while (index < text.length && WHITESPACE.test(text[index])) {
      index += 1;
    }
    const isWord = index < text.length && WORD_CHAR.test(text[index]);
    while (
      index < text.length &&
      WORD_CHAR.test(text[index]) === isWord &&
      !WHITESPACE.test(text[index])
    ) {
      index += 1;
    }
    if (index === 0) {
      this.deleteForward();
      return;
    }
    this.editor.commands.deleteRange({ from, to: from + index });
  }

  /**
   * Cmd+Backspace semantics: delete to the start of the current line — the
   * previous hardBreak, or the block start. Visual (wrapped) lines are not
   * computable without layout, so "soft line" means "up to the hard break".
   */
  private deleteSoftLineBackward(): void {
    const caret = this.caretText("before");
    if (!caret) {
      this.editor.commands.deleteSelection();
      return;
    }
    const { text, from } = caret;
    const lineBreak = text.lastIndexOf("\n");
    const target = lineBreak === -1 ? 0 : lineBreak + 1;
    if (target === text.length) {
      this.deleteBackward();
      return;
    }
    this.editor.commands.deleteRange({
      from: from - (text.length - target),
      to: from,
    });
  }

  /** Forward mirror of {@link deleteSoftLineBackward}. */
  private deleteSoftLineForward(): void {
    const caret = this.caretText("after");
    if (!caret) {
      this.editor.commands.deleteSelection();
      return;
    }
    const { text, from } = caret;
    const lineBreak = text.indexOf("\n");
    const target = lineBreak === -1 ? text.length : lineBreak;
    if (target === 0) {
      this.deleteForward();
      return;
    }
    this.editor.commands.deleteRange({ from, to: from + target });
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
    const domSelection = selectionFor(this.element);
    const anchorNode = domSelection?.anchorNode ?? null;
    const block = anchorNode
      ? this.blocks.find((entry) => entry.element.contains(anchorNode))
      : undefined;
    if (!block || !domSelection) {
      this.render();
      return;
    }
    // A trailing <br> in the DOM is the caret placeholder and is stripped on
    // read — unless the model block already ends in a leaf node (a real
    // hardBreak), in which case that <br> is its rendering, not a placeholder.
    const current = blockAtPath(this.editor.state.doc, block.path);
    const currentChildren = current ? childrenOf(current) : [];
    const endsInLeaf =
      currentChildren.length > 0 &&
      currentChildren[currentChildren.length - 1].type !== "text";
    const content = parseDOMContent(
      this.schema,
      block.element,
      block.name,
      undefined,
      !endsInLeaf,
    );
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
    this.element.removeEventListener("dragstart", this.onDragStart);
    this.element.removeEventListener("dragend", this.onDragEnd);
    this.element.removeEventListener("dragover", allowDrop);
    this.element.removeEventListener("dragenter", allowDrop);
    this.element.removeEventListener("drop", this.onDrop);
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
    for (const entry of this.nodeViews.values()) {
      entry.instance.destroy?.();
    }
    this.nodeViews = new Map();
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
