// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { vanishInput } from "../../../src/aceternity/inputs/vanishInput.ts";

// jsdom has no real 2D canvas backend (no `canvas` npm package installed), so
// the vanish animation's own `getContext("2d")` guard falls back to clearing
// the field immediately — this only exercises structure/typing/submit
// wiring, not the particle animation itself.

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

describe("vanishInput", () => {
  it("renders a working demo with zero arguments: a pill form with canvas, input, placeholder and submit button", () => {
    const { host } = render(vanishInput() as DomphyElement);
    const form = host.querySelector("form");
    expect(form).toBeTruthy();
    expect(form?.querySelector("canvas")).toBeTruthy();
    expect(form?.querySelector("input[type=text]")).toBeTruthy();
    expect(form?.querySelector("button[type=submit]")).toBeTruthy();
  });

  it("typing updates the controlled value and fires onChange", () => {
    const onChange = vi.fn();
    const { host } = render(vanishInput({ onChange }) as DomphyElement);
    const input = host.querySelector("input") as HTMLInputElement;

    input.value = "hello domphy";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(onChange).toHaveBeenCalledWith("hello domphy");
    expect(input.value).toBe("hello domphy");
  });

  it("submitting (Enter) fires onSubmit with the value present at that moment", () => {
    const onSubmit = vi.fn();
    const { host } = render(vanishInput({ onSubmit }) as DomphyElement);
    const input = host.querySelector("input") as HTMLInputElement;

    input.value = "vanish me";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));

    expect(onSubmit).toHaveBeenCalledWith("vanish me");
  });

  it("accepts a custom placeholder list without throwing", () => {
    expect(() => render(vanishInput({ placeholders: ["Ask me anything", "Try a search"] }) as DomphyElement)).not.toThrow();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(vanishInput() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
