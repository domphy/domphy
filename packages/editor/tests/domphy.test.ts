/**
 * Smoke tests for the Domphy adapter (`@domphy/editor/domphy`):
 * createEditor / editorContent / bubbleMenu / editorState, plus the
 * editorContent host-children contract guard.
 */

import type { DomphyElement } from "@domphy/core";

import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bubbleMenu,
  createEditor,
  editorContent,
  editorState,
} from "../src/domphy/index";
import { starterKit } from "../src/extensions/starterKit";
import type { EditorInstance } from "../src/types";

function mount(App: DomphyElement): { host: HTMLElement; node: ElementNode } {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(App);
  node.render(host);
  return { host, node };
}

function flush(): Promise<void> {
  return new Promise<void>((resolve) => queueMicrotask(resolve));
}

const editors: EditorInstance[] = [];

function makeEditor(content = "<p>hello</p>"): EditorInstance {
  const editor = createEditor({
    extensions: [starterKit()],
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  while (editors.length > 0) {
    editors.pop()?.destroy();
  }
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("createEditor", () => {
  it("creates an unmounted editor", () => {
    const editor = makeEditor();
    expect(editor.getText()).toBe("hello");
    expect(editor.isDestroyed).toBe(false);
  });
});

describe("editorContent", () => {
  it("mounts the editor's view into the host", () => {
    const editor = makeEditor();
    const { host } = mount({
      div: null,
      $: [editorContent(editor)],
    } as DomphyElement);
    const editable = host.querySelector("[contenteditable]");
    expect(editable).not.toBeNull();
    expect(editable?.innerHTML).toBe("<p>hello</p>");
    expect(editor.isDestroyed).toBe(false);
  });

  it("warns when the host declares children content", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = makeEditor();
    mount({
      div: ["declared"],
      $: [editorContent(editor)],
    } as DomphyElement);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("must declare null children"),
    );
  });

  it("warns when a [] host is re-rendered (declared empty children)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = makeEditor();
    const refresh = toState(0);
    mount({
      div: (listener: (state: typeof refresh) => void) => {
        refresh.get(listener as never);
        return [{ div: [], $: [editorContent(editor)], _key: "editor-host" }];
      },
    } as DomphyElement);
    expect(spy).not.toHaveBeenCalled();
    refresh.set(1);
    await flush();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("must declare null children"),
    );
  });

  it("does not warn for a null host", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const editor = makeEditor();
    const refresh = toState(0);
    mount({
      div: (listener: (state: typeof refresh) => void) => {
        refresh.get(listener as never);
        return [{ div: null, $: [editorContent(editor)], _key: "editor-host" }];
      },
    } as DomphyElement);
    refresh.set(1);
    await flush();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("bubbleMenu", () => {
  it("mounts the menu once the selection is non-empty", async () => {
    const editor = makeEditor();
    mount({
      div: null,
      $: [
        editorContent(editor),
        bubbleMenu(editor, {
          children: { div: "menu" },
        }),
      ],
    } as DomphyElement);
    // The panel mounts lazily on first show.
    expect(document.body.querySelector("[role='toolbar']")).toBeNull();
    editor.commands.setTextSelection({ from: 1, to: 3 });
    await flush();
    expect(document.body.querySelector("[role='toolbar']")).not.toBeNull();
  });

  it("stays hidden for an empty selection", async () => {
    const editor = makeEditor();
    mount({
      div: null,
      $: [
        editorContent(editor),
        bubbleMenu(editor, {
          children: { div: "menu" },
        }),
      ],
    } as DomphyElement);
    await flush();
    expect(document.body.querySelector("[role='toolbar']")).toBeNull();
  });
});

describe("editorState", () => {
  it("reads isActive and arbitrary state reactively", () => {
    const editor = makeEditor();
    const state = editorState(editor);
    const listener = () => {};

    expect(state.isActive("bold")(listener)).toBe(false);
    editor.commands.setTextSelection({ from: 1, to: 3 });
    editor.commands.toggleMark("bold");
    expect(state.isActive("bold")(listener)).toBe(true);
    expect(state.read((instance) => instance.getText())(listener)).toBe(
      "hello",
    );
  });

  it("notifies a subscribed listener on transactions", async () => {
    const editor = makeEditor();
    const state = editorState(editor);
    let notified = 0;
    // Reading with a listener wires it to editor.stateVersion.
    state.isActive("bold")(() => {
      notified += 1;
    });
    editor.commands.insertContent("x");
    await flush();
    expect(notified).toBeGreaterThan(0);
  });
});
