// shadcn-community "File Tree" — clean-room reimplementation.
//
// A nested, expandable directory/file browser resembling a code editor's
// sidebar explorer. Implemented purely from the block's public functional/
// visual spec — no upstream source was viewed or copied.
//
// Structurally close to a Collapsible/Accordion-built tree view, but built
// fully custom here (rather than layered on the `accordion()`/`details()`
// patches) so expand state, selection, sort order, and custom icon
// renderers can all be driven from one shared, optionally externally
// controlled reactive context — matching the props surface the spec asks
// for (pre-set/controlled expanded ids + selected id, onSelect/onToggle).
//
// The expand/collapse reveal uses the CSS grid "0fr → 1fr" accordion trick
// (a `display: grid` wrapper whose single track animates between those two
// sizes) rather than `<details>`'s native open/close, which the UA
// stylesheet hides via `display: none` when closed — a property transitions
// can't smoothly animate across without extra opt-in machinery. The grid
// trick needs no height measurement and works for any content height.

import type {
  DomphyElement,
  Listener,
  State,
  StyleObject,
  ValueOrState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { small } from "@domphy/ui";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

export interface FileTreeNode {
  /** Stable identifier — also the value passed to `onSelect`/`onToggle` and used for `_key`. */
  id: string;
  /** Displayed label. */
  name: string;
  type: "file" | "folder";
  /** Nested entries. Only meaningful when `type` is `"folder"`. */
  children?: FileTreeNode[];
  /** Whether this node can become the selected item. Files default to `true`; folders ignore this (they toggle, not select). */
  selectable?: boolean;
}

export type FileTreeSortMode =
  | "folders-first"
  | "as-is"
  | ((a: FileTreeNode, b: FileTreeNode) => number);

export interface FileTreeProps {
  /** Root-level nodes. Defaults to a small demo `src/` layout. */
  data?: FileTreeNode[];
  /** Folder ids that start (or, when a `State` is passed, stay) expanded. */
  expandedIds?: ValueOrState<string[]>;
  /** The initially (or, when a `State` is passed, externally) selected node id. */
  selectedId?: ValueOrState<string | null>;
  /** How sibling nodes at each level are ordered. Defaults to `"folders-first"`. */
  sort?: FileTreeSortMode;
  /** Text direction. Defaults to `"ltr"`. */
  direction?: "ltr" | "rtl";
  /** Custom closed/open folder icon renderer. Defaults to a generic folder glyph. */
  renderFolderIcon?: (open: boolean, node: FileTreeNode) => DomphyElement;
  /** Custom file icon renderer (e.g. per extension). Defaults to a generic document glyph. */
  renderFileIcon?: (node: FileTreeNode) => DomphyElement;
  onSelect?: (node: FileTreeNode) => void;
  onToggle?: (node: FileTreeNode, open: boolean) => void;
  /** Theme color for the panel surface/borders. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Accent color for the selected-row highlight. Defaults to `"primary"`. */
  accentColor?: ThemeColor;
  style?: StyleObject;
}

interface FileTreeContext {
  selectedId: State<string | null>;
  expandedIds: State<string[]>;
  sort: FileTreeSortMode;
  color: ThemeColor;
  accentColor: ThemeColor;
  renderFolderIcon: (open: boolean, node: FileTreeNode) => DomphyElement;
  renderFileIcon: (node: FileTreeNode) => DomphyElement;
  onSelect?: (node: FileTreeNode) => void;
  onToggle?: (node: FileTreeNode, open: boolean) => void;
}

const DEFAULT_DATA: FileTreeNode[] = [
  {
    id: "src",
    name: "src",
    type: "folder",
    children: [
      {
        id: "src/components",
        name: "components",
        type: "folder",
        children: [
          { id: "src/components/Button.tsx", name: "Button.tsx", type: "file" },
          { id: "src/components/Card.tsx", name: "Card.tsx", type: "file" },
        ],
      },
      { id: "src/app.ts", name: "app.ts", type: "file" },
      { id: "src/index.ts", name: "index.ts", type: "file" },
    ],
  },
  { id: "package.json", name: "package.json", type: "file" },
  { id: "readme", name: "README.md", type: "file" },
];

const DEFAULT_EXPANDED_IDS = ["src"];
const DEFAULT_SELECTED_ID = "src/index.ts";
const ROW_INDENT_STEP = 5;
const ROW_BASE_INDENT = 2;

function sortNodes(nodes: FileTreeNode[], sort: FileTreeSortMode): FileTreeNode[] {
  if (sort === "as-is") return nodes;
  if (typeof sort === "function") return [...nodes].sort(sort);
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function isNodeExpanded(context: FileTreeContext, node: FileTreeNode, listener: Listener): boolean {
  return context.expandedIds.get(listener).includes(node.id);
}

function rowBaseStyle(depth: number, color: ThemeColor): StyleObject {
  return {
    display: "flex",
    alignItems: "center",
    gap: themeSpacing(1.5),
    height: themeSpacing(7),
    paddingInlineStart: themeSpacing(ROW_BASE_INDENT + depth * ROW_INDENT_STEP),
    paddingInlineEnd: themeSpacing(2),
    borderRadius: themeSpacing(1.5),
    userSelect: "none",
    fontSize: (listener: Listener) => themeSize(listener, "inherit"),
    color: (listener: Listener) => themeColor(listener, "shift-9", color),
    backgroundColor: "transparent",
    transition: "background-color 150ms ease",
    "&:hover": {
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-2", color),
    },
  } as StyleObject;
}

function treeGlyph(paths: string[]): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: paths.map((d, index) => ({ path: null, d, _key: `p-${index}` }) as DomphyElement),
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      flexShrink: 0,
      width: themeSpacing(4.5),
      height: themeSpacing(4.5),
    },
  };
}

function defaultFolderIcon(open: boolean): DomphyElement {
  return open
    ? treeGlyph(["M3 7.2a1.5 1.5 0 0 1 1.5-1.5h4.2l1.8 1.9h8.6a1.5 1.5 0 0 1 1.47 1.8l-1.15 6.6A1.7 1.7 0 0 1 17.75 17.5H5.6a1.5 1.5 0 0 1-1.48-1.24L3 7.2Z"])
    : treeGlyph(["M3 6.5A1.5 1.5 0 0 1 4.5 5h4.3l1.8 1.9h9A1.5 1.5 0 0 1 21 8.4v8.1A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-10Z"]);
}

function defaultFileIcon(): DomphyElement {
  return treeGlyph([
    "M6.5 3.2h6.8l4 4v13.1a1 1 0 0 1-1 1h-9.8a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1Z",
    "M13.3 3.4v3.9a1 1 0 0 0 1 1h3.9",
  ]);
}

function chevronGlyph(context: FileTreeContext, node: FileTreeNode): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polyline: null, points: "9 5 15 12 9 19" }],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      flexShrink: 0,
      width: themeSpacing(3.5),
      height: themeSpacing(3.5),
      transition: "transform 200ms ease-out",
      transform: (listener: Listener) =>
        isNodeExpanded(context, node, listener) ? "rotate(90deg)" : "rotate(0deg)",
    },
  };
}

function buildFolderNode(node: FileTreeNode, depth: number, context: FileTreeContext): DomphyElement {
  const toggle = () => {
    const currentIds = context.expandedIds.get();
    const currentlyOpen = currentIds.includes(node.id);
    const next = !currentlyOpen;
    context.expandedIds.set(
      next ? [...currentIds, node.id] : currentIds.filter((id) => id !== node.id),
    );
    context.onToggle?.(node, next);
  };

  const sortedChildren = sortNodes(node.children ?? [], context.sort);

  const closedIcon: DomphyElement = {
    span: [context.renderFolderIcon(false, node)],
    style: {
      display: (listener: Listener) =>
        isNodeExpanded(context, node, listener) ? "none" : "inline-flex",
    },
  };
  const openIcon: DomphyElement = {
    span: [context.renderFolderIcon(true, node)],
    style: {
      display: (listener: Listener) =>
        isNodeExpanded(context, node, listener) ? "inline-flex" : "none",
    },
  };

  const header: DomphyElement = {
    div: [
      chevronGlyph(context, node),
      closedIcon,
      openIcon,
      {
        small: node.name,
        $: [small({ color: context.color })],
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: "1 1 auto",
          minWidth: 0,
        },
      },
    ],
    role: "treeitem",
    tabindex: 0,
    ariaExpanded: (listener: Listener) => String(isNodeExpanded(context, node, listener)),
    onClick: toggle,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    },
    style: { ...rowBaseStyle(depth, context.color), cursor: "pointer" } as StyleObject,
  } as DomphyElement;

  const childrenWrapper: DomphyElement = {
    div: [
      {
        div: sortedChildren.map((child) => buildNode(child, depth + 1, context)),
        style: { minHeight: 0 },
      },
    ],
    role: "group",
    style: {
      display: "grid",
      gridTemplateRows: (listener: Listener) =>
        isNodeExpanded(context, node, listener) ? "1fr" : "0fr",
      opacity: (listener: Listener) => (isNodeExpanded(context, node, listener) ? 1 : 0),
      overflow: "hidden",
      transition: "grid-template-rows 200ms ease-out, opacity 150ms ease-out",
    } as StyleObject,
  };

  return {
    div: [header, childrenWrapper],
    _key: node.id,
  };
}

function buildFileNode(node: FileTreeNode, depth: number, context: FileTreeContext): DomphyElement {
  const selectable = node.selectable ?? true;
  const select = () => {
    context.selectedId.set(node.id);
    context.onSelect?.(node);
  };

  const fileRow: Record<string, unknown> = {
    div: [
      // Spacer matching the folder row's chevron width, so file/folder names align.
      { span: null, ariaHidden: "true", style: { display: "inline-flex", flexShrink: 0, width: themeSpacing(3.5) } },
      context.renderFileIcon(node),
      {
        small: node.name,
        $: [small({ color: context.color })],
        style: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: "1 1 auto",
          minWidth: 0,
        },
      },
    ],
    role: "treeitem",
    tabindex: selectable ? 0 : -1,
    ariaSelected: (listener: Listener) => String(context.selectedId.get(listener) === node.id),
    ariaDisabled: selectable ? "false" : "true",
    _key: node.id,
    style: {
      ...rowBaseStyle(depth, context.color),
      cursor: selectable ? "pointer" : "default",
      "&[aria-selected=true]": {
        backgroundColor: (listener: Listener) => themeColor(listener, "shift-3", context.accentColor),
        color: (listener: Listener) => themeColor(listener, "shift-11", context.accentColor),
      },
    } as StyleObject,
  };

  // Domphy's event validation rejects an explicit `onClick: undefined`
  // (unlike ordinary attribute props), so only attach handlers when the
  // node actually supports selection.
  if (selectable) {
    fileRow.onClick = select;
    fileRow.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    };
  }

  return fileRow as DomphyElement;
}

function buildNode(node: FileTreeNode, depth: number, context: FileTreeContext): DomphyElement {
  return node.type === "folder"
    ? buildFolderNode(node, depth, context)
    : buildFileNode(node, depth, context);
}

/**
 * A nested, expandable file/folder browser with accordion-style reveal,
 * a rotating chevron, an open/closed folder icon swap, and click-to-select
 * files. Call with no arguments for a working demo — a small `src/` layout
 * with one folder pre-expanded and `index.ts` pre-selected.
 */
function fileTree(props: FileTreeProps = {}): DomphyElement<"div"> {
  // The demo `selectedId`/`expandedIds` only make sense paired with the demo
  // `data` — a caller supplying their own `data` but no selection/expansion
  // prop should start with nothing selected/expanded, not the demo's ids.
  const usingDefaultData = props.data === undefined;
  const data = props.data ?? DEFAULT_DATA;
  const sort = props.sort ?? "folders-first";
  const direction = props.direction ?? "ltr";
  const color = props.color ?? "neutral";
  const accentColor = props.accentColor ?? "primary";

  const context: FileTreeContext = {
    selectedId: toState<string | null>(
      props.selectedId ?? (usingDefaultData ? DEFAULT_SELECTED_ID : null),
    ),
    expandedIds: toState<string[]>(
      props.expandedIds ?? (usingDefaultData ? DEFAULT_EXPANDED_IDS : []),
    ),
    sort,
    color,
    accentColor,
    renderFolderIcon: props.renderFolderIcon ?? defaultFolderIcon,
    renderFileIcon: props.renderFileIcon ?? defaultFileIcon,
    onSelect: props.onSelect,
    onToggle: props.onToggle,
  };

  const sortedRoots = sortNodes(data, sort);

  return {
    div: sortedRoots.map((node) => buildNode(node, 0, context)),
    dir: direction,
    role: "tree",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(0.5),
      padding: themeSpacing(2),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", color)}`,
      outlineOffset: "-1px",
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { fileTree };
