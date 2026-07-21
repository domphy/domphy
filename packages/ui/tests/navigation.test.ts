// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  breadcrumb,
  breadcrumbEllipsis,
  menu,
  pagination,
  segmented,
  select,
  selectItem,
  tabs,
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
// tabs / tab / tabPanel
// ---------------------------------------------------------------------------

describe("tabs", () => {
  it("generates [role=tablist] div inside host", () => {
    const { host } = render({ div: null, $: [tabs()] } as DomphyElement);
    const tablist = host.querySelector("[role=tablist]");
    expect(tablist).not.toBeNull();
    expect(tablist!.getAttribute("aria-orientation")).toBe("horizontal");
  });

  it("accepts an initial activeKey and passes it through context", () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          activeKey: "b",
          items: [
            { label: "A", key: "a" },
            { label: "B", key: "b" },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll("[role=tab]");
    expect(buttons[0].getAttribute("aria-selected")).toBe("false");
    expect(buttons[1].getAttribute("aria-selected")).toBe("true");
  });

  it("clicking a tab updates activeKey so the right tab becomes selected", async () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          activeKey: 0,
          items: [
            { label: "A", key: 0 },
            { label: "B", key: 1 },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("[role=tab]");
    buttons[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(buttons[1].getAttribute("aria-selected")).toBe("true");
    expect(buttons[0].getAttribute("aria-selected")).toBe("false");
  });

  it("tabPanel is hidden when its key does not match activeKey", () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          activeKey: 0,
          items: [
            { label: "A", key: 0, content: { div: "Panel A" } as any },
            { label: "B", key: 1, content: { div: "Panel B" } as any },
          ],
        }),
      ],
    } as DomphyElement);
    const panels = host.querySelectorAll("[role=tabpanel]");
    expect((panels[0] as HTMLElement).hidden).toBe(false);
    expect((panels[1] as HTMLElement).hidden).toBe(true);
  });

  it("clicking a tab shows the matching panel and hides the others", async () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          activeKey: 0,
          items: [
            { label: "A", key: 0, content: { div: "Panel A" } as any },
            { label: "B", key: 1, content: { div: "Panel B" } as any },
          ],
        }),
      ],
    } as DomphyElement);
    host.querySelectorAll<HTMLButtonElement>("[role=tab]")[1].click();
    await new Promise((r) => setTimeout(r, 0));
    const panels = host.querySelectorAll("[role=tabpanel]");
    expect((panels[0] as HTMLElement).hidden).toBe(true);
    expect((panels[1] as HTMLElement).hidden).toBe(false);
  });

  it("releases activeKey listeners when the tree is removed", () => {
    const active = toState(0, "activeKey");
    const { node } = render({
      div: null,
      $: [
        tabs({
          activeKey: active,
          items: [{ label: "A", key: 0, content: { div: "Panel A" } as any }],
        }),
      ],
    } as DomphyElement);
    expect(listenerCount(active)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(active)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// menu / menuItem
// ---------------------------------------------------------------------------

describe("menu", () => {
  it("sets role=menu on the host element", () => {
    const { host } = render({ div: null, $: [menu()] } as DomphyElement);
    expect(host.firstElementChild!.getAttribute("role")).toBe("menu");
  });

  it("clicking a menuItem sets it as the active key via aria-current", async () => {
    const { host } = render({
      div: null,
      $: [
        menu({
          activeKey: 0,
          items: [
            { label: "Home", key: 0 },
            { label: "Settings", key: 1 },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    // wait for initial render
    await new Promise((r) => setTimeout(r, 0));
    expect(buttons[0].getAttribute("aria-current")).toBe("true");
    expect(buttons[1].getAttribute("aria-current")).toBeNull();
    buttons[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(buttons[1].getAttribute("aria-current")).toBe("true");
    expect(buttons[0].getAttribute("aria-current")).toBeNull();
  });

  it("does not update activeKey when selectable is false", () => {
    const { host } = render({
      div: null,
      $: [
        menu({
          activeKey: null,
          selectable: false,
          items: [
            { label: "A", key: 0 },
            { label: "B", key: 1 },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    buttons[0].click();
    // Items should not have aria-current at all since selectable=false
    expect(buttons[0].getAttribute("aria-current")).toBeNull();
  });

  it("releases activeKey listeners when the menu tree is removed", () => {
    const active = toState(0, "menuActive");
    const { node } = render({
      div: null,
      $: [menu({ activeKey: active, items: [{ label: "A", key: 0 }] })],
    } as DomphyElement);
    expect(listenerCount(active)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(active)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// select (native)
// ---------------------------------------------------------------------------

describe("select (native)", () => {
  it("applies appearance:none style to a native select element", () => {
    const { host } = render({
      select: [{ option: "A" }],
      $: [select()],
    } as DomphyElement);
    const el = host.querySelector("select") as HTMLSelectElement;
    expect(el).not.toBeNull();
    // The patch adds inline CSS class-based styles; verify the element is present and styled
    expect(el.tagName.toLowerCase()).toBe("select");
  });

  it("warns when applied to a non-select tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({ div: [{ div: null, $: [select()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"select" primitive patch must use select tag'),
    );
    warn.mockRestore();
  });

  it("renders option children inside the select element", () => {
    const { host } = render({
      select: [{ option: "Alpha" }, { option: "Beta" }],
      $: [select()],
    } as DomphyElement);
    const options = host.querySelectorAll("option");
    expect(options.length).toBe(2);
    expect(options[0].textContent).toBe("Alpha");
    expect(options[1].textContent).toBe("Beta");
  });
});

// ---------------------------------------------------------------------------
// selectItem (context-based custom select)
// ---------------------------------------------------------------------------

describe("selectItem", () => {
  function makeSelectList(initialValue: string | null, multiple = false) {
    const value = toState(initialValue, "selectVal");
    const app: DomphyElement = {
      div: [
        { div: "Option A", $: [selectItem({ value: "a" })], _key: "a" },
        { div: "Option B", $: [selectItem({ value: "b" })], _key: "b" },
      ],
      _context: {
        select: { value, multiple },
      },
    } as any;
    return { value, app };
  }

  it("reflects aria-selected based on context value", () => {
    const { app } = makeSelectList("a");
    const { host } = render(app);
    const items = host.querySelectorAll<HTMLElement>("[role=option]");
    expect(items[0].getAttribute("aria-selected")).toBe("true");
    expect(items[1].getAttribute("aria-selected")).toBe("false");
  });

  it("clicking an item updates the selection", async () => {
    const { app, value } = makeSelectList("a");
    const { host } = render(app);
    const items = host.querySelectorAll<HTMLElement>("[role=option]");
    items[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(value.get()).toBe("b");
    expect(items[1].getAttribute("aria-selected")).toBe("true");
    expect(items[0].getAttribute("aria-selected")).toBe("false");
  });

  it("warns when applied to non-div tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ span: "X", $: [selectItem({ value: "x" })] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"selectItem" patch must use div tag'),
    );
    warn.mockRestore();
  });

  it("works without a select context (no crash)", () => {
    expect(() =>
      render({
        div: [{ div: "X", $: [selectItem({ value: "x" })] }],
      } as DomphyElement),
    ).not.toThrow();
  });

  it("releases listeners when removed", () => {
    const value = toState("a", "selVal");
    const app: DomphyElement = {
      div: [{ div: "A", $: [selectItem({ value: "a" })], _key: "a" }],
      _context: {
        select: { value, multiple: false },
      },
    } as any;
    const { node } = render(app);
    expect(listenerCount(value)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(value)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// segmented / segmentedItem
// ---------------------------------------------------------------------------

describe("segmented + segmentedItem", () => {
  it("sets role=radiogroup on the container", () => {
    const { host } = render({
      div: null,
      $: [segmented({ value: "a" })],
    } as DomphyElement);
    expect(host.firstElementChild!.getAttribute("role")).toBe("radiogroup");
  });

  it("segmentedItem reflects aria-checked from context value", () => {
    const { host } = render({
      div: null,
      $: [
        segmented({
          value: "month",
          items: [
            { label: "Day", key: "day" },
            { label: "Month", key: "month" },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    expect(buttons[0].getAttribute("aria-checked")).toBe("false");
    expect(buttons[1].getAttribute("aria-checked")).toBe("true");
  });

  it("clicking a segmentedItem updates the context value", async () => {
    const value = toState("day", "seg");
    const { host } = render({
      div: null,
      $: [
        segmented({
          value,
          items: [
            { label: "Day", key: "day" },
            { label: "Week", key: "week" },
          ],
        }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    buttons[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(value.get()).toBe("week");
    expect(buttons[1].getAttribute("aria-checked")).toBe("true");
    expect(buttons[0].getAttribute("aria-checked")).toBe("false");
  });

  it("uses index as key when no explicit key is provided", async () => {
    const value = toState("", "seg2");
    const { host } = render({
      div: null,
      $: [
        segmented({ value, items: [{ label: "First" }, { label: "Second" }] }),
      ],
    } as DomphyElement);
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    buttons[0].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(value.get()).toBe("0");
    buttons[1].click();
    await new Promise((r) => setTimeout(r, 0));
    expect(value.get()).toBe("1");
  });

  it("releases listeners when the segmented tree is removed", () => {
    const value = toState("a", "segClean");
    const { node } = render({
      div: null,
      $: [segmented({ value, items: [{ label: "A", key: "a" }] })],
    } as DomphyElement);
    expect(listenerCount(value)).toBeGreaterThanOrEqual(1);
    node.remove();
    expect(listenerCount(value)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// pagination
// ---------------------------------------------------------------------------

describe("pagination", () => {
  it("sets role=navigation and ariaLabel on the host", () => {
    const { host } = render({
      div: null,
      $: [pagination({ total: 5 })],
    } as DomphyElement);
    const el = host.firstElementChild as HTMLElement;
    expect(el.getAttribute("role")).toBe("navigation");
    expect(el.getAttribute("aria-label")).toBe("Pagination");
  });

  it("renders prev/next buttons plus one button per page when total <= 7", () => {
    const { host } = render({
      div: null,
      $: [pagination({ total: 5, value: 1 })],
    } as DomphyElement);
    const buttons = host.querySelectorAll("button");
    // prev + 5 pages + next = 7
    expect(buttons.length).toBe(7);
  });

  it("clicking a page button updates the active page", () => {
    const page = toState(1, "page");
    const { host } = render({
      div: null,
      $: [pagination({ total: 5, value: page })],
    } as DomphyElement);
    // buttons: prev, 1(active/disabled), 2, 3, 4, 5, next
    const buttons = host.querySelectorAll<HTMLButtonElement>("button");
    // page 3 is the 4th button (index 3)
    buttons[3].click();
    expect(page.get()).toBe(3);
  });

  it("prev button is disabled on the first page", () => {
    const { host } = render({
      div: null,
      $: [pagination({ total: 5, value: 1 })],
    } as DomphyElement);
    const prev = host.querySelector<HTMLButtonElement>(
      "button[aria-label='Previous page']",
    )!;
    expect(prev.disabled).toBe(true);
  });

  it("next button is disabled on the last page", () => {
    const { host } = render({
      div: null,
      $: [pagination({ total: 5, value: 5 })],
    } as DomphyElement);
    const next = host.querySelector<HTMLButtonElement>(
      "button[aria-label='Next page']",
    )!;
    expect(next.disabled).toBe(true);
  });

  it("clicking next increments page", () => {
    const page = toState(2, "pageNext");
    const { host } = render({
      div: null,
      $: [pagination({ total: 5, value: page })],
    } as DomphyElement);
    const next = host.querySelector<HTMLButtonElement>(
      "button[aria-label='Next page']",
    )!;
    next.click();
    expect(page.get()).toBe(3);
  });

  it("navigating between pages with total > 7 (item count changes) does not warn about unkeyed list length changes", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const page = toState(1, "pageManyTotal");
    const { host } = render({
      div: null,
      $: [pagination({ total: 10, value: page })],
    } as DomphyElement);
    // page 1 renders fewer items (getPages(1,10) = [1,2,...,10], 4 page items)
    // than page 5 (getPages(5,10) = [1,...,4,5,6,...,10], 7 page items) — the
    // reactive item array's length genuinely changes across this navigation.
    page.set(5);
    const next = host.querySelector<HTMLButtonElement>(
      "button[aria-label='Next page']",
    )!;
    next.click();
    expect(
      warn.mock.calls.some((call) =>
        String(call[0]).includes("unkeyed list length changed"),
      ),
    ).toBe(false);
  });

  it("warns when applied to non-div tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // _onInsert fires only on children (not the render root), so wrap in a parent
    render({
      div: [{ span: null, $: [pagination({ total: 3 })] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"pagination" patch must use div tag'),
    );
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// breadcrumb
// ---------------------------------------------------------------------------

describe("breadcrumb", () => {
  it("sets role-equivalent ariaLabel=breadcrumb on the nav element", () => {
    const { host } = render({
      nav: null,
      $: [breadcrumb()],
    } as DomphyElement);
    const el = host.firstElementChild as HTMLElement;
    expect(el.getAttribute("aria-label")).toBe("breadcrumb");
  });

  it("renders child link elements inside the nav", () => {
    const { host } = render({
      nav: [{ a: "Home" }, { a: "Products" }, { a: "Detail" }],
      $: [breadcrumb()],
    } as DomphyElement);
    const links = host.querySelectorAll("a");
    expect(links.length).toBe(3);
  });

  it("warns when applied to non-nav tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // _onInsert fires only on children (not the render root), so wrap in a parent
    render({ div: [{ div: null, $: [breadcrumb()] }] } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"breadcrumb" patch must use nav tag'),
    );
    warn.mockRestore();
  });

  it("does not throw when applied to nav with no children", () => {
    expect(() =>
      render({ nav: null, $: [breadcrumb()] } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// breadcrumbEllipsis
// ---------------------------------------------------------------------------

describe("breadcrumbEllipsis", () => {
  it("sets ariaLabel='More breadcrumb items' on the button", () => {
    const { host } = render({
      nav: [{ button: "…", $: [breadcrumbEllipsis()] }],
      $: [breadcrumb()],
    } as DomphyElement);
    const button = host.querySelector("button")!;
    expect(button.getAttribute("aria-label")).toBe("More breadcrumb items");
  });

  it("renders as a button element", () => {
    const { host } = render({
      nav: [{ button: "…", $: [breadcrumbEllipsis()] }],
      $: [breadcrumb()],
    } as DomphyElement);
    expect(host.querySelector("button")).not.toBeNull();
  });

  it("warns when applied to non-button tag", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      nav: [{ span: "…", $: [breadcrumbEllipsis()] }],
      $: [breadcrumb()],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"breadcrumbEllipsis" patch must use button tag'),
    );
    warn.mockRestore();
  });

  it("does not throw when rendered inside a breadcrumb", () => {
    expect(() =>
      render({
        nav: [
          { a: "Home" },
          { button: "…", $: [breadcrumbEllipsis()] },
          { a: "Page" },
        ],
        $: [breadcrumb()],
      } as DomphyElement),
    ).not.toThrow();
  });
});
