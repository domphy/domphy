// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dashboard01 } from "../../../src/shadcn/dashboard/dashboard-01.ts";

// The full tree (sidebar + KPI grid + chart + drag-reorderable table + row
// drawer) is legitimately slow to render under jsdom — raise the per-test
// timeout above vitest's 5s default to avoid contention flakiness (mirrors
// packages/blocks/tests/shadcn/sidebar/sidebar01.test.ts).
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

beforeEach(() => {
  // jsdom's <dialog> support is partial in this repo's jsdom version — stub
  // showModal/close so the row-editing drawer's `_onMount` (and its 350ms
  // fallback-close timer) never throws "close is not a function" (mirrors
  // packages/blocks/tests/shadcn/sidebar/sidebar01.test.ts).
  if (!(HTMLDialogElement.prototype as any).showModal) {
    (HTMLDialogElement.prototype as any).showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("dashboard01", () => {
  it("renders a working demo tree with zero args: sidebar shell, KPI cards, chart, and data table", () => {
    const { host } = render(dashboard01() as DomphyElement);

    // Sidebar shell (reused sidebar07 shell).
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.textContent).toContain("Acme Inc.");
    expect(host.textContent).toContain("Dashboard");

    // Content header (breadcrumb page title + utility row).
    expect(host.textContent).toContain("Documents");
    expect(host.textContent).toContain("GitHub");

    // KPI metric cards.
    expect(host.textContent).toContain("Active Subscriptions");
    expect(host.textContent).toContain("8,492");

    // Chart region (reused chartBarStacked — canvas-based).
    expect(host.textContent).toContain("Visitor Trends");
    expect(host.querySelector("canvas")).toBeTruthy();

    // Data table region: rows, status badges, pagination footer.
    const table = host.querySelector("table");
    expect(table).toBeTruthy();
    expect(host.textContent).toContain("Project Brief");
    expect(host.textContent).toContain("Done");
    expect(host.textContent).toContain("row(s) selected");
  });

  it("filters the table to a status view via the tab/select control", async () => {
    const { host } = render(dashboard01() as DomphyElement);
    const viewSelect = host.querySelector('select[aria-label="Select view"]') as HTMLSelectElement;
    expect(viewSelect).toBeTruthy();
    viewSelect.value = "Done";
    viewSelect.dispatchEvent(new Event("change", { bubbles: true }));
    // Reactive re-render is scheduled (not synchronous) — flush a tick.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(host.textContent).toContain("Budget Forecast");
    expect(host.textContent).not.toContain("Risk Assessment");
  });

  it("clicking a row title opens the row-editing drawer", async () => {
    const { host } = render(dashboard01() as DomphyElement);
    const titleButtons = Array.from(host.querySelectorAll("table tbody button")).filter(
      (button) => button.textContent?.includes("Project Brief"),
    );
    expect(titleButtons.length).toBeGreaterThan(0);
    (titleButtons[0] as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const dialog = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector("h3")?.textContent).toBe("Project Brief");
  });

  it("accepts custom table rows and metric cards", () => {
    const { host } = render(
      dashboard01({
        tableRows: [
          { id: 1, header: "Custom Row", sectionType: "Custom", status: "Done", target: 1, limit: 1, reviewer: "Test Reviewer" },
        ],
        metricCards: [
          { label: "Custom Metric", value: "42", badgeDelta: "+1%", trendDirection: "up", footerHeadline: "Up", footerSubtext: "Sub" },
        ],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom Row");
    expect(host.textContent).toContain("Custom Metric");
  });
});
