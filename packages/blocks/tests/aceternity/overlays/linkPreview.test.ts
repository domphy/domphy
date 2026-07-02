// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { linkPreview } from "../../../src/aceternity/overlays/linkPreview.ts";

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

describe("linkPreview", () => {
  it("renders a working demo with zero arguments: a link trigger plus a hidden preview card", () => {
    const { host } = render(linkPreview() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper).toBeTruthy();
    const trigger = wrapper.querySelector("a");
    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute("href")).toBe("https://example.com");
    const preview = wrapper.querySelector('[role="presentation"]');
    expect(preview).toBeTruthy();
    expect((preview as HTMLElement).querySelector("img")).toBeTruthy();
  });

  it("shows the preview card on hover and hides it on mouse leave", async () => {
    // The resting opacity/transform come from the declarative `style` object,
    // which Domphy compiles into a CSS class rule (not an inline style) — so
    // only the imperative open/close transition (driven by the `openState`
    // listener in `_onMount`) is observable via `element.style` here. State
    // notifications are scheduled on a microtask, so each assertion needs a
    // flush (mirrors `@domphy/ui`'s own `motion.test.ts` pattern).
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const { host } = render(
      linkPreview({ url: "https://domphy.dev", children: "Domphy" }) as DomphyElement,
    );
    const trigger = host.querySelector("a") as HTMLElement;
    const preview = host.querySelector('[role="presentation"]') as HTMLElement;
    trigger.dispatchEvent(new Event("mouseenter"));
    await flush();
    expect(preview.style.opacity).toBe("1");
    trigger.dispatchEvent(new Event("mouseleave"));
    await flush();
    expect(preview.style.opacity).toBe("0");
  });

  it("resolves an async imageResolver once on first hover without throwing", async () => {
    const resolver = vi.fn().mockResolvedValue("https://example.com/shot.png");
    const { host } = render(
      linkPreview({ url: "https://domphy.dev", imageResolver: resolver }) as DomphyElement,
    );
    const trigger = host.querySelector("a") as HTMLElement;
    trigger.dispatchEvent(new Event("mouseenter"));
    trigger.dispatchEvent(new Event("mouseenter"));
    await Promise.resolve();
    await Promise.resolve();
    expect(resolver).toHaveBeenCalledTimes(1);
  });
});
