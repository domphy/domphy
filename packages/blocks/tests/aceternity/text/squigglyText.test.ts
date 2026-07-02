// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { squigglyText } from "../../../src/aceternity/text/squigglyText.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("squigglyText", () => {
  it("renders a working demo with zero args: text plus a namespaced SVG turbulence/displacement filter per step", () => {
    const { host, node } = render(squigglyText() as DomphyElement);
    flushSync();

    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper.textContent).toContain("Wobbly");

    const filters = wrapper.querySelectorAll("filter");
    expect(filters.length).toBe(5); // default `steps`
    const firstFilter = filters[0];
    expect(firstFilter.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(firstFilter.querySelector("feTurbulence")).toBeTruthy();
    expect(firstFilter.querySelector("feDisplacementMap")).toBeTruthy();
    expect(firstFilter.querySelector("feTurbulence")!.namespaceURI).toBe("http://www.w3.org/2000/svg");

    // Declarative `style:` compiles to class-based CSS, so assert against the
    // generated stylesheet rather than an inline `style="..."` attribute.
    const firstFilterId = firstFilter.getAttribute("id");
    expect(node.generateCSS()).toContain(`url(#${firstFilterId})`);
  });

  it("steps through the filter cycle on the timer, looping back to the first", () => {
    vi.useFakeTimers();
    const { host, node } = render(squigglyText({ steps: 3, stepDuration: 100 }) as DomphyElement);
    flushSync();
    const wrapper = host.firstElementChild as HTMLElement;
    const filterIds = Array.from(wrapper.querySelectorAll("filter")).map((filter) => filter.getAttribute("id"));
    expect(filterIds).toHaveLength(3);

    expect(node.generateCSS()).toContain(`url(#${filterIds[0]})`);

    vi.advanceTimersByTime(100);
    expect(wrapper.style.filter).toContain(filterIds[1]!);

    vi.advanceTimersByTime(100);
    expect(wrapper.style.filter).toContain(filterIds[2]!);

    vi.advanceTimersByTime(100);
    expect(wrapper.style.filter).toContain(filterIds[0]!);
  });

  it("renders as a block div when as:'div' is passed", () => {
    const { host } = render(squigglyText({ as: "div", children: "Block wobble" }) as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("DIV");
    expect(wrapper.textContent).toContain("Block wobble");
  });

  it("removes cleanly without throwing", () => {
    vi.useFakeTimers();
    const { node } = render(squigglyText() as DomphyElement);
    flushSync();
    expect(() => node.remove()).not.toThrow();
  });
});
