/**
 * The generic command set. Extension commands (toggleBold, setHeading, …)
 * delegate to these, exactly like tiptap.
 */

import type { Editor } from "../Editor.js";
import {
  findParentNode,
  getMarkAttributes,
  getMarkRange,
  isMarkActive,
  isNodeActive,
} from "../isActive.js";
import {
  childrenOf,
  contentSize,
  endPosition,
  nodeSize,
  nodesBetween,
  resolveInternal,
  startPosition,
} from "../model/position.js";
import type { Schema } from "../model/schema.js";
import { parseHTML } from "../serialize/html.js";
import { createDocument } from "../serialize/json.js";
import type {
  Attributes,
  Command,
  CommandProps,
  Content,
  EditorInstance,
  EditorStateLike,
  FocusPosition,
  JSONContent,
  RawCommands,
} from "../types.js";
import { isLinkUriAllowed } from "../extensions/link.js";
import { liftListItem, setNodeTypeAt, sinkListItem } from "./list.js";

function schemaOf(editor: EditorInstance): Schema {
  return editor.schema as Schema;
}

function documentFrom(schema: Schema, content: Content): JSONContent {
  return createDocument(schema, content, (html) => parseHTML(schema, html));
}

function canSetMark(
  schema: Schema,
  state: EditorStateLike,
  markType: string,
): boolean {
  const { empty, from, to } = state.selection;
  if (empty) {
    const $from = resolveInternal(schema, state.doc, from);
    if (!schema.allowsMark($from.parent.type ?? "", markType)) {
      return false;
    }
    const current = state.storedMarks ?? $from.marks();
    return (
      current.some((mark) => mark.type === markType) ||
      !current.some((mark) => schema.markExcludes(mark.type, markType))
    );
  }
  let supported = false;
  nodesBetween(schema, state.doc, from, to, (node, _pos, parent) => {
    if (supported) {
      return false;
    }
    if (schema.isInline(node.type ?? "")) {
      const marks = node.marks ?? [];
      supported =
        schema.allowsMark(parent.type ?? "", markType) &&
        (marks.some((mark) => mark.type === markType) ||
          !marks.some((mark) => schema.markExcludes(mark.type, markType)));
    }
    return !supported;
  });
  return supported;
}

function canSetBlockType(
  schema: Schema,
  state: EditorStateLike,
  nodeType: string,
): boolean {
  const { from, to } = state.selection;
  let possible = false;
  let blocked = false;
  nodesBetween(schema, state.doc, from, to, (node, _pos, parent) => {
    if (!schema.isTextblock(node.type ?? "")) {
      return undefined;
    }
    if (schema.allowsContent(parent.type ?? "", nodeType)) {
      possible = true;
    } else {
      blocked = true;
    }
    return undefined;
  });
  return possible && !blocked;
}

function isListNode(schema: Schema, name: string | undefined): boolean {
  return (schema.nodes.get(name ?? "")?.group ?? "")
    .split(/\s+/)
    .includes("list");
}

function resolveFocusPosition(
  schema: Schema,
  doc: JSONContent,
  position: FocusPosition,
): { from: number; to: number } | null {
  if (position === null || position === undefined || position === false) {
    return null;
  }
  if (position === "start" || position === true) {
    const start = startPosition(schema, doc);
    return { from: start, to: start };
  }
  if (position === "end") {
    const end = endPosition(schema, doc);
    return { from: end, to: end };
  }
  if (position === "all") {
    return { from: startPosition(schema, doc), to: endPosition(schema, doc) };
  }
  return { from: position, to: position };
}

export const generalCommands: RawCommands = {
  setContent:
    (content: Content, options?: { emitUpdate?: boolean }) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      if (dispatch) {
        const schema = schemaOf(editor);
        const document = documentFrom(schema, content);
        tr.replaceRange(0, contentSize(schema, tr.doc), childrenOf(document));
        tr.setMeta("preventUpdate", options?.emitUpdate === false);
      }
      return true;
    },

  insertContent:
    (content: Content) =>
    ({ tr, commands }: CommandProps) =>
      commands.insertContentAt(
        { from: tr.selection.from, to: tr.selection.to },
        content,
      ),

  insertContentAt:
    (position: number | { from: number; to: number }, content: Content) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      if (dispatch) {
        const schema = schemaOf(editor);
        const range =
          typeof position === "number"
            ? { from: position, to: position }
            : position;
        const document = documentFrom(schema, content);
        let nodes = childrenOf(document);
        const $from = resolveInternal(schema, tr.doc, range.from);
        const intoTextblock = schema.isTextblock($from.parent.type ?? "");
        if (
          intoTextblock &&
          nodes.length === 1 &&
          schema.isTextblock(nodes[0].type ?? "")
        ) {
          nodes = childrenOf(nodes[0]);
        }
        tr.replaceRange(range.from, range.to, nodes);
      }
      return true;
    },

  setMark:
    (markType: string, attrs?: Attributes) =>
    ({ tr, state, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (!schema.isMark(markType)) {
        return false;
      }
      const { empty, from, to } = tr.selection;
      const nextAttributes = empty
        ? {
            ...schema.defaultAttributes(markType),
            ...getMarkAttributes(schema, state, markType),
            ...attrs,
          }
        : { ...schema.defaultAttributes(markType), ...attrs };
      if (!isLinkUriAllowed(editor, markType, nextAttributes.href)) {
        return false;
      }
      if (dispatch) {
        if (empty) {
          tr.addStoredMark({
            type: markType,
            attrs: nextAttributes,
          });
        } else {
          tr.addMark(from, to, {
            type: markType,
            attrs: nextAttributes,
          });
        }
      }
      return canSetMark(schema, state, markType);
    },

  toggleMark:
    (
      markType: string,
      attrs?: Attributes,
      options?: { extendEmptyMarkRange?: boolean },
    ) =>
    ({ state, commands, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (isMarkActive(schema, state, markType, attrs ?? {})) {
        return commands.unsetMark(markType, options);
      }
      return commands.setMark(markType, attrs);
    },

  unsetMark:
    (markType: string, options?: { extendEmptyMarkRange?: boolean }) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (!schema.isMark(markType)) {
        return false;
      }
      if (dispatch) {
        const { empty, from, to } = tr.selection;
        if (empty && options?.extendEmptyMarkRange) {
          const range = getMarkRange(schema, tr.doc, from, markType);
          if (range) {
            tr.removeMark(range.from, range.to, markType);
          }
        } else if (!empty) {
          tr.removeMark(from, to, markType);
        }
        tr.removeStoredMark(markType);
      }
      return true;
    },

  setNode:
    (nodeType: string, attrs?: Attributes) =>
    ({ tr, state, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (!schema.isNode(nodeType) || !schema.isTextblock(nodeType)) {
        return false;
      }
      if (!canSetBlockType(schema, state, nodeType)) {
        return false;
      }
      if (dispatch) {
        const { from, to } = tr.selection;
        tr.setBlockType(from, to, nodeType, attrs);
      }
      return true;
    },

  toggleNode:
    (nodeType: string, toggleType: string, attrs?: Attributes) =>
    ({ state, commands, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      const $anchor = resolveInternal(
        schema,
        state.doc,
        state.selection.anchor,
      );
      const $head = resolveInternal(schema, state.doc, state.selection.head);
      const shared =
        $anchor.parent === $head.parent ? $anchor.parent.attrs : undefined;
      if (isNodeActive(schema, state, nodeType, attrs ?? {})) {
        return commands.setNode(toggleType, shared);
      }
      return commands.setNode(nodeType, { ...shared, ...attrs });
    },

  updateAttributes:
    (nodeOrMarkType: string, attrs: Attributes) =>
    ({ tr, state, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      const { from, to, empty } = tr.selection;

      if (schema.isMark(nodeOrMarkType)) {
        let updated = false;
        if (empty) {
          const range = getMarkRange(schema, state.doc, from, nodeOrMarkType);
          if (range) {
            const attributes = {
              ...getMarkAttributes(schema, state, nodeOrMarkType),
              ...attrs,
            };
            if (!isLinkUriAllowed(editor, nodeOrMarkType, attributes.href)) {
              return false;
            }
            updated = true;
            if (dispatch) {
              tr.addMark(range.from, range.to, {
                type: nodeOrMarkType,
                attrs: attributes,
              });
            }
          }
          return updated;
        }
        let rejected = false;
        nodesBetween(schema, state.doc, from, to, (node, pos) => {
          const mark = (node.marks ?? []).find(
            (candidate) => candidate.type === nodeOrMarkType,
          );
          if (!mark) {
            return undefined;
          }
          const nextAttributes = { ...mark.attrs, ...attrs };
          if (!isLinkUriAllowed(editor, nodeOrMarkType, nextAttributes.href)) {
            rejected = true;
            return false;
          }
          updated = true;
          if (dispatch) {
            tr.addMark(
              Math.max(pos, from),
              Math.min(pos + nodeSize(schema, node), to),
              {
                type: nodeOrMarkType,
                attrs: nextAttributes,
              },
            );
          }
          return undefined;
        });
        return rejected ? false : updated;
      }

      if (!schema.isNode(nodeOrMarkType)) {
        return false;
      }
      const positions: number[] = [];
      nodesBetween(schema, state.doc, from, to, (node, pos) => {
        if (node.type === nodeOrMarkType) {
          positions.push(pos);
        }
        return undefined;
      });
      if (positions.length === 0) {
        const parent = findParentNode(
          schema,
          state.doc,
          from,
          (node) => node.type === nodeOrMarkType,
        );
        if (parent) {
          positions.push(parent.pos);
        }
      }
      if (positions.length === 0) {
        return false;
      }
      if (dispatch) {
        for (const pos of positions) {
          tr.setNodeAttributes(pos, attrs);
        }
      }
      return true;
    },

  clearNodes:
    () =>
    ({ tr, editor }: CommandProps) => {
      // Always rewrite the draft. can() uses a throwaway transaction, and
      // toggleList needs the cleared tree to report the same feasibility
      // dispatch would see after this step.
      const schema = schemaOf(editor);
      const defaultType = schema.defaultTypeFor("block") ?? "paragraph";
      tr.setBlockType(tr.selection.from, tr.selection.to, defaultType);
      for (let guard = 0; guard < 10; guard++) {
        const before = tr.doc;
        if (!tr.canLift(tr.selection.from, tr.selection.to)) {
          break;
        }
        tr.lift(tr.selection.from, tr.selection.to);
        if (tr.doc === before) {
          break;
        }
      }
      return true;
    },

  wrapIn:
    (nodeType: string, attrs?: Attributes) =>
    ({ tr, dispatch }: CommandProps) => {
      const { from, to } = tr.selection;
      if (!tr.canWrap(from, to, nodeType)) {
        return false;
      }
      if (dispatch) {
        tr.wrap(from, to, nodeType, attrs);
      }
      return true;
    },

  toggleWrap:
    (nodeType: string, attrs?: Attributes) =>
    ({ state, commands, editor }: CommandProps) => {
      if (isNodeActive(schemaOf(editor), state, nodeType, attrs ?? {})) {
        return commands.lift(nodeType, attrs);
      }
      return commands.wrapIn(nodeType, attrs);
    },

  lift:
    (nodeType: string, attrs?: Attributes) =>
    ({ tr, state, dispatch, editor }: CommandProps) => {
      if (!isNodeActive(schemaOf(editor), state, nodeType, attrs ?? {})) {
        return false;
      }
      const { from, to } = tr.selection;
      if (!tr.canLift(from, to)) {
        return false;
      }
      if (dispatch) {
        tr.lift(from, to);
      }
      return true;
    },

  toggleList:
    (listType: string, itemType: string, attrs?: Attributes) =>
    ({ tr, state, dispatch, editor, commands }: CommandProps) => {
      const schema = schemaOf(editor);
      const parentList = findParentNode(
        schema,
        state.doc,
        state.selection.from,
        (node) => isListNode(schema, node.type),
      );

      if (parentList) {
        if (parentList.node.type === listType) {
          return commands.liftListItem(itemType);
        }
        if (dispatch) {
          tr.transform((doc) =>
            setNodeTypeAt(schema, doc, parentList.pos, listType, attrs),
          );
        }
        return true;
      }

      const wrapSelection = (): boolean => {
        const { from, to } = tr.selection;
        if (!tr.canWrap(from, to, listType)) {
          return false;
        }
        if (dispatch) {
          tr.wrap(from, to, listType, attrs);
        }
        return true;
      };

      // Headings and other non-default textblocks must become paragraphs
      // before wrapping (`listItem` content is `paragraph block*`).
      const defaultType = schema.defaultTypeFor("block") ?? "paragraph";
      let needsClear = false;
      nodesBetween(schema, tr.doc, tr.selection.from, tr.selection.to, (node) => {
        const name = node.type ?? "";
        if (schema.isTextblock(name) && name !== defaultType) {
          needsClear = true;
          return false;
        }
        return undefined;
      });

      if (!needsClear && wrapSelection()) {
        return true;
      }
      // Clear then wrap — including during can(), so feasibility matches
      // dispatch. The old `if (!dispatch) return false` disagreed.
      commands.clearNodes();
      return wrapSelection();
    },

  splitListItem:
    (itemType: string) =>
    ({ tr, dispatch, editor, commands }: CommandProps) => {
      const schema = schemaOf(editor);
      const { from, to, empty } = tr.selection;
      const $from = resolveInternal(schema, tr.doc, from);
      if ($from.depth < 2 || $from.node($from.depth - 1).type !== itemType) {
        return false;
      }
      // An empty item breaks out of the list instead of adding another one.
      if (empty && contentSize(schema, $from.parent) === 0) {
        return commands.liftListItem(itemType);
      }
      if (!empty) {
        if (!dispatch) {
          return true;
        }
        tr.delete(from, to);
      }
      const pos = tr.selection.from;
      if (!tr.canSplit(pos, 2)) {
        return false;
      }
      if (dispatch) {
        tr.split(pos, 2);
      }
      return true;
    },

  sinkListItem:
    (itemType: string) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (!sinkListItem(schema, tr.doc, tr.selection.from, itemType)) {
        return false;
      }
      if (dispatch) {
        tr.transform((doc) =>
          sinkListItem(schema, doc, tr.selection.from, itemType),
        );
      }
      return true;
    },

  liftListItem:
    (itemType: string) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      if (!liftListItem(schema, tr.doc, tr.selection.from, itemType)) {
        return false;
      }
      if (dispatch) {
        const anchor = tr.selection.from;
        tr.transform((doc) => liftListItem(schema, doc, anchor, itemType));
      }
      return true;
    },

  splitBlock:
    (options?: { keepMarks?: boolean }) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      const keepMarks = options?.keepMarks !== false;
      const { from, to, empty } = tr.selection;
      const $from = resolveInternal(schema, tr.doc, from);
      if (!schema.isTextblock($from.parent.type ?? "")) {
        return false;
      }
      if (!tr.canSplit(from, 1)) {
        return false;
      }
      if (!dispatch) {
        return true;
      }
      const splittable = (editor as Editor).extensionManager.splittableMarks;
      const marks = keepMarks
        ? (tr.storedMarks ?? $from.marks()).filter((mark) =>
            splittable.includes(mark.type),
          )
        : [];
      const atEnd = from === $from.end();
      if (!empty) {
        tr.delete(from, to);
      }
      const pos = tr.selection.from;
      tr.split(pos, 1);
      if (atEnd) {
        const defaultType = schema.defaultTypeFor("block") ?? "paragraph";
        if (($from.parent.type ?? "") !== defaultType) {
          tr.setBlockType(tr.selection.from, tr.selection.from, defaultType);
        }
      }
      if (marks.length > 0) {
        tr.setStoredMarks(marks);
      }
      return true;
    },

  exitCode:
    () =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const schema = schemaOf(editor);
      const $from = resolveInternal(schema, tr.doc, tr.selection.from);
      if (!schema.nodes.get($from.parent.type ?? "")?.code) {
        return false;
      }
      if (dispatch) {
        const after = $from.after($from.depth);
        const defaultType = schema.defaultTypeFor("block") ?? "paragraph";
        tr.replaceRange(after, after, [schema.createNode(defaultType)]);
        tr.setSelection(after + 1);
      }
      return true;
    },

  setTextSelection:
    (position: number | { from: number; to: number }) =>
    ({ tr, dispatch }: CommandProps) => {
      if (dispatch) {
        const range =
          typeof position === "number"
            ? { from: position, to: position }
            : position;
        tr.setSelection(range.from, range.to);
      }
      return true;
    },

  selectAll:
    () =>
    ({ tr, dispatch, editor }: CommandProps) => {
      if (dispatch) {
        const schema = schemaOf(editor);
        tr.setSelection(
          startPosition(schema, tr.doc),
          endPosition(schema, tr.doc),
        );
      }
      return true;
    },

  deleteSelection:
    () =>
    ({ tr, dispatch }: CommandProps) => {
      const { from, to, empty } = tr.selection;
      if (empty) {
        return false;
      }
      if (dispatch) {
        tr.delete(from, to);
      }
      return true;
    },

  deleteRange:
    (range: { from: number; to: number }) =>
    ({ tr, dispatch }: CommandProps) => {
      if (dispatch) {
        tr.delete(range.from, range.to);
      }
      return true;
    },

  focus:
    (position?: FocusPosition) =>
    ({ tr, dispatch, editor }: CommandProps) => {
      if (!editor.view) {
        return false;
      }
      if (position === false) {
        return true;
      }
      if (dispatch) {
        const resolved = resolveFocusPosition(
          schemaOf(editor),
          tr.doc,
          position ?? null,
        );
        if (resolved) {
          tr.setSelection(resolved.from, resolved.to);
        }
        tr.setMeta("focus", true);
      }
      return true;
    },

  blur:
    () =>
    ({ tr, dispatch, editor }: CommandProps) => {
      if (!editor.view) {
        return false;
      }
      if (dispatch) {
        tr.setMeta("blur", true);
      }
      return true;
    },

  scrollIntoView:
    () =>
    ({ tr, dispatch }: CommandProps) => {
      if (dispatch) {
        tr.setMeta("scrollIntoView", true);
      }
      return true;
    },

  setMeta:
    (key: string, value: unknown) =>
    ({ tr }: CommandProps) => {
      tr.setMeta(key, value);
      return true;
    },

  command: (fn: Command) => (props: CommandProps) => fn(props),

  first:
    (commands: Command[] | ((props: CommandProps) => Command[])) =>
    (props: CommandProps) => {
      const items = typeof commands === "function" ? commands(props) : commands;
      for (const item of items) {
        if (item(props)) {
          return true;
        }
      }
      return false;
    },

  undo:
    () =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const engine = editor as Editor;
      if (!engine.history.canUndo) {
        return false;
      }
      if (dispatch) {
        const entry = engine.history.undo({
          doc: editor.state.doc,
          selection: editor.state.selection,
          storedMarks: editor.state.storedMarks,
        });
        if (!entry) {
          return false;
        }
        tr.setMeta("addToHistory", false);
        tr.transform(() => entry.doc);
        tr.setSelection(entry.selection.anchor, entry.selection.head);
        tr.setStoredMarks(entry.storedMarks);
      }
      return true;
    },

  redo:
    () =>
    ({ tr, dispatch, editor }: CommandProps) => {
      const engine = editor as Editor;
      if (!engine.history.canRedo) {
        return false;
      }
      if (dispatch) {
        const entry = engine.history.redo({
          doc: editor.state.doc,
          selection: editor.state.selection,
          storedMarks: editor.state.storedMarks,
        });
        if (!entry) {
          return false;
        }
        tr.setMeta("addToHistory", false);
        tr.transform(() => entry.doc);
        tr.setSelection(entry.selection.anchor, entry.selection.head);
        tr.setStoredMarks(entry.storedMarks);
      }
      return true;
    },
};
