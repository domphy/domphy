// magicui "Avatar Circles" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// compact horizontal stack of overlapping circular avatars ending in a
// passive "+N" overflow badge, used to show group/team membership at a
// glance. Purely static — no animation, only ordinary link hover/focus
// states.
//
// Default avatars render a generic silhouette placeholder (an inline SVG
// data URI, no network fetch) rather than hotlinking any real person's
// photo, since this package has no access to (and shouldn't fabricate)
// real user avatars for a demo.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { small } from "@domphy/ui";

export interface AvatarCirclesItem {
  /** Avatar image URL. */
  imageUrl: string;
  /** Profile URL opened when the avatar is clicked. Defaults to `"#"`. */
  profileUrl?: string;
  /** Accessible name — used for `alt` text and the native hover tooltip (`title`). */
  name?: string;
}

export interface AvatarCirclesProps {
  /** Ordered avatar entries rendered as the overlapping stack. Defaults to 6 generic placeholders. */
  avatars?: AvatarCirclesItem[];
  /** Count shown in the trailing "+N" badge. Defaults to 99. Pass `0` to omit the badge entirely. */
  overflowCount?: number;
  /** Avatar diameter, in `themeSpacing` units (≈40px at the default). Defaults to 10. */
  diameterUnits?: number;
  /** How much each avatar overlaps the previous one, in `themeSpacing` units. Defaults to 4 (matches upstream's 16px `-space-x-4` at the default diameter). */
  overlapUnits?: number;
  /** Ring/border color around each avatar, matching the surrounding surface. Defaults to `"neutral"`. */
  ringColor?: ThemeColor;
  style?: StyleObject;
}

const DEFAULT_OVERFLOW_COUNT = 99;
const DEFAULT_DIAMETER_UNITS = 10;
const DEFAULT_OVERLAP_UNITS = 4;

// Generic person-silhouette placeholder — a single reusable inline SVG data
// URI, not any real user's photo. Real usage supplies actual `imageUrl`s.
const PLACEHOLDER_SILHOUETTE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
  '<rect width="40" height="40" fill="#9aa3af"/>' +
  '<circle cx="20" cy="16" r="7" fill="#e5e8ec"/>' +
  '<path d="M6 38c1-9 8-14 14-14s13 5 14 14z" fill="#e5e8ec"/>' +
  "</svg>";
const PLACEHOLDER_SILHOUETTE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_SILHOUETTE_MARKUP)}`;

function defaultAvatars(): AvatarCirclesItem[] {
  return Array.from({ length: 6 }, (_unused, index) => ({
    imageUrl: PLACEHOLDER_SILHOUETTE_URI,
    profileUrl: "#",
    name: `Member ${index + 1}`,
  }));
}

function avatarLink(
  item: AvatarCirclesItem,
  index: number,
  diameterUnits: number,
  overlapUnits: number,
  ringColor: ThemeColor,
): DomphyElement<"a"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors dock.ts's separator()).
  const element = {
    a: [
      {
        img: null,
        src: item.imageUrl,
        alt: item.name ?? `Member ${index + 1}`,
        style: {
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        },
      },
    ],
    href: item.profileUrl ?? "#",
    target: "_blank",
    rel: "noopener noreferrer",
    title: item.name,
    _key: `avatar-${index}`,
    // Image-only content, no text — the ring color intentionally matches the
    // *ambient* (parent) tone rather than establishing a `dataTone` of its
    // own, so it blends with whatever surface this stack sits on. That means
    // no `style.color` applies here, which is the same "decorative, no text"
    // exemption dottedMap's marker dots use.
    _doctorDisable: "missing-color",
    style: {
      position: "relative",
      display: "block",
      flexShrink: 0,
      width: themeSpacing(diameterUnits),
      height: themeSpacing(diameterUnits),
      borderRadius: "50%",
      overflow: "hidden",
      marginInlineStart: index === 0 ? undefined : themeSpacing(-overlapUnits),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      outline: (listener: Listener) =>
        `${themeSpacing(0.5)} solid ${themeColor(listener, "inherit", ringColor)}`,
      outlineOffset: "0",
    } as StyleObject,
  };
  return element as DomphyElement<"a">;
}

function overflowBadge(
  overflowCount: number,
  count: number,
  diameterUnits: number,
  overlapUnits: number,
  ringColor: ThemeColor,
): DomphyElement<"div"> {
  return {
    div: [{ small: `+${overflowCount}`, $: [small({ color: "neutral" })] }],
    _key: "avatar-overflow",
    // Upstream is a solid high-contrast disc — `bg-black text-white` in light,
    // `dark:bg-white dark:text-black` in dark. `shift-17` is this package's
    // established "solid dark button" anchor (same one signup01's submit uses);
    // the dark theme reverses the neutral ramp, so it flips black↔white exactly
    // like upstream, and `color: shift-9` rides the surface to the readable side.
    dataTone: "shift-17",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: themeSpacing(diameterUnits),
      height: themeSpacing(diameterUnits),
      borderRadius: "50%",
      marginInlineStart: count === 0 ? undefined : themeSpacing(-overlapUnits),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) =>
        `${themeSpacing(0.5)} solid ${themeColor(listener, "inherit", ringColor)}`,
      // Upstream `hover:bg-gray-600`: a small lighten off the shift-17 surface
      // reads as the same hover cue in both themes (black disc → gray, white
      // disc → light-gray). Mirrors animatedShinyText's nested-hover idiom.
      "&:hover": {
        backgroundColor: (listener: Listener) =>
          themeColor(listener, "shift-2"),
      },
    } as StyleObject,
  };
}

/**
 * A compact horizontal stack of overlapping circular avatars ending in a
 * "+N" overflow badge. Static — no built-in animation. Call with no
 * arguments for a working demo — 6 placeholder avatars plus a "+99" badge.
 */
function avatarCircles(props: AvatarCirclesProps = {}): DomphyElement<"div"> {
  const avatars = props.avatars ?? defaultAvatars();
  const overflowCount = props.overflowCount ?? DEFAULT_OVERFLOW_COUNT;
  const diameterUnits = props.diameterUnits ?? DEFAULT_DIAMETER_UNITS;
  const overlapUnits = props.overlapUnits ?? DEFAULT_OVERLAP_UNITS;
  const ringColor = props.ringColor ?? "neutral";

  const children: DomphyElement[] = avatars.map((item, index) =>
    avatarLink(item, index, diameterUnits, overlapUnits, ringColor),
  );
  if (overflowCount > 0) {
    children.push(
      overflowBadge(
        overflowCount,
        avatars.length,
        diameterUnits,
        overlapUnits,
        ringColor,
      ),
    );
  }

  return {
    div: children,
    role: "group",
    ariaLabel: `${avatars.length} members shown, plus ${overflowCount} more`,
    style: {
      display: "flex",
      alignItems: "center",
      // Upstream root carries `z-10` — preserve it so the stack keeps its
      // stacking priority against adjacent page content.
      zIndex: 10,
      width: "fit-content",
      ...(props.style ?? {}),
    },
  };
}

export { avatarCircles };
