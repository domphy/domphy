// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  descriptionList,
  heading,
  list,
  listItem,
  listItemButton,
  orderedList,
  popoverArrow,
  preformated,
  subscript,
  superscript,
  table,
  unorderedList,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function cssOf(app: DomphyElement): string {
  return new ElementNode(app).generateCSS();
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
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// heading (HeadingShift rename — per-level scaling)
// ---------------------------------------------------------------------------

describe("heading level scaling", () => {
  it("scales h1 to a larger font-size index than h6 via the HeadingShift map", () => {
    // font-size resolves to a theme var: var(--fontSize-N). A correct rename
    // produces distinct, ordered indices per heading level (h1 high, h6 low).
    const indexFor = (tag: "h1" | "h6"): number => {
      const css = cssOf({ [tag]: "T", $: [heading()] } as DomphyElement);
      const match = css.match(/font-size:\s*var\(--fontSize-(\d+)\)/);
      expect(match).not.toBeNull();
      return Number((match as RegExpMatchArray)[1]);
    };
    const h1 = indexFor("h1");
    const h6 = indexFor("h6");
    expect(h1).toBeGreaterThan(h6);
    // h1 = base(2) + increase-4 = 6; h6 = base(2) + decrease-1 = 1.
    expect(h1).toBe(6);
    expect(h6).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// descriptionList
// ---------------------------------------------------------------------------

describe("descriptionList", () => {
  it("warns when applied to a non-dl tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [descriptionList()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("descriptionList"),
    );
  });

  it("lays out the dl as a two-column grid", () => {
    const css = cssOf({
      dl: [{ dt: "Name" }, { dd: "Domphy" }],
      $: [descriptionList()],
    } as DomphyElement);
    expect(css).toContain("display: grid");
    expect(css).toContain("grid-template-columns");
  });

  it("renders its dt/dd children", () => {
    const { host } = render({
      dl: [{ dt: "Name" }, { dd: "Domphy" }],
      $: [descriptionList()],
    } as DomphyElement);
    expect(host.querySelector("dt")?.textContent).toBe("Name");
    expect(host.querySelector("dd")?.textContent).toBe("Domphy");
  });
});

// ---------------------------------------------------------------------------
// list / listItem / listItemButton
// ---------------------------------------------------------------------------

describe("list", () => {
  it("removes list bullets and lays the host out as a flex column", () => {
    const css = cssOf({
      ul: [{ li: "A" }],
      $: [list()],
    } as DomphyElement);
    expect(css).toContain("list-style: none");
    expect(css).toContain("flex-direction: column");
  });

  it("no longer writes a dead list context (color prop is inert)", () => {
    const node = new ElementNode({
      ul: [{ li: "A" }],
      $: [list({ color: "primary" })],
    } as DomphyElement);
    node.render(document.body);
    // The removed _context.list write means descendants see no "list" context.
    expect(node.getContext("list")).toBeUndefined();
  });

  it("renders without throwing when given a color prop", () => {
    expect(() =>
      render({
        ul: [{ li: "X" }],
        $: [list({ color: "neutral" })],
      } as DomphyElement),
    ).not.toThrow();
  });
});

describe("listItem", () => {
  it("lays out the row as a centered flex line", () => {
    const css = cssOf({ li: "Item", $: [listItem()] } as DomphyElement);
    expect(css).toContain("display: flex");
    expect(css).toContain("align-items: center");
  });

  it("renders its content", () => {
    const { host } = render({
      ul: [{ li: "Row", $: [listItem()] }],
      $: [list()],
    } as DomphyElement);
    expect(host.querySelector("li")?.textContent).toBe("Row");
  });
});

describe("listItemButton", () => {
  it("sets a pointer cursor and a hover background state", () => {
    const { host } = render({
      button: "Action",
      $: [listItemButton()],
    } as DomphyElement);
    // cursor is a real CSS property (nested inside style), not an HTML attribute.
    expect(host.querySelector("button")?.getAttribute("cursor")).toBeNull();
    const css = cssOf({
      button: "Action",
      $: [listItemButton()],
    } as DomphyElement);
    expect(css).toContain("cursor: pointer");
    // The hover selector is emitted (with the native :not([disabled]) guard).
    expect(css).toContain(":hover");
  });

  it("releases its color listener on removal", () => {
    const color = toState<"neutral" | "primary">("neutral", "color");
    const { node } = render({
      ul: [{ button: "Go", $: [listItemButton({ color })] }],
      $: [list()],
    } as DomphyElement);
    expect(listenerCount(color)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(color)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// orderedList / unorderedList
// ---------------------------------------------------------------------------

describe("orderedList", () => {
  it("warns when applied to a non-ol tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [orderedList()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("orderedList"));
  });

  it("uses decimal markers positioned outside", () => {
    const css = cssOf({
      ol: [{ li: "First" }],
      $: [orderedList()],
    } as DomphyElement);
    expect(css).toContain("list-style-type: decimal");
    expect(css).toContain("list-style-position: outside");
  });
});

describe("unorderedList", () => {
  it("warns when applied to a non-ul tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [unorderedList()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("unorderedList"));
  });

  it("uses disc markers positioned outside", () => {
    const css = cssOf({
      ul: [{ li: "Item" }],
      $: [unorderedList()],
    } as DomphyElement);
    expect(css).toContain("list-style-type: disc");
    expect(css).toContain("list-style-position: outside");
  });
});

// ---------------------------------------------------------------------------
// preformated
// ---------------------------------------------------------------------------

describe("preformated", () => {
  it("warns when applied to a non-pre tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [preformated()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("preformated"));
  });

  it("sets dataTone=shift-2 on the host", () => {
    const { host } = render({
      pre: "const x = 1",
      $: [preformated()],
    } as DomphyElement);
    expect(host.querySelector("pre")?.getAttribute("data-tone")).toBe(
      "shift-2",
    );
  });
});

// ---------------------------------------------------------------------------
// subscript / superscript
// ---------------------------------------------------------------------------

describe("subscript", () => {
  it("warns when applied to a non-sub tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "2", $: [subscript()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("subscript"));
  });

  it("aligns text to the sub baseline", () => {
    const css = cssOf({ sub: "2", $: [subscript()] } as DomphyElement);
    expect(css).toContain("vertical-align: sub");
  });
});

describe("superscript", () => {
  it("warns when applied to a non-sup tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ span: "2", $: [superscript()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("superscript"));
  });

  it("aligns text to the super baseline", () => {
    const css = cssOf({ sup: "2", $: [superscript()] } as DomphyElement);
    expect(css).toContain("vertical-align: super");
  });
});

// ---------------------------------------------------------------------------
// table
// ---------------------------------------------------------------------------

describe("table", () => {
  it("warns when applied to a non-table tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [table()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("table"));
  });

  it("collapses borders and stretches to full width", () => {
    const css = cssOf({ table: null, $: [table()] } as DomphyElement);
    expect(css).toContain("border-collapse: collapse");
    expect(css).toContain("width: 100%");
  });

  it("renders table rows and cells", () => {
    const { host } = render({
      table: [{ tbody: [{ tr: [{ td: "cell" }] }] }],
      $: [table()],
    } as DomphyElement);
    expect(host.querySelector("td")?.textContent).toBe("cell");
  });
});

// ---------------------------------------------------------------------------
// popoverArrow
// ---------------------------------------------------------------------------

describe("popoverArrow", () => {
  it("draws the arrow via an ::after pseudo-element", () => {
    const css = cssOf({
      div: "panel",
      $: [popoverArrow({ placement: "top" })],
    } as DomphyElement);
    expect(css).toContain("::after");
    expect(css).toContain("position: relative");
  });

  it("omits the arrow border when bordered=false", () => {
    const css = cssOf({
      div: "panel",
      $: [popoverArrow({ bordered: false })],
    } as DomphyElement);
    expect(css).toContain("border-width: 0");
  });

  it("renders the host content", () => {
    const { host } = render({
      div: "Tooltip body",
      $: [popoverArrow()],
    } as DomphyElement);
    expect(host.textContent).toContain("Tooltip body");
  });
});
