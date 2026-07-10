// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import type { ConfettiHandle } from "../../../src/magicui/effects/confetti.js";
import {
  confetti,
  confettiButton,
} from "../../../src/magicui/effects/confetti.js";

// jsdom ships no canvas implementation: getContext() returns null, and
// canvas-confetti's animation loop (started by confetti()'s default
// autoFire: true the moment the canvas mounts) crashes on context.clearRect
// as an unhandled async error AFTER the tests pass. Hand it a no-op 2D
// context so the real default path runs harmlessly.
const noopCanvasContext = new Proxy(
  {},
  {
    get: (_target, property) => (property === "canvas" ? undefined : () => {}),
    set: () => true,
  },
);
HTMLCanvasElement.prototype.getContext = (() =>
  noopCanvasContext) as typeof HTMLCanvasElement.prototype.getContext;

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

describe("confetti", () => {
  it("renders a bare, inert canvas and hands back a ready handle", () => {
    let readyHandle: ConfettiHandle | null = null;
    const { host } = render(
      confetti({ onReady: (handle) => (readyHandle = handle) }),
    );

    const canvasElement = host.querySelector("canvas")!;
    expect(canvasElement).toBeTruthy();
    expect(canvasElement.getAttribute("aria-hidden")).toBe("true");
    expect(readyHandle).toBeTruthy();
    expect(typeof readyHandle!.fire).toBe("function");
    expect(typeof readyHandle!.reset).toBe("function");
  });
});

describe("confettiButton", () => {
  it("renders a working demo button with an internal burst canvas", () => {
    const { host } = render(confettiButton());

    const buttonElement = host.querySelector("button")!;
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.textContent).toContain("Celebrate");
    expect(buttonElement.querySelector("canvas")).toBeTruthy();
  });

  it("accepts a custom label and color", () => {
    const { host } = render(
      confettiButton({ children: "Launch", color: "success" }),
    );

    const buttonElement = host.querySelector("button")!;
    expect(buttonElement.textContent).toContain("Launch");
  });
});
