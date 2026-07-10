// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { auroraText } from "../../../src/magicui/text/auroraText.ts";

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

describe("auroraText", () => {
  it("renders a working demo with zero args: sr-only text plus an aria-hidden gradient-filled copy", () => {
    const { host } = render(auroraText() as DomphyElement);

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    const spans = wrapper.querySelectorAll(":scope > span");
    expect(spans).toHaveLength(2);
    expect(wrapper.textContent).toContain("Aurora Text");
    const decorativeCopy = wrapper.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLElement;
    expect(decorativeCopy).toBeTruthy();
    expect(decorativeCopy.textContent).toBe("Aurora Text");
  });

  it("accepts custom text, colors, speed, and wrapping tag without throwing", () => {
    expect(() =>
      render(
        auroraText({
          children: "Ship it",
          colors: ["success", "info"],
          speed: 2,
          as: "h2",
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });
});
