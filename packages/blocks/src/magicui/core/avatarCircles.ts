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
import { small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

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
  /** How much each avatar overlaps the previous one, in `themeSpacing` units. Defaults to 3. */
  overlapUnits?: number;
  /** Ring/border color around each avatar, matching the surrounding surface. Defaults to `"neutral"`. */
  ringColor?: ThemeColor;
  style?: StyleObject;
}

const DEFAULT_OVERFLOW_COUNT = 99;
const DEFAULT_DIAMETER_UNITS = 10;
const DEFAULT_OVERLAP_UNITS = 3;

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
  count: number,
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
        style: { display: "block", width: "100%", height: "100%", objectFit: "cover" },
      },
    ],
    href: item.profileUrl ?? "#",
    target: "_blank",
    rel: "noreferrer",
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
      zIndex: count - index,
      marginInlineStart: index === 0 ? undefined : themeSpacing(-overlapUnits),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      outline: (listener: Listener) => `${themeSpacing(1)} solid ${themeColor(listener, "inherit", ringColor)}`,
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
    dataTone: "shift-3",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: themeSpacing(diameterUnits),
      height: themeSpacing(diameterUnits),
      borderRadius: "50%",
      zIndex: 0,
      marginInlineStart: count === 0 ? undefined : themeSpacing(-overlapUnits),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `${themeSpacing(1)} solid ${themeColor(listener, "inherit", ringColor)}`,
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
    avatarLink(item, index, avatars.length, diameterUnits, overlapUnits, ringColor),
  );
  if (overflowCount > 0) {
    children.push(overflowBadge(overflowCount, avatars.length, diameterUnits, overlapUnits, ringColor));
  }

  return {
    div: children,
    role: "group",
    ariaLabel: `${avatars.length} members shown, plus ${overflowCount} more`,
    style: {
      display: "flex",
      alignItems: "center",
      width: "fit-content",
      ...(props.style ?? {}),
    },
  };
}

export { avatarCircles };
