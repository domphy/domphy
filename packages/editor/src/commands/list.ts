/** Structural transforms for list items — used by sinkListItem / liftListItem. */

import { childrenOf, resolveInternal } from "../model/position.js";
import type { Schema } from "../model/schema.js";
import { nodeAtPath, replaceAtPath } from "../model/tree.js";
import type { JSONContent } from "../types.js";

function itemDepthAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  itemType: string,
): number {
  const $pos = resolveInternal(schema, doc, pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type === itemType) {
      return depth;
    }
  }
  return -1;
}

/** Nest the current item inside the previous sibling item (Tab). */
export function sinkListItem(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  itemType: string,
): JSONContent | null {
  const itemDepth = itemDepthAt(schema, doc, pos, itemType);
  if (itemDepth < 1) {
    return null;
  }
  const $pos = resolveInternal(schema, doc, pos);
  const listDepth = itemDepth - 1;
  const list = $pos.node(listDepth);
  const index = $pos.indexAt(listDepth);
  if (index <= 0) {
    return null;
  }
  const children = childrenOf(list);
  const previous = children[index - 1];
  const current = children[index];
  if (!previous || !current) {
    return null;
  }
  const nested: JSONContent = {
    type: list.type,
    attrs: list.attrs,
    content: [current],
  };
  const updatedPrevious: JSONContent = {
    ...previous,
    content: [...childrenOf(previous), nested],
  };
  return replaceAtPath(doc, $pos.pathTo(listDepth), {
    ...list,
    content: [
      ...children.slice(0, index - 1),
      updatedPrevious,
      ...children.slice(index + 1),
    ],
  });
}

/** Move the current item one level out (Shift-Tab, or out of the list entirely). */
export function liftListItem(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  itemType: string,
): JSONContent | null {
  const itemDepth = itemDepthAt(schema, doc, pos, itemType);
  if (itemDepth < 1) {
    return null;
  }
  const $pos = resolveInternal(schema, doc, pos);
  const listDepth = itemDepth - 1;
  const list = $pos.node(listDepth);
  const index = $pos.indexAt(listDepth);
  const children = childrenOf(list);
  const item = children[index];
  if (!item) {
    return null;
  }
  const outerDepth = listDepth - 1;

  if (outerDepth >= 1 && $pos.node(outerDepth).type === itemType) {
    const outerItem = $pos.node(outerDepth);
    const outerList = $pos.node(outerDepth - 1);
    const outerIndex = $pos.indexAt(outerDepth - 1);
    const listIndexInItem = $pos.indexAt(outerDepth);
    const remaining = [
      ...children.slice(0, index),
      ...children.slice(index + 1),
    ];
    const outerItemChildren = childrenOf(outerItem);
    const updatedOuterItemContent =
      remaining.length > 0
        ? [
            ...outerItemChildren.slice(0, listIndexInItem),
            { ...list, content: remaining },
            ...outerItemChildren.slice(listIndexInItem + 1),
          ]
        : [
            ...outerItemChildren.slice(0, listIndexInItem),
            ...outerItemChildren.slice(listIndexInItem + 1),
          ];
    const outerChildren = childrenOf(outerList);
    return replaceAtPath(doc, $pos.pathTo(outerDepth - 1), {
      ...outerList,
      content: [
        ...outerChildren.slice(0, outerIndex),
        { ...outerItem, content: updatedOuterItemContent },
        item,
        ...outerChildren.slice(outerIndex + 1),
      ],
    });
  }

  const before = children.slice(0, index);
  const after = children.slice(index + 1);
  const replacement: JSONContent[] = [];
  if (before.length > 0) {
    replacement.push({ ...list, content: before });
  }
  replacement.push(...childrenOf(item));
  if (after.length > 0) {
    replacement.push({ ...list, content: after });
  }
  const listPath = $pos.pathTo(listDepth);
  const parentPath = listPath.slice(0, -1);
  const listIndex = listPath[listPath.length - 1];
  const parent = nodeAtPath(doc, parentPath);
  const parentChildren = childrenOf(parent);
  return replaceAtPath(doc, parentPath, {
    ...parent,
    content: [
      ...parentChildren.slice(0, listIndex),
      ...replacement,
      ...parentChildren.slice(listIndex + 1),
    ],
  });
}

/** Change a list node's type in place (bulletList <-> orderedList). */
export function setNodeTypeAt(
  schema: Schema,
  doc: JSONContent,
  pos: number,
  type: string,
  attributes?: Record<string, unknown>,
): JSONContent | null {
  const $pos = resolveInternal(schema, doc, pos);
  const node = childrenOf($pos.parent)[$pos.index];
  if (!node) {
    return null;
  }
  return replaceAtPath(doc, [...$pos.pathTo($pos.depth), $pos.index], {
    ...node,
    type,
    attrs: { ...schema.defaultAttributes(type), ...attributes },
  });
}
