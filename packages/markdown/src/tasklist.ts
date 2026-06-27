/**
 * Built-in markdown-it plugin for GFM-style task list items.
 *
 * Transforms list items that begin with [ ] or [x] into checkbox inputs:
 *
 *   - [ ] unchecked item   →  li > [checkbox(unchecked), " unchecked item"]
 *   - [x] checked item     →  li > [checkbox(checked), " checked item"]
 *
 * The plugin runs as a core rule (post-inline) so it can inspect the already-
 * parsed inline token children without duplicating the inline parser.
 * Checkboxes are emitted as disabled <input type="checkbox"> — task lists in
 * markdown are purely visual, not interactive forms.
 */
import type MarkdownIt from "markdown-it";

// CoreState provides the token stream after all block + inline parsing.
interface CoreState {
  tokens: Array<{
    type: string;
    children: Array<{
      type: string;
      content: string;
      attrSet(name: string, value: string): void;
      attrGet(name: string): string | null;
    }> | null;
  }>;
  Token: new (type: string, tag: string, nesting: number) => {
    type: string;
    tag: string;
    nesting: number;
    content: string;
    attrSet(name: string, value: string): void;
    attrGet(name: string): string | null;
    attrs: Array<[string, string]> | null;
    children: unknown[] | null;
    markup: string;
    info: string;
    meta: unknown;
    block: boolean;
    hidden: boolean;
  };
}

/** Pattern for a task list prefix: [ ] or [x] or [X] followed by a space. */
const TASK_PREFIX = /^\[([xX ])\] /;

/**
 * Core rule that detects GFM task list items and injects a checkbox token
 * at the start of each matching list item's inline content.
 */
function taskListRule(state: CoreState): void {
  const tokens = state.tokens;

  for (let i = 0; i < tokens.length; i++) {
    // Only inspect inline tokens that are direct children of a list item.
    // The inline token follows a paragraph_open (which may be hidden) which
    // follows a list_item_open.
    if (tokens[i].type !== "inline") continue;

    const children = tokens[i].children;
    if (!children || children.length === 0) continue;

    const first = children[0];
    if (first.type !== "text") continue;

    const match = TASK_PREFIX.exec(first.content);
    if (!match) continue;

    // Verify that this inline token is inside a list item by scanning backward.
    if (!isInsideListItem(tokens as Array<{ type: string }>, i)) continue;

    // Strip the task prefix from the text node.
    first.content = first.content.slice(match[0].length);

    // Create a checkbox token and prepend it to the children array.
    const checkbox = new state.Token("task_checkbox", "input", 0);
    checkbox.attrSet("type", "checkbox");
    checkbox.attrSet("disabled", "");
    if (match[1].toLowerCase() === "x") {
      checkbox.attrSet("checked", "");
    }
    children.unshift(checkbox as (typeof children)[number]);
  }
}

/**
 * Walk backward from `index` in the token array to determine whether the
 * nearest enclosing block container is a list_item_open. Stops at any
 * bullet/ordered list open (which would mean we are not in a list item but
 * looking at a bare paragraph inside a list at an outer level).
 */
function isInsideListItem(tokens: Array<{ type: string }>, index: number): boolean {
  for (let i = index - 1; i >= 0; i--) {
    const type = tokens[i].type;
    if (type === "list_item_open") return true;
    if (type === "bullet_list_open" || type === "ordered_list_open") return false;
  }
  return false;
}

/**
 * Installs the task-list plugin on a markdown-it instance.
 * After installation, list items whose text starts with `[ ]` or `[x]`
 * produce a `task_checkbox` inline token as the first child.
 * The walker in walker.ts converts that token to a Domphy <input> element.
 */
export function taskListPlugin(md: MarkdownIt): void {
  md.core.ruler.after(
    "inline",
    "task_list",
    taskListRule as Parameters<typeof md.core.ruler.after>[2],
  );
}
