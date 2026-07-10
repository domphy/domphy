// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { comicText } from "../../../src/magicui/community/comicText.ts";

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

describe("comicText", () => {
  it("renders a working demo with zero args: uppercase text in a single div", () => {
    const { host } = render(comicText() as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.tagName).toBe("DIV");
    expect(container.textContent).toBe("BOOM!");
  });

  it("forces custom text content to uppercase", () => {
    const { host } = render(comicText({ children: "pow" }) as DomphyElement);
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.textContent).toBe("POW");
  });

  it("applies an extra class name onto the container", () => {
    const { host } = render(
      comicText({ className: "hero-word" }) as DomphyElement,
    );
    flushSync();

    const container = host.firstElementChild as HTMLElement;
    expect(container.classList.contains("hero-word")).toBe(true);
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(comicText() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
