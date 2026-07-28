import { Mark } from "../Extendable";
import type { Attributes, CommandProps, RawCommands } from "../types";
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

/** A hyperlink mark, rendered as `<a href>`. */
export const Link = Mark.create<LinkOptions>({
  name: "link",

  priority: 1000,

  keepOnSplit: false,

  exitable: true,

  addOptions() {
    return {
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
    };
  },

  onCreate() {
    const host = this.editor.view?.element;

    if (!this.options.openOnClick || !host) {
      return;
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
    host.addEventListener("click", handleClick);
  },

  onDestroy() {
    const host = this.editor.view?.element;
    const handleClick = this.storage.handleClick as
      | ((event: MouseEvent) => void)
      | null;

    if (host && handleClick) {
      host.removeEventListener("click", handleClick);
    }

    this.storage.handleClick = null;
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
});
