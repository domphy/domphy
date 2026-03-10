// .vitepress/config.js
import { defineConfig } from "vitepress";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import include from 'markdown-it-include'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  transformPageData(pageData) {
    const noAside = ['/patches/']
    const isMatch = noAside.some(path => pageData.relativePath.includes(path))

    if (isMatch) {
      pageData.frontmatter.aside = false
    }
  },
  markdown: {
    config: (md) => {
      md.use(include, {
        root: './'
      })
    }
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

  title: "Domphy Docs",
  description: "Official documentation for Domphy UI Engine.",
  head: [["link", { rel: "icon", href: "/favicon.svg" }]],

  themeConfig: {
    search: { provider: "local" },
    nav: [
      { text: "Core", link: "/core/" },
      { text: "Theme", link: "/theme/" },
      { text: "UI", link: "/ui/" },
      { text: "Integrations", link: "/integrations/" },
      { text: "Playground", link: "/playground" },
    ],

    sidebar: {
      "/": [
        { text: "Overview", link: "/" },
        { text: "Core", link: "/core/" },
        { text: "Theme", link: "/theme/" },
        { text: "UI", link: "/ui/" },
        { text: "Integrations", link: "/integrations/" },
        { text: "Playground", link: "/playground" },
      ],
      "/core/": [
        { text: "Guide", link: "/core/" },
        {
          text: "API Reference",
          items: [
            { text: "ElementNode", link: "/core/api/element-node" },
            { text: "ElementList", link: "/core/api/element-list" },
            { text: "AttributeList", link: "/core/api/attribute-list" },
            { text: "StyleList", link: "/core/api/style-list" },
            { text: "State", link: "/core/api/state" },
            { text: "Notifier", link: "/core/api/notifier" },
            { text: "TextNode", link: "/core/api/text-node" },
            { text: "hashString", link: "/core/api/hash-string" },
          ]
        },
      ],
      "/theme/": [
        { text: "Guide", link: "/theme/" },
        {
          text: "Concepts",
          items: [
            { text: "Tone", link: "/theme/tone" },
            { text: "Size", link: "/theme/size" },
          ]
        },
      ],
      "/ui/": [
        { text: "Guide", link: "/ui" },
        { text: "Abbreviation", link: "/ui/patches/abbreviation" },
        { text: "Alert", link: "/ui/patches/alert" },
        { text: "Avatar", link: "/ui/patches/avatar" },
        { text: "Badge", link: "/ui/patches/badge" },
        { text: "Blockquote", link: "/ui/patches/blockquote" },
        { text: "Breadcrumb", link: "/ui/patches/breadcrumb" },
        { text: "Button", link: "/ui/patches/button" },
        { text: "Button Switch", link: "/ui/patches/button-switch" },
        { text: "Card", link: "/ui/patches/card" },
        { text: "Code", link: "/ui/patches/code" },
        { text: "Combobox", link: "/ui/patches/combobox" },
        { text: "Command", link: "/ui/patches/command" },
        { text: "Description List", link: "/ui/patches/description-list" },
        { text: "Details", link: "/ui/patches/details" },
        { text: "Dialog", link: "/ui/patches/dialog" },
        { text: "Divider", link: "/ui/patches/divider" },
        { text: "Drawer", link: "/ui/patches/drawer" },
        { text: "Emphasis", link: "/ui/patches/emphasis" },
        { text: "Form Group", link: "/ui/patches/form-group" },
        { text: "Figure", link: "/ui/patches/figure" },
        { text: "Form", link: "/ui/patches/form" },
        { text: "Heading", link: "/ui/patches/heading" },
        { text: "Horizontal Rule", link: "/ui/patches/horizontal-rule" },
        { text: "Icon", link: "/ui/patches/icon" },
        { text: "Image", link: "/ui/patches/image" },
        { text: "Input Checkbox", link: "/ui/patches/input-checkbox" },
        { text: "Input Color", link: "/ui/patches/input-color" },
        { text: "Input Date Time", link: "/ui/patches/input-date-time" },
        { text: "Input File", link: "/ui/patches/input-file" },
        { text: "Input Number", link: "/ui/patches/input-number" },
        { text: "Input OTP", link: "/ui/patches/input-otp" },
        { text: "Input Radio", link: "/ui/patches/input-radio" },
        { text: "Input Range", link: "/ui/patches/input-range" },
        { text: "Input Search", link: "/ui/patches/input-search" },
        { text: "Input Switch", link: "/ui/patches/input-switch" },
        { text: "Input Text", link: "/ui/patches/input-text" },
        { text: "Keyboard", link: "/ui/patches/keyboard" },
        { text: "Label", link: "/ui/patches/label" },
        { text: "Link", link: "/ui/patches/link" },
        { text: "Mark", link: "/ui/patches/mark" },
        { text: "Menu", link: "/ui/patches/menu" },
        { text: "Ordered List", link: "/ui/patches/ordered-list" },
        { text: "Pagination", link: "/ui/patches/pagination" },
        { text: "Paragraph", link: "/ui/patches/paragraph" },
        { text: "Popover", link: "/ui/patches/popover" },
        { text: "Popover Arrow", link: "/ui/patches/popover-arrow" },
        { text: "Preformated", link: "/ui/patches/preformated" },
        { text: "Progress", link: "/ui/patches/progress" },
        { text: "Select", link: "/ui/patches/select" },
        { text: "Select Box", link: "/ui/patches/select-box" },
        { text: "Select List", link: "/ui/patches/select-list" },
        { text: "Skeleton", link: "/ui/patches/skeleton" },
        { text: "Small", link: "/ui/patches/small" },
        { text: "Spinner", link: "/ui/patches/spinner" },
        { text: "Splitter", link: "/ui/patches/splitter" },
        { text: "Strong", link: "/ui/patches/strong" },
        { text: "Subscript", link: "/ui/patches/subscript" },
        { text: "Superscript", link: "/ui/patches/superscript" },
        { text: "Table", link: "/ui/patches/table" },
        { text: "Tabs", link: "/ui/patches/tabs" },
        { text: "Tag", link: "/ui/patches/tag" },
        { text: "Textarea", link: "/ui/patches/textarea" },
        { text: "Toast", link: "/ui/patches/toast" },
        { text: "Toggle", link: "/ui/patches/toggle" },
        { text: "Tooltip", link: "/ui/patches/tooltip" },
        { text: "TransitionGroup", link: "/ui/patches/transition-group" },
        { text: "Unordered List", link: "/ui/patches/unordered-list" },
        {
          text: "Recipes",
          items: [
            { text: "Alert Dialog",  link: "/ui/recipes/alertDialog" },
            { text: "Context Menu",  link: "/ui/recipes/contextMenu" },
            { text: "Hover Card",    link: "/ui/recipes/hoverCard" },
            { text: "Menubar",       link: "/ui/recipes/menuBar" },
          ],
        },
      ],
      "/integrations/": [
        { text: "Guide", link: "/integrations/" },
        {
          text: "Example",
          items: [
            { text: "i18next",         link: "/integrations/i18next" },
            { text: "TanStack Query",  link: "/integrations/tanstack-query" },
            { text: "SortableJS",      link: "/integrations/sortablejs" },
            { text: "Zod",             link: "/integrations/zod" },
            { text: "page.js",         link: "/integrations/pagejs" },
          ]
        }
      ]
    },

    footer: {
      message: "Released under the MIT License.",
    },
  },
})

