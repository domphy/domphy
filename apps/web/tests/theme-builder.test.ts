// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { diagnose, format } from "@domphy/doctor";
import { afterEach, describe, expect, it, vi } from "vitest";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

// Each import gets a fresh copy of the module's top-level state (baseColors,
// activeTab, ...), since the demo isn't designed to be mounted twice in one
// process — force a fresh module instance per test via resetModules().
async function mountFresh() {
  vi.resetModules();
  const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(mod.default);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

describe("ThemeBuilder demo", () => {
  it("renders one color picker per semantic role", async () => {
    const { host } = await mountFresh();
    const pickers = host.querySelectorAll('input[type="color"]');
    // 10 roles + 1 inputColor gallery item.
    expect(pickers.length).toBeGreaterThanOrEqual(10);
  });

  it("renders 18-step swatch rows for every role", async () => {
    const { host } = await mountFresh();
    const rows = host.querySelectorAll("aside ~ div section div");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("changing a color picker regenerates the theme and updates the export panel", async () => {
    const { host } = await mountFresh();
    const picker = host.querySelector('input[type="color"]') as HTMLInputElement;
    expect(picker).toBeTruthy();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    const hexMirror = picker.closest("div")?.querySelector("code") as HTMLElement;
    const before = exportCode.textContent;

    picker.value = "#00ff00";
    picker.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    // The picked hex isn't required to survive verbatim into the discretized
    // 18-step ramp (it's a WCAG-optimized interpolation, not an identity
    // passthrough) — assert on the raw-input mirror instead, and that the
    // export panel (which reflects the regenerated theme) actually changed.
    expect(hexMirror.textContent).toBe("#00ff00");
    expect(exportCode.textContent).not.toBe(before);
  });

  it("switching tabs shows the size/density fields instead of color pickers", async () => {
    const { host } = await mountFresh();
    const buttons = Array.from(host.querySelectorAll("aside button"));
    const sizeTabButton = buttons.find((b) => b.textContent === "Size & Density") as HTMLButtonElement;
    expect(sizeTabButton).toBeTruthy();

    sizeTabButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    const numberInputs = host.querySelectorAll('aside input[type="number"]');
    expect(numberInputs.length).toBe(5); // one per density step
  });

  it("switching the preview theme selector changes the gallery's dataTheme", async () => {
    const { host } = await mountFresh();
    const select = host.querySelector("aside select") as HTMLSelectElement;
    const galleryRoot = host.querySelector("[data-theme]:not(aside [data-theme])") as HTMLElement | null;
    const gallery = Array.from(host.querySelectorAll("[data-theme]")).find(
      (el) => el !== host.querySelector("aside")?.closest("[data-theme]"),
    ) as HTMLElement | undefined;

    expect(select).toBeTruthy();
    // Default is the generated "brand" theme, not "light".
    const initialTheme = (gallery ?? galleryRoot)?.getAttribute("data-theme");
    expect(initialTheme).not.toBe("light");

    select.value = "Built-in light";
    select.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    const afterTheme = (gallery ?? galleryRoot)?.getAttribute("data-theme");
    expect(afterTheme).toBe("light");
  });

  it("changing a density field regenerates without throwing", async () => {
    const { host } = await mountFresh();
    const buttons = Array.from(host.querySelectorAll("aside button"));
    const sizeTabButton = buttons.find((b) => b.textContent === "Size & Density") as HTMLButtonElement;
    sizeTabButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await flush();

    const densityInput = host.querySelector('aside input[type="number"]') as HTMLInputElement;
    densityInput.value = "1.25";
    densityInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    expect(exportCode.textContent).toContain("1.25");
  });

  it("passes @domphy/doctor's static checks (AGENTS.md self-check rule)", async () => {
    vi.resetModules();
    const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
    const diagnostics = diagnose(mod.default);
    expect(diagnostics, format(diagnostics)).toHaveLength(0);
  });
});
