// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { magicCard } from "../../../src/magicui/effects/magicCard.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("magicCard", () => {
  it("renders a working demo card with a glow layer + content wrapper by default", () => {
    const { host } = render(magicCard() as DomphyElement);
    expect(host.querySelector("h3")?.textContent).toBe("Magic Card");
    const card = host.firstElementChild as HTMLElement;
    expect(card.children).toHaveLength(2); // interior glow layer + content wrapper
  });

  it("moving the pointer updates the CSS custom properties and fades the interior glow in", () => {
    const { host } = render(magicCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 42, clientY: 24, bubbles: true }),
    );

    expect(card.style.getPropertyValue("--magic-card-x")).toBe("42px");
    expect(card.style.getPropertyValue("--magic-card-y")).toBe("24px");
    // Interior glow fades to gradientOpacity (0.8), not full opacity.
    expect(glow.style.opacity).toBe("0.8");
  });

  it("leaving the pointer fades the interior glow back out and parks the spotlight off-card", () => {
    const { host } = render(magicCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10, bubbles: true }));
    expect(glow.style.opacity).toBe("0.8");

    card.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
    expect(glow.style.opacity).toBe("0");
    expect(card.style.getPropertyValue("--magic-card-x")).toBe("-200px");
  });

  it("a global blur/visibility reset hides the interior glow even without a mouseleave", () => {
    const { host } = render(magicCard() as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const glow = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10, bubbles: true }));
    expect(glow.style.opacity).toBe("0.8");

    window.dispatchEvent(new Event("blur"));
    expect(glow.style.opacity).toBe("0");
  });

  it("orb variant renders a blurred, blend-mode gradient blob", () => {
    const { host, node } = render(magicCard({ variant: "orb" }) as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    // Static visual styles land in Domphy's generated CSS, not inline.
    const css = (node as unknown as { generateCSS: () => string }).generateCSS();
    expect(css).toContain("blur(60px)");
    expect(css).toContain("mix-blend-mode: multiply");
    expect(css).toContain("mix-blend-mode: screen"); // dark-scheme override
    // The border spotlight still tracks the raw pointer in orb mode.
    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 5, bubbles: true }));
    expect(card.style.getPropertyValue("--magic-card-x")).toBe("5px");
  });

  it("orb visibility eases toward orbOpacity via a spring on enter", () => {
    // Drive the rAF loop synchronously so the spring can settle inside the test.
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const { host } = render(magicCard({ variant: "orb", orbOpacity: 0.65 }) as DomphyElement);
    const card = host.firstElementChild as HTMLElement;
    const orb = card.firstElementChild as HTMLElement;

    card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    card.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 5, bubbles: true }));

    let time = performance.now();
    for (let i = 0; i < 2000 && frames.length > 0; i++) {
      const cb = frames.shift();
      time += 16;
      cb?.(time);
    }

    expect(Number(orb.style.opacity)).toBeCloseTo(0.65, 2);
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(magicCard() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });

  it("orb variant removes cleanly without throwing", () => {
    const { node } = render(magicCard({ variant: "orb" }) as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
