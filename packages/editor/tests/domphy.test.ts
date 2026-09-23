/**
 * Smoke tests for the Domphy adapter (`@domphy/editor/domphy`):
 * createEditor / editorContent / bubbleMenu / editorState, plus the
 * editorContent host-children contract guard.
 */

import { type DomphyElement, ElementNode, toState } from "@domphy/core";
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

/**
 * Domphy writes reactive styles straight into the CSSOM, and jsdom's
 * `getComputedStyle` only reads a `<style>` element's TEXT — so the live value
 * has to come off the rule itself.
 */
function ruleValue(element: HTMLElement, property: string): string {
  const selector = `.${element.className.split(" ")[0]}`;
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if ((rule as CSSStyleRule).selectorText === selector) {
        return (rule as CSSStyleRule).style.getPropertyValue(property);
      }
    }
  }
  return "";
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

  it("ignores options.element instead of mounting twice", () => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const editor = createEditor({
      extensions: [starterKit()],
      content: "<p>hello</p>",
      element: el,
    });
    editors.push(editor);
    expect(el.querySelector("[contenteditable]")).toBeNull();
    expect(editor.getText()).toBe("hello");
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

  it("applies color, accentColor, and minHeight from editorContent props", () => {
    const editor = makeEditor();
    const { host, node } = mount({
      div: null,
      $: [
        editorContent(editor, {
          color: "primary",
          accentColor: "info",
          minHeight: 20,
        }),
      ],
    } as DomphyElement);
    // The editor stamps contenteditable on the patched host itself.
    expect(host.querySelector("[contenteditable]")).not.toBeNull();
    // Patch styles the host via CSS-in-JS, not element.style.
    // minHeight 20 → themeSpacing(20) = calc(20/4 em).
    const css = node.generateCSS();
    expect(css).toMatch(/min-height:\s*calc\(\s*5em\s*\)/);
    expect(css).toMatch(/--primary-/);
    expect(css).toMatch(/--info-/);
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

  it("does not unmount a remounted editor when a previous host is removed", () => {
    const editor = makeEditor();
    const wrapperA = document.createElement("div");
    const wrapperB = document.createElement("div");
    document.body.append(wrapperA, wrapperB);
    const nodeA = new ElementNode({
      div: null,
      $: [editorContent(editor)],
    } as DomphyElement);
    nodeA.render(wrapperA);
    const hostA = nodeA.domElement as HTMLElement;
    const nodeB = new ElementNode({
      div: null,
      $: [editorContent(editor)],
    } as DomphyElement);
    nodeB.render(wrapperB);
    const hostB = nodeB.domElement as HTMLElement;
    expect(editor.view?.element).toBe(hostB);
    nodeA.remove();
    expect(editor.view).not.toBeNull();
    expect(editor.view?.element).toBe(hostB);
    expect(hostB.querySelector("p")?.textContent).toBe("hello");
    expect(hostA.isConnected).toBe(false);
  });

  it("unmounts only when the departing host still owns the view", () => {
    const editor = makeEditor();
    const { node, host } = mount({
      div: null,
      $: [editorContent(editor)],
    } as DomphyElement);
    const editorHost = host.querySelector("[contenteditable]") ?? host;
    expect(editor.view?.element).toBe(editorHost);
    node.remove();
    expect(editor.view).toBeNull();
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

  it("portals the toolbar outside the contenteditable host and survives a view render wipe", async () => {
    const editor = makeEditor();
    const { host } = mount({
      div: null,
      $: [
        editorContent(editor),
        bubbleMenu(editor, {
          children: { div: "menu" },
        }),
      ],
    } as DomphyElement);
    const editable = host.querySelector("[contenteditable]") ?? host;
    editor.commands.setTextSelection({ from: 1, to: 3 });
    await flush();
    const toolbar = document.body.querySelector("[role='toolbar']");
    expect(toolbar).not.toBeNull();
    expect(editable.contains(toolbar)).toBe(false);
    editor.view!.render();
    await flush();
    const after = document.body.querySelector("[role='toolbar']");
    expect(after).not.toBeNull();
    expect(editable.contains(after)).toBe(false);
  });

  it("removes the toolbar when the editor is destroyed", async () => {
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
    editor.commands.setTextSelection({ from: 1, to: 3 });
    await flush();
    expect(document.body.querySelector("[role='toolbar']")).not.toBeNull();
    editor.destroy();
    expect(document.body.querySelector("[role='toolbar']")).toBeNull();
  });

  it("keeps the menu open when the blur's relatedTarget is inside it (tiptap BubbleMenuPlugin.blurHandler)", async () => {
    const editor = makeEditor();
    const { host } = mount({
      div: null,
      $: [
        editorContent(editor),
        bubbleMenu(editor, { children: { button: "B" } }),
      ],
    } as DomphyElement);
    const editable = (host.querySelector("[contenteditable]") ??
      host) as HTMLElement;
    editor.commands.setTextSelection({ from: 1, to: 3 });
    await flush();
    const toolbar = document.body.querySelector(
      "[role='toolbar']",
    ) as HTMLElement;
    const menuButton = toolbar.querySelector("button") as HTMLElement;

    // Tab out of the editor INTO the menu: hiding here is what makes the
    // toolbar unreachable by keyboard, because the browser lands on nothing.
    editable.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: menuButton }),
    );
    await flush();
    expect(ruleValue(toolbar, "visibility")).toBe("visible");

    // Blur to anything else still dismisses.
    editable.dispatchEvent(
      new FocusEvent("blur", { relatedTarget: document.body }),
    );
    await flush();
    expect(ruleValue(toolbar, "visibility")).toBe("hidden");
  });

  it("Escape inside the menu hides it and returns focus to the editor (WAI-ARIA APG: non-modal overlays are dismissible and restore focus)", async () => {
    const editor = makeEditor();
    const { host } = mount({
      div: null,
      $: [
        editorContent(editor),
        bubbleMenu(editor, { children: { button: "B" } }),
      ],
    } as DomphyElement);
    const editable = (host.querySelector("[contenteditable]") ??
      host) as HTMLElement;
    editor.commands.setTextSelection({ from: 1, to: 3 });
    await flush();
    const toolbar = document.body.querySelector(
      "[role='toolbar']",
    ) as HTMLElement;
    const menuButton = toolbar.querySelector("button") as HTMLElement;

    const focused = vi.spyOn(editable, "focus");
    menuButton.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flush();
    expect(ruleValue(toolbar, "visibility")).toBe("hidden");
    expect(focused).toHaveBeenCalled();

    // Refocusing must not re-open it — only a new selection does.
    editor.handleFocus(new FocusEvent("focus"));
    await flush();
    expect(ruleValue(toolbar, "visibility")).toBe("hidden");
    editor.commands.setTextSelection({ from: 1, to: 4 });
    await flush();
    expect(ruleValue(toolbar, "visibility")).toBe("visible");
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
