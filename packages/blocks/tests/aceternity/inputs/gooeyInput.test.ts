// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { gooeyInput } from "../../../src/aceternity/inputs/gooeyInput.ts";

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

describe("gooeyInput", () => {
  it("renders a working demo with zero arguments: goo filter defs, an icon trigger and a text field", () => {
    const { host } = render(gooeyInput() as DomphyElement);
    const wrapper = host.firstElementChild as HTMLElement;
    expect(wrapper.querySelector("svg filter feGaussianBlur")).toBeTruthy();
    expect(wrapper.querySelector("svg filter feColorMatrix")).toBeTruthy();
    expect(wrapper.querySelector('button[type="button"]')).toBeTruthy();
    expect(wrapper.querySelector("input[type=text]")).toBeTruthy();
  });

  it("clicking the icon bubble expands the field and fires onOpenChange", () => {
    const onOpenChange = vi.fn();
    const { host } = render(gooeyInput({ onOpenChange }) as DomphyElement);
    const trigger = host.querySelector('button[type="button"]') as HTMLButtonElement;

    trigger.click();
    flushSync();

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("typing into the expanded field fires onValueChange", () => {
    const onValueChange = vi.fn();
    const { host } = render(gooeyInput({ onValueChange }) as DomphyElement);
    const trigger = host.querySelector('button[type="button"]') as HTMLButtonElement;
    trigger.click();

    const input = host.querySelector("input[type=text]") as HTMLInputElement;
    input.value = "search term";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(onValueChange).toHaveBeenCalledWith("search term");
  });

  it("disabled prevents the trigger from opening", () => {
    const onOpenChange = vi.fn();
    const { host } = render(gooeyInput({ disabled: true, onOpenChange }) as DomphyElement);
    const trigger = host.querySelector('button[type="button"]') as HTMLButtonElement;

    trigger.click();

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(gooeyInput() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
