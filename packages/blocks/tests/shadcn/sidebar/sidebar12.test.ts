// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { sidebar12 } from "../../../src/shadcn/sidebar/sidebar12.ts";

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

describe("sidebar12", () => {
  it("renders a working demo tree with zero args: aside + main shell", () => {
    const { host } = render(sidebar12() as DomphyElement);
    expect(host.querySelector("aside")).toBeTruthy();
    expect(host.querySelector("main")).toBeTruthy();
    expect(host.querySelector("header")).toBeTruthy();
  });

  it("renders the user header, month date-picker and calendar groups", () => {
    const { host } = render(sidebar12() as DomphyElement);
    expect(host.textContent).toContain("Shad Cn");
    expect(host.textContent).toContain("October 2024");
    expect(host.textContent).toContain("Su");
    expect(host.textContent).toContain("My Calendars");
    expect(host.textContent).toContain("Personal");
    expect(host.textContent).toContain("Favorites");
    expect(host.textContent).toContain("Other");
  });

  it("renders one checkbox per calendar entry, only the first two per group checked by default", () => {
    const { host } = render(sidebar12() as DomphyElement);
    const checkboxes = Array.from(
      host.querySelectorAll("aside input[type=checkbox]"),
    ) as HTMLInputElement[];
    expect(checkboxes.length).toBe(8);
    // DEFAULT_GROUPS: My Calendars (3), Favorites (2), Other (3) — only each
    // group's first two entries start checked, matching the reference.
    const checkedCount = checkboxes.filter(
      (checkbox) => checkbox.checked,
    ).length;
    expect(checkedCount).toBe(6);
  });

  it("clicking a calendar checkbox toggles it off", () => {
    const { host } = render(sidebar12() as DomphyElement);
    const checkbox = host.querySelector(
      "aside input[type=checkbox]",
    ) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    expect(checkbox.checked).toBe(false);
  });

  it("month-picker prev/next arrows change the displayed month label", async () => {
    const { host } = render(sidebar12() as DomphyElement);
    const nextButton = host.querySelector(
      'aside button[aria-label="Next month"]',
    ) as HTMLButtonElement;
    expect(nextButton).toBeTruthy();
    nextButton.click();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(host.querySelector("aside")?.textContent).toContain("November 2024");
  });

  it("clicking a day cell selects it without throwing", () => {
    const { host } = render(sidebar12() as DomphyElement);
    const dayButtons = Array.from(host.querySelectorAll("aside button")).filter(
      (button) => /^\d+$/.test(button.textContent ?? ""),
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    expect(() => (dayButtons[10] as HTMLButtonElement).click()).not.toThrow();
  });

  it("clicking the header toggle does not throw", () => {
    const { host } = render(sidebar12() as DomphyElement);
    const toggle = host.querySelector("header button") as HTMLButtonElement;
    expect(() => toggle.click()).not.toThrow();
  });

  it("accepts custom user and calendar groups", () => {
    const { host } = render(
      sidebar12({
        user: { name: "Jamie Doe", email: "jamie@example.com" },
        groups: [
          {
            label: "Solo",
            entries: [{ id: "x", name: "Custom Calendar", color: "primary" }],
          },
        ],
      }) as DomphyElement,
    );
    expect(host.textContent).toContain("Jamie Doe");
    expect(host.textContent).toContain("Custom Calendar");
  });
});
