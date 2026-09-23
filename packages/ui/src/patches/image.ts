import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

type ImageProps = { color?: ValueOrState<ThemeColor> } & (
  | { alt: string; decorative?: false }
  | { decorative: true; alt?: undefined }
);

/**
 * Styles a responsive image: full-width, cover-fit, rounded corners with a
 * themed placeholder background. Apply to an `<img>` element.
 *
 * `alt` is a required prop (WCAG 1.1.1) forwarded onto the host as the native
 * `alt` attribute, not left for the call site to declare separately — a
 * native `alt` on the host element still wins over this if both are given
 * (Domphy's usual native-over-patch merge), but every call site must now
 * make an explicit choice. Pass `decorative: true` for `alt=""` (purely
 * decorative images the caller does not want announced).
 *
 * @hostTag img
 * @param props.alt - Accessible text alternative. Required unless `decorative: true`.
 * @param props.decorative - Marks the image as pure decoration — renders `alt=""` so assistive tech skips it. Optional.
 * @param props.color - Optional theme color tone for the placeholder background (`ValueOrState<ThemeColor>`). Defaults to `"neutral"`.
 * @example { img: null, src: "photo.jpg", $: [image({ alt: "A scenic mountain photo" })] }
 * @example { img: null, src: "divider.svg", $: [image({ decorative: true })] }
 */
function image(props: ImageProps): PartialElement {
  const color = toState(props.color ?? "neutral", "color");

  return {
    alt: props.decorative ? "" : props.alt,
    dataTone: "shift-2",
    _onInsert: (node) => {
      if (node.tagName !== "img") {
        console.warn(`"image" primitive patch must use img tag`);
      }
    },
    style: {
      display: "block",
      width: "100%",
      maxWidth: "100%",
      height: "auto",
      objectFit: "cover",
      borderRadius: themeSpacing(2),
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
    },
  };
}

export { image };
