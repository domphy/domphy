// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebar04 } from "../../../src/shadcn/sidebar/sidebar04.js";

// Each test renders the full aside + mobile-drawer + main tree (nav content
// is duplicated across both), which is legitimately slow under jsdom when
// many sibling sidebar test files run in the same worker pool — raise the
// per-test timeout above vitest's 5s default to avoid contention flakiness.
vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom's <dialog> support is partial in this repo's jsdom version — stub
  // showModal/close so the mobile drawer's `_onMount` (and its 350ms
  // fallback-close timer) never throws "close is not a function" (mirrors
  // packages/ui/tests/overlay.test.ts's drawer suite).
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

describe("sidebar04", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(sidebar04());

    expect(host.querySelectorAll("aside").length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
    expect(host.querySelectorAll("main").length).toBe(1);
  });

  it("renders the floating aside with a rounded/bordered/margined card style", () => {
    const { host, node } = render(sidebar04());
    const aside = host.querySelector("aside")!;
    const css = node.generateCSS();

    expect(aside).toBeTruthy();
    // Floating card styling: rounded corners, a margin gap from the page edge.
    expect(css).toContain("border-radius");
    expect(css).toMatch(/margin:\s*calc/);
  });

  it("keeps the parent/child nav tree from sidebar03's interaction model", () => {
    const { host } = render(sidebar04());
    const aside = host.querySelector("aside")!;

    expect(aside.querySelectorAll("nav li > details").length).toBe(3);
  });

  it("renders a non-sticky content header", () => {
    const { host, node } = render(sidebar04());
    const header = host.querySelector("main header")!;

    expect(header).toBeTruthy();
    const css = node.generateCSS();
    expect(css).not.toMatch(/position:\s*sticky/);
  });
});
