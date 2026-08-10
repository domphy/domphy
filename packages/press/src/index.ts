export { buildSite, RUNTIME_SCRIPT } from "./build.js";
export type { SiteConfig, UserConfig } from "./config.js";
export { defineConfig } from "./config.js";
export type { FenceMeta } from "./highlight.js";
export { createHighlighter, parseFenceInfo, renderFence } from "./highlight.js";
export type { LayoutContext } from "./layout.js";
export { homeShell, pageShell } from "./layout.js";
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
// Markdown API (folded in from the former @domphy/markdown package). Main
// entry only — the browser entrypoint stays free of the remark pipeline.
// `TocEntry` is shared with ./types.js and re-exported from there.
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
export { renderDoc } from "./pipeline.js";
export {
  discoverPages,
  flattenSidebar,
  outFileForRoute,
  prevNextForRoute,
  routeForFile,
  sidebarForRoute,
  withBase,
} from "./routes.js";
export type { SearchResult, SearchWidgetOptions } from "./search.js";
export {
  buildSearchIndex,
  mountSearch,
  queryIndex,
  searchWidget,
} from "./search.js";
export { startDevServer, startServer } from "./serve.js";
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
