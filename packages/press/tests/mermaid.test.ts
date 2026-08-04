import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildSite, mermaidSanitizeSource } from "../src/build.ts";
import { defineConfig } from "../src/config.ts";

// Evaluate the exact inline sanitizer source the head script embeds, so the
// payload-stripping assertions below test what browsers actually run.
const sanitize = new Function(
  `${mermaidSanitizeSource}; return sanitize;`,
)() as (html: string) => string;

describe("mermaid inline SVG sanitizer", () => {
  it("strips <script> elements but keeps legitimate SVG content", () => {
    const out = sanitize("<svg><script>alert(1)</script><text>hi</text></svg>");
    expect(out).not.toContain("script");
    expect(out).toContain("<text>hi</text>");
  });

  it("neutralizes an unclosed <script> tag", () => {
    const out = sanitize("<svg><script>alert(1)");
    expect(out).not.toContain("<script");
  });

  it("strips on* handler attributes, incl. the <svg/onload=…> form", () => {
    expect(sanitize("<svg onload=alert(1)></svg>")).not.toContain("onload");
    expect(sanitize("<svg/onload=alert(1)>")).not.toContain("onload");
    expect(sanitize('<svg ONCLICK="alert(1)"></svg>')).not.toContain("ONCLICK");
  });

  it("strips iframe srcdoc documents", () => {
    expect(sanitize('<iframe srcdoc="<p>x</p>"></iframe>')).not.toContain(
      "srcdoc",
    );
  });

  it("neutralizes script-capable URL schemes, incl. entity obfuscation", () => {
    expect(sanitize('<a href="javascript:alert(1)">x</a>')).toContain(
      'href="#"',
    );
    expect(sanitize('<a href="&#106;avascript:alert(1)">x</a>')).toContain(
      'href="#"',
    );
    expect(sanitize('<a href="java&Tab;script:alert(1)">x</a>')).toContain(
      'href="#"',
    );
    expect(
      sanitize('<object data="data:text/html,<p>x</p>"></object>'),
    ).toContain('data="#"');
  });

  it("keeps legitimate URLs untouched", () => {
    const svg =
      '<image href="data:image/png;base64,iVBORw0KGgo="></image><a href="https://example.com">x</a>';
    expect(sanitize(svg)).toBe(svg);
  });
});

describe("mermaid head script in built site", () => {
  let srcDir: string;
  let outDir: string;

  afterEach(() => {
    rmSync(srcDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("renders mermaid fences as .dp-mermaid blocks and ships the hardened loader", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-mermaid-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-mermaid-out-"));
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(
      join(srcDir, "index.md"),
      "# Home\n\n```mermaid\ngraph TD; A-->B;\n```\n",
    );
    const config = defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
      themeConfig: { mermaid: true },
    });

    await buildSite({ config, srcDir, outDir });

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    // The fence still renders to the client-rendered mermaid block…
    expect(html).toContain('class="dp-mermaid language-mermaid"');
    // …and the inline loader is hardened: strict pin, sanitizer, theme flips.
    expect(html).toContain("securityLevel:'strict'");
    expect(html).toContain("function sanitize(");
    expect(html).toContain("innerHTML=svg");
    expect(html).toContain("MutationObserver");
    expect(html).toContain("attributeFilter:['data-theme']");
  }, 30_000);

  it("omits the mermaid loader when themeConfig.mermaid is off", async () => {
    srcDir = mkdtempSync(join(tmpdir(), "press-nomermaid-src-"));
    outDir = mkdtempSync(join(tmpdir(), "press-nomermaid-out-"));
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "index.md"), "# Home\n");
    const config = defineConfig({
      title: "Test Site",
      description: "",
      hostname: "https://example.com",
      srcDir,
      outDir,
    });

    await buildSite({ config, srcDir, outDir });

    const html = readFileSync(join(outDir, "index.html"), "utf8");
    // No mermaid fence was rendered and no loader script was emitted (the
    // baked CSS legitimately still contains .dp-mermaid style rules).
    expect(html).not.toContain('class="dp-mermaid');
    expect(html).not.toContain("mermaid.esm.min.mjs");
    expect(html).not.toContain("function sanitize(");
  }, 30_000);
});
