// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { Login05 } from "../../../src/shadcn/auth/login05.ts";

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

describe("Login05", () => {
  it("renders a working demo tree with zero args: single email field, no password field", () => {
    const { host } = render(Login05() as DomphyElement);
    expect(host.querySelector("form")).toBeTruthy();
    expect(host.querySelector('input[name="email"][type="email"]')).toBeTruthy();
    expect(host.querySelector('input[type="password"]')).toBeFalsy();
    expect(host.textContent).toContain("Continue with Apple");
    expect(host.textContent).toContain("Continue with Google");
  });

  it("renders the header row (logo/title + sign-up link) and legal footer", () => {
    const { host } = render(Login05() as DomphyElement);
    expect(host.textContent).toContain("Welcome to Acme Inc.");
    const links = Array.from(host.querySelectorAll("a")).map((a) => a.textContent);
    expect(links).toContain("Sign up");
    expect(links).toContain("Terms of Service");
    expect(links).toContain("Privacy Policy");
  });

  it("submitting the form calls onSubmit with only the entered email", () => {
    const values: { email: string }[] = [];
    const { host } = render(
      Login05({ onSubmit: (v) => values.push(v) }) as DomphyElement,
    );
    const form = host.querySelector("form") as HTMLFormElement;
    const email = host.querySelector('input[name="email"]') as HTMLInputElement;
    email.value = "user@example.com";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(values).toEqual([{ email: "user@example.com" }]);
  });
});
