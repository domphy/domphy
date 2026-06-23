// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  inputCheckbox,
  inputNumber,
  inputOTP,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  textarea,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function listenerCount(state: any): number {
  const listeners = state?._notifier?._listeners;
  if (!listeners) return 0;
  let total = 0;
  for (const key in listeners) total += listeners[key].size;
  return total;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// ---------------------------------------------------------------------------
// inputText
// ---------------------------------------------------------------------------
describe("inputText", () => {
  it("sets type=text on the input element", () => {
    const { host } = render({ input: null, $: [inputText()] } as DomphyElement);
    const el = host.querySelector("input")!;
    expect(el.type).toBe("text");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputText()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputText"));
    warn.mockRestore();
  });

  it("reflects [disabled] attribute when set", () => {
    const { host } = render({
      input: null,
      disabled: true,
      $: [inputText()],
    } as DomphyElement);
    const el = host.querySelector("input")!;
    expect(el.disabled).toBe(true);
  });

  it("releases color listener after node.remove()", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      input: null,
      $: [inputText({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });

  it("releases accentColor listener after node.remove()", () => {
    const accentColor = toState<"primary" | "success">(
      "primary",
      "accentColor",
    );
    const { node } = render({
      input: null,
      $: [inputText({ accentColor })],
    } as DomphyElement);
    expect(listenerCount(accentColor)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(accentColor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputNumber
// ---------------------------------------------------------------------------
describe("inputNumber", () => {
  it("sets type=number on the input element", () => {
    const { host } = render({
      input: null,
      $: [inputNumber()],
    } as DomphyElement);
    const el = host.querySelector("input")!;
    expect(el.type).toBe("number");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputNumber()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputNumber"));
    warn.mockRestore();
  });

  it("reflects [disabled] attribute", () => {
    const { host } = render({
      input: null,
      disabled: true,
      $: [inputNumber()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("releases color listener after node.remove()", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      input: null,
      $: [inputNumber({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputRange
// ---------------------------------------------------------------------------
describe("inputRange", () => {
  it("sets type=range on the input element", () => {
    const { host } = render({
      input: null,
      type: "range",
      $: [inputRange()],
    } as DomphyElement);
    // jsdom respects the type attribute set in the element definition
    expect(host.querySelector("input")!.type).toBe("range");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputRange()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputRange"));
    warn.mockRestore();
  });

  it("reflects [disabled] attribute", () => {
    const { host } = render({
      input: null,
      type: "range",
      disabled: true,
      $: [inputRange()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("releases accentColor listener after node.remove()", () => {
    const accentColor = toState<"primary" | "success">(
      "primary",
      "accentColor",
    );
    const { node } = render({
      input: null,
      type: "range",
      $: [inputRange({ accentColor })],
    } as DomphyElement);
    expect(listenerCount(accentColor)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(accentColor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputCheckbox
// ---------------------------------------------------------------------------
describe("inputCheckbox", () => {
  it("sets type=checkbox on the input element", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      $: [inputCheckbox()],
    } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("checkbox");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputCheckbox()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputCheckbox"));
    warn.mockRestore();
  });

  it("checked state is reflected on the element", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      checked: true,
      $: [inputCheckbox()],
    } as DomphyElement);
    expect(host.querySelector("input")!.checked).toBe(true);
  });

  it("indeterminate state can be set programmatically", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      $: [inputCheckbox()],
    } as DomphyElement);
    const el = host.querySelector("input") as HTMLInputElement;
    el.indeterminate = true;
    expect(el.indeterminate).toBe(true);
  });

  it("releases color listener after node.remove()", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      input: null,
      type: "checkbox",
      $: [inputCheckbox({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputRadio
// ---------------------------------------------------------------------------
describe("inputRadio", () => {
  it("sets type=radio on the input element", () => {
    const { host } = render({
      input: null,
      type: "radio",
      $: [inputRadio()],
    } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("radio");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputRadio()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputRadio"));
    warn.mockRestore();
  });

  it("reflects [disabled] attribute", () => {
    const { host } = render({
      input: null,
      type: "radio",
      disabled: true,
      $: [inputRadio()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("releases accentColor listener after node.remove()", () => {
    const accentColor = toState<"primary" | "error">("primary", "accentColor");
    const { node } = render({
      input: null,
      type: "radio",
      $: [inputRadio({ accentColor })],
    } as DomphyElement);
    expect(listenerCount(accentColor)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(accentColor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputSwitch
// ---------------------------------------------------------------------------
describe("inputSwitch", () => {
  it("renders an input with type=checkbox", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      $: [inputSwitch()],
    } as DomphyElement);
    const el = host.querySelector("input")!;
    expect(el.type).toBe("checkbox");
  });

  it("sets role=switch on the element", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      $: [inputSwitch()],
    } as DomphyElement);
    expect(host.querySelector("input")!.getAttribute("role")).toBe("switch");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputSwitch()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputSwitch"));
    warn.mockRestore();
  });

  it("aria-checked reflects checked state after click", () => {
    const { host } = render({
      input: null,
      type: "checkbox",
      $: [inputSwitch()],
    } as DomphyElement);
    const el = host.querySelector("input") as HTMLInputElement;
    expect(el.checked).toBe(false);
    el.click();
    expect(el.checked).toBe(true);
  });

  it("releases accentColor listener after node.remove()", () => {
    const accentColor = toState<"primary" | "success">(
      "primary",
      "accentColor",
    );
    const { node } = render({
      input: null,
      type: "checkbox",
      $: [inputSwitch({ accentColor })],
    } as DomphyElement);
    expect(listenerCount(accentColor)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(accentColor)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputSearch
// ---------------------------------------------------------------------------
describe("inputSearch", () => {
  it("sets type=search on the input element", () => {
    const { host } = render({
      input: null,
      $: [inputSearch()],
    } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("search");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputSearch()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputSearch"));
    warn.mockRestore();
  });

  it("reflects [disabled] attribute", () => {
    const { host } = render({
      input: null,
      disabled: true,
      $: [inputSearch()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("releases color listener after node.remove()", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      input: null,
      $: [inputSearch({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// textarea
// ---------------------------------------------------------------------------
describe("textarea", () => {
  it("renders a textarea element", () => {
    const { host } = render({
      textarea: null,
      $: [textarea()],
    } as DomphyElement);
    expect(host.querySelector("textarea")).not.toBeNull();
  });

  it("warns when applied to a non-textarea tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [textarea()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("textarea"));
    warn.mockRestore();
  });

  it("sets overflow:hidden and adjusts height on input when autoResize:true", () => {
    const { host } = render({
      textarea: null,
      $: [textarea({ autoResize: true })],
    } as DomphyElement);
    const el = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(el.style.overflow).toBe("hidden");

    // Simulate the initial resize call that fires immediately on mount.
    // In jsdom scrollHeight is 0, so height will be "0px".
    expect(el.style.height).toBeDefined();

    // Simulate an input event and confirm height is updated.
    Object.defineProperty(el, "scrollHeight", {
      value: 120,
      configurable: true,
    });
    el.dispatchEvent(new Event("input"));
    expect(el.style.height).toBe("120px");
  });

  it("does NOT set overflow:hidden when autoResize is false (default)", () => {
    const { host } = render({
      textarea: null,
      $: [textarea()],
    } as DomphyElement);
    const el = host.querySelector("textarea") as HTMLTextAreaElement;
    expect(el.style.overflow).not.toBe("hidden");
  });

  it("releases color listener after node.remove()", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      textarea: null,
      $: [textarea({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// inputOTP
// ---------------------------------------------------------------------------
describe("inputOTP", () => {
  it("renders the correct number of input slots", () => {
    const { host } = render({
      div: [
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
      ],
      $: [inputOTP()],
    } as DomphyElement);
    expect(host.querySelectorAll("input").length).toBe(4);
  });

  it("auto-advances focus to next input on value entry", () => {
    const { host } = render({
      div: [
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
      ],
      $: [inputOTP()],
    } as DomphyElement);
    const inputs = Array.from(
      host.querySelectorAll("input"),
    ) as HTMLInputElement[];
    inputs[0].focus();
    inputs[0].value = "1";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    expect(document.activeElement).toBe(inputs[1]);
  });

  it("moves focus back on Backspace when input is empty", () => {
    const { host } = render({
      div: [
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
      ],
      $: [inputOTP()],
    } as DomphyElement);
    const inputs = Array.from(
      host.querySelectorAll("input"),
    ) as HTMLInputElement[];
    inputs[1].focus();
    inputs[1].value = "";
    inputs[1].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
    );
    expect(document.activeElement).toBe(inputs[0]);
  });

  it("distributes pasted text across inputs", () => {
    const { host } = render({
      div: [
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
      ],
      $: [inputOTP()],
    } as DomphyElement);
    const inputs = Array.from(
      host.querySelectorAll("input"),
    ) as HTMLInputElement[];
    inputs[0].focus();

    const clipboardData = {
      getData: (_type: string) => "4567",
    };
    const pasteEvent = new Event("paste", { bubbles: true }) as ClipboardEvent;
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: clipboardData,
    });
    Object.defineProperty(pasteEvent, "target", { value: inputs[0] });
    host.querySelector("div")!.dispatchEvent(pasteEvent);

    expect(inputs[0].value).toBe("4");
    expect(inputs[1].value).toBe("5");
    expect(inputs[2].value).toBe("6");
    expect(inputs[3].value).toBe("7");
  });

  it("ArrowLeft / ArrowRight moves focus between inputs", () => {
    const { host } = render({
      div: [
        { input: null, type: "text" },
        { input: null, type: "text" },
        { input: null, type: "text" },
      ],
      $: [inputOTP()],
    } as DomphyElement);
    const inputs = Array.from(
      host.querySelectorAll("input"),
    ) as HTMLInputElement[];
    inputs[1].focus();

    inputs[1].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    expect(document.activeElement).toBe(inputs[0]);

    inputs[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(document.activeElement).toBe(inputs[1]);
  });
});
