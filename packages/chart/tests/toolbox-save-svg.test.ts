// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ToolboxHost } from "../src/overlay/toolbox.ts";
import { renderToolbox } from "../src/overlay/toolbox.ts";
import type { ToolboxOption } from "../src/types.ts";

// Truth source: an SVG document is well-formed only if it parses as XML and
// every referenced resource resolves — this build's WebGL-rasterized series
// (bar/line/scatter/…) have no vector form to re-derive after luma.gl has
// painted them, but the axes/legend/labels this package draws as SVG DO, so
// `type: "svg"` embeds the WebGL canvas as one raster <image> inside a real
// SVG document alongside those vector layers, instead of silently falling
// back to a PNG (the old behavior, kept for `type: "png"`/`"jpg"`).
function makeHost(): { host: ToolboxHost } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 80;
  canvas.toDataURL = vi.fn(() => "data:image/png;base64,FAKECANVASDATA");

  const backgroundSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("class", "bg-marker");
  backgroundSvg.appendChild(bgRect);

  const overlaySvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  ) as SVGSVGElement;
  const overlayText = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "text",
  );
  overlayText.setAttribute("class", "overlay-marker");
  overlaySvg.appendChild(overlayText);

  const host: ToolboxHost = {
    container,
    canvas,
    svgLayers: [backgroundSvg, overlaySvg],
    width: 100,
    height: 80,
    getOriginalOption: () => ({}),
    getCurrentOption: () => ({}),
    applyOption: () => {},
    restore: () => {},
    getPlotRect: () => null,
    setZoomWindow: () => {},
  };
  return { host };
}

describe("toolbox saveAsImage type:'svg'", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("downloads a real .svg document embedding the WebGL canvas as a raster <image>, not a PNG fallback", async () => {
    const { host } = makeHost();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const option: ToolboxOption = {
      feature: { saveAsImage: { type: "svg" } },
    };
    const cleanup = renderToolbox(option, host);

    let capturedBlob: Blob | null = null;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:fake";
    });
    URL.revokeObjectURL = vi.fn();

    const button = host.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save as Image"]',
    );
    button?.click();

    expect(capturedBlob).not.toBeNull();
    expect(capturedBlob?.type).toContain("image/svg+xml");
    const text = await capturedBlob?.text();
    expect(text).toContain("<svg");
    expect(text).toContain("bg-marker");
    expect(text).toContain("overlay-marker");
    expect(text).toContain("data:image/png;base64,FAKECANVASDATA");
    // A standalone SVG document that uses xlink:href must declare the xlink
    // namespace itself (XML Namespaces spec) — otherwise a spec-following
    // XML parser rejects `xlink:href` as an unbound prefix. Both the bare
    // `href` (SVG2) and `xlink:href` (older/standalone viewers) point at the
    // same raster so either form alone is enough to render the image.
    expect(text).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(text).toMatch(/href="data:image\/png;base64,FAKECANVASDATA"/);
    // Paint order: vector background layer, then the raster canvas image,
    // then the vector overlay layer on top.
    const bgIndex = text?.indexOf("bg-marker") ?? -1;
    const imageIndex = text?.indexOf("FAKECANVASDATA") ?? -1;
    const overlayIndex = text?.indexOf("overlay-marker") ?? -1;
    expect(bgIndex).toBeGreaterThan(-1);
    expect(bgIndex).toBeLessThan(imageIndex);
    expect(imageIndex).toBeLessThan(overlayIndex);
    // The old "PNG is exported instead" fallback warning must not fire.
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes("PNG is exported")),
    ).toBe(false);

    cleanup();
    warn.mockRestore();
  });

  it("type:'png' (default) is unaffected — still composites via canvas, no svg document produced", async () => {
    const { host } = makeHost();
    const option: ToolboxOption = { feature: { saveAsImage: {} } };
    const cleanup = renderToolbox(option, host);

    // jsdom has no real 2d canvas context (getContext returns null), so the
    // PNG path throws inside its own try/catch and warns instead of
    // downloading — this only asserts it took the PNG branch, not the new
    // svg one, since a real 2d encode is exercised for real in Chromium.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let createdBlobUrl = false;
    URL.createObjectURL = vi.fn(() => {
      createdBlobUrl = true;
      return "blob:fake";
    });

    const button = host.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Save as Image"]',
    );
    button?.click();
    await Promise.resolve();

    expect(createdBlobUrl).toBe(false);
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes("saveAsImage failed")),
    ).toBe(true);

    cleanup();
    warn.mockRestore();
  });
});
