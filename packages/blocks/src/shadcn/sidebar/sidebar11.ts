// shadcn/ui "sidebar-11" — clean-room reimplementation from the public
// behavior description only (no upstream source viewed). A code-editor-style
// sidebar rendering a recursive, collapsible folder/file tree with
// active-file highlighting synced to a breadcrumb in the main content
// header. See ./sidebar09-12-shared.ts and ./sidebar05-08-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { breadcrumb, buttonGhost, icon, link, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_CHEVRON_RIGHT,
  ICON_FILE,
  ICON_FOLDER,
  ICON_PANEL_TOGGLE,
  renderUserFooter,
  sidebarIcon,
  sidebarMainContent,
  verticalDivider,
  type SidebarUser,
} from "./sidebar09-12-shared.js";

/** A recursive tree node: either a folder with children, or a leaf file. */
type Sidebar11TreeNode =
  | { type: "folder"; name: string; children: Sidebar11TreeNode[]; icon?: string }
  | { type: "file"; name: string; icon?: string };

/** A changed file shown in the "Changes" group with a git-status badge. */
type Sidebar11Change = { file: string; state: string };

type Sidebar11Props = {
  tree?: Sidebar11TreeNode[];
  changes?: Sidebar11Change[];
  activeFilePath?: string;
  user?: SidebarUser;
  onFolderToggle?: (path: string, open: boolean) => void;
  onFileSelect?: (path: string) => void;
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_TREE: Sidebar11TreeNode[] = [
  {
    type: "folder",
    name: "app",
    children: [
      { type: "file", name: "layout.tsx" },
      { type: "file", name: "page.tsx" },
    ],
  },
  {
    type: "folder",
    name: "components",
    children: [
      {
        type: "folder",
        name: "ui",
        children: [
          { type: "file", name: "button.tsx" },
          { type: "file", name: "card.tsx" },
          { type: "file", name: "dialog.tsx" },
        ],
      },
      { type: "file", name: "app-sidebar.tsx" },
    ],
  },
  {
    type: "folder",
    name: "lib",
    children: [{ type: "file", name: "utils.ts" }],
  },
  {
    type: "folder",
    name: "public",
    children: [{ type: "file", name: "favicon.ico" }],
  },
];

const DEFAULT_CHANGES: Sidebar11Change[] = [
  { file: "README.md", state: "M" },
  { file: "api/hello/route.ts", state: "U" },
  { file: "app/layout.tsx", state: "M" },
];

const DEFAULT_ACTIVE_PATH = "components/ui/button.tsx";

const DEFAULT_USER: SidebarUser = { name: "Shad Cn", email: "shadcn@example.com" };

function joinPath(parent: string, name: string): string {
  return parent ? `${parent}/${name}` : name;
}

/** True if `path` is the active file, or an ancestor folder of the active file. */
function isAncestorOrSelf(path: string, activePath: string): boolean {
  return activePath === path || activePath.startsWith(`${path}/`);
}

function fileRow(path: string, node: Extract<Sidebar11TreeNode, { type: "file" }>, activeFilePath: State<string>, onSelect: (path: string) => void): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          sidebarIcon(node.icon ?? ICON_FILE),
          { span: node.name, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
        ],
        type: "button",
        ariaCurrent: (l: Listener) => (activeFilePath.get(l) === path ? "true" : undefined),
        onClick: () => onSelect(path),
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          overflow: "hidden",
          whiteSpace: "nowrap",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&[aria-current=true]": {
            backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
            color: (l: Listener) => themeColor(l, "shift-12", "primary"),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: node.name,
  } as DomphyElement<"li">;
}

function folderRow(
  path: string,
  node: Extract<Sidebar11TreeNode, { type: "folder" }>,
  activeFilePath: State<string>,
  initialActivePath: string,
  onFolderToggle: ((path: string, open: boolean) => void) | undefined,
  onSelect: (path: string) => void,
): DomphyElement<"li"> {
  return {
    li: [
      {
        details: [
          {
            summary: [
              {
                span: ICON_CHEVRON_RIGHT,
                dataSlot: "chevron",
                style: { transition: "transform 150ms ease" },
                $: [icon({ color: "neutral" })],
              } as unknown as DomphyElement,
              sidebarIcon(node.icon ?? ICON_FOLDER),
              { span: node.name, style: { flex: "1", textAlign: "left" } } as unknown as DomphyElement,
            ],
            style: {
              listStyle: "none",
              cursor: "pointer",
              userSelect: "none",
              display: "flex",
              alignItems: "center",
              gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
              width: "100%",
              paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
              paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
              backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
              "&::-webkit-details-marker": { display: "none" },
              "&::marker": { content: `""` },
              "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
            },
          } as unknown as DomphyElement,
          {
            ul: buildTreeList(path, node.children, activeFilePath, initialActivePath, onFolderToggle, onSelect),
            style: {
              listStyle: "none",
              margin: "0",
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginInlineStart: themeSpacing(4),
              paddingInlineStart: themeSpacing(2),
              paddingBlock: "0",
              paddingInlineEnd: "0",
              borderInlineStart: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
              color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
            },
          } as unknown as DomphyElement,
        ],
        open: isAncestorOrSelf(path, initialActivePath) || undefined,
        onToggle: (event: Event) => onFolderToggle?.(path, (event.target as HTMLDetailsElement).open),
        style: {
          "&[open] summary [data-slot=chevron]": { transform: "rotate(90deg)" },
        },
      } as unknown as DomphyElement,
    ],
    _key: node.name,
  } as DomphyElement<"li">;
}

function buildTreeList(
  parentPath: string,
  nodes: Sidebar11TreeNode[],
  activeFilePath: State<string>,
  initialActivePath: string,
  onFolderToggle: ((path: string, open: boolean) => void) | undefined,
  onSelect: (path: string) => void,
): DomphyElement[] {
  return nodes.map((node) => {
    const path = joinPath(parentPath, node.name);
    return node.type === "folder"
      ? folderRow(path, node, activeFilePath, initialActivePath, onFolderToggle, onSelect)
      : fileRow(path, node, activeFilePath, onSelect);
  });
}

/** Uppercase muted section heading (mirrors upstream's `SidebarGroupLabel`). */
function groupLabel(text: string): DomphyElement<"div"> {
  return {
    div: [{ small: text, $: [small({ color: "neutral" })] } as unknown as DomphyElement],
    style: {
      textTransform: "uppercase",
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
    },
  } as unknown as DomphyElement<"div">;
}

/** A changed-file row with a trailing git-status badge (M/U/etc.). */
function changeRow(change: Sidebar11Change): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          sidebarIcon(ICON_FILE),
          {
            span: change.file,
            style: { flex: "1", textAlign: "left", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
          } as unknown as DomphyElement,
          {
            span: change.state,
            dataSlot: "badge",
            ariaLabel: `status ${change.state}`,
            style: { flexShrink: "0", color: (l: Listener) => themeColor(l, "shift-7", "neutral") },
          } as unknown as DomphyElement,
        ],
        type: "button",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 1),
          border: "none",
          background: "none",
          cursor: "pointer",
          textAlign: "left",
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
        },
      } as unknown as DomphyElement,
    ],
    _key: change.file,
  } as DomphyElement<"li">;
}

/** Breadcrumb trail rebuilt reactively from the active file's path segments. */
function fileBreadcrumb(activeFilePath: State<string>): DomphyElement<"nav"> {
  return {
    nav: (listener: Listener) => {
      const segments = activeFilePath.get(listener).split("/").filter(Boolean);
      return segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        // Key by the cumulative path up to this segment, not its index — the
        // path is the segment's actual stable identity (two breadcrumbs at the
        // same position can represent different folders once the active file
        // changes depth).
        const cumulativePath = segments.slice(0, index + 1).join("/");
        return isLast
          ? ({
              strong: segment,
              _key: cumulativePath,
              ariaCurrent: "page",
              $: [strong({ color: "neutral" })],
            } as unknown as DomphyElement)
          : ({
              a: segment,
              _key: cumulativePath,
              href: "#",
              $: [link({ color: "neutral", accentColor: "neutral" })],
            } as unknown as DomphyElement);
      });
    },
    $: [breadcrumb({ color: "neutral" })],
  } as unknown as DomphyElement<"nav">;
}

/**
 * IDE-style recursive folder/file tree sidebar with active-file highlighting
 * synced to the main header's breadcrumb. Call with no arguments for a fully
 * working demo.
 */
function sidebar11(props: Sidebar11Props = {}): DomphyElement<"div"> {
  const {
    tree = DEFAULT_TREE,
    changes = DEFAULT_CHANGES,
    user = DEFAULT_USER,
    onFolderToggle,
    onFileSelect,
    children,
  } = props;

  const initialActivePath = props.activeFilePath ?? DEFAULT_ACTIVE_PATH;
  const activeFilePath = toState(initialActivePath);
  const collapsed = toState(false);

  const selectFile = (path: string) => {
    activeFilePath.set(path);
    onFileSelect?.(path);
  };

  const asideElement: DomphyElement<"aside"> = {
    aside: [
      {
        nav: [
          ...(changes.length > 0
            ? [
                groupLabel("Changes"),
                {
                  ul: changes.map(changeRow),
                  style: {
                    listStyle: "none",
                    margin: "0",
                    padding: "0",
                    display: "flex",
                    flexDirection: "column",
                    gap: themeSpacing(0.5),
                    marginBlockEnd: (l: Listener) => themeSpacing(themeDensity(l) * 2),
                  },
                } as unknown as DomphyElement,
              ]
            : []),
          groupLabel("Files"),
          {
            ul: buildTreeList("", tree, activeFilePath, initialActivePath, onFolderToggle, selectFile),
            style: { listStyle: "none", margin: "0", padding: "0", display: "flex", flexDirection: "column", gap: themeSpacing(0.5) },
          } as unknown as DomphyElement,
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
      renderUserFooter(user),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (collapsed.get(l) ? "0px" : themeSpacing(64)),
      overflow: "hidden",
      transition: "width 180ms ease-out",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"aside">;

  const headerElement: DomphyElement<"header"> = {
    header: [
      {
        button: [sidebarIcon(ICON_PANEL_TOGGLE)],
        type: "button",
        ariaLabel: "Toggle sidebar",
        onClick: () => collapsed.set(!collapsed.get()),
        $: [buttonGhost({ color: "neutral" })],
      } as unknown as DomphyElement,
      verticalDivider(),
      fileBreadcrumb(activeFilePath),
    ],
    style: {
      position: "sticky",
      top: "0",
      zIndex: "10",
      display: "flex",
      alignItems: "center",
      gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      height: themeSpacing(14),
      flexShrink: "0",
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"header">;

  const mainElement: DomphyElement<"main"> = {
    main: [headerElement, sidebarMainContent(children)],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "hidden",
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [asideElement, mainElement],
    dataTone: "shift-0",
    style: {
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebar11 };
export type { Sidebar11Change, Sidebar11Props, Sidebar11TreeNode };
