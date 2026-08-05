// js-framework-benchmark (krausest) keyed implementation for Domphy.
//
// Two implementations in one bundle, switched by `?impl=` (default "fine"):
//   - "fine":   per-row fine-grained states (label + selected). Partial update
//               touches only every 10th row's label state; select touches the
//               old/new row only. The row list itself is one keyed state.
//   - "memo":   "fine" + each row's element descriptor created ONCE per row
//               and reused across list re-renders (the fine-grained idiom —
//               the row view is stable, per-row states drive its updates).
//               ElementNode.patch()'s reference-equality fast path then skips
//               unchanged rows entirely on reorder/remove.
//   - "coarse": one state holding plain row objects + one selected-id state.
//               Every mutation replaces the array and re-runs full keyed
//               reconciliation; every row subscribes to the selected id.
//
// DOM structure mirrors frameworks/keyed/vanillajs from the krausest repo:
//   tr > td.col-md-1 (id) + td.col-md-4 > a (label) + td.col-md-1 > a > span.glyphicon-remove + td.col-md-6
// Selected row: tr.danger.

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";

// ---------------------------------------------------------------------------
// Data generation (verbatim from the krausest reference implementations)
// ---------------------------------------------------------------------------

function _random(max: number): number {
  return Math.round(Math.random() * 1000) % max;
}

const ADJECTIVES = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy",
];
const COLOURS = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "brown",
  "white",
  "black",
  "orange",
];
const NOUNS = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard",
];

let nextId = 1;

function buildLabels(count: number): { id: number; label: string }[] {
  const data: { id: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    data.push({
      id: nextId++,
      label:
        ADJECTIVES[_random(ADJECTIVES.length)] +
        " " +
        COLOURS[_random(COLOURS.length)] +
        " " +
        NOUNS[_random(NOUNS.length)],
    });
  }
  return data;
}

// ---------------------------------------------------------------------------
// Shared row markup helpers
// ---------------------------------------------------------------------------

const REMOVE_ICON: DomphyElement = {
  span: null,
  class: "glyphicon glyphicon-remove",
  "aria-hidden": "true",
} as DomphyElement;

// ---------------------------------------------------------------------------
// "fine" implementation — per-row states
// ---------------------------------------------------------------------------

interface FineRow {
  id: number;
  label: ReturnType<typeof toState<string>>;
  selected: ReturnType<typeof toState<boolean>>;
}

function createFineImpl(opts: { tuned?: boolean; memo?: boolean } = {}) {
  const data = toState<FineRow[]>([]);
  let selectedRow: FineRow | null = null;
  // Captured via _onMount for the "tuned" variant's imperative list ops.
  let tbodyNode: any = null;

  function buildData(count: number): FineRow[] {
    return buildLabels(count).map(({ id, label }) => ({
      id,
      label: toState(label),
      selected: toState(false),
    }));
  }

  function rowElement(row: FineRow): DomphyElement {
    return {
      tr: [
        { td: row.id, class: "col-md-1" },
        {
          td: [
            {
              a: (l: any) => row.label.get(l),
              onClick: () => {
                if (selectedRow === row) return;
                selectedRow?.selected.set(false);
                row.selected.set(true);
                selectedRow = row;
              },
            },
          ],
          class: "col-md-4",
        },
        {
          td: [
            {
              a: [REMOVE_ICON],
              onClick: () => {
                if (selectedRow === row) selectedRow = null;
                if (opts.tuned && tbodyNode) {
                  // Imperative removal: mutate the model array in place and
                  // drop just this row's node — skips the full-list patch pass
                  // that data.set() would trigger (see ElementList.update).
                  const rows = data.get();
                  const index = rows.indexOf(row);
                  if (index < 0) return;
                  rows.splice(index, 1);
                  tbodyNode.children.remove(tbodyNode.children.items[index]);
                } else {
                  data.set(data.get().filter((r) => r !== row));
                }
              },
            },
          ],
          class: "col-md-1",
        },
        { td: null, class: "col-md-6" },
      ],
      _key: row.id,
      class: (l: any) => (row.selected.get(l) ? "danger" : ""),
    } as DomphyElement;
  }

  // "memo" variant: cache one descriptor per row so a list re-render produces
  // the SAME object references for unchanged rows — patch()'s fast path skips
  // them. Per-row label/selected states keep those rows live without re-patch.
  const elementCache = opts.memo ? new WeakMap<FineRow, DomphyElement>() : null;
  function elementFor(row: FineRow): DomphyElement {
    if (!elementCache) return rowElement(row);
    let element = elementCache.get(row);
    if (!element) {
      element = rowElement(row);
      elementCache.set(row, element);
    }
    return element;
  }

  return {
    rows: (l: any) => data.get(l).map(elementFor),
    onTbodyMount(node: any) {
      tbodyNode = node;
    },
    run(count: number) {
      selectedRow = null;
      data.set(buildData(count));
    },
    add(count: number) {
      data.set(data.get().concat(buildData(count)));
    },
    update() {
      const rows = data.get();
      for (let i = 0; i < rows.length; i += 10) {
        const s = rows[i].label;
        s.set(s.get() + " !!!");
      }
    },
    swapRows() {
      const rows = data.get();
      if (rows.length < 999) return;
      if (opts.tuned && tbodyNode) {
        // Imperative swap: reorder the model array in place + swap the two
        // DOM rows via ElementList.swap — no reconciliation pass at all.
        const tmp = rows[1];
        rows[1] = rows[998];
        rows[998] = tmp;
        tbodyNode.children.swap(1, 998);
        return;
      }
      const next = rows.slice();
      const tmp = next[1];
      next[1] = next[998];
      next[998] = tmp;
      data.set(next);
    },
    clear() {
      selectedRow = null;
      data.set([]);
    },
  };
}

// ---------------------------------------------------------------------------
// "coarse" implementation — single array state + selected-id state
// ---------------------------------------------------------------------------

interface CoarseRow {
  id: number;
  label: string;
}

function createCoarseImpl() {
  const data = toState<CoarseRow[]>([]);
  const selected = toState<number | null>(null);

  function rowElement(row: CoarseRow): DomphyElement {
    return {
      tr: [
        { td: row.id, class: "col-md-1" },
        {
          td: [
            {
              a: row.label,
              onClick: () => selected.set(row.id),
            },
          ],
          class: "col-md-4",
        },
        {
          td: [
            {
              a: [REMOVE_ICON],
              onClick: () =>
                data.set(data.get().filter((r) => r.id !== row.id)),
            },
          ],
          class: "col-md-1",
        },
        { td: null, class: "col-md-6" },
      ],
      _key: row.id,
      class: (l: any) => (selected.get(l) === row.id ? "danger" : ""),
    } as DomphyElement;
  }

  return {
    rows: (l: any) => data.get(l).map(rowElement),
    run(count: number) {
      selected.set(null);
      data.set(buildLabels(count));
    },
    add(count: number) {
      data.set(data.get().concat(buildLabels(count)));
    },
    update() {
      data.set(
        data
          .get()
          .map((r, i) =>
            i % 10 === 0 ? { ...r, label: r.label + " !!!" } : r,
          ),
      );
    },
    swapRows() {
      const rows = data.get();
      if (rows.length < 999) return;
      const next = rows.slice();
      const tmp = next[1];
      next[1] = next[998];
      next[998] = tmp;
      data.set(next);
    },
    clear() {
      selected.set(null);
      data.set([]);
    },
  };
}

// ---------------------------------------------------------------------------
// Page scaffold (mirrors the krausest index.html structure) + mount
// ---------------------------------------------------------------------------

const implParam = new URLSearchParams(location.search).get("impl");
const impl =
  implParam === "coarse"
    ? createCoarseImpl()
    : createFineImpl({
        tuned: implParam === "tuned",
        memo: implParam === "memo",
      });

function actionButton(
  id: string,
  label: string,
  run: () => void,
): DomphyElement {
  return {
    div: [
      {
        button: label,
        type: "button",
        class: "btn btn-primary btn-block",
        id,
        onClick: run,
      },
    ],
    class: "col-sm-6 smallpad",
  } as DomphyElement;
}

const App: DomphyElement = {
  div: [
    {
      div: [
        {
          div: [
            { div: [{ h1: 'Domphy-"keyed"' }], class: "col-md-6" },
            {
              div: [
                {
                  div: [
                    actionButton("run", "Create 1,000 rows", () =>
                      impl.run(1000),
                    ),
                    actionButton("runlots", "Create 10,000 rows", () =>
                      impl.run(10000),
                    ),
                    actionButton("add", "Append 1,000 rows", () =>
                      impl.add(1000),
                    ),
                    actionButton("update", "Update every 10th row", () =>
                      impl.update(),
                    ),
                    actionButton("clear", "Clear", () => impl.clear()),
                    actionButton("swaprows", "Swap Rows", () =>
                      impl.swapRows(),
                    ),
                  ],
                  class: "row",
                },
              ],
              class: "col-md-6",
            },
          ],
          class: "row",
        },
      ],
      class: "jumbotron",
    },
    {
      table: [
        {
          tbody: (l: any) => impl.rows(l),
          id: "tbody",
          _onMount: (node: any) => (impl as any).onTbodyMount?.(node),
        },
      ],
      class: "table table-hover table-striped test-data",
    },
    {
      span: null,
      class: "preloadicon glyphicon glyphicon-remove",
      "aria-hidden": "true",
    },
  ],
  class: "container",
} as DomphyElement;

const root: DomphyElement = { div: [App], id: "main" } as DomphyElement;
new ElementNode(root).render(document.body);

// Harness hooks (not part of the measured UI).
(window as any).__flushSync = flushSync;
