// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  breadcrumbEllipsis,
  button,
  buttonSwitch,
  combobox,
  dialog,
  inputRange,
  inputText,
  link,
  linkButton,
  listItemButton,
  menu,
  popover,
  selectBox,
  tooltip,
} from "../src/index.ts";
import { elevation } from "../src/utils/elevation.ts";
import { focusRing } from "../src/utils/focusRing.ts";

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

describe("elevation()", () => {
  it("returns a distinct layered box-shadow per level", () => {
    const levels = ["low", "medium", "high"] as const;
    const values = levels.map((level) => elevation(level));
    expect(new Set(values).size).toBe(3);
    for (const value of values) {
      expect(value).toContain("rgba(0,0,0,");
      // Two layers (contact + ambient shadow), comma-separated.
      expect(value.split(",").length).toBeGreaterThanOrEqual(4);
    }
  });

  it("higher levels use larger blur/spread than lower ones", () => {
    const extractMax = (value: string) =>
      Math.max(...(value.match(/-?\d+(?=px)/g) ?? []).map(Number));
    expect(extractMax(elevation("low"))).toBeLessThan(
      extractMax(elevation("medium")),
    );
    expect(extractMax(elevation("medium"))).toBeLessThan(
      extractMax(elevation("high")),
    );
  });
});

describe("focusRing()", () => {
  it("returns a 2px box-shadow ring referencing the given color's tone", () => {
    const value = focusRing(null, "primary");
    expect(value).toMatch(/^0 0 0 2px /);
    expect(value).toContain("primary");
  });
});

describe("floating surfaces pick up elevation + focus ring", () => {
  it("popover content carries a box-shadow once shown", () => {
    vi.useFakeTimers();
    const { host, node } = render({
      button: "Open",
      $: [popover({ content: { div: "Hi" } })],
    } as DomphyElement);
    host.querySelector("button")!.click();
    vi.advanceTimersByTime(150);
    flushSync();
    expect(node.generateCSS()).toContain("box-shadow");
    vi.useRealTimers();
  });

  it("dialog carries a box-shadow", () => {
    const { node } = render({
      dialog: [{ p: "Body" }],
      $: [dialog()],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("box-shadow");
  });

  it("tooltip content carries a box-shadow once shown", () => {
    vi.useFakeTimers();
    const { host, node } = render({
      button: "Hover",
      $: [tooltip({ content: "Help" })],
    } as DomphyElement);
    host
      .querySelector("button")!
      .dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    vi.advanceTimersByTime(150);
    flushSync();
    expect(node.generateCSS()).toContain("box-shadow");
    vi.useRealTimers();
  });

  it("menu carries a box-shadow", () => {
    const { node } = render({
      div: null,
      $: [menu({ items: [{ label: "A" }] })],
    } as DomphyElement);
    expect(node.generateCSS()).toContain("box-shadow");
  });
});

describe("button/input focus-visible ring", () => {
  it("button's generated CSS includes a focus-visible box-shadow rule", () => {
    const { node } = render({
      button: "Save",
      $: [button()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("focus-visible");
    const focusBlock = css.slice(css.indexOf("focus-visible"));
    expect(focusBlock).toContain("box-shadow");
  });

  it("inputText's generated CSS includes a focus-visible box-shadow rule", () => {
    const { node } = render({
      input: "",
      type: "text",
      $: [inputText()],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("focus-visible");
    const focusBlock = css.slice(css.indexOf("focus-visible"));
    expect(focusBlock).toContain("box-shadow");
  });

  it("interactive patches expose unified focus rings", () => {
    for (const [name, el] of [
      ["buttonSwitch", { button: { span: null }, $: [buttonSwitch()] }],
      [
        "linkButton",
        { a: "Go", href: "#", $: [linkButton({ variant: "solid" })] },
      ],
      [
        "selectBox",
        {
          div: null,
          $: [
            selectBox({
              content: { div: "menu" },
              options: [{ label: "A", value: "a" }],
            }),
          ],
        },
      ],
      [
        "combobox",
        {
          div: null,
          $: [
            combobox({
              content: { div: "menu" },
              options: [{ label: "A", value: "a" }],
            }),
          ],
        },
      ],
      ["link", { a: "Docs", href: "/docs", $: [link()] }],
      ["listItemButton", { button: "Row", $: [listItemButton()] }],
      ["inputRange", { input: null, type: "range", $: [inputRange()] }],
      ["breadcrumbEllipsis", { button: "…", $: [breadcrumbEllipsis()] }],
    ] as const) {
      document.body.innerHTML = "";
      const { node } = render(el as DomphyElement);
      const css = node.generateCSS();
      expect(css, name).toMatch(/focus-visible|focus-within/);
      expect(css, name).toContain("box-shadow");
    }
  });
});
