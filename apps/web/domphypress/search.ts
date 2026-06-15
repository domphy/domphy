// DomphyPress local search — a self-contained, zero-dependency engine that
// replaces the VitePress default search. It has two halves:
//
//  1. A build-time index builder (`buildSearchIndex`) that turns the site's
//     `SearchDocument[]` into a compact, deterministic inverted index serialized
//     as a JSON string. The build writes that string to `public/search-index.json`.
//
//  2. A client search widget (`searchWidget`) built entirely in Domphy. It
//     fetches the index once on mount, queries it as the user types (debounced),
//     and renders the matches as deep links grouped by page.
//
// The index format is hand-rolled rather than delegated to a third-party search
// library so the engine carries no extra runtime dependency and the serialized
// output is fully deterministic (no timestamps, no random ids), which keeps the
// generated `search-index.json` stable across builds.

import { type DomphyElement, ElementNode, RecordState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { card, inputSearch, link, menu, small } from "@domphy/ui";
import type { SearchDocument, TocEntry } from "./types";

// --- Serialized index shape --------------------------------------------------

/**
 * A single searchable unit. Each page contributes one "page" entry (the whole
 * body) plus one "section" entry per heading in its table of contents. Section
 * entries carry the heading `slug` so a result can deep-link to `route#slug`.
 */
interface SearchEntry {
  /** Page route, e.g. "/docs/core/syntax". */
  route: string;
  /** Page title, repeated on every entry so results can group by page. */
  pageTitle: string;
  /** Heading text for a section entry; equals the page title for a page entry. */
  heading: string;
  /** Heading slug for a section entry; empty for a page entry (links to route). */
  slug: string;
  /** True for the page-level entry, false for heading-level entries. */
  isPage: boolean;
}

/**
 * The serialized index. `entries` is the flat list of searchable units;
 * `postings` maps each term to the entry indices that contain it together with
 * the highest-weight field the term appeared in for that entry. Storing only the
 * best field keeps the postings list small while preserving title-over-body rank.
 */
interface SerializedIndex {
  entries: SearchEntry[];
  /** term -> array of `[entryIndex, fieldWeight]` pairs. */
  postings: Record<string, [number, number][]>;
}

/** A single resolved search hit handed to the UI. */
export interface SearchResult {
  route: string;
  pageTitle: string;
  heading: string;
  slug: string;
  isPage: boolean;
  /** Combined relevance score; higher is better. */
  score: number;
  /** Deep-link target, `route` for a page hit or `route#slug` for a section. */
  href: string;
}

// Field weights. A term that matches in a title outranks the same term matching
// only in a heading, which in turn outranks a body-text-only match.
const FIELD_TITLE = 3;
const FIELD_HEADING = 2;
const FIELD_BODY = 1;

// --- Tokenization ------------------------------------------------------------

/**
 * Splits text into lowercased word tokens. Unicode letters and numbers are kept,
 * everything else is a separator. Single-character tokens are dropped because
 * they add noise without improving recall for documentation search.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length >= 2) tokens.push(raw);
  }
  return tokens;
}

// --- Build-time index builder ------------------------------------------------

/**
 * Records every token of `text` into the postings map for `entryIndex`, keeping
 * only the strongest field weight seen for that (term, entry) pair so a single
 * entry never inflates a term's rank by repeating it.
 */
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
    if (existing === undefined || fieldWeight > existing) {
      perEntry.set(entryIndex, fieldWeight);
    }
  }
}

/**
 * Builds the search index from the site's documents and serializes it to a JSON
 * string. The output is deterministic: entries follow document order, terms are
 * emitted in sorted order, and each postings list is sorted by entry index. No
 * timestamps or random values are introduced.
 */
export function buildSearchIndex(docs: SearchDocument[]): string {
  const entries: SearchEntry[] = [];
  const postings = new Map<string, Map<number, number>>();

  for (const doc of docs) {
    // Page-level entry: title is weighted highest, the whole body is indexed.
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

    // Section entries: one per heading, so results can deep-link to `#slug`.
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
  const sortedTerms = Array.from(postings.entries()).sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  );
  for (const [term, perEntry] of sortedTerms) {
    serializedPostings[term] = Array.from(perEntry.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([entryIndex, weight]) => [entryIndex, weight]);
  }

  const index: SerializedIndex = { entries, postings: serializedPostings };
  return JSON.stringify(index);
}

// --- Query -------------------------------------------------------------------

/**
 * Queries a serialized index and returns the top matches ordered by relevance.
 * A query term contributes its field weight to every entry it appears in; an
 * entry that matches more of the query terms is ranked above one that matches
 * fewer (term coverage breaks ties before raw weight). Prefix matches are
 * supported so partial typing surfaces results before the word is finished.
 */
export function queryIndex(
  serializedIndex: string,
  query: string,
  limit = 10,
): SearchResult[] {
  const index = JSON.parse(serializedIndex) as SerializedIndex;
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  // For each candidate entry track the accumulated weight and how many distinct
  // query terms it matched, so coverage can dominate ranking.
  const scoreByEntry = new Map<number, number>();
  const matchedTermsByEntry = new Map<number, number>();

  for (const term of terms) {
    // Collect postings for the exact term plus any term that has it as a prefix.
    const seenForThisTerm = new Set<number>();
    for (const indexedTerm in index.postings) {
      if (indexedTerm !== term && !indexedTerm.startsWith(term)) continue;
      const exact = indexedTerm === term;
      for (const [entryIndex, fieldWeight] of index.postings[indexedTerm]) {
        // An exact term match is worth its full field weight; a prefix-only
        // match is discounted so completed words rank above partial ones.
        const contribution = exact ? fieldWeight : fieldWeight * 0.5;
        scoreByEntry.set(
          entryIndex,
          (scoreByEntry.get(entryIndex) ?? 0) + contribution,
        );
        if (!seenForThisTerm.has(entryIndex)) {
          seenForThisTerm.add(entryIndex);
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
      // Coverage is the primary signal; field weight refines within a coverage
      // band. Scaling coverage keeps it dominant over accumulated field weight.
      score: coverage * 100 + score,
      href: entry.slug ? `${entry.route}#${entry.slug}` : entry.route,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Stable, deterministic tie-break so equal-score hits keep a fixed order.
    if (a.route !== b.route) return a.route < b.route ? -1 : 1;
    return a.isPage === b.isPage ? 0 : a.isPage ? -1 : 1;
  });

  return results.slice(0, limit);
}

// --- Client widget -----------------------------------------------------------

export interface SearchWidgetOptions {
  /** URL the built index is fetched from. Defaults to "/search-index.json". */
  indexUrl?: string;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Maximum number of results to show. */
  limit?: number;
}

interface WidgetState {
  /** The serialized index text once fetched; null until then. */
  index: string | null;
  /** Current input query. */
  query: string;
  /** Current resolved results. */
  results: SearchResult[];
  /** Whether the results dropdown is shown. */
  open: boolean;
  /** Index of the keyboard-highlighted result, -1 when none. */
  active: number;
}

/** Stable id for a result row so it can be referenced by aria-activedescendant. */
function optionId(widgetId: number, resultIndex: number): string {
  return `domphypress-search-${widgetId}-option-${resultIndex}`;
}

// Each widget instance gets a unique id namespace for its option element ids.
let widgetCounter = 0;

/**
 * Builds a single result row as a deep link. Reactive styling reflects the
 * keyboard-active row; clicking navigates and closes the dropdown.
 */
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

/**
 * Resolves the current query against the loaded index and writes the results
 * (and a fresh open/active state) back into the widget state.
 */
function runQuery(state: RecordState<WidgetState>, limit: number): void {
  const index = state.get("index");
  const query = state.get("query");
  const results = index && query.trim() ? queryIndex(index, query, limit) : [];
  state.set("results", results);
  state.set("active", -1);
  state.set("open", results.length > 0);
}

/**
 * The DomphyPress search widget: a search input plus a results dropdown built
 * with Domphy patches. On mount it fetches the serialized index once; on input
 * it queries (debounced) and renders deep links grouped under their page. Arrow
 * keys move the highlight, Enter navigates, Escape closes.
 */
export function searchWidget(options: SearchWidgetOptions = {}): DomphyElement {
  const {
    indexUrl = "/search-index.json",
    placeholder = "Search docs…",
    limit = 10,
  } = options;

  const widgetId = ++widgetCounter;
  const listboxId = `domphypress-search-${widgetId}-listbox`;

  const state = new RecordState<WidgetState>({
    index: null,
    query: "",
    results: [],
    open: false,
    active: -1,
  });

  // Debounce handle shared across keystrokes so only the latest query runs.
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
      const active = state.get("active", l);
      return active >= 0 ? optionId(widgetId, active) : undefined;
    },
    value: (l) => state.get("query", l),
    onInput: (e) => {
      const value = (e.target as HTMLInputElement).value;
      state.set("query", value);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => runQuery(state, limit), 120);
    },
    onFocus: () => {
      if (state.get("results").length > 0) state.set("open", true);
    },
    onKeyDown: (e: KeyboardEvent) => {
      const results = state.get("results");
      const key = e.key;
      if (key === "Escape") {
        state.set("open", false);
        state.set("active", -1);
        return;
      }
      if (key === "ArrowDown") {
        if (results.length === 0) return;
        e.preventDefault();
        state.set("open", true);
        const next = (state.get("active") + 1) % results.length;
        state.set("active", next);
        return;
      }
      if (key === "ArrowUp") {
        if (results.length === 0) return;
        e.preventDefault();
        const current = state.get("active");
        const next = (current - 1 + results.length) % results.length;
        state.set("active", next);
        return;
      }
      if (key === "Enter") {
        const active = state.get("active");
        const target = active >= 0 ? results[active] : results[0];
        if (target) {
          e.preventDefault();
          navigate(target);
        }
      }
    },
    $: [inputSearch({ color: "neutral", accentColor: "primary" })],
    style: {
      width: "100%",
    },
  };

  const dropdown: DomphyElement = {
    div: (l) =>
      state.get("open", l)
        ? state
            .get("results", l)
            .map((result, resultIndex) =>
              resultRow(result, resultIndex, widgetId, state),
            )
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
    style: {
      position: "relative",
      display: "block",
      width: "100%",
    },
    _onMount: (node) => {
      // Fetch the serialized index exactly once when the widget mounts. Any
      // query typed before the fetch resolves is re-run as soon as it lands.
      fetch(indexUrl)
        .then((response) => response.text())
        .then((text) => {
          state.set("index", text);
          if (state.get("query").trim()) runQuery(state, limit);
        })
        .catch(() => {
          // Network or parse failure leaves the widget usable but empty; there
          // is nothing actionable to surface to the user from a missing index.
        });

      // Close the dropdown when focus or a click leaves the widget subtree.
      const host = node.domElement as HTMLElement;
      const onDocumentPointerDown = (e: Event) => {
        if (!host.contains(e.target as Node)) state.set("open", false);
      };
      document.addEventListener("pointerdown", onDocumentPointerDown);
      node.setMetadata("onDocumentPointerDown", onDocumentPointerDown);
    },
    _onRemove: (node) => {
      const handler = node.getMetadata("onDocumentPointerDown") as
        | ((e: Event) => void)
        | undefined;
      if (handler) document.removeEventListener("pointerdown", handler);
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}

/**
 * Mounts the search widget into an existing host element and returns the root
 * node so the caller can later remove it. Used by the build's island bootstrap
 * to hydrate the search box on every page.
 */
export function mountSearch(
  host: HTMLElement,
  options: SearchWidgetOptions = {},
): ElementNode {
  const node = new ElementNode(searchWidget(options));
  node.render(host);
  return node;
}
