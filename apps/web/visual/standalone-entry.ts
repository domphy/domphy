/**
 * Standalone visual catalog host — bypasses press islands so Playwright can
 * screenshot every [data-visual] cell without a full docs build.
 *
 * Query: ?catalog=patches|blocks|uioverlays|three|editor|chart  (default patches)
 *        &theme=dark|light        (default light)
 *        &only=<BlockDemoName>    (blocks/uioverlays: mount ONE demo — avoids
 *                                 "Too many active WebGL contexts" when
 *                                 70 chart blocks all mount at once)
 */
import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { themeApply } from "@domphy/theme";
import {
  visualCell,
  visualPage,
  visualSection,
} from "../docs/demos/visual/cell.js";
import "../site-theme.js";

const params = new URLSearchParams(location.search);
const catalogName = params.get("catalog") ?? "patches";
const theme = params.get("theme") === "dark" ? "dark" : "light";
const only = params.get("only"); // e.g. chartAreaDefault
// fit=1: mount the solo demo WITHOUT the catalog's min-width stage clamps so
// responsive specs can measure the block's own behavior at narrow viewports.
const fit = params.get("fit") === "1";
document.documentElement.setAttribute("data-theme", theme);

themeApply();

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

async function main(): Promise<void> {
  let tree: DomphyElement;
  if (catalogName === "uioverlays" && only) {
    // Single interactive @domphy/ui patch demo (ui-overlays.spec.ts).
    const safe = only.replace(/[^a-zA-Z0-9_-]/g, "");
    const { uiOverlayDemos } = await import(
      "../docs/demos/visual/ui-overlays-demos.js"
    );
    const demo = uiOverlayDemos[safe];
    if (!demo) throw new Error(`Unknown ui-overlay demo: ${safe}`);
    tree = visualPage(`UI ${safe}`, [
      visualCell(`ui-${safe}`, safe, demo(), {
        overflow: "visible",
        block: true,
      }),
    ]);
  } else if (catalogName === "three" && only) {
    // Single @domphy/three demo (three.spec.ts) — real WebGLRenderer, one
    // WebGL context per page (SwiftShader headless caps contexts hard).
    const safe = only.replace(/[^a-zA-Z0-9_-]/g, "");
    const { threeDemos } = await import("./three-demos.js");
    const demo = threeDemos[safe];
    if (!demo) throw new Error(`Unknown three demo: ${safe}`);
    tree = visualPage(`Three ${safe}`, [
      visualCell(`three-${safe}`, safe, demo(), {
        overflow: "visible",
        block: true,
      }),
    ]);
  } else if (catalogName === "editor" && only) {
    // Single @domphy/editor demo (editor.spec.ts) — the docs demos, mounted
    // one per page so typing/selection state never crosses tests.
    const safe = only.replace(/[^a-zA-Z0-9_-]/g, "");
    const demo = await import(`../docs/demos/editor/${safe}.ts`);
    const el = demo.default as DomphyElement;
    if (!el) throw new Error(`Unknown editor demo: ${safe}`);
    tree = visualPage(`Editor ${safe}`, [
      visualCell(`editor-${safe}`, safe, el, {
        overflow: "visible",
        block: true,
      }),
    ]);
  } else if (catalogName === "blocks" && only) {
    // Single-block page — one WebGL context max (full catalog exhausts GPU).
    const safe = only.replace(/[^a-zA-Z0-9_-]/g, "");
    const { blockDemoLoaders } = await import(
      "../docs/demos/visual/blocks-import-map.js"
    );
    const loader = blockDemoLoaders[safe];
    if (!loader) throw new Error(`Unknown block demo: ${safe}`);
    const demo = await loader();
    const el = demo.default as DomphyElement;
    if (!el) throw new Error(`Demo ${safe} has no default export`);
    // Solo page: do NOT clip with maxHeight — layout shells (login/dashboard)
    // and tall grids (bento) were false-broken under overflow:hidden crops.
    // Give layouts a desktop-width stage so 4-col KPI grids and sidebars fit.
    const isLayout = /^(sidebar|dashboard|Login|signup)/i.test(safe);
    const isChart = /^chart/i.test(safe);
    const isWide =
      /^(bentoGrid|marquee|hero|dock|safari|iphone|android|macbook)/i.test(
        safe,
      );
    const isBento = /^bentoGrid/i.test(safe);
    if (fit) {
      // Responsive-fit staging: a full-width cell rendered directly on the
      // page (no section grid track, no min-width clamps) so the block's own
      // responsive behavior is what gets measured.
      tree = visualPage(`Block ${safe}`, [
        visualCell(`block-${safe}`, safe, el, {
          overflow: "visible",
          block: true,
        }),
      ]);
    } else {
      const opts = isLayout
        ? {
            minWidth: "1280px",
            overflow: "visible" as const,
            block: true,
          }
        : isChart
          ? {
              minWidth: "480px",
              minHeight: "360px",
              overflow: "visible" as const,
              block: true,
            }
          : isBento
            ? {
                // ≥64em so mosaic column/row spans activate (see bentoGrid card CSS).
                minWidth: "1100px",
                overflow: "visible" as const,
                block: true,
              }
            : isWide
              ? {
                  minWidth: "720px",
                  overflow: "visible" as const,
                  block: true,
                }
              : { minWidth: "320px", overflow: "visible" as const };
      tree = visualPage(`Block ${safe}`, [
        visualSection("Solo", [visualCell(`block-${safe}`, safe, el, opts)]),
      ]);
    }
  } else if (catalogName === "chart" && only) {
    // Single @domphy/chart docs demo (chart.spec.ts) — one WebGL context per
    // page (SwiftShader headless caps contexts hard).
    const safe = only.replace(/[^a-zA-Z0-9_-]/g, "");
    const { chartDemoLoaders } = await import("./chart-demos.js");
    const loader = chartDemoLoaders[safe];
    if (!loader) throw new Error(`Unknown chart demo: ${safe}`);
    const demo = await loader();
    const el = demo.default as DomphyElement;
    if (!el) throw new Error(`Chart demo ${safe} has no default export`);
    tree = visualPage(`Chart ${safe}`, [
      visualCell(`chart-${safe}`, safe, el, {
        minWidth: "480px",
        minHeight: "420px",
        overflow: "visible",
        block: true,
      }),
    ]);
  } else if (catalogName === "blocks") {
    const mod = await import("../docs/demos/visual/blocks-catalog.js");
    tree = mod.default;
  } else {
    const mod = await import("../docs/demos/visual/patches-catalog.js");
    tree = mod.default;
  }
  if (!tree) throw new Error(`Catalog "${catalogName}" has no default export`);
  new ElementNode(tree).render(root);
  document.documentElement.setAttribute("data-visual-ready", "1");
}

main().catch((error) => {
  console.error(error);
  document.body.textContent = String(error);
});
