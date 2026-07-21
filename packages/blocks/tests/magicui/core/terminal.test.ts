// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { terminal } from "../../../src/magicui/core/terminal.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("terminal", () => {
  it("renders a working demo with zero arguments (header dots + scripted lines)", () => {
    // Never start playback so we assert the resting full-text surface.
    class IdleIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", IdleIntersectionObserver);

    const { host } = render(terminal());

    const window_ = host.firstElementChild!;
    expect(window_).toBeTruthy();
    const header = window_.children[0];
    expect(header.children.length).toBe(3);
    expect(window_.querySelectorAll("small")).toHaveLength(0);
    // Resting state shows the full script before playback starts.
    expect(host.textContent).toContain("Scaffolding your project");
    expect(host.textContent).toContain("npx domphy@latest init");
    expect(window_.children.length).toBe(2);
    const linesColumn = window_.children[1];
    expect(linesColumn.children.length).toBe(5);
  });

  it("keeps full typing + fade text at rest before playback starts", () => {
    class IdleIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal("IntersectionObserver", IdleIntersectionObserver);

    const { host } = render(
      terminal({
        startOnView: true,
        lines: [
          { type: "typing", text: "echo hi" },
          { type: "fade", text: "Done", color: "success" },
        ],
      }),
    );
    expect(host.textContent).toContain("▊");
    expect(host.textContent).toContain("echo hi");
    expect(host.textContent).toContain("Done");
  });

  it("retypes from empty after start (progressive typing)", async () => {
    vi.useFakeTimers();
    const { host } = render(
      terminal({
        startOnView: false,
        sequence: false,
        lines: [
          {
            type: "typing",
            text: "echo hi",
            charsPerSecond: 100,
            delay: 0,
          },
        ],
      }),
    );

    // Resting full text is present on first paint.
    expect(host.textContent).toContain("echo hi");

    // startOnView:false → started immediately → runTyping clears then types.
    await vi.advanceTimersByTimeAsync(0);
    // After clear, the full command is gone until characters stream in.
    expect(host.textContent?.includes("echo hi")).toBe(false);

    // ~100 chars/sec → 10ms per char; 7 chars ≈ 70ms.
    await vi.advanceTimersByTimeAsync(20);
    const mid = host.textContent ?? "";
    expect(mid.includes("e")).toBe(true);
    expect(mid.includes("echo hi")).toBe(false);

    await vi.advanceTimersByTimeAsync(200);
    expect(host.textContent).toContain("echo hi");
  });
});
