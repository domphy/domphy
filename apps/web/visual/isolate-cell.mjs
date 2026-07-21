/**
 * Shared isolation for catalog screenshots.
 * Sticky/fixed chrome from OTHER cells (sidebar demos) sticks to the viewport
 * and pollutes later cell crops — hide every other [data-visual] and demote
 * sticky/fixed outside the current cell before capture.
 */
export async function isolateVisualCell(page, currentId) {
  await page.evaluate((id) => {
    for (const el of document.querySelectorAll("[data-visual]")) {
      const match = el.getAttribute("data-visual") === id;
      if (match) {
        el.style.removeProperty("display");
        el.style.removeProperty("visibility");
        el.style.removeProperty("pointer-events");
        el.removeAttribute("data-visual-isolated-off");
      } else {
        el.setAttribute("data-visual-isolated-off", "1");
        el.style.setProperty("display", "none", "important");
      }
    }
    // Demote sticky/fixed that still escape (portals, leftovers).
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(`[data-visual="${id}"]`)) continue;
      if (el.closest("[data-visual-page]")) {
        // keep page chrome labels? hide only sticky/fixed
      }
      const pos = getComputedStyle(el).position;
      if (pos === "sticky" || pos === "fixed") {
        // Don't hide the page root; only unstick.
        if (el.hasAttribute("data-visual")) continue;
        el.style.setProperty("position", "static", "important");
        el.style.setProperty("top", "auto", "important");
        el.style.setProperty("left", "auto", "important");
        el.style.setProperty("right", "auto", "important");
        el.style.setProperty("bottom", "auto", "important");
        el.style.setProperty("z-index", "auto", "important");
      }
    }
  }, currentId);
}

export async function freezeMotion(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        animation-duration: 0s !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}
