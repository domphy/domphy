// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  button,
  buttonGhost,
  buttonSwitch,
  fab,
  linkButton,
  toggleGroup,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

/** Flush reactive microtasks so async attribute/style updates settle. */
function flush() {
  return new Promise<void>((r) => setTimeout(r, 0));
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
// button
// ---------------------------------------------------------------------------

describe("button", () => {
  it("generates CSS with cursor:pointer and display:flex", () => {
    const { node } = render({
      button: "Save",
      $: [button()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("cursor: pointer");
    expect(css).toContain("display: flex");
  });

  it("generates CSS with appearance:none", () => {
    const { node } = render({
      button: "Save",
      $: [button()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("appearance: none");
  });

  it("reactive color prop: CSS changes when color state updates", async () => {
    const color = toState<"primary" | "error">("primary", "color");
    const { node } = render({
      button: "Act",
      $: [button({ color })],
    } as DomphyElement);
    const cssBefore = node.generateCSS();

    color.set("error");
    await flush();

    expect(node.generateCSS()).not.toBe(cssBefore);
  });

  it("warns when applied to a non-button tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: "x", $: [button()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("button"));
    warn.mockRestore();
  });

  it("releases listeners on removal (no leak)", () => {
    const color = toState<"primary" | "neutral">("primary", "color");
    const { node } = render({
      button: "X",
      $: [button({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });

  it("defaults to the outline variant (backward compatible: tinted bg + outline)", () => {
    const { node } = render({
      button: "Save",
      $: [button()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("outline: 1px solid");
    expect(css).not.toContain("outline: none");
  });

  it("solid variant fills the background and removes the outline", () => {
    const { node } = render({
      button: "Save",
      $: [button({ variant: "solid" })],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("outline: none");
  });

  it("ghost variant delegates to buttonGhost (no background/border)", () => {
    const { node } = render({
      button: "Save",
      $: [button({ variant: "ghost" })],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("background: none");
    expect(css).toContain("border: none");
  });

  it("size preset changes padding-inline: small < medium < large", () => {
    const cssValues: string[] = [];
    const sizes = ["small", "medium", "large"] as const;
    for (const size of sizes) {
      const { node } = render({
        button: "Save",
        $: [button({ size })],
      } as DomphyElement);
      const css = node.generateCSS();
      const match = css.match(/padding-inline: ([^;]+)/);
      cssValues.push(match ? match[1].trim() : "");
      document.body.innerHTML = "";
    }
    expect(new Set(cssValues).size).toBe(3);
    const nums = cssValues.map((v) => parseFloat(v.match(/[\d.]+/)?.[0] ?? ""));
    expect(nums[0]).toBeLessThan(nums[1]);
    expect(nums[1]).toBeLessThan(nums[2]);
  });
});

// ---------------------------------------------------------------------------
// linkButton
// ---------------------------------------------------------------------------

describe("linkButton", () => {
  it("defaults to outline (border + tinted surface) like button()", () => {
    const { node } = render({
      a: "Open",
      href: "/app",
      $: [linkButton()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("outline: 1px solid");
    expect(css).toContain("focus-visible");
    expect(css).toContain("140ms");
  });

  it("solid variant drops outline and anchors on a dark dataTone surface", () => {
    const { host, node } = render({
      a: "Get started",
      href: "/start",
      $: [linkButton({ variant: "solid", color: "primary" })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("outline: none");
    expect(host.querySelector("a")?.getAttribute("data-tone")).toBe(
      "shift-17",
    );
  });

  it("ghost variant is transparent like buttonGhost", () => {
    const { node } = render({
      a: "Skip",
      href: "#",
      $: [linkButton({ variant: "ghost" })],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("background: none");
    expect(css).toContain("border: none");
  });

  it("warns when applied to a non-anchor tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ button: "x", $: [linkButton()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("linkButton"));
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// buttonGhost
// ---------------------------------------------------------------------------

describe("buttonGhost", () => {
  it("generates CSS with background:none and border:none", () => {
    const { node } = render({
      button: "×",
      $: [buttonGhost()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("background: none");
    expect(css).toContain("border: none");
  });

  it("generates CSS with display:inline-flex", () => {
    const { node } = render({
      button: "×",
      $: [buttonGhost()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("display: inline-flex");
  });

  it("generates CSS with cursor:pointer", () => {
    const { node } = render({
      button: "×",
      $: [buttonGhost()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("cursor: pointer");
  });

  it("warns when applied to a non-button tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "x", $: [buttonGhost()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("buttonGhost"));
    warn.mockRestore();
  });

  it("releases color state listeners on removal", () => {
    const color = toState<"primary" | "error">("error", "color");
    const { node } = render({
      button: "del",
      $: [buttonGhost({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });

  it("size preset changes padding-inline: small < medium < large", () => {
    const cssValues: string[] = [];
    const sizes = ["small", "medium", "large"] as const;
    for (const size of sizes) {
      const { node } = render({
        button: "×",
        $: [buttonGhost({ size })],
      } as DomphyElement);
      const css = node.generateCSS();
      const match = css.match(/padding-inline: ([^;]+)/);
      cssValues.push(match ? match[1].trim() : "");
      document.body.innerHTML = "";
    }
    expect(new Set(cssValues).size).toBe(3);
    const nums = cssValues.map((v) => parseFloat(v.match(/[\d.]+/)?.[0] ?? ""));
    expect(nums[0]).toBeLessThan(nums[1]);
    expect(nums[1]).toBeLessThan(nums[2]);
  });
});

// ---------------------------------------------------------------------------
// buttonSwitch
// ---------------------------------------------------------------------------

describe("buttonSwitch", () => {
  it("renders with role=switch and aria-checked=false by default", () => {
    const { host } = render({
      button: { span: null },
      $: [buttonSwitch()],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("role")).toBe("switch");
    expect(el.getAttribute("aria-checked")).toBe("false");
  });

  it("clicking toggles aria-checked from false to true", async () => {
    const { host } = render({
      button: { span: null },
      $: [buttonSwitch()],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("aria-checked")).toBe("false");
    el.click();
    await flush();
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("clicking twice returns aria-checked to false (round-trip)", async () => {
    const { host } = render({
      button: { span: null },
      $: [buttonSwitch()],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    el.click();
    await flush();
    el.click();
    await flush();
    expect(el.getAttribute("aria-checked")).toBe("false");
  });

  it("respects an initial checked:true prop", () => {
    const { host } = render({
      button: { span: null },
      $: [buttonSwitch({ checked: true })],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("external checked state drives aria-checked reactively", async () => {
    const checked = toState(false);
    const { host } = render({
      button: { span: null },
      $: [buttonSwitch({ checked })],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("aria-checked")).toBe("false");

    checked.set(true);
    await flush();
    expect(el.getAttribute("aria-checked")).toBe("true");
  });

  it("warns when applied to a non-button tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: { span: null }, $: [buttonSwitch()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("buttonSwitch"));
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// fab
// ---------------------------------------------------------------------------

describe("fab", () => {
  it("generates CSS with border-radius:50% (circular shape)", () => {
    const { node } = render({
      button: "+",
      $: [fab()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("border-radius: 50%");
  });

  it("generates CSS with cursor:pointer and display:inline-flex", () => {
    const { node } = render({
      button: "+",
      $: [fab()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("cursor: pointer");
    expect(css).toContain("display: inline-flex");
  });

  it("size preset changes width/height dimension: small < medium < large", () => {
    const cssValues: string[] = [];
    const sizes = ["small", "medium", "large"] as const;
    for (const size of sizes) {
      const { node } = render({
        button: "+",
        $: [fab({ size })],
      } as DomphyElement);
      // Extract the width value from generated CSS
      const css = node.generateCSS();
      const match = css.match(/width: ([^;]+)/);
      cssValues.push(match ? match[1].trim() : "");
      document.body.innerHTML = "";
    }
    // All three sizes must be distinct
    expect(new Set(cssValues).size).toBe(3);
    // And must be strictly ordered: small < medium < large
    const nums = cssValues.map((v) => parseFloat(v.match(/[\d.]+/)?.[0] ?? ""));
    expect(nums[0]).toBeLessThan(nums[1]);
    expect(nums[1]).toBeLessThan(nums[2]);
  });

  it("warns when applied to a non-button tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: "+", $: [fab()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("fab"));
    warn.mockRestore();
  });

  it("releases color state listeners on removal", () => {
    const color = toState<"primary" | "error">("primary", "color");
    const { node } = render({
      button: "+",
      $: [fab({ color })],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// toggle (requires toggleGroup context)
// ---------------------------------------------------------------------------

describe("toggle", () => {
  it("generates CSS with cursor:pointer inside a group", () => {
    const { node } = render({
      div: null,
      $: [toggleGroup({ items: [{ label: "B" }] })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("cursor: pointer");
  });

  it("aria-pressed starts false and becomes true after click", async () => {
    const { host } = render({
      div: null,
      $: [toggleGroup({ items: [{ label: "Bold" }] })],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("aria-pressed")).toBe("false");
    el.click();
    await flush();
    expect(el.getAttribute("aria-pressed")).toBe("true");
  });

  it("clicking a pressed toggle in single-select deselects it", async () => {
    const { host } = render({
      div: null,
      $: [toggleGroup({ items: [{ label: "Bold" }] })],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    el.click();
    await flush();
    el.click();
    await flush();
    expect(el.getAttribute("aria-pressed")).toBe("false");
  });

  it("role attribute is set to button", () => {
    const { host } = render({
      div: null,
      $: [toggleGroup({ items: [{ label: "B" }] })],
    } as DomphyElement);
    const el = host.querySelector("button")!;
    expect(el.getAttribute("role")).toBe("button");
  });
});

// ---------------------------------------------------------------------------
// toggleGroup
// ---------------------------------------------------------------------------

describe("toggleGroup", () => {
  it("renders with role=group", () => {
    const { host } = render({
      div: null,
      $: [toggleGroup()],
    } as DomphyElement);
    expect(host.querySelector("div")!.getAttribute("role")).toBe("group");
  });

  it("generates CSS with display:flex", () => {
    const { node } = render({
      div: null,
      $: [toggleGroup()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("display: flex");
  });

  it("single-select: clicking one toggle selects it and deselects another", async () => {
    const { host } = render({
      div: null,
      $: [toggleGroup({ items: [{ label: "A" }, { label: "B" }] })],
    } as DomphyElement);
    const [btnA, btnB] = Array.from(host.querySelectorAll("button"));
    btnA.click();
    await flush();
    expect(btnA.getAttribute("aria-pressed")).toBe("true");
    expect(btnB.getAttribute("aria-pressed")).toBe("false");
    btnB.click();
    await flush();
    expect(btnA.getAttribute("aria-pressed")).toBe("false");
    expect(btnB.getAttribute("aria-pressed")).toBe("true");
  });

  it("multiple mode: clicking two toggles selects both simultaneously", async () => {
    const { host } = render({
      div: null,
      $: [
        toggleGroup({
          multiple: true,
          items: [{ label: "A" }, { label: "B" }],
        }),
      ],
    } as DomphyElement);
    const [btnA, btnB] = Array.from(host.querySelectorAll("button"));
    btnA.click();
    await flush();
    btnB.click();
    await flush();
    expect(btnA.getAttribute("aria-pressed")).toBe("true");
    expect(btnB.getAttribute("aria-pressed")).toBe("true");
  });

  it("external value state drives initial selection", () => {
    const value = toState("0");
    const { host } = render({
      div: null,
      $: [toggleGroup({ value, items: [{ label: "A" }, { label: "B" }] })],
    } as DomphyElement);
    const [btnA, btnB] = Array.from(host.querySelectorAll("button"));
    expect(btnA.getAttribute("aria-pressed")).toBe("true");
    expect(btnB.getAttribute("aria-pressed")).toBe("false");
  });

  it("clicking a toggle updates the external value state", async () => {
    const value = toState("");
    const { host } = render({
      div: null,
      $: [toggleGroup({ value, items: [{ label: "X" }] })],
    } as DomphyElement);
    const btn = host.querySelector("button")!;
    btn.click();
    await flush();
    expect(value.get()).toBe("0");
  });
});
