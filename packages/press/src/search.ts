// Self-contained search: build-time inverted index + client Domphy widget.
// No third-party search dependency — zero runtime dep, deterministic output.

import { type DomphyElement, ElementNode, RecordState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { card, inputSearch, link, menu, small } from "@domphy/ui";
import type { SearchDocument, TocEntry } from "./types.js";

// --- Index shape -------------------------------------------------------------

interface SearchEntry {
  route: string;
  pageTitle: string;
  heading: string;
  slug: string;
  isPage: boolean;
}

interface SerializedIndex {
  entries: SearchEntry[];
  postings: Record<string, [number, number][]>;
}

export interface SearchResult {
  route: string;
  pageTitle: string;
  heading: string;
  slug: string;
  isPage: boolean;
  score: number;
  href: string;
}

const FIELD_TITLE = 3;
const FIELD_HEADING = 2;
const FIELD_BODY = 1;

// --- Tokenizer ---------------------------------------------------------------

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length >= 2) tokens.push(raw);
  }
  return tokens;
}

// --- Build-time --------------------------------------------------------------

function indexText(
  postings: Map<string, Map<number, number>>,
  entryIndex: number,
  text: string,
  fieldWeight: number,
): void {
  for (const term of tokenize(text)) {
    let perEntry = postings.get(term);
    if (!perEntry) {
      perEntry = new Map();
      postings.set(term, perEntry);
    }
    const existing = perEntry.get(entryIndex);
    if (existing === undefined || fieldWeight > existing)
      perEntry.set(entryIndex, fieldWeight);
  }
}

export function buildSearchIndex(docs: SearchDocument[]): string {
  const entries: SearchEntry[] = [];
  const postings = new Map<string, Map<number, number>>();

  for (const doc of docs) {
    const pageIndex = entries.length;
    entries.push({
      route: doc.route,
      pageTitle: doc.title,
      heading: doc.title,
      slug: "",
      isPage: true,
    });
    indexText(postings, pageIndex, doc.title, FIELD_TITLE);
    indexText(postings, pageIndex, doc.text, FIELD_BODY);
    for (const entry of doc.toc as TocEntry[]) {
      const sectionIndex = entries.length;
      entries.push({
        route: doc.route,
        pageTitle: doc.title,
        heading: entry.text,
        slug: entry.slug,
        isPage: false,
      });
      indexText(postings, sectionIndex, entry.text, FIELD_HEADING);
    }
  }

  const serializedPostings: Record<string, [number, number][]> = {};
  for (const [term, perEntry] of Array.from(postings.entries()).sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    serializedPostings[term] = Array.from(perEntry.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([i, w]) => [i, w]);
  }
  return JSON.stringify({
    entries,
    postings: serializedPostings,
  } satisfies SerializedIndex);
}

// --- Query -------------------------------------------------------------------

function editDistance1(a: string, b: string): boolean {
  const diff = a.length - b.length;
  if (diff < -1 || diff > 1) return false;
  if (diff === 0) {
    let mismatches = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i] && ++mismatches > 1) return false;
    }
    return mismatches === 1;
  }
  const longer = diff > 0 ? a : b;
  const shorter = diff > 0 ? b : a;
  let i = 0, j = 0, skipped = false;
  while (i < longer.length) {
    if (j < shorter.length && longer[i] === shorter[j]) { i++; j++; }
    else if (!skipped) { skipped = true; i++; }
    else return false;
  }
  return true;
}

export function queryIndex(
  serializedIndex: string,
  query: string,
  limit = 10,
): SearchResult[] {
  const index = JSON.parse(serializedIndex) as SerializedIndex;
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const scoreByEntry = new Map<number, number>();
  const matchedTermsByEntry = new Map<number, number>();

  for (const term of terms) {
    const seen = new Set<number>();
    for (const indexedTerm in index.postings) {
      let weight: number;
      if (indexedTerm === term) {
        weight = 1.0;
      } else if (indexedTerm.startsWith(term)) {
        weight = 0.5;
      } else if (term.length >= 4 && editDistance1(term, indexedTerm)) {
        weight = 0.3;
      } else {
        continue;
      }
      for (const [entryIndex, fieldWeight] of index.postings[indexedTerm]) {
        const contribution = fieldWeight * weight;
        scoreByEntry.set(
          entryIndex,
          (scoreByEntry.get(entryIndex) ?? 0) + contribution,
        );
        if (!seen.has(entryIndex)) {
          seen.add(entryIndex);
          matchedTermsByEntry.set(
            entryIndex,
            (matchedTermsByEntry.get(entryIndex) ?? 0) + 1,
          );
        }
      }
    }
  }

  const results: SearchResult[] = [];
  for (const [entryIndex, score] of scoreByEntry) {
    const entry = index.entries[entryIndex];
    const coverage = matchedTermsByEntry.get(entryIndex) ?? 0;
    results.push({
      route: entry.route,
      pageTitle: entry.pageTitle,
      heading: entry.heading,
      slug: entry.slug,
      isPage: entry.isPage,
      score: coverage * 100 + score,
      href: entry.slug ? `${entry.route}#${entry.slug}` : entry.route,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.route !== b.route) return a.route < b.route ? -1 : 1;
    return a.isPage === b.isPage ? 0 : a.isPage ? -1 : 1;
  });
  return results.slice(0, limit);
}

// --- Client widget -----------------------------------------------------------

export interface SearchWidgetOptions {
  indexUrl?: string;
  placeholder?: string;
  limit?: number;
}

interface WidgetState {
  index: string | null;
  query: string;
  results: SearchResult[];
  open: boolean;
  active: number;
}

function optionId(widgetId: number, resultIndex: number): string {
  return `dp-search-${widgetId}-option-${resultIndex}`;
}

let widgetCounter = 0;

function resultRow(
  result: SearchResult,
  resultIndex: number,
  widgetId: number,
  state: RecordState<WidgetState>,
): DomphyElement {
  const id = optionId(widgetId, resultIndex);
  return {
    a: [
      { div: result.isPage ? result.pageTitle : result.heading },
      result.isPage
        ? null
        : { small: result.pageTitle, $: [small({ color: "neutral" })] },
    ],
    href: result.href,
    role: "option",
    id,
    ariaSelected: (l) => state.get("active", l) === resultIndex || undefined,
    onClick: () => {
      state.set("open", false);
    },
    onMouseEnter: () => {
      state.set("active", resultIndex);
    },
    $: [link({ color: "neutral", accentColor: "primary" })],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
      paddingBlock: themeSpacing(2),
      paddingInline: themeSpacing(3),
      borderRadius: themeSpacing(1),
      backgroundColor: (l) =>
        state.get("active", l) === resultIndex
          ? themeColor(l, "shift-3", "primary")
          : themeColor(l, "inherit", "neutral"),
    },
    _key: result.href,
  };
}

function runQuery(state: RecordState<WidgetState>, limit: number): void {
  const index = state.get("index");
  const query = state.get("query");
  const results = index && query.trim() ? queryIndex(index, query, limit) : [];
  state.set("results", results);
  state.set("active", -1);
  state.set("open", results.length > 0);
}

export function searchWidget(options: SearchWidgetOptions = {}): DomphyElement {
  const {
    indexUrl = "/search-index.json",
    placeholder = "Search docs…",
    limit = 10,
  } = options;
  const widgetId = ++widgetCounter;
  const listboxId = `dp-search-${widgetId}-listbox`;

  const state = new RecordState<WidgetState>({
    index: null,
    query: "",
    results: [],
    open: false,
    active: -1,
  });
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function navigate(result: SearchResult | undefined): void {
    if (!result) return;
    state.set("open", false);
    window.location.assign(result.href);
  }

  const input: DomphyElement = {
    input: null,
    type: "search",
    placeholder,
    autocomplete: "off",
    role: "combobox",
    ariaExpanded: (l) => (state.get("open", l) ? "true" : "false"),
    ariaControls: listboxId,
    ariaAutocomplete: "list",
    ariaActiveDescendant: (l) => {
      const a = state.get("active", l);
      return a >= 0 ? optionId(widgetId, a) : undefined;
    },
    value: (l) => state.get("query", l),
    onInput: (e) => {
      state.set("query", (e.target as HTMLInputElement).value);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runQuery(state, limit), 120);
    },
    onFocus: () => {
      if (state.get("results").length > 0) state.set("open", true);
    },
    onKeyDown: (e: KeyboardEvent) => {
      const results = state.get("results");
      if (e.key === "Escape") {
        state.set("open", false);
        state.set("active", -1);
        return;
      }
      if (e.key === "ArrowDown") {
        if (!results.length) return;
        e.preventDefault();
        state.set("open", true);
        state.set("active", (state.get("active") + 1) % results.length);
        return;
      }
      if (e.key === "ArrowUp") {
        if (!results.length) return;
        e.preventDefault();
        state.set(
          "active",
          (state.get("active") - 1 + results.length) % results.length,
        );
        return;
      }
      if (e.key === "Enter") {
        const active = state.get("active");
        navigate(active >= 0 ? results[active] : results[0]);
      }
    },
    $: [inputSearch({ color: "neutral", accentColor: "primary" })],
    style: { width: "100%" },
  };

  const dropdown: DomphyElement = {
    div: (l) =>
      state.get("open", l)
        ? state
            .get("results", l)
            .map((r, i) => resultRow(r, i, widgetId, state))
        : [],
    id: listboxId,
    role: "listbox",
    $: [
      menu({ selectable: false, color: "neutral" }),
      card({ color: "neutral" }),
    ],
    style: {
      display: (l) => (state.get("open", l) ? "block" : "none"),
      position: "absolute",
      insetInlineStart: 0,
      insetInlineEnd: 0,
      marginBlockStart: themeSpacing(1),
      maxHeight: themeSpacing(80),
      overflowY: "auto",
      zIndex: "50",
    },
  };

  return {
    div: [input, dropdown],
    role: "search",
    style: { position: "relative", display: "block", width: "100%" },
    _onMount: (node) => {
      fetch(indexUrl)
        .then((r) => r.text())
        .then((text) => {
          state.set("index", text);
          if (state.get("query").trim()) runQuery(state, limit);
        })
        .catch(() => {});
      const host = node.domElement as HTMLElement;
      const handler = (e: Event) => {
        if (!host.contains(e.target as Node)) state.set("open", false);
      };
      document.addEventListener("pointerdown", handler);
      node.setMetadata("dpSearchHandler", handler);
    },
    _onRemove: (node) => {
      const handler = node.getMetadata("dpSearchHandler") as
        | ((e: Event) => void)
        | undefined;
      if (handler) document.removeEventListener("pointerdown", handler);
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

export function mountSearch(
  host: HTMLElement,
  options: SearchWidgetOptions = {},
): ElementNode {
  while (host.firstChild) host.removeChild(host.firstChild);
  const node = new ElementNode(searchWidget(options));
  node.render(host);
  return node;
}
