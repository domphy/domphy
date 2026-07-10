// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { signup05 } from "../../../src/shadcn/auth/signup05.ts";

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

describe("signup05", () => {
  it("renders a working demo tree with zero args: welcome heading, single email field, two provider buttons", () => {
    const { host } = render(signup05() as DomphyElement);
    expect(host.querySelector("h1")?.textContent).toBe("Welcome to Acme Inc.");
    expect(host.querySelectorAll("form input").length).toBe(1);
    expect(host.querySelector('input[type="email"]')).toBeTruthy();
    const providerButtons = Array.from(
      host.querySelectorAll("form button"),
    ).filter((el) => el.getAttribute("type") === "button");
    expect(providerButtons.length).toBe(2);
  });

  it("places the sign-in line in the header, above the email field", () => {
    const { host } = render(signup05() as DomphyElement);
    const heading = host.querySelector("h1")!;
    // Upstream nests the header (logo, heading, sign-in line) as the first
    // child of the form's FieldGroup, so the sign-in link lives inside the
    // <form> — before the email field, not as a sibling outside the form.
    const emailInput = host.querySelector('input[type="email"]')!;
    const signInLink = Array.from(host.querySelectorAll("a")).find(
      (a) => a.textContent === "Sign in",
    )!;
    expect(signInLink).toBeTruthy();
    expect(
      heading.compareDocumentPosition(signInLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      signInLink.compareDocumentPosition(emailInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("preventDefault()s the native submit and invokes onSubmit", () => {
    let called = false;
    const { host } = render(
      signup05({ onSubmit: () => (called = true) }) as DomphyElement,
    );
    const form = host.querySelector("form")!;
    const event = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(called).toBe(true);
  });
});
