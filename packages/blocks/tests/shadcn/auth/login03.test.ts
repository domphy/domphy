// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { Login03 } from "../../../src/shadcn/auth/login03.ts";

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

describe("Login03", () => {
  it("renders a working demo tree with zero args: logo row, card, Apple + Google buttons, email/password form", () => {
    const { host } = render(Login03() as DomphyElement);
    expect(host.querySelector("form")).toBeTruthy();
    expect(host.querySelector('input[name="email"][type="email"]')).toBeTruthy();
    expect(host.querySelector('input[name="password"][type="password"]')).toBeTruthy();
    expect(host.textContent).toContain("Login with Apple");
    expect(host.textContent).toContain("Login with Google");
  });

  it("renders the legal disclaimer footer below the card with Terms/Privacy links", () => {
    const { host } = render(Login03() as DomphyElement);
    const links = Array.from(host.querySelectorAll("a")).map((a) => a.textContent);
    expect(links).toContain("Terms of Service");
    expect(links).toContain("Privacy Policy");
  });

  it("submitting the form calls onSubmit with the entered email/password", () => {
    const values: { email: string; password: string }[] = [];
    const { host } = render(
      Login03({ onSubmit: (v) => values.push(v) }) as DomphyElement,
    );
    const form = host.querySelector("form") as HTMLFormElement;
    const email = host.querySelector('input[name="email"]') as HTMLInputElement;
    const password = host.querySelector('input[name="password"]') as HTMLInputElement;
    email.value = "user@example.com";
    password.value = "secret";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(values).toEqual([{ email: "user@example.com", password: "secret" }]);
  });
});
