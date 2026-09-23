// Keyboard-operable reorder for @domphy/dnd.
//
// The FormKit engine this package wraps is pointer-only: `handleNodeKeydown`
// is an empty stub in 0.6.1 and no `tabindex` is set on items, so a list wired
// with `dragDrop()` alone is unreachable by keyboard. That fails WCAG 2.2
// SC 2.5.7 "Dragging Movements" (AA — all drag functionality needs a
// non-dragging alternative) and SC 2.1.1 "Keyboard".
//
// This module supplies the alternative with the interaction model shared by
// dnd-kit's KeyboardSensor and react-beautiful-dnd: tab to an item, space or
// enter to pick it up, arrow keys to move it, space/enter to drop, escape to
// cancel; each step announced through an assertive live region. Because it
// writes the SAME `State<T[]>` the pointer engine writes, keyboard and pointer
// reorders stay in sync with no extra wiring.

import type { Listener, PartialElement, State } from "@domphy/core";
import { flushSync, toState } from "@domphy/core";

export interface KeyboardSortOptions<T> {
  /**
   * Accessible label for an item, used in announcements. Defaults to the
   * item element's own text content.
   */
  label?: (item: T, index: number) => string;
  /**
   * Accessible name for each list, used in cross-list announcements.
   * Defaults to "list N".
   */
  listLabel?: (listIndex: number) => string;
}

/**
 * Returns the patch for the item at `index`. Apply it to the item element via
 * `$` — it makes the item focusable, describes the keyboard contract to
 * assistive tech, and handles the keys.
 */
export type KeyboardSorter = (index: number) => PartialElement;

interface Grab {
  /** Index into the session's `lists`. */
  list: number;
  /** Current index of the grabbed item inside that list. */
  index: number;
  /** Where the item started, for Escape. */
  originList: number;
  originIndex: number;
  /** Snapshot of every list at grab time, restored on Escape. */
  snapshot: unknown[][];
  label: string;
}

interface Session<T> {
  /** Unique per session — scopes the `data-grabbed` DOM query below so two
   * independent keyboardSort()/keyboardSortGroup() calls on the same page
   * can never match each other's grabbed item. */
  id: number;
  lists: State<T[]>[];
  options: KeyboardSortOptions<T>;
  grabbed: State<Grab | null>;
}

let sessionCounter = 0;

const INSTRUCTIONS_ID = "domphy-dnd-keyboard-instructions";
const INSTRUCTIONS_TEXT =
  "Press space or enter to pick up. Use the arrow keys to move, space or enter to drop, escape to cancel.";
// Announced at pick-up: the item is already held, so repeating "press space to
// pick up" there would be wrong. Same split dnd-kit's default announcements use.
const HELD_INSTRUCTIONS =
  "Use the arrow keys to move, space or enter to drop, escape to cancel.";

// Keys the held item consumes. "Spacebar" is the legacy name older engines
// still report for the space bar.
const HELD_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "Escape",
  " ",
  "Spacebar",
  "Enter",
]);

let liveRegion: HTMLElement | null = null;

// The instructions node must be in the document before focus reaches an item
// (aria-describedby resolves at focus time) and the live region before the
// first announcement. Both are singletons appended to <body>, the same shape
// dnd-kit portals its screen-reader nodes into. DOM-guarded so SSR and the
// initial render on the server stay DOM-free.
function ensureAccessibilityHost(): HTMLElement | null {
  // `document.body` is null while a script in <head> runs — appending then
  // throws, so treat "no body yet" the same as "no DOM".
  if (typeof document === "undefined" || !document.body) return null;
  if (liveRegion?.isConnected) return liveRegion;

  if (!document.getElementById(INSTRUCTIONS_ID)) {
    const instructions = document.createElement("div");
    instructions.id = INSTRUCTIONS_ID;
    instructions.textContent = INSTRUCTIONS_TEXT;
    hide(instructions);
    document.body.appendChild(instructions);
  }

  liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "assertive");
  liveRegion.setAttribute("aria-atomic", "true");
  liveRegion.setAttribute("role", "status");
  hide(liveRegion);
  document.body.appendChild(liveRegion);
  return liveRegion;
}

// Visually hidden but readable by assistive tech (the standard clip pattern —
// `display: none`/`visibility: hidden` would remove it from the a11y tree).
function hide(element: HTMLElement): void {
  element.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0";
}

function announce(message: string): void {
  const region = ensureAccessibilityHost();
  if (region) region.textContent = message;
}

// True while a move is re-rendering the list. Reconciliation removes and
// re-inserts the moved item, which blurs it in every browser, so the blur that
// arrives during this window is machinery, not the user leaving the item.
let movingFocus = false;

/**
 * Re-focus the grabbed item after a move. A one-step move often leaves the
 * grabbed node in place (the neighbour is the one reconciliation moves), but a
 * multi-step move or a cross-list transfer re-inserts it (a fresh DOM node,
 * since the item lands in a list that never held its `_key` before) — and an
 * element removed from the DOM loses focus. `data-grabbed` is written by the
 * item patch itself scoped to this session's id (see `Session.id`), so it
 * marks the item wherever it landed, in either list, without matching a
 * concurrent session's own grabbed item.
 *
 * Also explicitly scrolls the item into view: a same-node in-place move keeps
 * focus (no browser auto-scroll fires at all), and even a refocus's implicit
 * scroll-on-focus isn't guaranteed "nearest" inside a nested overflow
 * container — `scrollIntoView({ block: "nearest" })` is the same fix
 * dnd-kit's keyboard sensor applies.
 */
function refocusGrabbed<T>(session: Session<T>): void {
  if (typeof document === "undefined") return;
  movingFocus = true;
  try {
    // Reactivity flushes on a microtask; drain it so the moved item exists at
    // its new place before we look for it.
    flushSync();
    const moved = document.querySelector(`[data-grab-session="${session.id}"]`);
    if (moved instanceof HTMLElement) {
      if (document.activeElement !== moved)
        moved.focus({ preventScroll: true });
      // jsdom (this package's own unit tests) has no layout engine and does
      // not implement scrollIntoView at all — guard it the same way
      // events.ts guards hasPointerCapture against a minimal test double.
      moved.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    }
  } finally {
    movingFocus = false;
  }
}

function labelOf<T>(
  session: Session<T>,
  listIndex: number,
  index: number,
  element: HTMLElement,
): string {
  const custom = session.options.label;
  if (custom) {
    const item = session.lists[listIndex]?.get()[index];
    if (item !== undefined) return custom(item, index);
  }
  const text = (element.textContent ?? "").trim();
  return text || `item ${index + 1}`;
}

function listLabelOf<T>(session: Session<T>, listIndex: number): string {
  return session.options.listLabel?.(listIndex) ?? `list ${listIndex + 1}`;
}

function move<T>(session: Session<T>, grab: Grab, target: number): void {
  const values = session.lists[grab.list];
  if (!values) return;
  const next = values.get().slice();
  if (target < 0 || target >= next.length || target === grab.index) return;
  const [item] = next.splice(grab.index, 1);
  next.splice(target, 0, item as T);
  values.set(next);
  grab.index = target;
  session.grabbed.set({ ...grab });
  refocusGrabbed(session);
  announce(`${grab.label} moved to position ${target + 1} of ${next.length}.`);
}

function transfer<T>(session: Session<T>, grab: Grab, delta: number): void {
  const targetList = grab.list + delta;
  const from = session.lists[grab.list];
  const to = session.lists[targetList];
  if (!from || !to) return;

  const fromNext = from.get().slice();
  const [item] = fromNext.splice(grab.index, 1);
  if (item === undefined) return;
  // Land at the same ordinal in the destination, clamped to its length —
  // the position react-beautiful-dnd uses for a cross-list keyboard move.
  const toNext = to.get().slice();
  const targetIndex = Math.min(grab.index, toNext.length);
  toNext.splice(targetIndex, 0, item);
  from.set(fromNext);
  to.set(toNext);

  grab.list = targetList;
  grab.index = targetIndex;
  session.grabbed.set({ ...grab });
  refocusGrabbed(session);
  announce(
    `${grab.label} moved to ${listLabelOf(session, targetList)}, position ${targetIndex + 1} of ${toNext.length}.`,
  );
}

function cancel<T>(session: Session<T>, grab: Grab): void {
  for (let index = 0; index < session.lists.length; index++) {
    const snapshot = grab.snapshot[index];
    if (snapshot) session.lists[index]?.set(snapshot as T[]);
  }
  // Keep the grab marker one render longer, on the item's original slot, so
  // focus can follow the item back before the grab is released.
  session.grabbed.set({
    ...grab,
    list: grab.originList,
    index: grab.originIndex,
  });
  refocusGrabbed(session);
  session.grabbed.set(null);
  announce(
    `Move cancelled. ${grab.label} returned to position ${grab.originIndex + 1}.`,
  );
}

function handleKey<T>(
  session: Session<T>,
  listIndex: number,
  index: number,
  event: KeyboardEvent,
): void {
  const element = event.currentTarget as HTMLElement;
  const grab = session.grabbed.get();
  const grabbedHere =
    grab !== null && grab.list === listIndex && grab.index === index;
  const key = event.key;
  const multiList = session.lists.length > 1;

  if (!grabbedHere) {
    if (grab !== null) return;
    if (key !== " " && key !== "Spacebar" && key !== "Enter") return;
    // Space scrolls and Enter may submit a surrounding form; the press is
    // consumed by the pick-up, so it must not reach an ancestor either.
    event.preventDefault();
    event.stopPropagation();
    const values = session.lists[listIndex]?.get() ?? [];
    const next: Grab = {
      list: listIndex,
      index,
      originList: listIndex,
      originIndex: index,
      snapshot: session.lists.map((list) => list.get().slice()),
      label: labelOf(session, listIndex, index, element),
    };
    session.grabbed.set(next);
    announce(
      `${next.label} grabbed. Position ${index + 1} of ${values.length}. ${HELD_INSTRUCTIONS}`,
    );
    return;
  }

  if (!HELD_KEYS.has(key)) return;
  // While an item is held these keys belong to the move, so they must not
  // also reach an ancestor: Escape has to cancel the move, not close the
  // dialog the list sits in, and the arrows must not scroll or drive a
  // surrounding listbox.
  event.preventDefault();
  event.stopPropagation();

  switch (key) {
    case "ArrowUp":
      move(session, grab, index - 1);
      break;
    case "ArrowDown":
      move(session, grab, index + 1);
      break;
    case "ArrowLeft":
      // With a group, the horizontal axis crosses lists (the
      // react-beautiful-dnd model); a lone list reorders on either axis so
      // horizontal lists are operable too.
      if (multiList) transfer(session, grab, -1);
      else move(session, grab, index - 1);
      break;
    case "ArrowRight":
      if (multiList) transfer(session, grab, 1);
      else move(session, grab, index + 1);
      break;
    case "Home":
      move(session, grab, 0);
      break;
    case "End":
      move(session, grab, (session.lists[grab.list]?.get().length ?? 1) - 1);
      break;
    case "Escape":
      cancel(session, grab);
      break;
    default: {
      // Space / Enter — drop where it stands.
      const length = session.lists[grab.list]?.get().length ?? 0;
      session.grabbed.set(null);
      announce(
        `${grab.label} dropped at position ${grab.index + 1} of ${length}.`,
      );
      break;
    }
  }
}

function createSorter<T>(
  session: Session<T>,
  listIndex: number,
): KeyboardSorter {
  return (index: number): PartialElement => {
    ensureAccessibilityHost();
    return {
      tabIndex: 0,
      // Valid on any role, so the host element keeps its native semantics
      // (an <li> stays a listitem and its <ul> parent stays a valid list —
      // overriding role would break the list's content model).
      ariaRoledescription: "sortable item",
      ariaDescribedby: INSTRUCTIONS_ID,
      dataGrabbed: (listener: Listener) => {
        const grab = session.grabbed.get(listener);
        return grab !== null && grab.list === listIndex && grab.index === index
          ? "true"
          : undefined;
      },
      // Internal only (undocumented) — scopes refocusGrabbed's DOM query to
      // THIS session, so two independent keyboardSort()/keyboardSortGroup()
      // calls on the same page can never match each other's grabbed item.
      // `data-grabbed="true"` above stays the stable public styling hook.
      dataGrabSession: (listener: Listener) => {
        const grab = session.grabbed.get(listener);
        return grab !== null && grab.list === listIndex && grab.index === index
          ? String(session.id)
          : undefined;
      },
      onKeyDown: (event: KeyboardEvent) =>
        handleKey(session, listIndex, index, event),
      onBlur: () => {
        // Focus left the grabbed item (Tab, a click elsewhere): commit where
        // it stands rather than leaving an invisible grab active. A blur
        // caused by the move's own re-render is not the user leaving.
        if (movingFocus) return;
        const grab = session.grabbed.get();
        if (grab !== null && grab.list === listIndex && grab.index === index) {
          session.grabbed.set(null);
        }
      },
    } as PartialElement;
  };
}

/**
 * Keyboard-operable reorder for a list already wired with `dragDrop()`.
 *
 * Apply the returned patch to each item; it makes the item focusable and
 * handles pick-up / move / drop / cancel, writing the same `State<T[]>` the
 * pointer engine writes.
 *
 * ```ts
 * const items = toState([{ id: 1, label: "A" }, { id: 2, label: "B" }])
 * const sortItem = keyboardSort(items)
 *
 * const App = {
 *   ul: (l) =>
 *     items.get(l).map((item, index) => ({
 *       li: item.label,
 *       _key: item.id,
 *       $: [sortItem(index)],
 *     })),
 *   $: [dragDrop(items)],
 * }
 * ```
 *
 * Keys: space/enter picks up and drops, arrow keys move, Home/End jump to the
 * ends, Escape cancels and restores the original order. Every step is
 * announced through a visually-hidden `aria-live="assertive"` region.
 *
 * An item's own `tabIndex` overrides the patch's (native element beats patch
 * defaults), but an own `onKeyDown` does NOT replace the sorter's — Domphy
 * chains event handlers, so both run, the patch's first. To own the keys
 * entirely, do not apply the sorter to that item.
 */
export function keyboardSort<T>(
  values: State<T[]>,
  options: KeyboardSortOptions<T> = {},
): KeyboardSorter {
  const session: Session<T> = {
    id: sessionCounter++,
    lists: [values],
    options,
    grabbed: toState<Grab | null>(null),
  };
  return createSorter(session, 0);
}

/**
 * Keyboard-operable reorder across several lists — the counterpart of
 * `multiListGroup()`. Returns one sorter per list, in the same order.
 *
 * Within a list the arrows behave as in `keyboardSort`; ArrowLeft/ArrowRight
 * move the grabbed item to the previous/next list (the react-beautiful-dnd
 * cross-list model).
 *
 * ```ts
 * const [dropTodo, dropDone] = multiListGroup("tasks", [todo, done])
 * const [sortTodo, sortDone] = keyboardSortGroup([todo, done])
 * ```
 */
export function keyboardSortGroup<T>(
  lists: State<T[]>[],
  options: KeyboardSortOptions<T> = {},
): KeyboardSorter[] {
  const session: Session<T> = {
    id: sessionCounter++,
    lists,
    options,
    grabbed: toState<Grab | null>(null),
  };
  return lists.map((_list, listIndex) => createSorter(session, listIndex));
}
