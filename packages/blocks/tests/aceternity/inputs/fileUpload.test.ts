// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fileUpload } from "../../../src/aceternity/inputs/fileUpload.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function dispatchDrop(target: HTMLElement, files: File[]) {
  const event = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer?: { files: File[] } };
  event.dataTransfer = { files };
  target.dispatchEvent(event);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("fileUpload", () => {
  it("renders a working empty demo: ghost cards, a drop-zone with a hidden file input and instruction text", () => {
    const { host } = render(fileUpload() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const dropZone = wrapper.querySelector('[role="button"]') as HTMLElement;
    expect(dropZone).toBeTruthy();
    expect(dropZone.querySelector("input[type=file]")).toBeTruthy();
    expect(dropZone.querySelector("h3")?.textContent).toBeTruthy();
  });

  it("clicking the drop-zone opens the native file picker", () => {
    const { host } = render(fileUpload() as DomphyElement);
    const dropZone = host.querySelector('[role="button"]') as HTMLElement;
    const fileInput = dropZone.querySelector("input[type=file]") as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, "click");

    dropZone.click();

    expect(clickSpy).toHaveBeenCalled();
  });

  it("dropping files adds them to the list and fires onChange", () => {
    const onChange = vi.fn();
    const { host } = render(fileUpload({ onChange }) as DomphyElement);
    const dropZone = host.querySelector('[role="button"]') as HTMLElement;
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    dispatchDrop(dropZone, [file]);
    flushSync();

    expect(onChange).toHaveBeenCalledWith([file]);
    expect(host.textContent).toContain("notes.txt");
  });

  it("respects maxFiles by dropping the overflow", () => {
    const onChange = vi.fn();
    const { host } = render(fileUpload({ onChange, maxFiles: 1 }) as DomphyElement);
    const dropZone = host.querySelector('[role="button"]') as HTMLElement;
    const first = new File(["a"], "a.txt", { type: "text/plain" });
    const second = new File(["b"], "b.txt", { type: "text/plain" });

    dispatchDrop(dropZone, [first, second]);

    expect(onChange).toHaveBeenCalledWith([first]);
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(fileUpload() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
