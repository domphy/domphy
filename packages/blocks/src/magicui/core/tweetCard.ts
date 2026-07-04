// magicui "Tweet Card" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A card
// that replicates a single social-post embed: avatar/name/verified-badge
// header, body text with mention/hashtag/link styling, optional media grid
// or link-preview card, an optional nested quoted post, and a footer
// timestamp. Shows a pulsing skeleton while data loads and a graceful
// fallback on fetch failure. The tweet-data contract (author, text, media,
// createdAt, optional quoted tweet) and the injectable `fetchTweet` are an
// independently designed shape to build against, not lifted from any
// existing fetching library.

import type { DomphyElement, ElementNode, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, empty, icon, link, paragraph, skeleton, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface TweetAuthor {
  name: string;
  handle: string;
  avatarUrl?: string;
  verified?: boolean;
}

export interface TweetMedia {
  url: string;
  alt?: string;
}

export interface TweetLinkPreview {
  url: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface TweetData {
  id: string;
  author: TweetAuthor;
  text: string;
  createdAt: string | number | Date;
  media?: TweetMedia[];
  linkPreview?: TweetLinkPreview;
  quotedTweet?: TweetData;
}

export type TweetFetcher = (tweetId: string) => Promise<TweetData>;

export interface TweetCardProps {
  /** Tweet id to resolve via `fetchTweet`. Ignored when `tweet` is provided. */
  tweetId?: string;
  /** Pre-fetched tweet data — renders synchronously with no loading skeleton (the server-rendered path). */
  tweet?: TweetData;
  /** Injectable data source, so the card is testable against static fixtures without a real network call. Defaults to a bundled mock fixture lookup. */
  fetchTweet?: TweetFetcher;
  /** Forces the card's subtree to a specific theme instead of inheriting the ambient page theme. */
  theme?: "light" | "dark";
  showMedia?: boolean;
  showQuotedTweet?: boolean;
}

type TweetPhase = "loading" | "loaded" | "error";

const DEFAULT_TWEET: TweetData = {
  id: "domphy-demo-1",
  author: { name: "Ada Byte", handle: "adabyte", verified: true },
  text: "Shipping a whole design system as plain objects keyed by HTML tag. No JSX, no virtual DOM. @domphy #buildinpublic https://domphy.com",
  createdAt: "2026-06-18T15:32:00Z",
  linkPreview: {
    url: "https://domphy.com",
    title: "Domphy — the AI-friendly UI framework",
    description: "Patch-based UI for native elements, with a runtime built for reactivity and theming.",
  },
};

const MOCK_TWEET_FIXTURES: Record<string, TweetData> = {
  [DEFAULT_TWEET.id]: DEFAULT_TWEET,
};

/**
 * Default injectable fetcher: resolves from an in-memory fixture table
 * (falling back to a synthesized placeholder tweet for unknown ids) after a
 * short simulated network delay. No real network request is made — callers
 * that need live data should pass their own `fetchTweet`.
 */
const defaultFetchTweet: TweetFetcher = (tweetId) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        MOCK_TWEET_FIXTURES[tweetId] ?? {
          id: tweetId,
          author: { name: "Unknown Author", handle: "unknown" },
          text: "This is placeholder content for a tweet id with no bundled fixture.",
          createdAt: Date.now(),
        },
      );
    }, 400);
  });

function formatTweetDate(createdAt: TweetData["createdAt"]): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Small outline checkmark badge shown next to a verified author's name. */
function verifiedBadgeIcon(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { circle: null, cx: "12", cy: "12", r: "9" },
          { polyline: null, points: "8,12.5 11,15.5 16,9" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaLabel: "Verified account",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    $: [icon({ color: "info" })],
    style: { width: themeSpacing(4), height: themeSpacing(4), flexShrink: "0" },
  };
}

/** Small generic chat-bubble mark standing in for a "platform" logo — a
 * deliberately original, generic glyph, not a reproduction of any specific
 * platform's trademarked logo. */
function platformLogoIcon(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: "M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
          },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.75",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    $: [icon({ color: "neutral" })],
    style: { width: themeSpacing(4), height: themeSpacing(4), marginInlineStart: "auto", flexShrink: "0" },
  };
}

function tweetHeader(author: TweetAuthor): DomphyElement<"div"> {
  const initials =
    author.name
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const nameRowChildren: DomphyElement[] = [{ strong: author.name, $: [strong()] }];
  if (author.verified) nameRowChildren.push(verifiedBadgeIcon());

  return {
    div: [
      {
        span: author.avatarUrl
          ? [{ img: null, src: author.avatarUrl, alt: author.name, loading: "lazy" as const }]
          : initials,
        $: [avatar({ color: "primary" })],
      },
      {
        div: [
          {
            div: nameRowChildren,
            style: { display: "flex", alignItems: "center", gap: themeSpacing(1) },
          },
          { small: `@${author.handle}`, $: [small()] },
        ],
        style: { display: "flex", flexDirection: "column", minWidth: "0", overflow: "hidden" },
      },
      platformLogoIcon(),
    ],
    style: { display: "flex", alignItems: "flex-start", gap: themeSpacing(3) },
  };
}

/** Splits the tweet body into plain text runs and clickable @mention / #hashtag / URL entities. */
function tweetTextBody(text: string): DomphyElement<"p"> {
  const tokens = text.split(/(\s+)/);
  const children: (string | DomphyElement<"a">)[] = tokens.map((token, index) => {
    if (/^https?:\/\/\S+/.test(token)) {
      return {
        a: token,
        href: token,
        target: "_blank",
        rel: "noopener noreferrer",
        _key: `entity-${index}`,
        // `link()` only underlines on hover — these entities sit inline
        // within the tweet body's own plain-text runs, so axe-core's
        // `link-in-text-block` rule (WCAG 1.4.1) needs them distinguishable
        // from surrounding text at rest too, not just by color.
        style: { textDecoration: "underline" },
        $: [link({ color: "info" })],
      };
    }
    if (/^[@#]\w+/.test(token)) {
      return {
        a: token,
        href: "#",
        _key: `entity-${index}`,
        style: { textDecoration: "underline" },
        $: [link({ color: "info" })],
      };
    }
    return token;
  });

  return { p: children as DomphyElement<"p">["p"], $: [paragraph()] };
}

function mediaGrid(media: TweetMedia[]): DomphyElement<"div"> {
  const shown = media.slice(0, 4);
  const columns = shown.length === 1 ? 1 : 2;

  return {
    div: shown.map((item, index) => ({
      img: null,
      src: item.url,
      alt: item.alt ?? "",
      loading: "lazy" as const,
      _key: `media-${index}`,
      style: {
        width: "100%",
        height: "100%",
        aspectRatio: shown.length === 1 ? "16 / 9" : "1 / 1",
        objectFit: "cover",
        display: "block",
      },
    })),
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: themeSpacing(0.5),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      overflow: "hidden",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
    },
  };
}

function linkPreviewCard(preview: TweetLinkPreview): DomphyElement<"a"> {
  let hostname = preview.url;
  try {
    hostname = new URL(preview.url).hostname;
  } catch {
    // Malformed preview URL — fall back to showing the raw string.
  }

  const detailChildren: DomphyElement[] = [{ strong: preview.title, $: [strong()] }];
  if (preview.description) detailChildren.push({ small: preview.description, $: [small()] });
  detailChildren.push({ small: hostname, $: [small()] });

  const cardChildren: DomphyElement[] = [];
  if (preview.thumbnailUrl) {
    cardChildren.push({
      img: null,
      src: preview.thumbnailUrl,
      alt: "",
      loading: "lazy",
      style: { width: "100%", display: "block", objectFit: "cover", aspectRatio: "2 / 1" },
    });
  }
  cardChildren.push({
    div: detailChildren,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  });

  return {
    a: cardChildren,
    href: preview.url,
    target: "_blank",
    rel: "noopener noreferrer",
    style: {
      display: "block",
      textDecoration: () => "none",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      overflow: "hidden",
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      "&:hover": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1") },
    },
  };
}

function tweetFooter(createdAt: TweetData["createdAt"]): DomphyElement<"div"> {
  return {
    div: [{ small: formatTweetDate(createdAt), $: [small()] }],
    style: {
      display: "flex",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      borderTop: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      paddingTop: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

interface TweetBodyOptions {
  showMedia: boolean;
  showQuotedTweet: boolean;
  /** Caps quoted-tweet nesting at one level, so a quote never renders its own quote. */
  depth: number;
}

function tweetBody(data: TweetData, options: TweetBodyOptions): DomphyElement<"div"> {
  const children: DomphyElement[] = [tweetHeader(data.author), tweetTextBody(data.text)];

  if (options.showMedia && data.media?.length) children.push(mediaGrid(data.media));
  if (data.linkPreview) children.push(linkPreviewCard(data.linkPreview));
  if (options.showQuotedTweet && data.quotedTweet && options.depth < 1) {
    children.push({
      div: [
        tweetBody(data.quotedTweet, {
          showMedia: options.showMedia,
          showQuotedTweet: false,
          depth: options.depth + 1,
        }),
      ],
      dataTone: "shift-2",
      style: {
        borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
        padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
        backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
        color: (listener: Listener) => themeColor(listener, "shift-10"),
        outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
        outlineOffset: "-1px",
      },
    });
  }
  children.push(tweetFooter(data.createdAt));

  return {
    div: children,
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  };
}

function tweetSkeleton(): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          { span: null, $: [skeleton()], style: { width: themeSpacing(9), height: themeSpacing(9), borderRadius: "50%" } },
          {
            div: [
              { span: null, $: [skeleton()], style: { width: "40%" } },
              { span: null, $: [skeleton()], style: { width: "25%" } },
            ],
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), flex: "1 1 auto" },
          },
        ],
        style: { display: "flex", gap: themeSpacing(3), alignItems: "center" },
      },
      { span: null, $: [skeleton()], style: { width: "100%" } },
      { span: null, $: [skeleton()], style: { width: "80%" } },
    ],
    ariaLabel: "Loading tweet",
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(3) },
  };
}

function tweetFallback(): DomphyElement<"div"> {
  return {
    div: [{ span: "🚫" }, { p: "This post is unavailable.", $: [paragraph()] }],
    $: [empty()],
  };
}

/**
 * A card replicating a single social-post embed, with header/body/media/
 * link-preview/quoted-post/footer regions, a loading skeleton, and a
 * fallback state on fetch failure. Call with no arguments for a working
 * demo tweet (rendered synchronously — no loading flicker). Pass `tweetId`
 * (with an optional injectable `fetchTweet`) to exercise the async
 * loading/error states instead.
 */
function tweetCard(props: TweetCardProps = {}): DomphyElement<"div"> {
  const fetchTweet = props.fetchTweet ?? defaultFetchTweet;
  const showMedia = props.showMedia ?? true;
  const showQuotedTweet = props.showQuotedTweet ?? true;

  const initialTweet = props.tweet ?? (props.tweetId ? null : DEFAULT_TWEET);
  const phase = toState<TweetPhase>(initialTweet ? "loaded" : "loading");
  const tweetState = toState<TweetData | null>(initialTweet);

  return {
    div: (listener: Listener) => {
      const currentPhase = phase.get(listener);
      // Each phase gets a distinct `_key` so the reconciler replaces the
      // single child outright on a phase transition instead of positionally
      // patching the old (structurally different) DOM subtree in place —
      // without this, stale attributes/nodes from the previous phase can
      // leak through (e.g. the skeleton's `aria-label` surviving onto the
      // loaded body).
      if (currentPhase === "loading") return [{ ...tweetSkeleton(), _key: "skeleton" }];
      const data = tweetState.get(listener);
      if (currentPhase === "error" || !data) return [{ ...tweetFallback(), _key: "error" }];
      return [{ ...tweetBody(data, { showMedia, showQuotedTweet, depth: 0 }), _key: `body-${data.id}` }];
    },
    role: "article",
    dataTheme: props.theme,
    dataTone: "shift-1",
    style: {
      display: "block",
      width: "100%",
      maxWidth: themeSpacing(120),
      borderRadius: (listenerValue: Listener) => themeSpacing(themeDensity(listenerValue) * 3),
      padding: (listenerValue: Listener) => themeSpacing(themeDensity(listenerValue) * 4),
      backgroundColor: (listenerValue: Listener) => themeColor(listenerValue, "inherit"),
      color: (listenerValue: Listener) => themeColor(listenerValue, "shift-10"),
      outline: (listenerValue: Listener) => `1px solid ${themeColor(listenerValue, "shift-3")}`,
      outlineOffset: "-1px",
    },
    _onMount: (node: ElementNode) => {
      if (props.tweet || !props.tweetId) return;
      let cancelled = false;
      fetchTweet(props.tweetId)
        .then((data) => {
          if (cancelled) return;
          tweetState.set(data);
          phase.set("loaded");
        })
        .catch(() => {
          if (cancelled) return;
          phase.set("error");
        });
      node.addHook("Remove", () => {
        cancelled = true;
      });
    },
  };
}

export { tweetCard, defaultFetchTweet };
