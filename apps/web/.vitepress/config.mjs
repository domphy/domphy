import { defineConfig } from "vitepress";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import include from "markdown-it-include";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  base: "/",
  sitemap: {
    hostname: "https://www.domphy.com",
  },
  transformPageData(pageData) {
    const noAside = ["/patches/"];
    const isMatch = noAside.some((path) => pageData.relativePath.includes(path));

    if (isMatch) {
      pageData.frontmatter.aside = false;
    }
  },
  markdown: {
    config: (md) => {
      md.use(include, {
        root: resolve(__dirname, "../docs"),
      });
    },
  },
  vite: {
    server: {
      fs: {
        allow: ["..", "../..", "../../.."],
      },
    },
    resolve: {
      alias: [
        {
          find: "@domphy/core",
          replacement: resolve(__dirname, "../../../packages/core/src"),
        },
        {
          find: "@domphy/theme",
          replacement: resolve(__dirname, "../../../packages/theme/src"),
        },
        {
          find: "@domphy/ui",
          replacement: resolve(__dirname, "../../../packages/ui/src"),
        },
      ],
    },
  },
  title: "Domphy",
  description: "Patch-based UI for native elements.",
  head: [
    ["link", { rel: "icon", href: "/favicon.svg" }],
    [
      "script",
      {
        async: "",
        src: "https://www.googletagmanager.com/gtag/js?id=G-NKPX3DHXWE",
      },
    ],
    [
      "script",
      {},
      `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-NKPX3DHXWE');`,
    ],
  ],
  themeConfig: {
    search: { provider: "local" },
    nav: [
      { text: "Home", link: "/" },
      { text: "Quickstart", link: "/docs/quickstart" },
      { text: "Docs", link: "/docs/" },
      { text: "Core", link: "/docs/core/" },
      { text: "Theme", link: "/docs/theme/" },
      { text: "UI", link: "/docs/ui/" },
      { text: "Integrations", link: "/docs/integrations/" },
      { text: "Research", link: "/docs/research/" },
      { text: "Playground", link: "/docs/playground" },
    ],
    sidebar: {
      "/docs/core/": [
        { text: "Overview", link: "/docs/core/" },
        { text: "Syntax", link: "/docs/core/syntax" },
        { text: "Reactivity", link: "/docs/core/reactivity" },
        { text: "Lifecycle", link: "/docs/core/lifecycle" },
        { text: "SSR", link: "/docs/core/ssr" },
        { text: "Portal", link: "/docs/core/portal" },
        {
          text: "Patterns",
          items: [
            { text: "Insert Content", link: "/docs/core/patterns/insert-content" },
          ],
        },
        {
          text: "API Reference",
          items: [
            { text: "ElementNode", link: "/docs/core/api/element-node" },
            { text: "ElementList", link: "/docs/core/api/element-list" },
            { text: "AttributeList", link: "/docs/core/api/attribute-list" },
            { text: "TextNode", link: "/docs/core/api/text-node" },
            { text: "State", link: "/docs/core/api/state" },
            { text: "ListState", link: "/docs/core/api/list-state" },
            { text: "Notifier", link: "/docs/core/api/notifier" },
            { text: "Utilities", link: "/docs/core/api/utilities" },
          ],
        },
      ],
      "/docs/theme/": [
        { text: "Overview", link: "/docs/theme/" },
        { text: "Setup", link: "/docs/theme/setup" },
        { text: "Palette", link: "/docs/theme/palette" },
        { text: "API", link: "/docs/theme/api" },
        {
          text: "Theory",
          items: [
            { text: "Tone", link: "/docs/theme/tone" },
            { text: "Size", link: "/docs/theme/size" },
          ],
        },
      ],
      "/docs/ui/": [
        { text: "Overview", link: "/docs/ui" },
        { text: "Color And Tone", link: "/docs/ui/color" },
        { text: "Dimension", link: "/docs/ui/dimension" },
        { text: "Customization", link: "/docs/ui/customization" },
        { text: "Creation", link: "/docs/ui/creation" },
        {
          text: "Patches",
          items: [
            { text: "Abbreviation", link: "/docs/ui/patches/abbreviation" },
            { text: "Alert", link: "/docs/ui/patches/alert" },
            { text: "Avatar", link: "/docs/ui/patches/avatar" },
            { text: "Badge", link: "/docs/ui/patches/badge" },
            { text: "Blockquote", link: "/docs/ui/patches/blockquote" },
            { text: "Breadcrumb", link: "/docs/ui/patches/breadcrumb" },
            { text: "Button", link: "/docs/ui/patches/button" },
            { text: "Button Switch", link: "/docs/ui/patches/button-switch" },
            { text: "Card", link: "/docs/ui/patches/card" },
            { text: "Code", link: "/docs/ui/patches/code" },
            { text: "Combobox", link: "/docs/ui/patches/combobox" },
            { text: "Command", link: "/docs/ui/patches/command" },
            { text: "Description List", link: "/docs/ui/patches/description-list" },
            { text: "Details", link: "/docs/ui/patches/details" },
            { text: "Dialog", link: "/docs/ui/patches/dialog" },
            { text: "Divider", link: "/docs/ui/patches/divider" },
            { text: "Drawer", link: "/docs/ui/patches/drawer" },
            { text: "Emphasis", link: "/docs/ui/patches/emphasis" },
            { text: "Figure", link: "/docs/ui/patches/figure" },
            { text: "Form", link: "/docs/ui/patches/form" },
            { text: "Form Group", link: "/docs/ui/patches/form-group" },
            { text: "Heading", link: "/docs/ui/patches/heading" },
            { text: "Horizontal Rule", link: "/docs/ui/patches/horizontal-rule" },
            { text: "Icon", link: "/docs/ui/patches/icon" },
            { text: "Image", link: "/docs/ui/patches/image" },
            { text: "Input Checkbox", link: "/docs/ui/patches/input-checkbox" },
            { text: "Input Color", link: "/docs/ui/patches/input-color" },
            { text: "Input Date Time", link: "/docs/ui/patches/input-date-time" },
            { text: "Input File", link: "/docs/ui/patches/input-file" },
            { text: "Input Number", link: "/docs/ui/patches/input-number" },
            { text: "Input OTP", link: "/docs/ui/patches/input-otp" },
            { text: "Input Radio", link: "/docs/ui/patches/input-radio" },
            { text: "Input Range", link: "/docs/ui/patches/input-range" },
            { text: "Input Search", link: "/docs/ui/patches/input-search" },
            { text: "Input Switch", link: "/docs/ui/patches/input-switch" },
            { text: "Input Text", link: "/docs/ui/patches/input-text" },
            { text: "Keyboard", link: "/docs/ui/patches/keyboard" },
            { text: "Label", link: "/docs/ui/patches/label" },
            { text: "Link", link: "/docs/ui/patches/link" },
            { text: "Mark", link: "/docs/ui/patches/mark" },
            { text: "Menu", link: "/docs/ui/patches/menu" },
            { text: "Ordered List", link: "/docs/ui/patches/ordered-list" },
            { text: "Pagination", link: "/docs/ui/patches/pagination" },
            { text: "Paragraph", link: "/docs/ui/patches/paragraph" },
            { text: "Popover", link: "/docs/ui/patches/popover" },
            { text: "Popover Arrow", link: "/docs/ui/patches/popover-arrow" },
            { text: "Preformated", link: "/docs/ui/patches/preformated" },
            { text: "Progress", link: "/docs/ui/patches/progress" },
            { text: "Select", link: "/docs/ui/patches/select" },
            { text: "Select Box", link: "/docs/ui/patches/select-box" },
            { text: "Select List", link: "/docs/ui/patches/select-list" },
            { text: "Skeleton", link: "/docs/ui/patches/skeleton" },
            { text: "Small", link: "/docs/ui/patches/small" },
            { text: "Spinner", link: "/docs/ui/patches/spinner" },
            { text: "Splitter", link: "/docs/ui/patches/splitter" },
            { text: "Strong", link: "/docs/ui/patches/strong" },
            { text: "Subscript", link: "/docs/ui/patches/subscript" },
            { text: "Superscript", link: "/docs/ui/patches/superscript" },
            { text: "Table", link: "/docs/ui/patches/table" },
            { text: "Tabs", link: "/docs/ui/patches/tabs" },
            { text: "Tag", link: "/docs/ui/patches/tag" },
            { text: "Textarea", link: "/docs/ui/patches/textarea" },
            { text: "Toast", link: "/docs/ui/patches/toast" },
            { text: "Toggle", link: "/docs/ui/patches/toggle" },
            { text: "Tooltip", link: "/docs/ui/patches/tooltip" },
            { text: "TransitionGroup", link: "/docs/ui/patches/transition-group" },
            { text: "Unordered List", link: "/docs/ui/patches/unordered-list" },
          ],
        },
        {
          text: "Recipes",
          items: [
            { text: "Alert Dialog", link: "/docs/ui/recipes/alertDialog" },
            { text: "Collapsible", link: "/docs/ui/recipes/collapsible" },
            { text: "Context Menu", link: "/docs/ui/recipes/contextMenu" },
            { text: "Hover Card", link: "/docs/ui/recipes/hoverCard" },
            { text: "Menubar", link: "/docs/ui/recipes/menuBar" },
          ],
        },
      ],
      "/docs/integrations/": [
        { text: "Guide", link: "/docs/integrations/" },
        {
          text: "Example",
          items: [
            { text: "i18next", link: "/docs/integrations/i18next" },
            { text: "TanStack Query", link: "/docs/integrations/tanstack-query" },
            { text: "SortableJS", link: "/docs/integrations/sortablejs" },
            { text: "Zod", link: "/docs/integrations/zod" },
            { text: "page.js", link: "/docs/integrations/pagejs" },
          ],
        },
      ],
      "/docs/research/": [
        { text: "Research", link: "/docs/research/" },
      ],
      "/docs/": [
        { text: "Overview", link: "/docs/" },
        { text: "Quickstart", link: "/docs/quickstart" },
        { text: "Core", link: "/docs/core/" },
        { text: "Theme", link: "/docs/theme/" },
        { text: "UI", link: "/docs/ui/" },
        { text: "Integrations", link: "/docs/integrations/" },
        { text: "Research", link: "/docs/research/" },
        { text: "Playground", link: "/docs/playground" },
      ],
    },
    footer: {
      message: "Released under the MIT License.",
    },
  },
});
