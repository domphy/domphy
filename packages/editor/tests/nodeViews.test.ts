import { afterEach, describe, expect, it } from "vitest";

import { Editor } from "../src/Editor.js";
import { Node } from "../src/Extendable.js";
import type {
  AnyExtension,
  NodeViewInstance,
  NodeViewProps,
} from "../src/types.js";
import { docOf, p, testExtensions } from "./fixtures.js";

const mounted: Editor[] = [];

afterEach(() => {
  while (mounted.length > 0) {
    mounted.pop()?.destroy();
  }
  document.body.replaceChildren();
});

interface ViewLog {
  created: NodeViewProps[];
  updated: number;
  destroyed: number;
  selected: number;
  deselected: number;
}

/** A leaf node rendered entirely by its node view. */
function pageBreak(log: ViewLog, options: { updateReturns?: boolean } = {}) {
  return Node.create({
    name: "pageBreak",
    group: "block",
    addAttributes: () => ({ label: { default: "break" } }),
    parseHTML: () => [{ tag: 'div[data-type="page-break"]' }],
    renderHTML: ({ HTMLAttributes }) => [
      "div",
      { ...HTMLAttributes, "data-type": "page-break" },
      "Page break",
    ],
    addNodeView:
      () =>
      (props: NodeViewProps): NodeViewInstance => {
        log.created.push(props);
        const dom =
          props.editor.view!.element.ownerDocument.createElement("div");
        dom.setAttribute("data-type", "page-break");
        dom.textContent = String(props.node.attrs?.label ?? "");
        return {
          dom,
          update(node) {
            log.updated += 1;
            if (options.updateReturns === false) {
              return false;
            }
            dom.textContent = String(node.attrs?.label ?? "");
            return true;
          },
          selectNode: () => {
            log.selected += 1;
          },
          deselectNode: () => {
            log.deselected += 1;
          },
          destroy: () => {
            log.destroyed += 1;
          },
        };
      },
  });
}

/** A contentful node whose children render into contentDOM. */
function panel(log: ViewLog) {
  return Node.create({
    name: "panel",
    group: "block",
    content: "block+",
    parseHTML: () => [{ tag: 'div[data-type="panel"]' }],
    renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
    addNodeView:
      () =>
      (props: NodeViewProps): NodeViewInstance => {
        log.created.push(props);
        const document = props.editor.view!.element.ownerDocument;
        const dom = document.createElement("section");
        dom.setAttribute("data-type", "panel");
        const contentDOM = document.createElement("div");
        dom.appendChild(contentDOM);
        return { dom, contentDOM, update: () => true };
      },
  });
}

function emptyLog(): ViewLog {
  return { created: [], updated: 0, destroyed: 0, selected: 0, deselected: 0 };
}

function mount(
  content: Parameters<Editor["createDocument"]>[0],
  extra: AnyExtension[],
  options: Partial<ConstructorParameters<typeof Editor>[0]> = {},
): { editor: Editor; host: HTMLElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: [...testExtensions, ...extra],
    content,
    ...options,
  });
  mounted.push(editor);
  return { editor, host };
}

describe("node views", () => {
  it("renders the node through the factory instead of renderHTML", () => {
    const log = emptyLog();
    const { host } = mount(
      docOf(p("a"), { type: "pageBreak", attrs: { label: "here" } }),
      [pageBreak(log)],
    );
    expect(log.created).toHaveLength(1);
    expect(host.innerHTML).toBe(
      '<p>a</p><div data-type="page-break">here</div>',
    );
  });

  it("keeps the same instance across a re-render and calls update", () => {
    const log = emptyLog();
    const { editor, host } = mount(docOf(p("a"), { type: "pageBreak" }), [
      pageBreak(log),
    ]);
    const before = host.querySelector('[data-type="page-break"]');
    editor.commands.insertContentAt(2, "b");
    const after = host.querySelector('[data-type="page-break"]');
    expect(after).toBe(before);
    expect(log.created).toHaveLength(1);
    expect(log.updated).toBe(1);
    expect(log.destroyed).toBe(0);
  });

  it("rebuilds when update returns false", () => {
    const log = emptyLog();
    const { editor, host } = mount(docOf(p("a"), { type: "pageBreak" }), [
      pageBreak(log, { updateReturns: false }),
    ]);
    const before = host.querySelector('[data-type="page-break"]');
    editor.commands.insertContentAt(2, "b");
    const after = host.querySelector('[data-type="page-break"]');
    expect(after).not.toBe(before);
    expect(log.created).toHaveLength(2);
    expect(log.destroyed).toBe(1);
  });

  it("destroys the instance exactly once when the node is removed", () => {
    const log = emptyLog();
    const { editor } = mount(docOf(p("a"), { type: "pageBreak" }), [
      pageBreak(log),
    ]);
    editor.commands.setContent(docOf(p("a")));
    expect(log.destroyed).toBe(1);
  });

  it("destroys live instances when the editor is destroyed", () => {
    const log = emptyLog();
    const { editor } = mount(docOf({ type: "pageBreak" }), [pageBreak(log)]);
    editor.destroy();
    expect(log.destroyed).toBe(1);
  });

  it("reports the node position through getPos", () => {
    const log = emptyLog();
    mount(docOf(p("ab"), { type: "pageBreak" }), [pageBreak(log)]);
    // <p>ab</p> occupies 0..4, so the leaf sits at 4
    expect(log.created[0].getPos()).toBe(4);
  });

  it("applies updateAttributes as a single transaction on the node", () => {
    const log = emptyLog();
    const { editor, host } = mount(
      docOf(p("a"), { type: "pageBreak", attrs: { label: "old" } }),
      [pageBreak(log)],
    );
    log.created[0].updateAttributes({ label: "new" });
    expect(editor.getJSON().content?.[1].attrs).toEqual({ label: "new" });
    // the surviving instance re-rendered its own DOM from update()
    expect(host.querySelector('[data-type="page-break"]')?.textContent).toBe(
      "new",
    );
  });

  it("renders children into contentDOM for contentful views", () => {
    const log = emptyLog();
    const { host } = mount(docOf({ type: "panel", content: [p("inside")] }), [
      panel(log),
    ]);
    expect(host.innerHTML).toBe(
      '<section data-type="panel"><div><p>inside</p></div></section>',
    );
  });

  it("signals selection with selectNode / deselectNode", () => {
    const log = emptyLog();
    const { editor } = mount(docOf(p("ab"), { type: "pageBreak" }, p("cd")), [
      pageBreak(log),
    ]);
    expect(log.selected).toBe(0);

    // a range spanning the leaf selects it
    editor.commands.setTextSelection({ from: 1, to: 8 });
    expect(log.selected).toBe(1);
    expect(log.deselected).toBe(0);

    editor.commands.setTextSelection(1);
    expect(log.deselected).toBe(1);
  });
});

describe("view hooks", () => {
  it("onKeyDown runs before the keymap and can skip it", () => {
    const seen: string[] = [];
    const shortcut = Node.create({ name: "unused" });
    const { editor, host } = mount(docOf(p("hello")), [shortcut], {
      onKeyDown: (event) => {
        seen.push(event.key);
        return event.key === "b";
      },
    });
    editor.commands.setTextSelection({ from: 1, to: 6 });
    host.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "b",
        code: "KeyB",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(seen).toEqual(["b"]);
    // the hook claimed the event, so the bold shortcut never ran
    expect(editor.getHTML()).toBe("<p>hello</p>");
  });

  it("onPaste can claim the event before the editor inserts", () => {
    const { editor, host } = mount(docOf(p("")), [], {
      onPaste: () => true,
    });
    editor.commands.setTextSelection(1);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "pasted" },
    });
    host.dispatchEvent(event);
    expect(editor.getJSON()).toEqual(docOf(p()));
    expect(event.defaultPrevented).toBe(false);
  });

  it("onDrop receives the event; the default blocks native drops", () => {
    const seen: string[] = [];
    const { host } = mount(docOf(p("a")), [], {
      onDrop: (event) => {
        seen.push(event.type);
        return false;
      },
    });
    const event = new Event("drop", { bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    expect(seen).toEqual(["drop"]);
    expect(event.defaultPrevented).toBe(true);
  });

  it("blocks native drops when no hook is wired", () => {
    const { host } = mount(docOf(p("a")), []);
    const event = new Event("drop", { bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("update event payload", () => {
  it("passes the applied transaction to onUpdate", () => {
    const received: { hasEditor: boolean; meta: unknown }[] = [];
    const { editor } = mount(docOf(p("a")), [], {
      onUpdate: ({ editor: instance, transaction }) => {
        received.push({
          hasEditor: !!instance,
          meta: transaction.getMeta("source"),
        });
      },
    });
    editor.chain().setMeta("source", "test").insertContentAt(2, "b").run();
    expect(received).toEqual([{ hasEditor: true, meta: "test" }]);
  });

  it("passes the transaction to `update` listeners too", () => {
    const metas: unknown[] = [];
    const { editor } = mount(docOf(p("a")), []);
    editor.on("update", (props) => {
      metas.push(
        (
          props as { transaction: { getMeta(key: string): unknown } }
        ).transaction.getMeta("source"),
      );
    });
    editor.chain().setMeta("source", "listener").insertContentAt(2, "b").run();
    expect(metas).toEqual(["listener"]);
  });
});
