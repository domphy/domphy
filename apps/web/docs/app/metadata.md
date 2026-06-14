# Metadata

The Metadata API is ported: each segment declares a `metadata` object (static) or function (the `generateMetadata` equivalent). Matched segments merge from root to leaf; the result drives `document.title` and `<meta>`/`<link>` tags on every navigation, and `result.head` during SSR.

## Static Metadata

```ts
{
  path: "/",
  metadata: {
    title: { default: "My Site", template: "%s | My Site" },
    description: "A Domphy application.",
    openGraph: { siteName: "My Site", type: "website" },
    icons: "/favicon.svg",
  },
  ...
  children: [
    { path: "about", metadata: { title: "About" }, page: AboutPage },
    // document.title becomes "About | My Site"
  ],
}
```

## Dynamic Metadata

```ts
{
  path: "blog/[slug]",
  metadata: async (context) => {
    const post = await fetchPost(context.params.slug as string)
    return {
      title: post.title,
      description: post.summary,
      openGraph: { images: [post.cover] },
    }
  },
  ...
}
```

## Title Resolution

Identical to Next.js:

- a string title gets the nearest ancestor `template` applied (`"%s | My Site"`)
- `title.default` is used when no descendant sets a title
- `title.absolute` escapes the template entirely

## Merge Rules

Top-level keys from deeper segments override shallower ones. Object keys (`openGraph`, `twitter`, `robots`, `icons`, `alternates`) are replaced wholesale, not deep-merged — the same rule as Next.js.

## Supported Fields

`title`, `description`, `applicationName`, `generator`, `keywords`, `authors`, `referrer`, `themeColor`, `colorScheme`, `viewport`, `robots`, `icons`, `openGraph`, `twitter`, `alternates` (canonical + languages), `metadataBase` (resolves relative URLs in openGraph/twitter/canonical), `other` (arbitrary name/content pairs).

`og:title`, `og:description`, `twitter:title` and `twitter:description` fall back to the page title and description when not set explicitly.

## Lower-Level API

```ts
import { resolveMetadata, metadataToHeadTags, renderHeadTags, applyHeadTags } from "@domphy/app"

const resolved = await resolveMetadata([rootMetadata, pageMetadata], loaderContext)
const tags = metadataToHeadTags(resolved)
renderHeadTags(tags)   // -> HTML string for SSR
applyHeadTags(tags)    // -> writes document.head, replacing previous tags
```
