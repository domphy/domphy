// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { Login04 } from "../../../src/shadcn/auth/login04.ts";

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

describe("Login04", () => {
  it("renders a working demo tree with zero args: two-column card frame, cover image, three OAuth buttons", () => {
    const { host } = render(Login04() as DomphyElement);
    expect(host.querySelector("form")).toBeTruthy();
    expect(
      host.querySelector('input[name="email"][type="email"]'),
    ).toBeTruthy();
    expect(
      host.querySelector('input[name="password"][type="password"]'),
    ).toBeTruthy();
    expect(host.querySelector("img")).toBeTruthy();
    // Submit + Apple + Google + Meta = 4 buttons.
    expect(host.querySelectorAll("button")).toHaveLength(4);
  });

  it("renders the legal disclaimer footer below the card", () => {
    const { host } = render(Login04() as DomphyElement);
    const links = Array.from(host.querySelectorAll("a")).map(
      (a) => a.textContent,
    );
    expect(links).toContain("Terms of Service");
    expect(links).toContain("Privacy Policy");
  });

  it("submitting the form calls onSubmit with the entered email/password", () => {
    const values: { email: string; password: string }[] = [];
    const { host } = render(
      Login04({ onSubmit: (v) => values.push(v) }) as DomphyElement,
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

  it("interpolates the brand name into the default description", () => {
    const { host } = render(Login04({ brandName: "Contoso" }) as DomphyElement);
    expect(host.textContent).toContain("Login to your Contoso account");
  });
});
