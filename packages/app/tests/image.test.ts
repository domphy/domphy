// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { type ImageLoader, optimizedImage } from "../src/image";

const cdnLoader: ImageLoader = ({ src, width, quality }) =>
  `https://cdn.test/${src}?w=${width}&q=${quality}`;

describe("optimizedImage", () => {
  it("uses the raw src and no srcset when no loader is given", () => {
    const part = optimizedImage({ src: "/photo.jpg", alt: "Photo" });
    expect(part.src).toBe("/photo.jpg");
    expect(part.srcSet).toBeUndefined();
    expect(part.alt).toBe("Photo");
    expect(part.loading).toBe("lazy");
    expect(part.decoding).toBe("async");
    expect(part.fetchPriority).toBe("auto");
  });

  it("generates a srcset across device sizes through the loader", () => {
    const part = optimizedImage({
      src: "/photo.jpg",
      loader: cdnLoader,
      quality: 80,
      deviceSizes: [640, 1080],
      sizes: "100vw",
    });
    // src uses the largest device size by default.
    expect(part.src).toBe("https://cdn.test//photo.jpg?w=1080&q=80");
    expect(part.srcSet).toBe(
      "https://cdn.test//photo.jpg?w=640&q=80 640w, " +
        "https://cdn.test//photo.jpg?w=1080&q=80 1080w",
    );
    expect(part.sizes).toBe("100vw");
  });

  it("uses the explicit width for the loader src when provided", () => {
    const part = optimizedImage({
      src: "/photo.jpg",
      width: 500,
      loader: cdnLoader,
    });
    expect(part.src).toBe("https://cdn.test//photo.jpg?w=500&q=75");
    expect(part.width).toBe(500);
  });

  it("applies priority loading and high fetch priority", () => {
    const part = optimizedImage({ src: "/hero.jpg", priority: true });
    expect(part.loading).toBe("eager");
    expect(part.fetchPriority).toBe("high");
  });

  it("stretches over the parent in fill layout", () => {
    const part = optimizedImage({ src: "/photo.jpg", fill: true });
    expect(part.style).toMatchObject({
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });
  });

  it("sets a blur placeholder background and clears it on load", () => {
    const part = optimizedImage({
      src: "/photo.jpg",
      placeholder: "blur",
      blurDataURL: "data:image/png;base64,AAAA",
    });
    expect(part.style).toMatchObject({
      backgroundImage: 'url("data:image/png;base64,AAAA")',
      backgroundSize: "cover",
      backgroundPosition: "center",
    });
    expect(typeof part.onLoad).toBe("function");

    // Render, then fire `load`; the onLoad handler must clear the inline
    // placeholder background. (Seed the background directly because jsdom's CSS
    // parser does not round-trip data-URL shorthand through core's render path.)
    const node = new ElementNode({ img: "", $: [part] });
    const host = document.createElement("div");
    document.body.appendChild(host);
    node.render(host);
    const image = host.querySelector("img") as HTMLImageElement;
    image.style.backgroundImage = 'url("data:image/png;base64,AAAA")';
    expect(image.style.backgroundImage).not.toBe("");

    image.dispatchEvent(new Event("load"));
    expect(image.style.backgroundImage).toBe("");

    node.remove();
    host.remove();
  });

  it("ignores the blur placeholder when no blurDataURL is given", () => {
    const part = optimizedImage({ src: "/photo.jpg", placeholder: "blur" });
    expect(part.style).toEqual({});
    expect(part.onLoad).toBeUndefined();
  });
});
