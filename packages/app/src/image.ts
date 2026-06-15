import type { PartialElement } from "@domphy/core";

export interface ImageLoaderInput {
  src: string;
  width: number;
  quality: number;
}

export type ImageLoader = (input: ImageLoaderInput) => string;

export interface OptimizedImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Stretch over the positioned parent, like the `fill` prop of `next/image`. */
  fill?: boolean;
  sizes?: string;
  quality?: number;
  /** Load eagerly with high fetch priority — use for the LCP image. */
  priority?: boolean;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  /** Maps `src` + width to an optimized URL; enables `srcset` generation. */
  loader?: ImageLoader;
  deviceSizes?: number[];
}

const DEFAULT_DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

/**
 * Patch for `img` elements, the equivalent of `next/image`: lazy loading,
 * async decoding, fetch priority, `srcset` through a custom loader, fill
 * layout and blur placeholders. URL optimization itself is the loader's job —
 * point it at any image CDN.
 */
export function optimizedImage(
  props: OptimizedImageProps,
): PartialElement<"img"> {
  const {
    src,
    alt = "",
    width,
    height,
    fill = false,
    sizes,
    quality = 75,
    priority = false,
    placeholder = "empty",
    blurDataURL,
    loader,
    deviceSizes = DEFAULT_DEVICE_SIZES,
  } = props;

  const part: PartialElement<"img"> = {
    src: loader
      ? loader({
          src,
          width: width ?? deviceSizes[deviceSizes.length - 1],
          quality,
        })
      : src,
    alt,
    loading: priority ? "eager" : "lazy",
    decoding: "async",
    fetchPriority: priority ? "high" : "auto",
    style: {},
  };

  if (loader) {
    part.srcSet = deviceSizes
      .map((size) => `${loader({ src, width: size, quality })} ${size}w`)
      .join(", ");
    if (sizes) part.sizes = sizes;
  }

  if (width !== undefined) part.width = width;
  if (height !== undefined) part.height = height;

  if (fill) {
    part.style = {
      ...part.style,
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    };
  }

  if (placeholder === "blur" && blurDataURL) {
    part.style = {
      ...part.style,
      backgroundImage: `url("${blurDataURL}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
    part.onLoad = (event) => {
      const image = event.target as HTMLImageElement;
      image.style.backgroundImage = "";
    };
  }

  return part;
}
