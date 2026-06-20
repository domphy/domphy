# Showcases

Real-world apps built with Domphy. Every interface below runs on `@domphy/core`, `@domphy/theme`, and `@domphy/ui` — no React, no Vue, no virtual DOM.

---

## 3dshouse.com — Design Tools

[3dshouse.com](https://3dshouse.com) delivers design tools for architects, 3D artists, and fabricators. All client-side interfaces ship with Domphy.

### Decimify

**3D mesh simplification** — drag a slider to reduce polygon count. One base mesh plus a reversible vertex-split stream; no snapshot pyramid, no quality cliff.

<img src="/figures/showcases/decimify.png" alt="Decimify mesh simplification web app" style="border-radius:8px;width:100%;max-width:800px;display:block;margin:1.5rem 0" />

| | |
|---|---|
| **Engine** | Rust / WASM (Garland–Heckbert QEM + Hoppe progressive mesh) |
| **Renderer** | Three.js |
| **UI** | `@domphy/core`, `@domphy/ui`, `@domphy/theme` |
| **Free tier** | Up to 30 % reduction |
| **Link** | [3dshouse.com/decimify](https://3dshouse.com/decimify/) |

---

### Tracepen

**Raster-to-vector** — upload PNG/JPG, export clean SVG/DXF with per-color layer support. Free tier: 2 colors. Pro: unlimited.

<img src="/figures/showcases/tracepen.png" alt="Tracepen image to vector web app" style="border-radius:8px;width:100%;max-width:800px;display:block;margin:1.5rem 0" />

| | |
|---|---|
| **Engine** | TypeScript / WASM (Wu quantize → Potrace contours) |
| **UI** | `@domphy/core`, `@domphy/ui`, `@domphy/theme` |
| **Export** | SVG, PNG, DXF Lines, DXF Hatch, DXF Faces |
| **Also ships as** | SketchUp plugin, Blender add-on |
| **Link** | [3dshouse.com/tracepen](https://3dshouse.com/tracepen) |

<img src="/figures/showcases/tracepen-sketchup.png" alt="Tracepen SketchUp plugin" style="border-radius:8px;width:100%;max-width:800px;display:block;margin:1.5rem 0" />

---

### Parashape

**Parametric 3D modeling** — web-based builder for SketchUp Dynamic Components. Browse, configure, and save parametric models directly in the browser or inside SketchUp.

<img src="/figures/showcases/parashape.png" alt="Parashape parametric modeling builder" style="border-radius:8px;width:100%;max-width:800px;display:block;margin:1.5rem 0" />

| | |
|---|---|
| **Renderer** | Three.js |
| **UI** | `@domphy/core`, `@domphy/ui`, `@domphy/theme` |
| **Storage** | Cloudflare R2 |
| **Auth** | 3dshouse account |
| **Link** | [3dshouse.com/parashape](https://3dshouse.com/parashape) |

---

### BevelUp

**Edge fillet for SketchUp** — round corners, chamfer edges, free forever. HtmlDialog UI built with Domphy and served inside the SketchUp plugin host.

<img src="/figures/showcases/bevelup.png" alt="BevelUp edge fillet SketchUp plugin" style="border-radius:8px;width:100%;max-width:800px;display:block;margin:1.5rem 0" />

| | |
|---|---|
| **Host** | SketchUp 2022+ (HtmlDialog) |
| **UI** | `@domphy/core`, `@domphy/ui`, `@domphy/theme` |
| **Price** | Free |
| **Link** | [3dshouse.com/bevelup](https://3dshouse.com/bevelup) |

---

### Metasheet

**Metadata management for Revit** — bulk find & replace, prefix/suffix, and export metadata across an entire Revit project. WebView2 dialog built with Domphy.

| | |
|---|---|
| **Host** | Revit 2021–2026 (WebView2 addin) |
| **UI** | `@domphy/core`, `@domphy/ui`, `@domphy/theme` |
| **Price** | Free, all features |
| **Link** | [3dshouse.com/metasheet](https://3dshouse.com/metasheet) |

---

## Domphy Docs

This documentation site is itself a showcase — built entirely with Domphy packages, with no third-party UI framework.

| | |
|---|---|
| **Markdown → Domphy** | `@domphy/markdown` |
| **Code editor islands** | `@domphy/core` + CodeMirror |
| **Live demos** | `@domphy/core` client-side hydration |
| **Search** | Custom Domphy-rendered search overlay |
| **SSR** | `ElementNode.generateHTML()` + `ElementNode.mount()` |
| **Link** | [domphy.com](https://domphy.com) |

---

## Add Your Project

Built something with Domphy? Open a pull request on [GitHub](https://github.com/domphy/domphy) and add it here.
