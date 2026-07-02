// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { chartPieInteractive } from "../../../src/shadcn/charts/chart-pie-interactive.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  new ElementNode(app).render(host);
  return { host };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("chartPieInteractive", () => {
  it("renders a select control, a donut ring and a center total for the default selection", () => {
    const { host } = render(chartPieInteractive());

    expect(host.querySelector("select")).toBeTruthy();
    expect(host.querySelectorAll("select option").length).toBe(5);
    expect(host.querySelectorAll("svg path").length).toBe(5);
    // Default selection = first record (Chrome, value 275).
    expect(host.textContent).toContain("275");
  });

  it("updates the center total and select value when the selection changes", () => {
    const { host } = render(chartPieInteractive());
    const select = host.querySelector("select") as HTMLSelectElement;

    select.value = "safari";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();

    expect(host.textContent).toContain("200");
  });

  it("calls onSelectionChange with the newly picked category key", () => {
    let lastSelection = "";
    const { host } = render(
      chartPieInteractive({ onSelectionChange: (key) => (lastSelection = key) }),
    );
    const select = host.querySelector("select") as HTMLSelectElement;

    select.value = "firefox";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();

    expect(lastSelection).toBe("firefox");
  });
});
