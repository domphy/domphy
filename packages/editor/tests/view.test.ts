import { afterEach, describe, expect, it } from "vitest";

import { Editor } from "../src/Editor.js";
import { Extension } from "../src/Extendable.js";
import type { AnyExtension } from "../src/types.js";
import { docOf, h, p, testExtensions } from "./fixtures.js";

const mounted: Editor[] = [];

function mount(
  content: Parameters<Editor["createDocument"]>[0],
  extra: AnyExtension[] = [],
): { editor: Editor; host: HTMLElement } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const editor = new Editor({
    element: host,
    extensions: [...testExtensions, ...extra],
    content,
  });
  mounted.push(editor);
  return { editor, host };
}

function beforeInput(
  host: HTMLElement,
  inputType: string,
  data: string | null = null,
): void {
  const event = new InputEvent("beforeinput", {
    inputType,
    data,
    bubbles: true,
    cancelable: true,
  });
  host.dispatchEvent(event);
}

function placeCursor(editor: Editor, pos: number): void {
  editor.commands.setTextSelection(pos);
}

/** jsdom has no DataTransfer, so stand in with the shape the view reads. */
function fakeClipboard(): {
  setData(type: string, value: string): void;
  getData(type: string): string;
} {
  const entries = new Map<string, string>();
  return {
    setData: (type, value) => {
      entries.set(type, value);
    },
    getData: (type) => entries.get(type) ?? "",
  };
}

function pasteEvent(
  clipboardData: ReturnType<typeof fakeClipboard>,
): ClipboardEvent {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as ClipboardEvent;
  Object.defineProperty(event, "clipboardData", { value: clipboardData });
  return event;
}

afterEach(() => {
  while (mounted.length > 0) {
    mounted.pop()?.destroy();
  }
  document.body.replaceChildren();
});

describe("rendering", () => {
  it("renders the document into the contenteditable host", () => {
    const { host } = mount(docOf(h(2, "Title"), p("body")));
    expect(host.getAttribute("contenteditable")).toBe("true");
    expect(host.innerHTML).toBe("<h2>Title</h2><p>body</p>");
  });

  it("gives empty blocks a br so the caret can reach them", () => {
    const { host } = mount(docOf(p()));
    expect(host.innerHTML).toBe("<p><br></p>");
  });

  it("re-renders after a document change", () => {
    const { editor, host } = mount(docOf(p("a")));
    editor.commands.insertContentAt(2, "b");
    expect(host.innerHTML).toBe("<p>ab</p>");
  });

  it("renders marks as nested elements", () => {
    const { editor, host } = mount(docOf(p("hello")));
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.toggleMark("bold");
    expect(host.innerHTML).toBe("<p><strong>hello</strong></p>");
  });
});

describe("beforeinput interception", () => {
  it("applies insertText to the model instead of the DOM", () => {
    const { editor, host } = mount(docOf(p("ac")));
    placeCursor(editor, 2);
    beforeInput(host, "insertText", "b");
    expect(editor.getJSON()).toEqual(docOf(p("abc")));
    expect(host.innerHTML).toBe("<p>abc</p>");
  });

  it("splits the block on insertParagraph", () => {
    const { editor, host } = mount(docOf(p("ab")));
    placeCursor(editor, 2);
    beforeInput(host, "insertParagraph");
    expect(editor.getJSON()).toEqual(docOf(p("a"), p("b")));
    expect(host.innerHTML).toBe("<p>a</p><p>b</p>");
  });

  it("deletes one character backward", () => {
    const { editor } = mount(docOf(p("abc")));
    placeCursor(editor, 3);
    beforeInput(
      document.querySelector("div") as HTMLElement,
      "deleteContentBackward",
    );
    expect(editor.getJSON()).toEqual(docOf(p("ac")));
  });

  it("joins with the previous block when at the start of a textblock", () => {
    const { editor, host } = mount(docOf(p("ab"), p("cd")));
    placeCursor(editor, 5);
    beforeInput(host, "deleteContentBackward");
    expect(editor.getJSON()).toEqual(docOf(p("abcd")));
  });

  it("deletes one character forward", () => {
    const { editor, host } = mount(docOf(p("abc")));
    placeCursor(editor, 2);
    beforeInput(host, "deleteContentForward");
    expect(editor.getJSON()).toEqual(docOf(p("ac")));
  });

  it("joins with the next block at the end of a textblock", () => {
    const { editor, host } = mount(docOf(p("ab"), p("cd")));
    placeCursor(editor, 3);
    beforeInput(host, "deleteContentForward");
    expect(editor.getJSON()).toEqual(docOf(p("abcd")));
  });

  it("ignores input when the editor is not editable", () => {
    const { editor, host } = mount(docOf(p("ab")));
    editor.setEditable(false);
    placeCursor(editor, 3);
    beforeInput(host, "insertText", "c");
    expect(editor.getJSON()).toEqual(docOf(p("ab")));
    expect(host.getAttribute("contenteditable")).toBe("false");
  });
});

describe("keyboard shortcuts", () => {
  const shortcuts = Extension.create({
    name: "testShortcuts",
    addKeyboardShortcuts: () => ({
      "Mod-b": ({ editor }) => editor.commands.toggleMark("bold"),
    }),
  });

  it("run the matching handler and prevent the default", () => {
    const { editor, host } = mount(docOf(p("hello")), [shortcuts]);
    editor.commands.setTextSelection({ from: 1, to: 6 });
    const event = new KeyboardEvent("keydown", {
      key: "b",
      code: "KeyB",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.getHTML()).toBe("<p><strong>hello</strong></p>");
  });

  it("leave unmatched keys alone", () => {
    const { host } = mount(docOf(p("hello")), [shortcuts]);
    const event = new KeyboardEvent("keydown", {
      key: "q",
      code: "KeyQ",
      bubbles: true,
      cancelable: true,
    });
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("paste", () => {
  it("prefers text/html and routes it through the parser", () => {
    const { editor, host } = mount(docOf(p("")));
    placeCursor(editor, 1);
    const clipboardData = fakeClipboard();
    clipboardData.setData("text/html", "<p>pasted <strong>bold</strong></p>");
    host.dispatchEvent(pasteEvent(clipboardData));
    expect(editor.getHTML()).toBe("<p>pasted <strong>bold</strong></p>");
  });

  it("falls back to plain text", () => {
    const { editor, host } = mount(docOf(p("")));
    placeCursor(editor, 1);
    const clipboardData = fakeClipboard();
    clipboardData.setData("text/plain", "plain");
    host.dispatchEvent(pasteEvent(clipboardData));
    expect(editor.getJSON()).toEqual(docOf(p("plain")));
  });
});

describe("focus and blur", () => {
  it("emit editor events and track isFocused", () => {
    const events: string[] = [];
    const host = document.createElement("div");
    document.body.appendChild(host);
    const editor = new Editor({
      element: host,
      extensions: testExtensions,
      content: docOf(p("a")),
      onFocus: () => events.push("focus"),
      onBlur: () => events.push("blur"),
    });
    mounted.push(editor);

    host.dispatchEvent(new FocusEvent("focus"));
    expect(editor.isFocused).toBe(true);
    host.dispatchEvent(new FocusEvent("blur"));
    expect(editor.isFocused).toBe(false);
    expect(events).toEqual(["focus", "blur"]);
  });
});

describe("mount / unmount", () => {
  it("cleans the host on destroy", () => {
    const { editor, host } = mount(docOf(p("a")));
    editor.destroy();
    expect(host.innerHTML).toBe("");
    expect(host.getAttribute("contenteditable")).toBe("false");
  });

  it("moves to a new host on mount", () => {
    const { editor } = mount(docOf(p("a")));
    const next = document.createElement("div");
    document.body.appendChild(next);
    editor.mount(next);
    expect(next.innerHTML).toBe("<p>a</p>");
  });
});

describe("DOM selection mapping", () => {
  it("reads the DOM selection back into model positions", () => {
    const { editor, host } = mount(docOf(p("hello")));
    const textNode = host.querySelector("p")?.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 1);
    range.setEnd(textNode, 4);
    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(editor.view?.readSelection()).toMatchObject({ from: 2, to: 5 });
  });
});
