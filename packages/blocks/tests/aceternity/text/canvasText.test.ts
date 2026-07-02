// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { canvasText } from "../../../src/aceternity/text/canvasText.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("canvasText", () => {
  it("renders a working demo with zero args: sr-only text plus an aria-hidden canvas", () => {
    const { host } = render(canvasText() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.textContent).toBe("Domphy");
    expect(wrapper.querySelector("canvas")).toBeTruthy();
    expect(wrapper.querySelector("canvas")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("omits the backdrop layer when backgroundClassName is not provided, and includes it when it is", () => {
    const { host } = render(canvasText() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    // sr-only span + canvas only — no backdrop div.
    expect(wrapper.children.length).toBe(2);

    document.body.innerHTML = "";
    const { host: hostWithBackdrop } = render(canvasText({ backgroundClassName: "page-bg" }) as DomphyElement);
    const wrapperWithBackdrop = hostWithBackdrop.firstElementChild as HTMLElement;
    expect(wrapperWithBackdrop.children.length).toBe(3);
    expect(wrapperWithBackdrop.querySelector(".page-bg")).toBeTruthy();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(canvasText({ text: "Flow" }) as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
