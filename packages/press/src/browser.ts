// Browser-safe entrypoint — layout/sidebar/theme only. No Node.js built-ins
// (no fs/child_process/path). Use this in Vite/browser bundles.
// The main "." entrypoint includes buildSite/startServer which require Node.js.
export type { SiteConfig, UserConfig } from "./config.js";
export { defineConfig } from "./config.js";
export type { FeatureConfig, HeroConfig, LayoutContext } from "./layout.js";
export { homeShell, pageShell } from "./layout.js";
// Markdown API — the whole remark pipeline is browser-safe. `createMarkdown`
// here cannot resolve the optional `remark-math` peer (`math: true` throws);
// pass remark-math via `plugins` instead, or use the Node entry.
// `TocEntry` is shared with ./types.js and re-exported from there.
//
// This file is one bundled ESM output (dist/browser.js, tsup, no
// code-splitting) even though it re-exports both the small layout API and
// the much larger remark/unified markdown pipeline. Measured with a real
// Vite production build (rollup, sideEffects:false from this package's
// package.json) importing ONLY `pageShell` from "@domphy/press/browser":
// the output bundle has zero occurrences of "unified"/"remark*"/"mdast*"/
// "micromark*"/"createMarkdown"/"parseMarkdown" — Rollup's tree-shaking
// drops the whole markdown graph. A sibling build that also imports
// `createMarkdown` pulls that graph back in (118.7 KB -> 750.15 KB
// unminified). No entry split is needed: the single-file bundle does not
// defeat tree-shaking here, because everything downstream of the unused
// exports (buildProcessor et al. in ./markdown/index.ts) is plain,
// side-effect-free functions never called from module scope.
export type {
  AnchorSlugify,
  CreateMarkdownOptions,
  FrontmatterSplit,
  Highlight,
  MarkdownInstance,
  MdastWalkOptions,
  ParseOptions,
  ParseResult,
  RemarkPlugin,
  WalkHelper,
} from "./markdown/index.js";
export {
  createMarkdown,
  createUniqueSlugger,
  defaultSlugify,
  markdownToDomphy,
  parseMarkdown,
  splitFrontmatter,
  transformOutsideCodeBlocks,
  walkMdast,
} from "./markdown/index.js";
export {
  flattenSidebar,
  prevNextForRoute,
  sidebarForRoute,
  withBase,
} from "./routes-browser.js";
export { mountSearch, queryIndex, searchWidget } from "./search.js";
export { pressCSS } from "./theme.js";
export type {
  DomphyElement,
  EditLink,
  IslandRef,
  LayoutSlots,
  LocaleConfig,
  NavItem,
  PageEntry,
  RenderDocOptions,
  RenderedDoc,
  SearchDocument,
  SidebarItem,
  SocialLink,
  ThemeConfig,
  TocEntry,
} from "./types.js";
