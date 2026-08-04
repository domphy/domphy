// @vitest-environment jsdom

// Regression tests for two reused-node lifecycle bugs in dashboard-01:
//
// 1. The header "select all" checkbox's `indeterminate` flag was set once in
//    `_onMount` — after any table-state re-render the flag went stale and the
//    partial-selection dash never appeared. Now re-applied per generation via
//    behavior() update().
// 2. The status-filter select bridged its `activeStatusFilter` state into the
//    table via an `_onMount` subscription to generation 1's state — after an
//    ancestor re-render the select silently stopped filtering. Now bridged
//    via behavior() so later generations re-point the subscription.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboard01 } from "../../../src/shadcn/dashboard/dashboard-01.ts";

vi.setConfig({ testTimeout: 20000 });

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  // jsdom <dialog> stubs (mirrors dashboard-01.test.ts).
  if (!(HTMLDialogElement.prototype as any).showModal) {
    (HTMLDialogElement.prototype as any).showModal = function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("dashboard01 — select-all indeterminate", () => {
  it("shows the partial-selection dash after one row is selected, clears on select-all", async () => {
    const { host } = render(dashboard01() as DomphyElement);
    const headerCheckbox = () =>
      host.querySelector("#dashboard01-select-all") as HTMLInputElement;
    expect(headerCheckbox()).toBeTruthy();
    expect(headerCheckbox().indeterminate).toBe(false);

    const rowCheckbox = host.querySelector(
      'table tbody input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(rowCheckbox).toBeTruthy();
    rowCheckbox.click();
    await tick();
    expect(headerCheckbox().indeterminate).toBe(true);

    headerCheckbox().click();
    await tick();
    expect(headerCheckbox().indeterminate).toBe(false);
    expect(headerCheckbox().checked).toBe(true);
  });
});

describe("dashboard01 — status filter bridge", () => {
  it("still filters after an ancestor re-render reuses the table", async () => {
    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({
      div: [
        {
          div: (listener: unknown) => {
            (refresh.get as (l: unknown) => number)(listener);
            return [dashboard01() as DomphyElement];
          },
        },
      ],
    } as DomphyElement);
    node.render(host);
    flushSync();

    const table = host.querySelector("table");
    // Ancestor re-render: fresh factory closure (new table + filter state),
    // SAME DOM subtree reused.
    refresh.set(1);
    flushSync();
    expect(host.querySelector("table")).toBe(table);

    const viewSelect = host.querySelector(
      'select[aria-label="Select view"]',
    ) as HTMLSelectElement;
    expect(viewSelect).toBeTruthy();
    viewSelect.value = "Done";
    viewSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await tick();

    expect(host.textContent).toContain("Budget Forecast");
    expect(host.textContent).not.toContain("Risk Assessment");
  });
});
