# Image & Script

## optimizedImage

`optimizedImage()` is the `next/image` equivalent — a patch for native `img` elements covering loading behavior, layout and placeholders. URL optimization itself is delegated to any image CDN through the `loader` prop (there is no optimization server, by design).

```ts
import { optimizedImage } from "@domphy/app"

{
  img: null,
  $: [optimizedImage({
    src: "/photos/coast.jpg",
    width: 1200,
    height: 800,
    alt: "Coastline",
  })],
}
```

What it sets: `loading="lazy"`, `decoding="async"`, `fetchpriority`, `width`/`height` (prevents layout shift), and optionally `srcset`, fill styles and a blur placeholder.

### Priority (LCP image)

```ts
optimizedImage({ src: hero, priority: true, ... })  // eager + fetchpriority="high"
```

### srcset via a loader

```ts
optimizedImage({
  src: "/photos/coast.jpg",
  loader: ({ src, width, quality }) =>
    `https://cdn.example.com${src}?w=${width}&q=${quality}`,
  sizes: "(max-width: 768px) 100vw, 50vw",
  quality: 80,
})
```

The loader runs once per device size (`640 ... 3840` by default, override with `deviceSizes`).

### Fill and blur placeholder

```ts
{
  div: [{ img: null, $: [optimizedImage({
    src: cover,
    fill: true,                       // absolute inset-0, object-fit: cover
    placeholder: "blur",
    blurDataURL: tinyBase64,          // shown until the real image loads
  })] }],
  style: { position: "relative", height: "16rem" },
}
```

## script

`script()` is the `next/script` equivalent — a block that loads an external script once, with a strategy:

```ts
import { script } from "@domphy/app"

const App = {
  div: [
    Page(),
    script({ src: "https://example.com/widget.js", strategy: "afterInteractive" }),
    script({
      src: "https://example.com/analytics.js",
      strategy: "lazyOnload",          // window load + idle time
      onLoad: () => initAnalytics(),
    }),
  ],
}
```

- `afterInteractive` (default) — loads as soon as the element mounts
- `lazyOnload` — waits for the window `load` event plus `requestIdleCallback`
- duplicate `src`/`id` values load only once, wherever they appear in the tree
