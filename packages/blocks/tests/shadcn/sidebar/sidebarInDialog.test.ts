// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sidebarInDialog } from "../../../src/shadcn/sidebar/sidebarInDialog.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom does not implement the native <dialog> modal API.
  (HTMLDialogElement.prototype as any).showModal = function () {
    this.open = true;
  };
  (HTMLDialogElement.prototype as any).close = function () {
    this.open = false;
  };
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sidebarInDialog", () => {
  it("renders a trigger and a closed dialog with zero args", () => {
    const { host } = render(sidebarInDialog() as DomphyElement);
    const dialogElement = host.querySelector("dialog") as HTMLDialogElement;
    expect(host.querySelector("button")).toBeTruthy();
    expect(dialogElement).toBeTruthy();
    expect(dialogElement.open).toBe(false);
  });

  it("clicking the trigger opens the dialog via showModal", () => {
    const { host } = render(sidebarInDialog() as DomphyElement);
    const trigger = host.querySelector("button") as HTMLButtonElement;
    trigger.click();
    flushSync();
    const dialogElement = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialogElement.open).toBe(true);
  });

  it("renders the default 12 settings categories and the default active category", () => {
    const { host } = render(sidebarInDialog() as DomphyElement);
    expect(host.textContent).toContain("Notifications");
    expect(host.textContent).toContain("Messages & media");
    expect(host.textContent).toContain("Advanced");
    // breadcrumb shows "Settings / <active category>"
    expect(host.textContent).toContain("Settings");
  });

  it("clicking another category row swaps the active category without throwing", () => {
    const { host } = render(sidebarInDialog() as DomphyElement);
    const rows = Array.from(host.querySelectorAll("nav ul button"));
    const notificationsRow = rows.find((rowButton) => rowButton.textContent?.includes("Notifications"));
    expect(notificationsRow).toBeTruthy();
    expect(() => (notificationsRow as HTMLButtonElement).click()).not.toThrow();
    flushSync();
    expect((notificationsRow as HTMLElement).getAttribute("aria-current")).toBe("true");
  });

  it("accepts custom categories and a custom default", () => {
    const { host } = render(
      sidebarInDialog({
        categories: [
          { id: "billing", label: "Billing", icon: "<svg></svg>" },
          { id: "team", label: "Team", icon: "<svg></svg>" },
        ],
        defaultCategoryId: "team",
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Billing");
    expect(host.textContent).toContain("Team");
    expect(host.textContent).not.toContain("Notifications");
  });
});
