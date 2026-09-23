// Real-browser demo for the e2e lane (playwright.config.ts). Mounts, for
// every theme x dataTone surface x tone x color role, a leaf node painted by
// themeColor() — the same matrix packages/theme/tests/theme-api.test.ts
// verifies off-DOM (resolveToneStep() vs themeColor()'s var(--…) reference) —
// plus a set of textToneOn()/textToneOnRampEdge() fill+label pairs, so the
// e2e specs can read real getComputedStyle() colors back from an actual
// Chromium CSS cascade, which jsdom (the unit tests) never runs at all.
import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import {
  AMBIENTS,
  COLORS,
  FILLS,
  SURFACES,
  THEMES,
  TONES,
} from "./demo-matrix.js";
import {
  textToneOn,
  textToneOnRampEdge,
  themeApply,
  themeColor,
} from "./src/index.js";
import type { ElementTone } from "./src/tone.js";

themeApply();

function mount(hostId: string, element: DomphyElement): void {
  const host = document.getElementById(hostId);
  if (!host) throw new Error(`Demo host #${hostId} not found`);
  new ElementNode(element).render(host);
}

const matrixCells: DomphyElement[] = [];
for (const theme of THEMES) {
  const surfaceCells: DomphyElement[] = [];
  for (const surface of SURFACES) {
    const toneCells: DomphyElement[] = [];
    for (const tone of TONES) {
      for (const color of COLORS) {
        toneCells.push({
          div: "",
          class: "cell",
          dataCell: `${theme}|${surface}|${tone}|${color}`,
          style: {
            backgroundColor: (l) => themeColor(l, tone, color),
          },
        });
      }
    }
    surfaceCells.push({ div: toneCells, dataTone: surface });
  }
  matrixCells.push({ div: surfaceCells, dataTheme: theme });
}
mount("matrix-root", { div: matrixCells });

const contrastCells: DomphyElement[] = [];
for (const theme of THEMES) {
  const ambientCells: DomphyElement[] = [];
  for (const ambient of AMBIENTS) {
    const fillCells: DomphyElement[] = [];
    for (const fill of FILLS) {
      const fillTone = `shift-${fill}` as ElementTone;
      for (const color of COLORS) {
        fillCells.push({
          div: "",
          class: "cell",
          dataCell: `${theme}|${ambient}|${fill}|${color}|textToneOn`,
          style: {
            backgroundColor: (l) => themeColor(l, fillTone, color),
            color: (l) => themeColor(l, textToneOn(fill, l), color),
          },
        });
        fillCells.push({
          div: "",
          class: "cell",
          dataCell: `${theme}|${ambient}|${fill}|${color}|textToneOnRampEdge`,
          style: {
            backgroundColor: (l) => themeColor(l, fillTone, color),
            color: (l) =>
              themeColor(l, textToneOnRampEdge(fillTone as string, l), color),
          },
        });
      }
    }
    ambientCells.push({ div: fillCells, dataTone: ambient });
  }
  contrastCells.push({ div: ambientCells, dataTheme: theme });
}
mount("contrast-root", { div: contrastCells });
