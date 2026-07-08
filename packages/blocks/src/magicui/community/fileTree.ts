// shadcn-community "File Tree" — clean-room reimplementation, behaviour
// re-verified against the real upstream source (registry/magicui/file-tree.tsx,
// MIT-licensed) so it matches: folders are selectable (a click both selects
// and toggles, highlighting the folder row), the selected row gets a neutral
// muted fill (not an accent tint) that hugs the label width, non-selectable
// rows render disabled/dimmed, the selected node's ancestors auto-expand on
// mount, and an optional collapse/expand-all control mirrors upstream's
// `CollapseButton`.
//
// A nested, expandable directory/file browser resembling a code editor's
// sidebar explorer, built fully custom (rather than layered on the
// `accordion()`/`details()` patches) so expand state, selection, sort order,
// and custom icon renderers can all be driven from one shared, optionally
// externally controlled reactive context — matching the props surface the
// spec asks for (pre-set/controlled expanded ids + selected id, onSelect/
// onToggle).
//
// Upstream shows only the open/closed folder icon then the name — no
// disclosure caret — so this renders no chevron either. Indentation is
// structural (each nesting level's child group carries a `marginInlineStart`,
// upstream's `ml-5`), which lets the selected background hug just the icon +
// label (upstream's `w-fit` button) instead of spanning the whole row.
//
// The expand/collapse reveal uses the CSS grid "0fr → 1fr" accordion trick
// (a `display: grid` wrapper whose single track animates between those two
// sizes) rather than `<details>`'s native open/close, which the UA
// stylesheet hides via `display: none` when closed — a property transitions
// can't smoothly animate across without extra opt-in machinery. The grid
// trick needs no height measurement and works for any content height.
//
// Each expanded folder draws a vertical guide-rail down its children (the
// `indicator` prop, on by default, matching upstream's `TreeIndicator`). It's
// an absolutely-positioned 1px line living inside the grid-collapsed wrapper,
// so it inherits the expand/collapse height and hides on collapse for free.

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
  /** Whether this node can be selected/focused. Files and folders default to `true`; set `false` to render the row disabled (dimmed, non-interactive). */
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
  /** The initially (or, when a `State` is passed, externally) selected node id. Its ancestor folders auto-expand so the node is revealed. */
  selectedId?: ValueOrState<string | null>;
  /** How sibling nodes at each level are ordered. Defaults to `"folders-first"`. */
  sort?: FileTreeSortMode;
  /** Text direction. Defaults to `"ltr"`. */
  direction?: "ltr" | "rtl";
  /** Draw the vertical guide-rail down each expanded folder's children. Defaults to `true`. */
  indicator?: boolean;
  /** Render a floating expand-all / collapse-all toggle over the tree (upstream's `CollapseButton`). Defaults to `false`. */
  collapseButton?: boolean;
  /** Custom closed/open folder icon renderer. Defaults to a generic folder glyph. */
  renderFolderIcon?: (open: boolean, node: FileTreeNode) => DomphyElement;
  /** Custom file icon renderer (e.g. per extension). Defaults to a generic document glyph. */
  renderFileIcon?: (node: FileTreeNode) => DomphyElement;
  onSelect?: (node: FileTreeNode) => void;
  onToggle?: (node: FileTreeNode, open: boolean) => void;
  /** Theme color for the panel surface/borders. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Color for the selected-row highlight fill. Defaults to the panel `color` (a neutral muted fill, matching upstream `bg-muted`); pass a distinct tone for a tinted highlight. */
  accentColor?: ThemeColor;
  style?: StyleObject;
}

interface FileTreeContext {
  selectedId: State<string | null>;
  expandedIds: State<string[]>;
  sort: FileTreeSortMode;
  indicator: boolean;
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
// Per-level child indent (upstream's `ml-5`) and guide-rail inset (`left-1.5`).
const INDENT_STEP = 5;
const RAIL_INSET = 1.5;

const fileTreeCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function sortNodes(nodes: FileTreeNode[], sort: FileTreeSortMode): FileTreeNode[] {
  if (sort === "as-is") return nodes;
  if (typeof sort === "function") return [...nodes].sort(sort);
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return fileTreeCollator.compare(a.name, b.name);
  });
}

function isNodeExpanded(context: FileTreeContext, node: FileTreeNode, listener: Listener): boolean {
  return context.expandedIds.get(listener).includes(node.id);
}

// Walk `nodes` for `targetId`, returning the id chain from root down to and
// including the target, plus whether the target is selectable. Mirrors
// upstream's `expandSpecificTargetedElements`/`findParent`.
function findSelectionPath(
  nodes: FileTreeNode[],
  targetId: string,
): { path: string[]; selectable: boolean } | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return { path: [node.id], selectable: node.selectable ?? true };
    }
    if (node.children?.length) {
      const found = findSelectionPath(node.children, targetId);
      if (found) return { path: [node.id, ...found.path], selectable: found.selectable };
    }
  }
  return null;
}

// All folder ids (selectable, with children) — upstream's `expendAllTree`.
function collectExpandableIds(nodes: FileTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (node: FileTreeNode) => {
    if ((node.selectable ?? true) && node.children?.length) {
      ids.push(node.id);
      node.children.forEach(walk);
    }
  };
  nodes.forEach(walk);
  return [...new Set(ids)];
}

function rowBaseStyle(color: ThemeColor): StyleObject {
  return {
    display: "flex",
    alignItems: "center",
    gap: themeSpacing(1.5),
    height: themeSpacing(7),
    // `w-fit`: the row (and thus its selected fill) hugs its icon + label
    // rather than stretching to fill the column (upstream File is a w-fit button).
    width: "fit-content",
    maxWidth: "100%",
    alignSelf: "flex-start",
    paddingInlineStart: themeSpacing(1.5),
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

// Neutral muted fill for the selected row (upstream `bg-muted`) — background
// only, text colour left untouched. Gated by `selectable` so a non-selectable
// row never highlights, matching upstream's `isSelected && isSelectable`.
function selectedFillStyle(context: FileTreeContext): StyleObject {
  return {
    "&[aria-selected=true]": {
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-3", context.accentColor),
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

// Expand/collapse-all glyph for the CollapseButton (fold-vertical).
function collapseGlyph(): DomphyElement {
  return treeGlyph(["M8 9l4-4 4 4", "M8 15l4 4 4-4"]);
}

function nameSpan(node: FileTreeNode, context: FileTreeContext): DomphyElement {
  return {
    small: node.name,
    $: [small({ color: context.color })],
    // `small()`'s own muted shift-6/7 sets itself directly on the tag,
    // overriding (and measuring less contrast than) this row's own shift-9
    // color set in `rowBaseStyle` — inherit that instead.
    style: {
      whiteSpace: "nowrap",
      color: "currentColor",
    },
  } as DomphyElement;
}

function buildFolderNode(node: FileTreeNode, context: FileTreeContext): DomphyElement {
  const selectable = node.selectable ?? true;

  // Upstream Folder Trigger onClick: select the folder AND toggle its expansion.
  const activate = () => {
    context.selectedId.set(node.id);
    context.onSelect?.(node);
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

  const header: Record<string, unknown> = {
    div: [closedIcon, openIcon, nameSpan(node, context)],
    role: "treeitem",
    tabindex: selectable ? 0 : -1,
    ariaExpanded: (listener: Listener) => String(isNodeExpanded(context, node, listener)),
    ariaSelected: (listener: Listener) => String(context.selectedId.get(listener) === node.id),
    ariaDisabled: selectable ? "false" : "true",
    style: {
      ...rowBaseStyle(context.color),
      cursor: selectable ? "pointer" : "not-allowed",
      opacity: selectable ? undefined : 0.5,
      ...(selectable ? selectedFillStyle(context) : {}),
    } as StyleObject,
  };

  // Domphy's event validation rejects an explicit `onClick: undefined`, and a
  // non-selectable folder is `disabled` upstream (no expand, no select) — so
  // attach handlers only when the folder supports interaction.
  if (selectable) {
    header.onClick = activate;
    header.onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    };
  }

  // Vertical guide-rail down this folder's children (upstream's `TreeIndicator`,
  // on by default). Positioned absolutely inside the children area so it spans
  // exactly the rendered children height, sitting just inside the folder row's
  // left edge (upstream's `left-1.5`). Because it lives inside the
  // grid-collapsed wrapper it inherits the expand/collapse height for free — no
  // separate open/close animation needed. `insetInlineStart` (not `left`) makes
  // it flip to the right edge in RTL automatically.
  const indicatorRail: DomphyElement = {
    div: null,
    dataSlot: "tree-indicator",
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInlineStart: themeSpacing(RAIL_INSET),
      top: 0,
      bottom: 0,
      width: "1px",
      borderRadius: themeSpacing(0.5),
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-5", context.color),
      transition: "background-color 300ms ease-in-out",
      "&:hover": {
        backgroundColor: (listener: Listener) => themeColor(listener, "shift-7", context.color),
      },
    } as StyleObject,
    _key: "__rail",
  };

  const childrenWrapper: DomphyElement = {
    div: [
      {
        div: [
          ...(context.indicator ? [indicatorRail] : []),
          {
            // Structural indent (upstream's `ml-5`) — this is what steps each
            // nesting level in, so the rows themselves stay `w-fit`.
            div: sortedChildren.map((child) => buildNode(child, context)),
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
              marginInlineStart: themeSpacing(INDENT_STEP),
              paddingBlock: themeSpacing(1),
            },
            _key: "__children",
          },
        ],
        style: { minHeight: 0, position: "relative" },
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
    div: [header as DomphyElement, childrenWrapper],
    _key: node.id,
  };
}

function buildFileNode(node: FileTreeNode, context: FileTreeContext): DomphyElement {
  const selectable = node.selectable ?? true;
  const select = () => {
    context.selectedId.set(node.id);
    context.onSelect?.(node);
  };

  const fileRow: Record<string, unknown> = {
    div: [context.renderFileIcon(node), nameSpan(node, context)],
    role: "treeitem",
    tabindex: selectable ? 0 : -1,
    ariaSelected: (listener: Listener) => String(context.selectedId.get(listener) === node.id),
    ariaDisabled: selectable ? "false" : "true",
    _key: node.id,
    style: {
      ...rowBaseStyle(context.color),
      cursor: selectable ? "pointer" : "not-allowed",
      opacity: selectable ? undefined : 0.5,
      ...(selectable ? selectedFillStyle(context) : {}),
    } as StyleObject,
  };

  // Domphy's event validation rejects an explicit `onClick: undefined`
  // (unlike ordinary attribute props), so only attach handlers when the
  // node actually supports selection (upstream `disabled={!isSelectable}`).
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

function buildNode(node: FileTreeNode, context: FileTreeContext): DomphyElement {
  return node.type === "folder"
    ? buildFolderNode(node, context)
    : buildFileNode(node, context);
}

// Floating expand-all / collapse-all toggle (upstream's `CollapseButton`):
// if anything is open, close everything; otherwise expand every folder.
function collapseToggleButton(context: FileTreeContext, data: FileTreeNode[]): DomphyElement {
  return {
    button: [collapseGlyph()],
    type: "button",
    ariaLabel: "Toggle all folders",
    onClick: () => {
      context.expandedIds.set(
        context.expandedIds.get().length > 0 ? [] : collectExpandableIds(data),
      );
    },
    _key: "__collapse",
    style: {
      position: "absolute",
      insetInlineEnd: themeSpacing(2),
      bottom: themeSpacing(1),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(8),
      height: themeSpacing(8),
      padding: themeSpacing(1),
      borderRadius: themeSpacing(1.5),
      border: "none",
      cursor: "pointer",
      color: (listener: Listener) => themeColor(listener, "shift-9", context.color),
      backgroundColor: "transparent",
      transition: "background-color 150ms ease",
      "&:hover": {
        backgroundColor: (listener: Listener) => themeColor(listener, "shift-2", context.color),
      },
    } as StyleObject,
  } as DomphyElement;
}

/**
 * A nested, expandable file/folder browser with accordion-style reveal, an
 * open/closed folder icon swap, and click-to-select rows (both files and
 * folders are selectable; a folder click also toggles its expansion). Call
 * with no arguments for a working demo — a small `src/` layout with one folder
 * pre-expanded and `index.ts` pre-selected.
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
  const accentColor = props.accentColor ?? color;

  const context: FileTreeContext = {
    selectedId: toState<string | null>(
      props.selectedId ?? (usingDefaultData ? DEFAULT_SELECTED_ID : null),
    ),
    expandedIds: toState<string[]>(
      props.expandedIds ?? (usingDefaultData ? DEFAULT_EXPANDED_IDS : []),
    ),
    sort,
    indicator: props.indicator ?? true,
    color,
    accentColor,
    renderFolderIcon: props.renderFolderIcon ?? defaultFolderIcon,
    renderFileIcon: props.renderFileIcon ?? defaultFileIcon,
    onSelect: props.onSelect,
    onToggle: props.onToggle,
  };

  // Auto-expand the selected node's ancestor path so it is revealed on mount
  // (upstream's `expandSpecificTargetedElements` effect). Add-only merge — it
  // never collapses folders the caller pre-opened.
  const initialSelected = context.selectedId.get();
  if (initialSelected) {
    const found = findSelectionPath(data, initialSelected);
    if (found) {
      const toReveal = found.selectable ? found.path : found.path.slice(0, -1);
      const current = context.expandedIds.get();
      const merged = [...new Set([...current, ...toReveal])];
      if (merged.length !== current.length) context.expandedIds.set(merged);
    }
  }

  const sortedRoots = sortNodes(data, sort);
  const children = sortedRoots.map((node) => buildNode(node, context));
  if (props.collapseButton) children.push(collapseToggleButton(context, data));

  return {
    div: children,
    dir: direction,
    role: "tree",
    style: {
      position: "relative",
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
