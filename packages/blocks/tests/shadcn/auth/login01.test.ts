// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { Login01 } from "../../../src/shadcn/auth/login01.ts";

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

describe("Login01", () => {
  it("renders a working demo tree with zero args: card, email + password fields, submit + Google buttons", () => {
    const { host } = render(Login01() as DomphyElement);
    expect(host.querySelector("form")).toBeTruthy();
    expect(
      host.querySelector('input[name="email"][type="email"]'),
    ).toBeTruthy();
    expect(
      host.querySelector('input[name="password"][type="password"]'),
    ).toBeTruthy();
    expect(host.querySelectorAll("button")).toHaveLength(2);
    expect(host.querySelector('button[type="submit"]')?.textContent).toBe(
      "Login",
    );
  });

  it("renders the inline forgot-password link and sign-up footer link", () => {
    const { host } = render(Login01() as DomphyElement);
    const links = Array.from(host.querySelectorAll("a")).map(
      (a) => a.textContent,
    );
    expect(links).toContain("Forgot your password?");
    expect(links).toContain("Sign up");
  });

  it("submitting the form calls onSubmit with the entered email/password", () => {
    const values: { email: string; password: string }[] = [];
    const { host } = render(
      Login01({ onSubmit: (v) => values.push(v) }) as DomphyElement,
    );
    const form = host.querySelector("form") as HTMLFormElement;
    const email = host.querySelector('input[name="email"]') as HTMLInputElement;
    const password = host.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement;
    email.value = "user@example.com";
    password.value = "secret";
    form.dispatchEvent(
      new Event("submit", { cancelable: true, bubbles: true }),
    );
    expect(values).toEqual([{ email: "user@example.com", password: "secret" }]);
  });

  it("accepts custom labels and href props", () => {
    const { host } = render(
      Login01({
        heading: "Welcome",
        googleButtonLabel: "Continue with Google",
      }) as DomphyElement,
    );
    expect(host.querySelector("h2")?.textContent).toBe("Welcome");
    expect(host.textContent).toContain("Continue with Google");
  });
});
