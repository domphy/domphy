// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { signup04 } from "../../../src/shadcn/auth/signup04.ts";

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

describe("signup04", () => {
  it("renders a working demo tree with zero args: email + password pair + three provider buttons", () => {
    const { host } = render(signup04() as DomphyElement);
    expect(host.querySelector("h1")?.textContent).toBe("Create your account");
    expect(host.querySelectorAll("form input").length).toBe(3);
    expect(host.querySelectorAll('input[type="password"]').length).toBe(2);
    const providerButtons = Array.from(host.querySelectorAll("form button")).filter(
      (el) => el.getAttribute("type") === "button",
    );
    expect(providerButtons.length).toBe(3);
  });

  it("respects a custom providers list", () => {
    const { host } = render(
      signup04({
        providers: [
          { id: "x", label: "Provider X" },
          { id: "y", label: "Provider Y" },
        ],
      }) as DomphyElement,
    );
    const providerButtons = Array.from(host.querySelectorAll("form button")).filter(
      (el) => el.getAttribute("type") === "button",
    );
    expect(providerButtons.length).toBe(2);
    expect(providerButtons[0].getAttribute("aria-label")).toBe("Sign up with Provider X");
  });

  it("renders the decorative image and legal links", () => {
    const { host } = render(signup04() as DomphyElement);
    expect(host.querySelector("img")).toBeTruthy();
    expect(host.querySelectorAll("small a").length).toBeGreaterThanOrEqual(2);
  });

  it("preventDefault()s the native submit and invokes onSubmit", () => {
    let called = false;
    const { host } = render(
      signup04({ onSubmit: () => (called = true) }) as DomphyElement,
    );
    const form = host.querySelector("form")!;
    const event = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(called).toBe(true);
  });
});
