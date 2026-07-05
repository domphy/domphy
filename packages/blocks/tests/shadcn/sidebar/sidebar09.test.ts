// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar09 } from "../../../src/shadcn/sidebar/sidebar09.ts";

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

describe("sidebar09", () => {
  it("renders a working demo tree with zero args: icon rail + list panel + main shell", () => {
    const { host } = render(sidebar09() as DomphyElement);
    expect(host.querySelectorAll("aside").length).toBe(2);
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders one folder button per folder and the default active folder's messages", () => {
    const { host } = render(sidebar09() as DomphyElement);
    const folderButtons = host.querySelectorAll("aside:first-of-type ul button[aria-label]");
    expect(folderButtons.length).toBe(5);
    expect(host.textContent).toContain("William Smith");
    expect(host.textContent).toContain("Meeting Tomorrow");
  });

  it("shows the active folder's title in the message-list header", () => {
    const { host } = render(sidebar09() as DomphyElement);
    const listHeaderTitle = host.querySelectorAll("aside")[1].querySelector("strong");
    expect(listHeaderTitle?.textContent).toBe("Inbox");
  });

  it("clicking a folder button switches the message list to that folder", async () => {
    const { host } = render(sidebar09() as DomphyElement);
    const draftsButton = Array.from(host.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "Drafts",
    ) as HTMLButtonElement;
    expect(draftsButton).toBeTruthy();
    draftsButton.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.textContent).toContain("Draft: Quarterly Report");
    expect(host.textContent).not.toContain("Meeting Tomorrow");
    // The message-list header title tracks the active folder (upstream parity).
    expect(host.querySelectorAll("aside")[1].querySelector("strong")?.textContent).toBe("Drafts");
  });

  it("toggling the Unreads switch filters the list to unread-only messages", async () => {
    const { host } = render(sidebar09() as DomphyElement);
    const unreadSwitch = host.querySelector('input[type=checkbox][role=switch]') as HTMLInputElement;
    expect(unreadSwitch).toBeTruthy();
    unreadSwitch.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.textContent).toContain("William Smith");
    expect(host.textContent).not.toContain("Bob Johnson");
  });

  it("clicking the header toggle does not throw", () => {
    const { host } = render(sidebar09() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts custom folders and messages", () => {
    const { host } = render(
      sidebar09({
        folders: [{ id: "custom", label: "Custom", icon: "" }],
        messages: [
          {
            id: "c1",
            folderId: "custom",
            sender: "Test Sender",
            timestamp: "now",
            subject: "Custom Subject",
            preview: "Custom preview text.",
          },
        ],
        activeFolderId: "custom",
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Custom Subject");
  });
});
