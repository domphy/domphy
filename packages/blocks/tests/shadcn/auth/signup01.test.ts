// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { signup01 } from "../../../src/shadcn/auth/signup01.ts";

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

describe("signup01", () => {
  it("renders a working demo tree with zero args: card with all four fields", () => {
    const { host } = render(signup01() as DomphyElement);
    expect(host.querySelector("h2")?.textContent).toBe("Create an account");
    expect(host.querySelectorAll("form input").length).toBe(4);
    expect(host.querySelector('input[name="signup01-name"]')).toBeTruthy();
    expect(host.querySelector('input[name="signup01-email"][type="email"]')).toBeTruthy();
    expect(host.querySelector('input[name="signup01-password"][type="password"]')).toBeTruthy();
  });

  it("renders the primary submit button and, by default, the Google button", () => {
    const { host } = render(signup01() as DomphyElement);
    const buttons = host.querySelectorAll("form button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].getAttribute("type")).toBe("submit");
    expect(buttons[0].textContent).toContain("Create Account");
    expect(buttons[1].textContent).toContain("Sign up with Google");
  });

  it("hides the Google button when showGoogleButton is false", () => {
    const { host } = render(signup01({ showGoogleButton: false }) as DomphyElement);
    expect(host.querySelectorAll("form button").length).toBe(1);
  });

  it("preventDefault()s the native submit and invokes onSubmit", () => {
    let called = false;
    const { host } = render(
      signup01({ onSubmit: () => (called = true) }) as DomphyElement,
    );
    const form = host.querySelector("form")!;
    const event = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(called).toBe(true);
  });

  it("renders the sign-in footer link with the given href", () => {
    const { host } = render(
      signup01({ signInHref: "/login" }) as DomphyElement,
    );
    const link = host.querySelector("form a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/login");
    expect(link.textContent).toBe("Sign in");
  });
});
