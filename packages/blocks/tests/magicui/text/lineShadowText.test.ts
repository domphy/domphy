// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { lineShadowText } from "../../../src/magicui/text/lineShadowText.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((styleElement) => styleElement.remove());
});

describe("lineShadowText", () => {
  it("renders a working demo with zero args: real text plus a data-attribute-driven ::after shadow", () => {
    const { host } = render(lineShadowText() as DomphyElement);

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.textContent).toBe("Line Shadow");
    // The duplicate shadow copy is generated via `content: attr(data-shadow-text)`,
    // not a second literal text node — the attribute is the only place the
    // string is duplicated.
    expect(wrapper.getAttribute("data-shadow-text")).toBe("Line Shadow");
  });

  it("accepts custom text, shadow color, and wrapping tag without throwing", () => {
    expect(() =>
      render(lineShadowText({ children: "Domphy", shadowColor: "primary", as: "h1" }) as DomphyElement),
    ).not.toThrow();
  });
});
