// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { heroVideoDialog } from "../../../src/magicui/core/heroVideoDialog.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom's <dialog> support is partial — stub showModal/close so dialog()'s
  // `_onMount` never throws (mirrors packages/blocks/tests/shadcn/sidebar/*).
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

describe("heroVideoDialog", () => {
  it("renders a working demo with zero arguments (thumbnail trigger + closed dialog)", () => {
    const { host } = render(heroVideoDialog());

    expect(host.querySelectorAll("dialog").length).toBe(1);
    const trigger = host.querySelector('[role="button"]')!;
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute("aria-label")).toContain("Play video");
    // Closed by default — the iframe's src is intentionally blank.
    const iframe = host.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toBe("");
  });

  it("clicking the play trigger opens the dialog and loads the video src", async () => {
    const { host } = render(heroVideoDialog({ videoSrc: "https://example.com/embed/demo" }));
    const trigger = host.querySelector('[role="button"]') as HTMLElement;
    trigger.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialog = host.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    const iframe = host.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toBe("https://example.com/embed/demo");
  });

  it("renders a themed placeholder panel when no thumbnailSrc is given", () => {
    const { host } = render(heroVideoDialog());
    expect(host.querySelector("img")).toBeNull();
  });
});
