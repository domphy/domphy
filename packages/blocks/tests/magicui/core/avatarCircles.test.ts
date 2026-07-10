// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { avatarCircles } from "../../../src/magicui/core/avatarCircles.ts";

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

describe("avatarCircles", () => {
  it("renders a working demo tree with zero args: 6 avatar links plus a +99 overflow badge", () => {
    const { host } = render(avatarCircles() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    const links = container.querySelectorAll("a");
    expect(links.length).toBe(6);
    expect(container.textContent).toContain("+99");
  });

  it("supports custom avatars, a custom overflow count, and omits the badge when count is 0", () => {
    const { host } = render(
      avatarCircles({
        avatars: [
          {
            imageUrl: "alice.png",
            profileUrl: "https://example.com/alice",
            name: "Alice",
          },
          { imageUrl: "bob.png", name: "Bob" },
        ],
        overflowCount: 0,
      }) as DomphyElement,
    );
    const links = host.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(links[0].getAttribute("href")).toBe("https://example.com/alice");
    expect(links[0].querySelector("img")?.getAttribute("alt")).toBe("Alice");
    expect(host.textContent).not.toContain("+");
  });
});
