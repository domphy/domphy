// @vitest-environment jsdom
//
// Regressions found by driving the patches in a real Chromium (Playwright).
// Every expectation below names the external source it is taken from — a spec
// section or a peer implementation — never this package's own output.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import { beforeEach, describe, expect, it } from "vitest";
import { dialog, menu, pagination, popover, tabs } from "../src/index.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Panel mount/unmount goes through Domphy's reactive scheduler, so let the
// task queue drain before asserting on the DOM.
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  document.body.innerHTML = "";
  (HTMLDialogElement.prototype as any).showModal = function () {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function () {
    this.open = false;
  };
});

describe("floating panels never portal into another root's dialog overlay", () => {
  // Truth source: DOM containment, observed in Chromium. `_portal` puts a
  // panel opened inside a <dialog> into `dialog > [data-domphy-floating]` so it
  // shares the dialog's top layer. That element carries the SAME id as the
  // app-level overlay, so a descendant `querySelector("[data-domphy-floating]")`
  // from the root returns the dialog's copy (first in document order) and
  // every later panel in the app was mounted inside a closed, display:none
  // dialog: aria-expanded stayed "true" while the panel had a 0x0 rect and
  // could not take focus.
  it("an outside-the-dialog popover mounts in the ROOT overlay, not the dialog's", async () => {
    const dialogOpen = toState(true);
    const innerOpen = toState(true);
    const outerOpen = toState(false);

    const { host } = render({
      div: [
        {
          dialog: [
            {
              button: "inner trigger",
              $: [
                popover({
                  open: innerOpen,
                  content: { div: "inner panel", id: "inner-panel" },
                }),
              ],
            },
          ],
          id: "dlg",
          $: [dialog({ open: dialogOpen })],
        },
        {
          button: "outer trigger",
          id: "outer-trigger",
          $: [
            popover({
              open: outerOpen,
              content: { div: "outer panel", id: "outer-panel" },
            }),
          ],
        },
      ],
    });

    // The dialog's own overlay exists and holds the inner panel.
    const dlg = host.querySelector("#dlg")!;
    expect(dlg.querySelector("#inner-panel")).not.toBeNull();

    // Now open the popover that lives OUTSIDE the dialog.
    outerOpen.set(true);
    await settle();

    const outerPanel = host.querySelector("#outer-panel");
    expect(outerPanel).not.toBeNull();
    expect(dlg.contains(outerPanel)).toBe(false);
  });
});

describe("Escape dismisses only the topmost layer", () => {
  // Truth source: WAI-ARIA APG "Dialog (Modal)" keyboard docs plus Radix
  // DismissableLayer / React Aria's overlay stack — Escape closes the
  // innermost open layer, not every ancestor layer at once. The browser fires
  // the <dialog> `cancel` event for the same keypress the panel's dismiss
  // handler sees, so one Escape closed both.
  it("a dialog ignores `cancel` while a floating panel is open inside it", async () => {
    const dialogOpen = toState(true);
    const panelOpen = toState(true);

    const { host } = render({
      dialog: [
        {
          button: "trigger",
          $: [
            popover({
              open: panelOpen,
              content: { div: "panel", id: "panel" },
            }),
          ],
        },
      ],
      id: "dlg",
      $: [dialog({ open: dialogOpen })],
    });

    const dlg = host.querySelector("#dlg") as HTMLDialogElement;
    expect(dlg.querySelector("#panel")).not.toBeNull();

    dlg.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(dialogOpen.get()).toBe(true);

    // With no panel mounted, the same event closes the dialog.
    panelOpen.set(false);
    await settle();
    expect(dlg.querySelector("#panel")).toBeNull();
    dlg.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(dialogOpen.get()).toBe(false);
  });

  // Same truth source, for POPOVER-in-popover. A nested popover's trigger is
  // an ordinary element inside the OUTER panel, so an Escape pressed on it
  // bubbles into the outer panel's own keydown handler as well as the inner
  // panel's. Measured in Chromium before the top-layer gate:
  // `outer trigger -> click -> inner trigger -> Escape` removed BOTH panels on
  // one keypress and returned the focus two levels, to the outer trigger.
  it("Escape pressed on a nested trigger closes only the inner panel", async () => {
    const outerOpen = toState(true);
    const innerOpen = toState(true);

    const { host } = render({
      div: [
        {
          button: "outer",
          id: "outer-trigger",
          $: [
            popover({
              open: outerOpen,
              content: {
                div: [
                  {
                    button: "inner",
                    id: "inner-trigger",
                    $: [
                      popover({
                        open: innerOpen,
                        content: { div: "deep", id: "inner-panel" },
                      }),
                    ],
                  },
                ],
                id: "outer-panel",
              },
            }),
          ],
        },
      ],
    });
    await settle();

    expect(host.querySelector("#outer-panel")).not.toBeNull();
    expect(host.querySelector("#inner-panel")).not.toBeNull();

    (host.querySelector("#inner-trigger") as HTMLElement).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    // hide() is debounced by HIDE_DELAY (100ms), so one settle() tick is not
    // enough to see either panel go.
    await new Promise((resolve) => setTimeout(resolve, 260));

    expect(host.querySelector("#inner-panel")).toBeNull();
    expect(host.querySelector("#outer-panel")).not.toBeNull();
    expect(outerOpen.get()).toBe(true);
  });
});

describe("dialog initial focus", () => {
  // Truth source: HTML Standard, "dialog focusing steps" — the control with
  // the `autofocus` attribute is focused, falling back to the first focusable
  // descendant. Radix Dialog, MUI Dialog and Mantine Modal all honour it.
  it("focuses the [autofocus] element, not merely the first focusable one", async () => {
    const open = toState(false);
    const { host } = render({
      dialog: [
        { button: "Cancel", id: "first-button" },
        { input: null, id: "wanted", type: "text", autofocus: true },
      ],
      id: "dlg",
      $: [dialog({ open })],
    });

    open.set(true);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    expect(document.activeElement).toBe(host.querySelector("#wanted"));
  });
});

describe("roving tabindex", () => {
  // Truth source: WAI-ARIA APG "Menu and Menubar" — "Only one of the
  // menuitems in a menu is in the tab sequence", so Tab leaves the menu
  // instead of stepping through every item (Radix DropdownMenu, React Aria
  // Menu and MUI MenuList all implement this).
  it("menu keeps exactly one item in the page tab order", () => {
    const { host } = render({
      div: null,
      $: [
        menu({
          items: [
            { label: "One", key: "one" },
            { label: "Two", key: "two" },
            { label: "Three", key: "three" },
          ],
        }),
      ],
    });

    const tabIndexes = Array.from(
      host.querySelectorAll<HTMLElement>("[role=menuitem]"),
    ).map((el) => el.tabIndex);
    expect(tabIndexes.filter((value) => value === 0)).toHaveLength(1);
    expect(tabIndexes.filter((value) => value === -1)).toHaveLength(2);
  });

  // Truth source: WAI-ARIA APG "Tabs" — "If the tabpanel does not contain any
  // focusable elements ... the tabpanel element has tabindex=0". Radix
  // Tabs.Content and React Aria TabPanel set it unconditionally.
  it("every tabpanel is focusable", () => {
    const { host } = render({
      div: null,
      $: [
        tabs({
          items: [
            { label: "A", content: { p: "a" }, key: "a" },
            { label: "B", content: { p: "b" }, key: "b" },
          ],
        }),
      ],
    });

    const panels = Array.from(
      host.querySelectorAll<HTMLElement>("[role=tabpanel]"),
    );
    expect(panels).toHaveLength(2);
    for (const panel of panels) expect(panel.tabIndex).toBe(0);
  });
});

describe("pagination keeps the current page in the tab order", () => {
  // Truth source: WCAG 2.4.3 Focus Order / 2.1.1 Keyboard — activating a
  // control must not destroy the focus position. `disabled` on the current
  // page (the previous behaviour) removed the just-clicked button from the
  // tab order, so the browser dropped focus to <body> on every page change.
  // shadcn/ui PaginationLink and MUI Pagination both mark the current page
  // with aria-current only.
  it("marks the active page with aria-current and leaves it enabled", () => {
    const { host } = render({
      div: "",
      id: "pag",
      $: [pagination({ total: 10, value: 3 })],
    });

    const current = host.querySelector<HTMLButtonElement>(
      "button[aria-current=page]",
    );
    expect(current).not.toBeNull();
    expect(current!.textContent).toBe("3");
    expect(current!.disabled).toBe(false);
  });
});
