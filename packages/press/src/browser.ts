// Browser-safe entrypoint — layout/sidebar/theme only. No Node.js built-ins
// (no fs/child_process/path). Use this in Vite/browser bundles.
// The main "." entrypoint includes buildSite/startServer which require Node.js.
export type { SiteConfig, UserConfig } from "./config.js";
export { defineConfig } from "./config.js";
export type { LayoutContext } from "./layout.js";
export { homeShell, pageShell } from "./layout.js";
export {
    flattenSidebar,
    prevNextForRoute,
    sidebarForRoute,
} from "./routes-browser.js";
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
