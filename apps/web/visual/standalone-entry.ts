/**
 * Standalone visual catalog host — bypasses press islands so Playwright can
 * screenshot every [data-visual] cell without a full docs build.
 *
 * Query: ?catalog=patches|blocks  (default patches)
 *        &theme=dark|light        (default light)
 */
import { ElementNode } from "@domphy/core";
import { themeApply } from "@domphy/theme";
import "../site-theme.js";

const params = new URLSearchParams(location.search);
const catalogName = params.get("catalog") ?? "patches";
const theme = params.get("theme") === "dark" ? "dark" : "light";
document.documentElement.setAttribute("data-theme", theme);

themeApply();

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

async function main(): Promise<void> {
  const mod =
    catalogName === "blocks"
      ? await import("../docs/demos/visual/blocks-catalog.js")
      : await import("../docs/demos/visual/patches-catalog.js");
  const tree = mod.default;
  if (!tree) throw new Error(`Catalog "${catalogName}" has no default export`);
  new ElementNode(tree).render(root);
  document.documentElement.setAttribute("data-visual-ready", "1");
}

main().catch((error) => {
  console.error(error);
  document.body.textContent = String(error);
});
