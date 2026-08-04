import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "../src/Editor";
import { starterKit } from "../src/extensions/starterKit";

/**
 * The Link openOnClick listener binds to the view's host element. With
 * `createEditor()` + `editorContent()` the view does not exist at onCreate
 * time, so the binding lives in the onMount hook — these tests pin that.
 */
function linkExtension(editor: Editor) {
  return editor.extensionManager.extensions.find(
    (extension) => extension.name === "link",
  );
}

function clickFirstLink(host: HTMLElement, ctrlKey = false): void {
  const anchor = host.querySelector("a[href]");
  expect(anchor).not.toBeNull();
  anchor!.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey }),
  );
}

describe("link openOnClick binding", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("binds when mounted after construction (the createEditor flow)", () => {
    const editor = new Editor({
      extensions: [starterKit()],
      content: '<p><a href="https://example.com">link</a></p>',
      element: null,
    });
    expect(linkExtension(editor)?.storage.handleClick).toBeNull();

    const host = document.createElement("div");
    editor.mount(host);

    expect(linkExtension(editor)?.storage.handleClick).not.toBeNull();
    editor.destroy();
  });

  it("binds when constructed with an element", () => {
    const host = document.createElement("div");
    const editor = new Editor({
      extensions: [starterKit()],
      content: "<p>hi</p>",
      element: host,
    });

    expect(linkExtension(editor)?.storage.handleClick).not.toBeNull();
    editor.destroy();
  });

  it("opens the link on Mod+click while editable", () => {
    const opened = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window);
    const editor = new Editor({
      extensions: [starterKit()],
      content: '<p><a href="https://example.com">link</a></p>',
      element: null,
    });
    const host = document.createElement("div");
    document.body.appendChild(host);
    editor.mount(host);

    clickFirstLink(host, true);

    expect(opened).toHaveBeenCalledWith("https://example.com", "_blank");
    editor.destroy();
    host.remove();
  });

  it("moves the listener to the new host on re-mount, once", () => {
    const opened = vi
      .spyOn(window, "open")
      .mockImplementation(() => null as unknown as Window);
    const editor = new Editor({
      extensions: [starterKit()],
      content: '<p><a href="https://example.com">link</a></p>',
      element: null,
    });
    const first = document.createElement("div");
    const second = document.createElement("div");
    editor.mount(first);
    const detach = vi.spyOn(first, "removeEventListener");
    editor.mount(second);

    expect(detach).toHaveBeenCalledWith("click", expect.any(Function));

    clickFirstLink(second, true);
    expect(opened).toHaveBeenCalledTimes(1);
    editor.destroy();
  });

  it("removes the listener on destroy", () => {
    const editor = new Editor({
      extensions: [starterKit()],
      content: '<p><a href="https://example.com">link</a></p>',
      element: null,
    });
    const host = document.createElement("div");
    editor.mount(host);
    const detach = vi.spyOn(host, "removeEventListener");
    editor.destroy();

    expect(detach).toHaveBeenCalledWith("click", expect.any(Function));
    expect(linkExtension(editor)?.storage.handleClick).toBeNull();
  });
});
