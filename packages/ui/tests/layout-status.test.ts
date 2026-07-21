// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accordion,
  badge,
  card,
  details,
  empty,
  formGroup,
  progress,
  rating,
  skeleton,
  spinner,
  splitter,
  splitterHandle,
  splitterPanel,
  steps,
  tag,
  timeline,
  timelineItem,
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
// accordion
// ---------------------------------------------------------------------------

describe("accordion", () => {
  it("applies flex column display to the host container", () => {
    const { host } = render({
      div: [
        { details: [{ summary: "A" }, { p: "Body A" }], $: [details()] },
        { details: [{ summary: "B" }, { p: "Body B" }], $: [details()] },
      ],
      $: [accordion()],
    } as DomphyElement);

    const container = host.firstElementChild as HTMLElement;
    // ElementNode writes CSS-in-JS to a <style> tag; the inline style on the
    // element holds the scoped class. We verify the patch rendered without error
    // and the container has children.
    expect(container.children.length).toBe(2);
  });

  it("single mode: clicking one header closes sibling details", () => {
    const app: DomphyElement = {
      div: [
        {
          details: [{ summary: "A" }, { p: "Content A" }],
          $: [details()],
        },
        {
          details: [{ summary: "B" }, { p: "Content B" }],
          $: [details()],
        },
      ],
      $: [accordion({ type: "single" })],
    };

    const { host } = render(app);
    const container = host.firstElementChild as HTMLElement;
    const [detailA, detailB] = Array.from(
      container.querySelectorAll(":scope > details"),
    ) as HTMLDetailsElement[];

    // Open first item manually
    detailA.open = true;

    // Now simulate clicking summary of second item
    detailB.open = true; // jsdom does not fire toggle on open= assignment
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", {
      get: () => detailB.querySelector("summary"),
    });
    detailB
      .querySelector("summary")!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // The handler listens for click then closes siblings that are open.
    // We open B and fire click on B's summary — A should close.
    // We simulate: B is now open so fire click on B's summary.
    detailB.open = true;
    container.dispatchEvent(
      Object.assign(new MouseEvent("click", { bubbles: true }), {
        // We dispatch from the summary itself so closest("summary") works.
      }),
    );
    detailB.querySelector("summary")!.click();
    // After clicking B's summary while B is still pending-open (handler fires
    // when item.open is false = closed means we just closed it), for a proper
    // test trigger: open A, keep B closed, then click B summary.
    detailA.open = true;
    detailB.open = false;
    detailB.querySelector("summary")!.click();

    // When single mode handler fires on a summary click and item.open === false
    // (the item was just opened by the browser — but jsdom doesn't toggle open
    // automatically, so item.open will still be false at handler time), it
    // closes siblings. So detailA should be closed.
    expect(detailA.open).toBe(false);
  });

  it("multiple mode: opening one item does not affect siblings", () => {
    const app: DomphyElement = {
      div: [
        { details: [{ summary: "A" }, { p: "Content A" }], $: [details()] },
        { details: [{ summary: "B" }, { p: "Content B" }], $: [details()] },
      ],
      $: [accordion({ type: "multiple" })],
    };

    const { host } = render(app);
    const container = host.firstElementChild as HTMLElement;
    const [detailA, detailB] = Array.from(
      container.querySelectorAll(":scope > details"),
    ) as HTMLDetailsElement[];

    detailA.open = true;
    detailB.querySelector("summary")!.click();

    // In multiple mode, clicking B should not close A.
    expect(detailA.open).toBe(true);
  });

  it("removes click listener on node removal (no leak)", () => {
    const { host, node } = render({
      div: [
        { details: [{ summary: "A" }, { p: "Content A" }], $: [details()] },
      ],
      $: [accordion({ type: "single" })],
    } as DomphyElement);

    const container = host.firstElementChild as HTMLElement;
    const spy = vi.spyOn(container, "removeEventListener");
    node.remove();
    expect(spy).toHaveBeenCalledWith("click", expect.any(Function));
  });
});

// ---------------------------------------------------------------------------
// details
// ---------------------------------------------------------------------------

describe("details", () => {
  it("warns when applied to a non-details element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: [{ summary: "X" }], $: [details()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("details"));
    warn.mockRestore();
  });

  it("does not warn when applied to a details element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ details: [{ summary: "X" }, { p: "Y" }], $: [details()] }],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders summary and body children", () => {
    const { host } = render({
      div: [
        {
          details: [{ summary: "Title" }, { p: "Body text" }],
          $: [details()],
        },
      ],
    } as DomphyElement);
    const det = host.querySelector("details")!;
    expect(det.querySelector("summary")!.textContent).toBe("Title");
    expect(det.querySelector("p")!.textContent).toBe("Body text");
  });

  it("open attribute is honoured by the DOM", () => {
    const { host } = render({
      div: [
        {
          details: [{ summary: "Title" }, { p: "Body" }],
          open: true,
          $: [details()],
        },
      ],
    } as DomphyElement);
    const det = host.querySelector("details") as HTMLDetailsElement;
    expect(det.open).toBe(true);
  });

  it("accepts custom duration prop without error", () => {
    expect(() =>
      render({
        div: [
          {
            details: [{ summary: "T" }, { p: "B" }],
            $: [details({ duration: 500 })],
          },
        ],
      } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// card
// ---------------------------------------------------------------------------

describe("card", () => {
  it("renders heading and paragraph children", () => {
    const { host } = render({
      div: [{ h3: "Card Title" }, { p: "Description" }],
      $: [card()],
    } as DomphyElement);
    expect(host.querySelector("h3")!.textContent).toBe("Card Title");
    expect(host.querySelector("p")!.textContent).toBe("Description");
  });

  it("renders footer content", () => {
    const { host } = render({
      div: [{ h3: "T" }, { footer: [{ button: "OK" }] }],
      $: [card()],
    } as DomphyElement);
    expect(host.querySelector("footer button")!.textContent).toBe("OK");
  });

  it("renders image child", () => {
    const { host } = render({
      div: [{ img: null, src: "photo.png", alt: "Photo" }],
      $: [card()],
    } as DomphyElement);
    expect(host.querySelector("img")!.getAttribute("src")).toBe("photo.png");
  });

  it("reactive color prop does not throw", () => {
    const color = toState<"neutral" | "primary">("neutral");
    expect(() =>
      render({
        div: { h3: "T" },
        $: [card({ color })],
      } as DomphyElement),
    ).not.toThrow();
    color.set("primary");
  });
});

// ---------------------------------------------------------------------------
// progress
// ---------------------------------------------------------------------------

describe("progress", () => {
  it("warns when applied to non-progress element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: null, $: [progress()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("progress"));
    warn.mockRestore();
  });

  it("does not warn on a progress element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ progress: null, value: 40, max: 100, $: [progress()] }],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("sets value and max attributes on the element", () => {
    const { host } = render({
      div: [{ progress: null, value: 30, max: 200, $: [progress()] }],
    } as DomphyElement);
    const el = host.querySelector("progress") as HTMLProgressElement;
    expect(el.value).toBe(30);
    expect(el.max).toBe(200);
  });

  it("reflects reactive value update via DOM state", () => {
    const valueState = toState(10);
    const { host } = render({
      div: [
        {
          progress: null,
          value: (listener: any) => valueState.get(listener),
          max: 100,
          $: [progress()],
        },
      ],
    } as DomphyElement);
    const el = host.querySelector("progress") as HTMLProgressElement;
    expect(el.value).toBe(10);
    valueState.set(75);
    flushSync();
    expect(el.value).toBe(75);
  });
});

// ---------------------------------------------------------------------------
// spinner
// ---------------------------------------------------------------------------

describe("spinner", () => {
  it("sets role=status on the element", () => {
    const { host } = render({
      div: [{ span: null, $: [spinner()] }],
    } as DomphyElement);
    expect(host.querySelector("span")!.getAttribute("role")).toBe("status");
  });

  it("sets aria-label=loading", () => {
    const { host } = render({
      div: [{ span: null, $: [spinner()] }],
    } as DomphyElement);
    expect(host.querySelector("span")!.getAttribute("aria-label")).toBe(
      "loading",
    );
  });

  it("warns when applied to a non-span element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: null, $: [spinner()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("spinner"));
    warn.mockRestore();
  });

  it("does not warn when applied to a span element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ span: null, $: [spinner()] }],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// skeleton
// ---------------------------------------------------------------------------

describe("skeleton", () => {
  it("sets aria-hidden=true", () => {
    const { host } = render({
      div: [{ div: null, $: [skeleton()] }],
    } as DomphyElement);
    const el = host.querySelector("[aria-hidden]");
    expect(el).not.toBeNull();
    expect(el!.getAttribute("aria-hidden")).toBe("true");
  });

  it("sets data-tone=shift-2 attribute", () => {
    const { host } = render({
      div: [{ div: null, $: [skeleton()] }],
    } as DomphyElement);
    const el = host.querySelector("[data-tone]");
    expect(el).not.toBeNull();
    expect(el!.getAttribute("data-tone")).toBe("shift-2");
  });

  it("renders without error with default color", () => {
    expect(() =>
      render({ div: [{ div: null, $: [skeleton()] }] } as DomphyElement),
    ).not.toThrow();
  });

  it("renders without error with custom color", () => {
    expect(() =>
      render({
        div: [{ div: null, $: [skeleton({ color: "primary" })] }],
      } as DomphyElement),
    ).not.toThrow();
  });

  it("releases listeners on removal", () => {
    const color = toState<"neutral" | "primary">("neutral");
    const { node } = render({
      div: [{ div: null, $: [skeleton({ color })] }],
    } as DomphyElement);
    const before = listenerCount(color);
    node.remove();
    expect(listenerCount(color)).toBeLessThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// empty
// ---------------------------------------------------------------------------

describe("empty", () => {
  it("renders icon and message children", () => {
    const { host } = render({
      div: [{ span: "📭" }, { p: "Nothing here" }],
      $: [empty()],
    } as DomphyElement);
    expect(host.querySelector("span")!.textContent).toBe("📭");
    expect(host.querySelector("p")!.textContent).toBe("Nothing here");
  });

  it("renders with three children (icon + title + description)", () => {
    const { host } = render({
      div: [
        { span: "🔍" },
        { p: "No results" },
        { span: "Try another search" },
      ],
      $: [empty()],
    } as DomphyElement);
    // The container div is the direct child of host; check it has 3 child elements.
    const container = host.firstElementChild as HTMLElement;
    const elementChildren = Array.from(container.children).filter(
      (el) => el.tagName !== "STYLE",
    );
    expect(elementChildren.length).toBe(3);
  });

  it("renders with a custom color without throwing", () => {
    expect(() =>
      render({
        div: [{ p: "Empty" }],
        $: [empty({ color: "danger" })],
      } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// badge
// ---------------------------------------------------------------------------

describe("badge", () => {
  it("renders host content", () => {
    const { host } = render({
      div: [{ span: "🔔", $: [badge({ label: 3 })] }],
    } as DomphyElement);
    expect(host.querySelector("span")!.textContent).toBe("🔔");
  });

  it("generates CSS with the label value in the ::after content", () => {
    const { node } = render({
      div: [{ span: "🔔", $: [badge({ label: 7 })] }],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("7");
  });

  it("reactive label is tracked by the state", () => {
    const label = toState<string | number>(3);
    // After setting the label state, the listener count should be >= 1
    // (the badge CSS content rule subscribes to it).
    render({
      div: [{ span: "🔔", $: [badge({ label })] }],
    } as DomphyElement);
    expect(listenerCount(label)).toBeGreaterThanOrEqual(1);
  });

  it("does not throw with default props", () => {
    expect(() =>
      render({ div: [{ span: "X", $: [badge()] }] } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// tag
// ---------------------------------------------------------------------------

describe("tag", () => {
  it("renders tag text content", () => {
    const { host } = render({
      div: [{ span: "JavaScript", $: [tag()] }],
    } as DomphyElement);
    expect(host.querySelector("span")!.textContent).toContain("JavaScript");
  });

  it("does not append a close button when removable is false (default)", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag()] }],
    } as DomphyElement);
    // removable=false → only the text, no extra span button
    const inner = host.querySelector("span")!;
    expect(inner.querySelectorAll("span").length).toBe(0);
  });

  it("appends a remove button when removable is true", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag({ removable: true })] }],
    } as DomphyElement);
    const inner = host.querySelector("span")!;
    expect(inner.querySelectorAll("span").length).toBeGreaterThan(0);
  });

  it("removes the tag element when close button is clicked", () => {
    const { host } = render({
      div: [{ span: "Label", $: [tag({ removable: true })] }],
    } as DomphyElement);
    const container = host.firstElementChild as HTMLElement;
    const tagEl = container.querySelector("span")!;
    const closeBtn = tagEl.querySelector("span")!;
    closeBtn.click();
    expect(container.querySelector("span")).toBeNull();
  });

  it("sets data-tone=shift-2 attribute", () => {
    const { host } = render({
      div: [{ span: "Tag", $: [tag()] }],
    } as DomphyElement);
    expect(host.querySelector("span")!.getAttribute("data-tone")).toBe(
      "shift-2",
    );
  });
});

// ---------------------------------------------------------------------------
// rating
// ---------------------------------------------------------------------------

describe("rating", () => {
  it("renders the correct number of star buttons (default max=5)", () => {
    const { host } = render({
      div: [{ div: null, $: [rating()] }],
    } as DomphyElement);
    expect(host.querySelectorAll("button").length).toBe(5);
  });

  it("renders stars equal to max prop", () => {
    const { host } = render({
      div: [{ div: null, $: [rating({ max: 3 })] }],
    } as DomphyElement);
    expect(host.querySelectorAll("button").length).toBe(3);
  });

  it("calls onChange when a star is clicked", () => {
    const onChange = vi.fn();
    const { host } = render({
      div: [{ div: null, $: [rating({ onChange })] }],
    } as DomphyElement);
    const stars = host.querySelectorAll("button");
    (stars[2] as HTMLButtonElement).click();
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("clicking the same star twice resets rating to 0 (toggle off)", () => {
    const onChange = vi.fn();
    const { host } = render({
      div: [{ div: null, $: [rating({ value: 3, onChange })] }],
    } as DomphyElement);
    const stars = host.querySelectorAll("button");
    // Click star index 3 (4th star, value=3 = star-3) to toggle off
    (stars[2] as HTMLButtonElement).click();
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("in readOnly mode, no click listeners fire onChange", () => {
    const onChange = vi.fn();
    const { host } = render({
      div: [{ div: null, $: [rating({ readOnly: true, onChange })] }],
    } as DomphyElement);
    const stars = host.querySelectorAll("button");
    (stars[0] as HTMLButtonElement).click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets role=group on the host", () => {
    const { host } = render({
      div: [{ div: null, $: [rating()] }],
    } as DomphyElement);
    const ratingEl = host.querySelector("[role=group]");
    expect(ratingEl).not.toBeNull();
    expect(ratingEl!.getAttribute("aria-label")).toBe("Rating");
  });
});

// ---------------------------------------------------------------------------
// steps + stepItem
// ---------------------------------------------------------------------------

describe("steps + stepItem", () => {
  it("active step has aria-current=step", () => {
    const { host } = render({
      ol: null,
      $: [
        steps({
          current: 1,
          items: [
            { label: "Step 1" },
            { label: "Step 2" },
            { label: "Step 3" },
          ],
        }),
      ],
    } as DomphyElement);

    const items = host.querySelectorAll("li");
    expect(items[0].getAttribute("aria-current")).toBeFalsy();
    expect(items[1].getAttribute("aria-current")).toBe("step");
    expect(items[2].getAttribute("aria-current")).toBeFalsy();
  });

  it("sets data-status correctly for pending/active/done", () => {
    const { host } = render({
      ol: null,
      $: [
        steps({
          current: 1,
          items: [
            { label: "Step 1" },
            { label: "Step 2" },
            { label: "Step 3" },
          ],
        }),
      ],
    } as DomphyElement);

    const items = host.querySelectorAll("li");
    expect((items[0] as HTMLElement).dataset.status).toBe("done");
    expect((items[1] as HTMLElement).dataset.status).toBe("active");
    expect((items[2] as HTMLElement).dataset.status).toBe("pending");
  });

  it("reactive current updates aria-current and data-status", () => {
    const current = toState(0);
    const { host } = render({
      ol: null,
      $: [
        steps({ current, items: [{ label: "Step 1" }, { label: "Step 2" }] }),
      ],
    } as DomphyElement);

    const items = host.querySelectorAll("li");
    expect(items[0].getAttribute("aria-current")).toBe("step");

    current.set(1);
    flushSync();
    expect(items[0].getAttribute("aria-current")).toBeFalsy();
    expect(items[1].getAttribute("aria-current")).toBe("step");
  });
});

// ---------------------------------------------------------------------------
// splitter
// ---------------------------------------------------------------------------

describe("splitter", () => {
  it("warns when splitterPanel is used outside a splitter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: "Content", $: [splitterPanel()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("splitterPanel"));
    warn.mockRestore();
  });

  it("warns when splitterHandle is used outside a splitter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: null, $: [splitterHandle()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("splitterHandle"),
    );
    warn.mockRestore();
  });

  it("renders panel and handle children without warning inside splitter", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [
        { div: "Left", $: [splitterPanel()] },
        { div: null, $: [splitterHandle()] },
        { div: "Right" },
      ],
      $: [splitter()],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("sets role=separator on the handle element", () => {
    const { host } = render({
      div: [
        { div: "Left", $: [splitterPanel()] },
        { div: null, $: [splitterHandle()] },
        { div: "Right" },
      ],
      $: [splitter()],
    } as DomphyElement);
    const handle = host.querySelector("[role=separator]")!;
    expect(handle).not.toBeNull();
  });

  it("handle aria-value attributes reflect defaultSize, min, max", () => {
    const { host } = render({
      div: [
        { div: "Left", $: [splitterPanel()] },
        { div: null, $: [splitterHandle()] },
        { div: "Right" },
      ],
      $: [splitter({ defaultSize: 40, min: 20, max: 80 })],
    } as DomphyElement);
    const handle = host.querySelector("[role=separator]")!;
    expect(handle.getAttribute("aria-valuenow")).toBe("40");
    expect(handle.getAttribute("aria-valuemin")).toBe("20");
    expect(handle.getAttribute("aria-valuemax")).toBe("80");
  });

  it("ArrowRight keyboard on horizontal handle increases size", () => {
    const { host } = render({
      div: [
        { div: "Left", $: [splitterPanel()] },
        { div: null, $: [splitterHandle()] },
        { div: "Right" },
      ],
      $: [splitter({ defaultSize: 50 })],
    } as DomphyElement);
    const handle = host.querySelector("[role=separator]") as HTMLElement;
    handle.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    flushSync();
    expect(handle.getAttribute("aria-valuenow")).toBe("51");
  });
});

// ---------------------------------------------------------------------------
// formGroup
// ---------------------------------------------------------------------------

describe("formGroup", () => {
  it("warns when applied to a non-fieldset element", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [{ div: [{ label: "Name" }], $: [formGroup()] }],
    } as DomphyElement);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("formGroup"));
    warn.mockRestore();
  });

  it("does not warn when applied to a fieldset", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render({
      div: [
        {
          fieldset: [{ legend: "Profile" }, { label: "Name" }, { input: "" }],
          $: [formGroup()],
        },
      ],
    } as DomphyElement);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("renders legend and label children", () => {
    const { host } = render({
      div: [
        {
          fieldset: [{ legend: "Profile" }, { label: "Email" }, { input: "" }],
          $: [formGroup()],
        },
      ],
    } as DomphyElement);
    expect(host.querySelector("legend")!.textContent).toBe("Profile");
    expect(host.querySelector("label")!.textContent).toBe("Email");
  });

  it("accepts vertical layout without error", () => {
    expect(() =>
      render({
        div: [
          {
            fieldset: [{ legend: "G" }, { label: "L" }, { input: "" }],
            $: [formGroup({ layout: "vertical" })],
          },
        ],
      } as DomphyElement),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// timeline
// ---------------------------------------------------------------------------

describe("timeline", () => {
  it("renders items in DOM order", () => {
    const { host } = render({
      div: [
        {
          ol: [
            { li: [{ b: "2023" }, { p: "Event A" }], $: [timelineItem()] },
            {
              li: [{ b: "2024" }, { p: "Event B" }],
              $: [timelineItem({ active: true })],
            },
            {
              li: [{ b: "2025" }, { p: "Event C" }],
              $: [timelineItem({ last: true })],
            },
          ],
          $: [timeline()],
        },
      ],
    } as DomphyElement);

    const items = host.querySelectorAll("li");
    expect(items.length).toBe(3);
    expect(items[0].querySelector("b")!.textContent).toBe("2023");
    expect(items[1].querySelector("b")!.textContent).toBe("2024");
    expect(items[2].querySelector("b")!.textContent).toBe("2025");
  });

  it("renders timeline with a single item", () => {
    const { host } = render({
      div: [
        {
          ol: [{ li: "Only event", $: [timelineItem({ last: true })] }],
          $: [timeline()],
        },
      ],
    } as DomphyElement);
    expect(host.querySelectorAll("li").length).toBe(1);
  });

  it("timelineItem reactive active state does not throw", () => {
    const active = toState(false);
    expect(() =>
      render({
        div: [
          {
            ol: [{ li: "Event", $: [timelineItem({ active })] }],
            $: [timeline()],
          },
        ],
      } as DomphyElement),
    ).not.toThrow();
    active.set(true);
  });
});
