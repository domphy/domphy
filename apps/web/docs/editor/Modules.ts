import * as domphyApp from "@domphy/app";
import * as domphyBlocks from "@domphy/blocks";
import * as domphyChart from "@domphy/chart";
import * as domphyCore from "@domphy/core";
import * as domphyDnd from "@domphy/dnd";
// Named imports only: the package index also exports `auditOutput` (Layer 4),
// which dynamic-imports the Node-only htmlhint/stylelint linters. esbuild
// resolves literal dynamic imports at bundle time, so pulling the namespace
// would force those into the browser bundle.
import { diagnose, fix, format, validate } from "@domphy/doctor";
import * as domphyEditor from "@domphy/editor";
import * as domphyEditorDomphy from "@domphy/editor/domphy";
import * as domphyFloating from "@domphy/floating";
import * as domphyForm from "@domphy/form/domphy";
import * as domphyI18n from "@domphy/i18n";
import * as domphyMarkdown from "@domphy/markdown";
// Browser-safe subpath: the main `@domphy/mermaid` entry statically imports
// node:fs/node:crypto (build-time renderer), which cannot bundle for the
// browser. The playground only ever renders client-side anyway.
import * as domphyMermaid from "@domphy/mermaid/client";
import * as domphyPalette from "@domphy/palette";
import * as domphyQuery from "@domphy/query";
import * as domphyQueryDomphy from "@domphy/query/domphy";
import * as domphyRouter from "@domphy/router";
import * as domphyTable from "@domphy/table";
import * as domphyTableDomphy from "@domphy/table/domphy";
import * as domphyTheme from "@domphy/theme";
import * as domphyThree from "@domphy/three";
import * as domphyUI from "@domphy/ui";
import * as domphyVirtual from "@domphy/virtual/domphy";
import * as queryCore from "@tanstack/query-core";
import page from "page";
import Sortable from "sortablejs";
import * as three from "three";
import * as threeOrbitControls from "three/addons/controls/OrbitControls.js";
import * as threeGLTFLoader from "three/addons/loaders/GLTFLoader.js";
import * as threeEffectComposer from "three/addons/postprocessing/EffectComposer.js";
import * as threeRenderPass from "three/addons/postprocessing/RenderPass.js";
import * as threeUnrealBloomPass from "three/addons/postprocessing/UnrealBloomPass.js";
import * as zod from "zod";
// GeoJSON asset for the geo/map chart demos ("world" is not built into
// @domphy/chart — demos must registerMap() it, see docs/chart/geo.md).
// Converted from world-atlas@2 countries-110m (TopoJSON → GeoJSON, 2-decimal
// coordinates); excluded from biome like bench/generated.json.
import worldGeoJSON from "./world.geo.json";

const moduleMap: Record<string, unknown> = {
  "@domphy/blocks": domphyBlocks,
  "@domphy/chart": domphyChart,
  "@domphy/core": domphyCore,
  "@domphy/ui": domphyUI,
  "@domphy/theme": domphyTheme,
  "@domphy/query": domphyQuery,
  "@domphy/query/domphy": domphyQueryDomphy,
  "@domphy/router": domphyRouter,
  "@domphy/table": domphyTable,
  "@domphy/table/domphy": domphyTableDomphy,
  "@domphy/app": domphyApp,
  "@domphy/i18n": domphyI18n,
  "@domphy/dnd": domphyDnd,
  "@domphy/doctor": { diagnose, fix, format, validate },
  "@domphy/editor": domphyEditor,
  "@domphy/editor/domphy": domphyEditorDomphy,
  "@domphy/floating": domphyFloating,
  "@domphy/form/domphy": domphyForm,
  "@domphy/markdown": domphyMarkdown,
  "@domphy/mermaid": domphyMermaid,
  "@domphy/mermaid/client": domphyMermaid,
  "@domphy/palette": domphyPalette,
  "@domphy/virtual/domphy": domphyVirtual,
  "@domphy/three": domphyThree,
  "@tanstack/query-core": queryCore,
  page,
  sortablejs: Sortable,
  three,
  "three/addons/controls/OrbitControls.js": threeOrbitControls,
  "three/addons/loaders/GLTFLoader.js": threeGLTFLoader,
  "three/addons/postprocessing/EffectComposer.js": threeEffectComposer,
  "three/addons/postprocessing/RenderPass.js": threeRenderPass,
  "three/addons/postprocessing/UnrealBloomPass.js": threeUnrealBloomPass,
  "geo/world.json": worldGeoJSON,
  zod,
};

export { moduleMap };
