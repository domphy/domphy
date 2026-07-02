// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expandableCard } from "../../../src/aceternity/cards/expandableCard.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom's <dialog> support is partial — stub showModal/close so dialog()'s
  // `_onMount` never throws (mirrors heroVideoDialog.test.ts).
  if (!(HTMLDialogElement.prototype as any).showModal) {
    (HTMLDialogElement.prototype as any).showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

/** Collapsed trigger cards live outside the `<dialog>`; the play button lives inside it. */
function collapsedButtons(host: HTMLElement): HTMLElement[] {
  return Array.from(host.querySelectorAll<HTMLElement>('button[type="button"]')).filter(
    (button) => !button.closest("dialog"),
  );
}

describe("expandableCard", () => {
  it("renders a working demo with zero args: collapsed cards plus a closed dialog", () => {
    const { host } = render(expandableCard() as DomphyElement);
    expect(collapsedButtons(host).length).toBe(3);
    const dialog = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialog).toBeTruthy();
    expect(dialog.open).toBeFalsy();
  });

  it("clicking a collapsed card opens the dialog with that item's content", async () => {
    let openedId = "";
    const { host } = render(expandableCard({ onOpen: (id) => (openedId = id) }) as DomphyElement);
    collapsedButtons(host)[0].click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(openedId).toBe("midnight-transit");
    expect(dialog.querySelector("h3")?.textContent).toBe("Midnight Transit");
  });

  it("clicking the close button closes the dialog", async () => {
    const { host } = render(expandableCard() as DomphyElement);
    collapsedButtons(host)[0].click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    const closeButton = dialog.querySelector('button[aria-label="Close"]') as HTMLElement;
    closeButton.click();
    // dialog()'s close path finalizes on `transitionend` (which jsdom never
    // fires for CSS transitions) or a 350ms fallback timer — wait past it.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(dialog.open).toBe(false);
  });

  it("removes cleanly without throwing", () => {
    const { node } = render(expandableCard() as DomphyElement);
    expect(() => node.remove()).not.toThrow();
  });
});
