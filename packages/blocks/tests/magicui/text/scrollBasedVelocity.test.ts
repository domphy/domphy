// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { scrollBasedVelocity } from "../../../src/magicui/text/scrollBasedVelocity.ts";

// jsdom has no requestAnimationFrame/ResizeObserver/IntersectionObserver, so
// scrollBasedVelocity()'s own guards bail out of the motion loop on mount —
// this only exercises structure, not the velocity-driven transform.

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

describe("scrollBasedVelocity", () => {
  it("renders a working demo with zero args: 2 rows, each with a track and two edge fades", () => {
    const { host } = render(scrollBasedVelocity() as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    expect(container).toBeTruthy();
    const rows = container.querySelectorAll(":scope > div");
    expect(rows).toHaveLength(2);
    for (const row of Array.from(rows)) {
      expect(row.querySelectorAll(":scope > div")).toHaveLength(3); // track + 2 fades
    }
  });

  it("duplicates row content into `repeat` copies, only the first announced", () => {
    const { host } = render(
      scrollBasedVelocity({
        rows: [{ content: "Hello" }],
        repeat: 4,
      }) as DomphyElement,
    );
    const track = host.querySelector('[data-size="increase-6"]') as HTMLElement;
    expect(track).toBeTruthy();
    const copies = track.querySelectorAll(":scope > strong");
    expect(copies).toHaveLength(4);
    expect(copies[0].getAttribute("aria-hidden")).toBeNull();
    expect(copies[1].getAttribute("aria-hidden")).toBe("true");
    expect(host.textContent).toContain("Hello");
  });

  it("accepts an explicit rowCount and arbitrary node content without throwing", () => {
    expect(() =>
      render(
        scrollBasedVelocity({
          rowCount: 1,
          rows: [{ content: { span: "Custom" }, direction: "right" }],
        }) as DomphyElement,
      ),
    ).not.toThrow();
  });

  it("removes cleanly without throwing (no rAF/ResizeObserver/IntersectionObserver in jsdom)", () => {
    const { node } = render(scrollBasedVelocity() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
