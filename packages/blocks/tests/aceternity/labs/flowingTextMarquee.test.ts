// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { flowingTextMarquee } from "../../../src/aceternity/labs/flowingTextMarquee.ts";

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

describe("flowingTextMarquee", () => {
  it("renders a working demo with zero args: text-on-a-path with a looping scroll animation", () => {
    const { host } = render(flowingTextMarquee() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    const svg = wrapper.querySelector("svg") as SVGSVGElement;
    expect(svg).toBeTruthy();

    const guidePath = svg.querySelector("defs path");
    expect(guidePath).toBeTruthy();

    const textPath = svg.querySelector("textPath") as SVGTextPathElement;
    expect(textPath).toBeTruthy();
    expect(textPath.textContent).toContain("basically what happened");

    const scrollLoop = textPath.querySelector("animate");
    expect(scrollLoop?.getAttribute("attributeName")).toBe("startOffset");
  });

  it("cycles between multiple phrases on an interval without throwing", () => {
    const { host } = render(
      flowingTextMarquee({ phrases: ["First phrase here", "Second phrase here"], phraseDurationMs: 10 }) as DomphyElement,
    );
    const textPath = (host.firstElementChild as HTMLElement).querySelector("textPath") as SVGTextPathElement;
    expect(textPath.textContent).toContain("First phrase here");
  });
});
