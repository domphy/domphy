import { Mark } from "../Extendable";
import { nodesBetween, textBetween } from "../model/position";
import type { Schema } from "../model/schema";
import type {
  Attributes,
  CommandProps,
  EditorInstance,
  InputRule,
  JSONContent,
  RawCommands,
} from "../types";
import { mergeAttributes } from "./mergeAttributes";

export interface LinkProtocolOptions {
  /** Protocol scheme to allow, e.g. `ftp`. */
  scheme: string;
}

export type LinkAttributes = {
  href: string;
  target?: string | null;
  rel?: string | null;
  class?: string | null;
};

export interface UriValidationContext {
  defaultValidate: (url: string | undefined) => boolean;
  protocols: Array<LinkProtocolOptions | string>;
}

export interface LinkOptions {
  /** Turn a URL into a link as soon as it is followed by a space or Enter. */
  autolink: boolean;
  /** Follow a link when it is Mod-clicked, or plain-clicked while read-only. */
  openOnClick: boolean;
  /** Extra protocols accepted on top of the built-in safe list. */
  protocols: Array<LinkProtocolOptions | string>;
  /** Guard against `javascript:` and friends; override only deliberately. */
  isAllowedUri: (
    url: string | undefined,
    context: UriValidationContext,
  ) => boolean;
  /** HTML attributes added to every rendered link. */
  HTMLAttributes: Attributes;
}

// From DOMPurify: whitespace and control characters a URL may hide its
// protocol behind, such as `java\nscript:`. Stripping them is the point.
const UNICODE_WHITESPACE_REGEX_GLOBAL =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional XSS guard
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g;

/**
 * Reject URLs whose protocol is not on the safe list — the XSS guard used by
 * both parsing and rendering.
 */
export function isAllowedUri(
  uri: string | undefined,
  protocols?: Array<LinkProtocolOptions | string>,
): boolean {
  if (!uri) {
    return true;
  }

  const allowedProtocols = [
    "http",
    "https",
    "ftp",
    "ftps",
    "mailto",
    "tel",
    "callto",
    "sms",
    "cid",
    "xmpp",
  ];

  for (const protocol of protocols ?? []) {
    const scheme = typeof protocol === "string" ? protocol : protocol.scheme;

    if (scheme) {
      allowedProtocols.push(scheme);
    }
  }

  const pattern = new RegExp(
    `^(?:(?:${allowedProtocols
      .map((protocol) => protocol.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"))
      .join("|")}):|[^a-z]|[a-z0-9+.\\-]+(?:[^a-z+.\\-:]|$))`,
    "i",
  );

  return pattern.test(uri.replace(UNICODE_WHITESPACE_REGEX_GLOBAL, ""));
}

function validationContext(options: LinkOptions): UriValidationContext {
  return {
    defaultValidate: (url) => isAllowedUri(url, options.protocols),
    protocols: options.protocols,
  };
}

// ponytail: strict `http(s)://` and `www.` matcher — no bare domains, no
// custom protocols, no IDN. Swap in linkifyjs if bare-domain autolink matters.
const AUTOLINK_PATTERN = /^(?:https?:\/\/\S+|www\.\S+\.\S+)$/i;
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"]+$/;

/** The href a typed word should link to, or null when it is not a URL. */
function autolinkHref(word: string, options: LinkOptions): string | null {
  const trimmed = word.replace(TRAILING_PUNCTUATION, "");

  if (!AUTOLINK_PATTERN.test(trimmed)) {
    return null;
  }

  const href = /^www\./i.test(trimmed) ? `http://${trimmed}` : trimmed;

  return options.isAllowedUri(href, validationContext(options)) ? href : null;
}

/** Length of the word that should carry the mark, trailing punctuation aside. */
function linkedLength(word: string): number {
  return word.replace(TRAILING_PUNCTUATION, "").length;
}

/**
 * True when any inline node in [from, to) already carries the mark.
 *
 * With `inclusive: false`, `editor.isActive(name)` is false on the boundary
 * right after a link, so it cannot protect a URL that already sits inside a
 * link from being re-linked (and its href clobbered) by autolink. The word's
 * own range is the thing to check.
 */
function rangeHasMark(
  schema: Schema,
  doc: JSONContent,
  from: number,
  to: number,
  name: string,
): boolean {
  let found = false;
  nodesBetween(schema, doc, from, to, (node) => {
    if ((node.marks ?? []).some((mark) => mark.type === name)) {
      found = true;
      return false;
    }
    return undefined;
  });
  return found;
}

/**
 * Link the word before the caret, for the Enter path where no text is typed
 * and so no input rule fires.
 */
function autolinkBeforeCursor(
  editor: EditorInstance,
  options: LinkOptions,
  name: string,
): void {
  if (editor.isActive(name)) {
    return;
  }

  editor.commands.command(({ tr }) => {
    if (!tr.selection.empty) {
      return false;
    }

    const caret = tr.selection.from;
    const textBefore = textBetween(
      editor.schema as Schema,
      tr.doc,
      tr.resolve(caret).start(),
      caret,
      "",
      () => " ",
    );
    const word = /\S+$/.exec(textBefore)?.[0];
    const href = word ? autolinkHref(word, options) : null;

    if (!word || !href) {
      return false;
    }

    const from = caret - word.length;

    if (rangeHasMark(editor.schema as Schema, tr.doc, from, caret, name)) {
      return false;
    }

    tr.addMark(from, from + linkedLength(word), {
      type: name,
      attrs: { href },
    });
    // The Enter handler returns false so splitBlock runs as a second
    // transaction; this flag folds that follow-up into the same history
    // group, so one undo reverts the whole gesture.
    tr.setMeta("appendNextToHistoryGroup", true);
    return true;
  });
}

/** A hyperlink mark, rendered as `<a href>`. */
export const Link = Mark.create<LinkOptions>({
  name: "link",

  priority: 1000,

  keepOnSplit: false,

  exitable: true,

  // Typing at the end of a link starts unlinked text, like tiptap.
  inclusive: false,

  addOptions() {
    return {
      autolink: true,
      openOnClick: true,
      protocols: [],
      isAllowedUri: (url, context) => context.defaultValidate(url),
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        class: null,
      },
    };
  },

  addStorage() {
    return {
      handleClick: null,
      clickHost: null,
    };
  },

  onMount() {
    const host = this.editor.view?.element;

    if (!this.options.openOnClick || !host) {
      return;
    }

    // Idempotent across re-mounts: detach from the previous host first, so a
    // moved editor never double-fires or keeps a stale element alive.
    const previous = this.storage.clickHost as HTMLElement | null;

    if (previous === host && this.storage.handleClick) {
      return;
    }

    if (previous && this.storage.handleClick) {
      previous.removeEventListener(
        "click",
        this.storage.handleClick as (event: MouseEvent) => void,
      );
    }

    const handleClick = (event: MouseEvent) => {
      // Plain clicks stay inside the editor while it is editable.
      if (this.editor.isEditable && !event.metaKey && !event.ctrlKey) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
      const href = anchor?.getAttribute("href");

      if (
        !href ||
        !this.options.isAllowedUri(href, validationContext(this.options))
      ) {
        return;
      }

      event.preventDefault();
      window.open(href, anchor?.getAttribute("target") ?? "_blank");
    };

    this.storage.handleClick = handleClick;
    this.storage.clickHost = host;
    host.addEventListener("click", handleClick);
  },

  onDestroy() {
    const host = this.storage.clickHost as HTMLElement | null;
    const handleClick = this.storage.handleClick as
      | ((event: MouseEvent) => void)
      | null;

    if (host && handleClick) {
      host.removeEventListener("click", handleClick);
    }

    this.storage.handleClick = null;
    this.storage.clickHost = null;
  },

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
      },
      target: {
        default: this.options.HTMLAttributes.target ?? null,
      },
      rel: {
        default: this.options.HTMLAttributes.rel ?? null,
      },
      class: {
        default: this.options.HTMLAttributes.class ?? null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (element) =>
          this.options.isAllowedUri(
            element.getAttribute("href") ?? undefined,
            validationContext(this.options),
          )
            ? null
            : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const href = HTMLAttributes.href as string | undefined;
    const safeAttributes = this.options.isAllowedUri(
      href,
      validationContext(this.options),
    )
      ? HTMLAttributes
      : { ...HTMLAttributes, href: "" };

    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, safeAttributes),
      0,
    ];
  },

  addCommands(): RawCommands {
    return {
      setLink:
        (attributes: LinkAttributes) =>
        ({ commands }: CommandProps): boolean => {
          if (
            !this.options.isAllowedUri(
              attributes.href,
              validationContext(this.options),
            )
          ) {
            return false;
          }

          return commands.setMark(this.name, attributes);
        },
      toggleLink:
        (attributes?: LinkAttributes) =>
        ({ commands }: CommandProps): boolean => {
          if (
            attributes?.href &&
            !this.options.isAllowedUri(
              attributes.href,
              validationContext(this.options),
            )
          ) {
            return false;
          }

          // A cursor inside a link toggles the whole link, not just the caret.
          return commands.toggleMark(this.name, attributes, {
            extendEmptyMarkRange: true,
          });
        },
      unsetLink:
        () =>
        ({ commands }: CommandProps): boolean =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },

  addInputRules(): InputRule[] {
    if (!this.options.autolink) {
      return [];
    }

    return [
      {
        // The rule replaces the typed separator, so the handler reinserts it.
        find: /(\S+)(\s)$/,
        handler: ({ editor, range, match, chain }) => {
          const [, word, separator] = match;
          const href = autolinkHref(word, this.options);

          // Only plain typing: nothing selected, match ends at the caret, and
          // the word is not already inside a link.
          if (
            !href ||
            range.from + word.length !== range.to ||
            rangeHasMark(
              editor.schema as Schema,
              editor.state.doc,
              range.from,
              range.to,
              this.name,
            )
          ) {
            return;
          }

          chain()
            .insertContentAt(range.to, { type: "text", text: separator })
            .setTextSelection({
              from: range.from,
              to: range.from + linkedLength(word),
            })
            .setMark(this.name, { href })
            .setTextSelection(range.to + separator.length)
            .run();
        },
      },
    ];
  },

  addKeyboardShortcuts(): Record<
    string,
    (props: { editor: EditorInstance }) => boolean
  > {
    if (!this.options.autolink) {
      return {};
    }

    return {
      Enter: ({ editor }) => {
        autolinkBeforeCursor(editor, this.options, this.name);
        // Never consume Enter — splitBlock and the list handlers still run.
        return false;
      },
    };
  },
});
