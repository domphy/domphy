// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { notch } from "../../../src/aceternity/navigation/notch.ts";

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

describe("notch", () => {
  it("renders a working demo with zero arguments: 3 groups, 2 dividers", () => {
    const { host } = render(notch());

    const nav = host.querySelector("nav")!;
    expect(nav).toBeTruthy();
    expect(nav.getAttribute("data-tone")).toBe("shift-14");
    // 3 group triggers, split by 2 dotted dividers: 5 direct children total,
    // 2 of which are the empty (childless) divider bars.
    expect(nav.querySelectorAll('button[aria-haspopup="listbox"]').length).toBe(3);
    const directChildren = Array.from(nav.children);
    expect(directChildren.length).toBe(5);
    expect(directChildren.filter((child) => child.children.length === 0).length).toBe(2);
  });

  it("opens a group's panel on trigger click and closes it again on a second click", () => {
    const { host } = render(notch({ animateOnMount: false }));
    const trigger = host.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;

    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.click();
    flushSync();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    trigger.click();
    flushSync();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opening a second group's panel closes the first (only one open at a time)", () => {
    const { host } = render(notch({ animateOnMount: false }));
    const triggers = Array.from(host.querySelectorAll('button[aria-haspopup="listbox"]')) as HTMLButtonElement[];

    triggers[0].click();
    flushSync();
    expect(triggers[0].getAttribute("aria-expanded")).toBe("true");
    triggers[1].click();
    flushSync();
    expect(triggers[0].getAttribute("aria-expanded")).toBe("false");
    expect(triggers[1].getAttribute("aria-expanded")).toBe("true");
  });

  it("selecting an option updates the trigger label and fires onChange", () => {
    const changes: Array<[string, string]> = [];
    const { host } = render(
      notch({
        animateOnMount: false,
        onChange: (groupId, optionId) => changes.push([groupId, optionId]),
      }),
    );
    const trigger = host.querySelector('button[aria-haspopup="listbox"]') as HTMLButtonElement;
    const wrapper = trigger.parentElement as HTMLElement;
    trigger.click();
    flushSync();

    // Scoped to this group's own panel — all 3 groups' panels are always
    // present in the DOM (visibility toggled via CSS), so an unscoped query
    // would also pick up the other two groups' option rows.
    const options = wrapper.querySelectorAll('button[role="option"]');
    expect(options.length).toBe(3);
    (options[1] as HTMLButtonElement).click();
    flushSync();

    expect(trigger.textContent).toContain("Light");
    expect(changes).toEqual([["display", "light"]]);
    // closeOnSelect defaults to true.
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
