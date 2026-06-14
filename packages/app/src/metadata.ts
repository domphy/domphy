import type { LoaderContext, MetadataValue } from "./types.js";

/**
 * Port of the Next.js Metadata API. Static objects merge from root layout to
 * page; later segments override earlier ones. `title.template` applies to the
 * titles of child segments, exactly like Next.js.
 */

export interface MetadataTitle {
  default?: string;
  template?: string;
  absolute?: string;
}

export interface OpenGraphImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OpenGraphMetadata {
  title?: string;
  description?: string;
  url?: string;
  siteName?: string;
  type?: string;
  locale?: string;
  images?: (string | OpenGraphImage)[];
}

export interface TwitterMetadata {
  card?: "summary" | "summary_large_image" | "app" | "player";
  title?: string;
  description?: string;
  site?: string;
  creator?: string;
  images?: string[];
}

export interface RobotsMetadata {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
}

export interface IconsMetadata {
  icon?: string;
  shortcut?: string;
  apple?: string;
}

export interface AlternatesMetadata {
  canonical?: string;
  languages?: Record<string, string>;
}

export interface Metadata {
  title?: string | MetadataTitle;
  description?: string;
  applicationName?: string;
  generator?: string;
  keywords?: string[];
  authors?: { name: string; url?: string }[];
  referrer?: string;
  themeColor?: string;
  colorScheme?: string;
  viewport?: string;
  robots?: string | RobotsMetadata;
  icons?: string | IconsMetadata;
  openGraph?: OpenGraphMetadata;
  twitter?: TwitterMetadata;
  alternates?: AlternatesMetadata;
  metadataBase?: string;
  /** Arbitrary extra meta tags: name -> content. */
  other?: Record<string, string>;
}

export interface ResolvedMetadata extends Omit<Metadata, "title"> {
  title?: string;
}

export interface HeadTag {
  tag: "title" | "meta" | "link";
  attributes: Record<string, string>;
  content?: string;
}

/** Resolves the metadata chain of all matched segments into one flat object. */
export async function resolveMetadata(
  values: (MetadataValue | undefined)[],
  context: LoaderContext,
): Promise<ResolvedMetadata> {
  const resolved: ResolvedMetadata = {};
  let template: string | null = null;

  for (const value of values) {
    if (!value) continue;
    const metadata = typeof value === "function" ? await value(context) : value;

    for (const key of Object.keys(metadata) as (keyof Metadata)[]) {
      if (key === "title") continue;
      const entry = metadata[key];
      if (entry !== undefined) {
        (resolved as Record<string, unknown>)[key] = entry;
      }
    }

    const title = metadata.title;
    if (title === undefined) continue;
    if (typeof title === "string") {
      resolved.title = template ? template.replace("%s", title) : title;
      continue;
    }
    if (title.absolute !== undefined) {
      resolved.title = title.absolute;
    } else if (title.default !== undefined) {
      resolved.title = template
        ? template.replace("%s", title.default)
        : title.default;
    }
    if (title.template !== undefined) {
      template = title.template;
    }
  }

  return resolved;
}

function absoluteUrl(url: string, base: string | undefined): string {
  if (!base || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return new URL(url, base).toString();
}

function robotsContent(robots: string | RobotsMetadata): string {
  if (typeof robots === "string") return robots;
  const directives: string[] = [];
  directives.push(robots.index === false ? "noindex" : "index");
  directives.push(robots.follow === false ? "nofollow" : "follow");
  if (robots.noarchive) directives.push("noarchive");
  if (robots.nosnippet) directives.push("nosnippet");
  if (robots.noimageindex) directives.push("noimageindex");
  return directives.join(", ");
}

/** Converts resolved metadata into a flat list of head tag descriptions. */
export function metadataToHeadTags(metadata: ResolvedMetadata): HeadTag[] {
  const tags: HeadTag[] = [];
  const base = metadata.metadataBase;
  const meta = (name: string, content: string | undefined) => {
    if (content !== undefined)
      tags.push({ tag: "meta", attributes: { name, content } });
  };
  const property = (name: string, content: string | undefined) => {
    if (content !== undefined) {
      tags.push({ tag: "meta", attributes: { property: name, content } });
    }
  };

  if (metadata.title !== undefined) {
    tags.push({ tag: "title", attributes: {}, content: metadata.title });
  }
  meta("description", metadata.description);
  meta("application-name", metadata.applicationName);
  meta("generator", metadata.generator);
  meta("keywords", metadata.keywords?.join(", "));
  meta("referrer", metadata.referrer);
  meta("theme-color", metadata.themeColor);
  meta("color-scheme", metadata.colorScheme);
  meta("viewport", metadata.viewport);
  if (metadata.robots !== undefined)
    meta("robots", robotsContent(metadata.robots));
  for (const author of metadata.authors ?? []) {
    meta("author", author.name);
    if (author.url) {
      tags.push({
        tag: "link",
        attributes: { rel: "author", href: author.url },
      });
    }
  }

  if (metadata.icons !== undefined) {
    const icons =
      typeof metadata.icons === "string"
        ? { icon: metadata.icons }
        : metadata.icons;
    if (icons.icon)
      tags.push({ tag: "link", attributes: { rel: "icon", href: icons.icon } });
    if (icons.shortcut) {
      tags.push({
        tag: "link",
        attributes: { rel: "shortcut icon", href: icons.shortcut },
      });
    }
    if (icons.apple) {
      tags.push({
        tag: "link",
        attributes: { rel: "apple-touch-icon", href: icons.apple },
      });
    }
  }

  const openGraph = metadata.openGraph;
  if (openGraph) {
    property("og:title", openGraph.title ?? metadata.title);
    property("og:description", openGraph.description ?? metadata.description);
    property(
      "og:url",
      openGraph.url ? absoluteUrl(openGraph.url, base) : undefined,
    );
    property("og:site_name", openGraph.siteName);
    property("og:type", openGraph.type);
    property("og:locale", openGraph.locale);
    for (const image of openGraph.images ?? []) {
      const value = typeof image === "string" ? { url: image } : image;
      property("og:image", absoluteUrl(value.url, base));
      if (value.width !== undefined)
        property("og:image:width", String(value.width));
      if (value.height !== undefined)
        property("og:image:height", String(value.height));
      if (value.alt !== undefined) property("og:image:alt", value.alt);
    }
  }

  const twitter = metadata.twitter;
  if (twitter) {
    meta("twitter:card", twitter.card ?? "summary");
    meta("twitter:title", twitter.title ?? metadata.title);
    meta("twitter:description", twitter.description ?? metadata.description);
    meta("twitter:site", twitter.site);
    meta("twitter:creator", twitter.creator);
    for (const image of twitter.images ?? []) {
      meta("twitter:image", absoluteUrl(image, base));
    }
  }

  const alternates = metadata.alternates;
  if (alternates) {
    if (alternates.canonical) {
      tags.push({
        tag: "link",
        attributes: {
          rel: "canonical",
          href: absoluteUrl(alternates.canonical, base),
        },
      });
    }
    for (const language of Object.keys(alternates.languages ?? {})) {
      tags.push({
        tag: "link",
        attributes: {
          rel: "alternate",
          hreflang: language,
          href: absoluteUrl(
            (alternates.languages as Record<string, string>)[language],
            base,
          ),
        },
      });
    }
  }

  for (const name of Object.keys(metadata.other ?? {})) {
    meta(name, (metadata.other as Record<string, string>)[name]);
  }

  return tags;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** Serializes head tags for server rendering. */
export function renderHeadTags(tags: HeadTag[]): string {
  return tags
    .map((tag) => {
      const attributes = Object.keys(tag.attributes)
        .map((name) => ` ${name}="${escapeAttribute(tag.attributes[name])}"`)
        .join("");
      if (tag.tag === "title") {
        return `<title>${escapeText(tag.content ?? "")}</title>`;
      }
      return `<${tag.tag}${attributes}>`;
    })
    .join("\n");
}

const MANAGED_ATTRIBUTE = "data-domphy-head";

/** Applies head tags to `document.head`, replacing tags from the previous navigation. */
export function applyHeadTags(tags: HeadTag[]): void {
  if (typeof document === "undefined") return;

  for (const element of Array.from(
    document.head.querySelectorAll(`[${MANAGED_ATTRIBUTE}]`),
  )) {
    element.remove();
  }

  for (const tag of tags) {
    if (tag.tag === "title") {
      document.title = tag.content ?? "";
      continue;
    }
    const element = document.createElement(tag.tag);
    for (const name of Object.keys(tag.attributes)) {
      element.setAttribute(name, tag.attributes[name]);
    }
    element.setAttribute(MANAGED_ATTRIBUTE, "");
    document.head.appendChild(element);
  }
}
