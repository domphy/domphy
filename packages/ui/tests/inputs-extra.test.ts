// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inputColor, inputDateTime, inputFile } from "../src/index.ts";

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

// ---------------------------------------------------------------------------
// inputColor
// ---------------------------------------------------------------------------

describe("inputColor", () => {
  it("sets type=color on the input element", () => {
    const { host } = render({
      input: null,
      $: [inputColor()],
    } as DomphyElement);
    const el = host.querySelector("input")!;
    expect(el.type).toBe("color");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputColor()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputColor"));
  });

  it("reflects the [disabled] attribute", () => {
    const { host } = render({
      input: null,
      disabled: true,
      $: [inputColor()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("emits a hardcoded neutral disabled style in generated CSS", () => {
    const node = new ElementNode({
      input: null,
      $: [inputColor()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("[disabled]");
    expect(css).toContain("cursor: not-allowed");
  });

  it("does not emit an empty no-op hover/focus rule", () => {
    const node = new ElementNode({
      input: null,
      $: [inputColor()],
    } as DomphyElement);
    const css = node.generateCSS();
    // The removed rule was "&:hover:not([disabled]), &:focus-visible {}".
    expect(css).not.toContain(":focus-visible");
  });
});

// ---------------------------------------------------------------------------
// inputDateTime
// ---------------------------------------------------------------------------

describe("inputDateTime", () => {
  it("defaults to type=datetime-local", () => {
    const { host } = render({
      input: null,
      $: [inputDateTime()],
    } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("datetime-local");
  });

  it("applies the chosen mode as the input type", () => {
    const { host } = render({
      input: null,
      $: [inputDateTime({ mode: "date" })],
    } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("date");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputDateTime()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputDateTime"));
  });

  it("reflects the [disabled] attribute and emits a disabled style", () => {
    const { host, node } = render({
      input: null,
      disabled: true,
      $: [inputDateTime({ mode: "time" })],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
    expect(node.generateCSS()).toContain("[disabled]");
  });
});

// ---------------------------------------------------------------------------
// inputFile
// ---------------------------------------------------------------------------

describe("inputFile", () => {
  it("sets type=file on the input element", () => {
    const { host } = render({ input: null, $: [inputFile()] } as DomphyElement);
    expect(host.querySelector("input")!.type).toBe("file");
  });

  it("warns when applied to a non-input tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [inputFile()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("inputFile"));
  });

  it("reflects the [disabled] attribute", () => {
    const { host } = render({
      input: null,
      disabled: true,
      $: [inputFile()],
    } as DomphyElement);
    expect(host.querySelector("input")!.disabled).toBe(true);
  });

  it("styles the native upload button via ::-webkit-file-upload-button", () => {
    const node = new ElementNode({
      input: null,
      $: [inputFile()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("file-upload-button");
  });
});
