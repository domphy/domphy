// @vitest-environment jsdom
// HIGH/MEDIUM layout-slice audit: errorBoundary reset, item rebuild on
// reuse, splitter recount, vertical steps, disabled link, list color,
// default type=button, motion behavior(), APG arrows on segmented/toggleGroup.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  button,
  buttonGhost,
  buttonSwitch,
  errorBoundary,
  fab,
  link,
  list,
  motion,
  pagination,
  segmented,
  splitter,
  splitterHandle,
  splitterPanel,
  steps,
  tabs,
  toggleGroup,
} from "../src/index.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function mountReactive(child: () => DomphyElement) {
  const refresh = toState(0);
  const { host } = render({
    div: [
      {
        div: (listener: { get?: unknown }) => {
          refresh.get(listener as never);
          return [{ div: [child()], _key: 1 }];
        },
      },
    ],
  } as DomphyElement);
  const rerender = () => {
    refresh.set(refresh.get() + 1);
    flushSync();
  };
  return { host, rerender };
}

function keydown(target: EventTarget, key: string) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

interface FakeAnim {
  finished: Promise<void>;
  keyframes: Keyframe[];
  resolve: () => void;
}
const motionCalls: FakeAnim[] = [];

function installWaapi() {
  (HTMLElement.prototype as unknown as { animate: unknown }).animate = (
    keyframes: Keyframe[],
  ) => {
    let resolve!: () => void;
    const finished = new Promise<void>((r) => {
      resolve = r;
    });
    const anim: FakeAnim = { finished, keyframes, resolve };
    motionCalls.push(anim);
    return anim as unknown as Animation;
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  motionCalls.length = 0;
});

// ---------------------------------------------------------------------------
// H09 — errorBoundary reset restores original children
// ---------------------------------------------------------------------------

describe("H09 errorBoundary reset restores original children", () => {
  it("reset() re-runs a throwing function child after the cause is gone", () => {
    let shouldThrow = true;
    const tick = toState(0);
    let capturedReset: (() => void) | undefined;

    const { host } = render({
      div: (listener: unknown) => {
        tick.get(listener as never);
        if (shouldThrow) throw new Error("boom");
        return "recovered";
      },
      $: [
        errorBoundary({
          fallback: (_error, reset) => {
            capturedReset = reset;
            return { button: "Try again" };
          },
        }),
      ],
    } as DomphyElement);

    tick.set(1);
    flushSync();
    expect(host.textContent).toContain("Try again");
    expect(capturedReset).toBeTypeOf("function");

    shouldThrow = false;
    capturedReset?.();
    flushSync();
    expect(host.textContent).toContain("recovered");
    expect(host.textContent).not.toContain("Try again");
  });

  it("reset() restores a static child whose reactive function threw", () => {
    let shouldThrow = true;
    const tick = toState(0);
    let capturedReset: (() => void) | undefined;

    const { host } = render({
      div: [
        {
          div: (listener: unknown) => {
            tick.get(listener as never);
            if (shouldThrow) throw new Error("inner");
            return { p: "ok again" };
          },
        },
      ],
      $: [
        errorBoundary({
          fallback: (_error, reset) => {
            capturedReset = reset;
            return { p: "fallback" };
          },
        }),
      ],
    } as DomphyElement);

    tick.set(1);
    flushSync();
    expect(host.textContent).toContain("fallback");

    shouldThrow = false;
    capturedReset?.();
    flushSync();
    expect(host.querySelector("p")?.textContent).toBe("ok again");
  });
});

// ---------------------------------------------------------------------------
// H10 — rebuild items/total on reuse/patch
// ---------------------------------------------------------------------------

describe("H10 injected items rebuild on reuse", () => {
  it("tabs picks up new items after an ancestor re-render", () => {
    let items = [
      { label: "One", content: { p: "one" }, key: "one" },
      { label: "Two", content: { p: "two" }, key: "two" },
    ];
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [tabs({ items })],
    }));
    expect(host.querySelectorAll("[role=tab]").length).toBe(2);

    items = [
      ...items,
      { label: "Three", content: { p: "three" }, key: "three" },
    ];
    rerender();
    expect(host.querySelectorAll("[role=tab]").length).toBe(3);
    expect(host.textContent).toContain("Three");
  });

  it("tabs keeps the clicked tab selected across a rebuild", () => {
    const items = [
      { label: "One", content: { p: "one" }, key: "one" },
      { label: "Two", content: { p: "two" }, key: "two" },
    ];
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [tabs({ items })],
    }));
    const buttons = () =>
      Array.from(host.querySelectorAll<HTMLElement>("[role=tab]"));
    buttons()[1].click();
    flushSync();
    expect(buttons()[1].getAttribute("aria-selected")).toBe("true");

    rerender();
    expect(buttons()[1].getAttribute("aria-selected")).toBe("true");
  });

  it("steps picks up new items after an ancestor re-render", () => {
    let items = [{ label: "Cart" }, { label: "Ship" }];
    const { host, rerender } = mountReactive(() => ({
      ol: null,
      $: [steps({ items, current: 0 })],
    }));
    expect(host.querySelectorAll("li").length).toBe(2);

    items = [...items, { label: "Pay" }];
    rerender();
    expect(host.querySelectorAll("li").length).toBe(3);
    expect(host.textContent).toContain("Pay");
  });

  it("toggleGroup picks up new items after an ancestor re-render", () => {
    let items = [
      { label: "Bold", key: "bold" },
      { label: "Italic", key: "italic" },
    ];
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [toggleGroup({ items })],
    }));
    expect(host.querySelectorAll("button").length).toBe(2);

    items = [...items, { label: "Underline", key: "underline" }];
    rerender();
    expect(host.querySelectorAll("button").length).toBe(3);
    expect(host.textContent).toContain("Underline");
  });

  it("segmented picks up new items after an ancestor re-render", () => {
    let items = [
      { label: "Day", key: "day" },
      { label: "Month", key: "month" },
    ];
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [segmented({ items })],
    }));
    expect(host.querySelectorAll("[role=radio]").length).toBe(2);

    items = [...items, { label: "Year", key: "year" }];
    rerender();
    expect(host.querySelectorAll("[role=radio]").length).toBe(3);
    expect(host.textContent).toContain("Year");
  });

  it("pagination rebuilds page buttons when total changes on reuse", () => {
    let total = 3;
    const { host, rerender } = mountReactive(() => ({
      div: null,
      $: [pagination({ total, value: 1 })],
    }));
    // prev + 3 pages + next
    expect(host.querySelectorAll("button").length).toBe(5);

    total = 5;
    rerender();
    expect(host.querySelectorAll("button").length).toBe(7);
    expect(host.textContent).toContain("5");
  });
});

// ---------------------------------------------------------------------------
// H11 — splitter panel recount on remount
// ---------------------------------------------------------------------------

describe("H11 splitter remounted panels recount first/second", () => {
  it("remounted two-panel split keeps complementary sizes", () => {
    const generation = toState(0);
    const { host } = render({
      div: (listener: unknown) => {
        const gen = generation.get(listener as never);
        return [
          { div: "Left", $: [splitterPanel()], _key: `left-${gen}` },
          { div: null, $: [splitterHandle()], _key: `handle-${gen}` },
          { div: "Right", $: [splitterPanel()], _key: `right-${gen}` },
        ];
      },
      $: [splitter({ defaultSize: 30 })],
    } as DomphyElement);

    const widths = () => {
      const root = host.firstElementChild as HTMLElement;
      const panels = Array.from(root.children).filter(
        (child) => child.getAttribute("role") !== "separator",
      ) as HTMLElement[];
      return panels.map((panel) => panel.style.width);
    };

    expect(widths()).toEqual(["30%", "70%"]);

    generation.set(1);
    flushSync();
    expect(widths()).toEqual(["30%", "70%"]);
  });
});

// ---------------------------------------------------------------------------
// M24 — vertical steps connector
// ---------------------------------------------------------------------------

describe("M24 steps vertical connector", () => {
  it("emits a vertical ::after track when direction is vertical", () => {
    const node = new ElementNode({
      ol: null,
      $: [
        steps({
          direction: "vertical",
          items: [{ label: "A" }, { label: "B" }, { label: "C" }],
        }),
      ],
    } as DomphyElement);
    const css = node.generateCSS();
    expect(css).toContain("flex-direction: column");
    expect(css).toMatch(/::after[\s\S]*width:\s*2px/);
  });
});

// ---------------------------------------------------------------------------
// M25 — disabled link must not navigate
// ---------------------------------------------------------------------------

describe("M25 disabled link does not navigate", () => {
  it("prevents click default and emits pointer-events:none when disabled", () => {
    const { host, node } = render({
      a: "Home",
      href: "https://example.com/away",
      disabled: true,
      $: [link()],
    } as DomphyElement);
    const anchor = host.querySelector("a") as HTMLAnchorElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(node.generateCSS()).toMatch(
      /\[disabled\][\s\S]*pointer-events:\s*none/,
    );
  });

  it("does not prevent click on an enabled link", () => {
    const { host } = render({
      a: "Home",
      href: "https://example.com/away",
      $: [link()],
    } as DomphyElement);
    const anchor = host.querySelector("a") as HTMLAnchorElement;
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// M26 — list color is applied
// ---------------------------------------------------------------------------

describe("M26 list color", () => {
  it("uses the color prop in generated CSS", () => {
    const node = new ElementNode({
      ul: [{ li: "A" }],
      $: [list({ color: "primary" })],
    } as DomphyElement);
    expect(node.generateCSS()).toMatch(/--primary-/);
  });
});

// ---------------------------------------------------------------------------
// M27 — default type=button (native type still wins)
// ---------------------------------------------------------------------------

describe("M27 default type=button", () => {
  it.each([
    ["button", () => ({ button: "Save", $: [button()] })],
    ["buttonGhost", () => ({ button: "×", $: [buttonGhost()] })],
    ["fab", () => ({ button: "+", $: [fab()] })],
    ["buttonSwitch", () => ({ button: { span: null }, $: [buttonSwitch()] })],
  ] as const)("%s defaults to type=button", (_name, factory) => {
    const { host } = render(factory() as DomphyElement);
    expect((host.querySelector("button") as HTMLButtonElement).type).toBe(
      "button",
    );
  });

  it("native type still wins over the patch default", () => {
    const { host } = render({
      button: "Go",
      type: "submit",
      $: [button()],
    } as DomphyElement);
    expect((host.querySelector("button") as HTMLButtonElement).type).toBe(
      "submit",
    );
  });
});

// ---------------------------------------------------------------------------
// M29 — motion behavior() applies a new animate on reuse
// ---------------------------------------------------------------------------

describe("M29 motion update applies new animate", () => {
  it("re-animates when a later generation passes a new animate target", () => {
    installWaapi();
    let frame = { opacity: 1 };
    const { rerender } = mountReactive(() => ({
      div: "box",
      $: [motion({ animate: frame })],
    }));
    expect(motionCalls.length).toBe(1);

    frame = { opacity: 0.4 };
    rerender();
    expect(motionCalls.length).toBeGreaterThanOrEqual(2);
    const last = motionCalls[motionCalls.length - 1].keyframes[0] as {
      opacity?: number;
    };
    expect(last.opacity).toBe(0.4);
  });
});

// ---------------------------------------------------------------------------
// M30 — segmented / toggleGroup APG arrow roving
// ---------------------------------------------------------------------------

describe("M30 segmented and toggleGroup arrow-key roving", () => {
  it("segmented ArrowRight/Home move selection and focus", () => {
    const { host } = render({
      div: null,
      $: [
        segmented({
          value: "a",
          items: [
            { label: "A", key: "a" },
            { label: "B", key: "b" },
            { label: "C", key: "c" },
          ],
        }),
      ],
    } as DomphyElement);

    const radios = Array.from(
      host.querySelectorAll<HTMLElement>("[role=radio]"),
    );
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].tabIndex).toBe(0);
    radios[0].focus();

    keydown(radios[0], "ArrowRight");
    flushSync();
    expect(radios[1].getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[1]);
    expect(radios[0].tabIndex).toBe(-1);
    expect(radios[1].tabIndex).toBe(0);

    keydown(radios[1], "End");
    flushSync();
    expect(radios[2].getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[2]);

    keydown(radios[2], "Home");
    flushSync();
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(radios[0]);
  });

  it("toggleGroup ArrowRight moves focus and single-select value", () => {
    const value = toState("a");
    const { host } = render({
      div: null,
      $: [
        toggleGroup({
          value,
          items: [
            { label: "A", key: "a" },
            { label: "B", key: "b" },
            { label: "C", key: "c" },
          ],
        }),
      ],
    } as DomphyElement);

    const buttons = Array.from(host.querySelectorAll<HTMLElement>("button"));
    expect(buttons[0].getAttribute("aria-pressed")).toBe("true");
    buttons[0].focus();

    keydown(buttons[0], "ArrowRight");
    flushSync();
    expect(value.get()).toBe("b");
    expect(buttons[1].getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(buttons[1]);

    keydown(buttons[1], "ArrowLeft");
    flushSync();
    expect(value.get()).toBe("a");
    expect(document.activeElement).toBe(buttons[0]);
  });
});
