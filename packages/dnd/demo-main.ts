// Real-browser demo for the e2e lane (playwright.config.ts). Mounts a
// single-list keyboardSort() session and a two-list keyboardSortGroup()
// session so the e2e specs can drive Tab/Space/Arrow/Escape against real
// DOM nodes in real Chromium — jsdom (the unit tests) never runs a browser's
// own focus/blur/scrollIntoView behavior, which is exactly what the
// keyboard-sort module depends on.
import type { DomphyElement } from "@domphy/core";
import { ElementNode, toState } from "@domphy/core";
import {
  dragDrop,
  keyboardSort,
  keyboardSortGroup,
  multiListGroup,
} from "./src/index.js";

function mount(hostId: string, element: DomphyElement): void {
  const host = document.getElementById(hostId);
  if (!host) throw new Error(`Demo host #${hostId} not found`);
  new ElementNode(element).render(host);
}

type Item = { id: number; label: string };

// ---- Single list ------------------------------------------------------
const single = toState<Item[]>([
  { id: 1, label: "Alpha" },
  { id: 2, label: "Bravo" },
  { id: 3, label: "Charlie" },
]);
const sortSingle = keyboardSort(single, { listLabel: () => "single list" });

mount("single-list", {
  ul: (l) =>
    single.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortSingle(index)],
    })),
  $: [dragDrop(single)],
});

// ---- Two lists, shared group -------------------------------------------
const todo = toState<Item[]>([
  { id: 10, label: "Write docs" },
  { id: 11, label: "Fix bug" },
]);
const done = toState<Item[]>([{ id: 12, label: "Ship release" }]);
const [dropTodo, dropDone] = multiListGroup("demo-group", [todo, done]);
const [sortTodo, sortDone] = keyboardSortGroup([todo, done], {
  listLabel: (listIndex) => (listIndex === 0 ? "todo" : "done"),
});

mount("todo-list", {
  ul: (l) =>
    todo.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortTodo(index)],
    })),
  $: [dropTodo],
});

mount("done-list", {
  ul: (l) =>
    done.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortDone(index)],
    })),
  $: [dropDone],
});

// ---- Long list in a scrollable container (autoscroll) ------------------
// Tall enough that item 0 moved to the bottom via ArrowDown lands outside
// the 150px viewport `#scroll-container` clips to in demo.html — proves
// refocusGrabbed's explicit scrollIntoView, not just that the move logic
// reorders the array.
const scrollItems = toState<Item[]>(
  Array.from({ length: 20 }, (_, index) => ({
    id: 100 + index,
    label: `Item ${index + 1}`,
  })),
);
const sortScroll = keyboardSort(scrollItems, {
  listLabel: () => "scroll list",
});

mount("scroll-list", {
  ul: (l) =>
    scrollItems.get(l).map((item, index) => ({
      li: item.label,
      _key: item.id,
      $: [sortScroll(index)],
    })),
  $: [dragDrop(scrollItems)],
});
