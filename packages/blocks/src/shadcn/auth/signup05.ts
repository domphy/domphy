import type { DomphyElement, Listener, PartialElement } from "@domphy/core";
import {
  themeColor,
  themeDensity,
  themeFluidSpacing,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { button, divider, heading, icon, label, link, small } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// Visually-hidden but screen-reader-visible text — same recipe as this
// package's other `sr-only` usages (see shadcn/auth/login05.ts).
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

// Generic monochrome letter-badge glyphs — original, brand-neutral placeholders.
// Swap for official brand SVGs in production.
function letterBadgeIcon(letter: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" ' +
    'fill="none" stroke="currentColor" stroke-width="1.5">' +
    '<circle cx="12" cy="12" r="9.25" />' +
    `<text x="12" y="16" text-anchor="middle" font-size="10" stroke="none" fill="currentColor">${letter}</text>` +
    "</svg>"
  );
}

const LOGO_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">' +
  '<path d="M12 3l8 16H4z" />' +
  "</svg>";

/**
 * Visual formula for a bounded text-like `<input>`, matching @domphy/ui's
 * `inputText()` patch. Written as a local patch instead of reusing
 * `inputText()` directly because that patch forces `type="text"` via
 * `_onSchedule`, which would silently coerce `type="email"` fields to plain
 * text — see the port's fidelity notes.
 */
function authFieldInput(): PartialElement {
  return {
    style: {
      fontFamily: fixed("inherit"),
      lineHeight: fixed("inherit"),
      width: "100%",
      boxSizing: "border-box",
      paddingInline: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener: Listener) =>
        `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", "neutral"),
      "&::placeholder": {
        color: (listener: Listener) =>
          themeColor(listener, "shift-7", "neutral"),
      },
      "&:hover:not([disabled]), &:focus-visible": {
        outline: (listener: Listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "primary")}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener: Listener) =>
          themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

function logoMark(): DomphyElement<"span"> {
  // Upstream's logo container is a transparent `size-8 rounded-md` box with the
  // icon in inherited currentColor — no background or color utility on it.
  return {
    span: [{ span: LOGO_ICON, $: [icon({ color: "inherit" })] }],
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      height: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      borderRadius: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      flexShrink: 0,
    },
  };
}

function logoRow(companyName: string, href: string): DomphyElement<"a"> {
  return {
    // Upstream stacks the mark above a screen-reader-only company name,
    // not a horizontal logo-left / text-right row.
    a: [logoMark(), { span: companyName, style: SR_ONLY_STYLE }],
    href,
    $: [link({ color: "neutral" })],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

function legalLine(
  termsHref: string,
  privacyHref: string,
): DomphyElement<"small"> {
  return {
    small: [
      "By clicking continue, you agree to our ",
      {
        a: "Terms of Service",
        href: termsHref,
        style: { textDecoration: fixed("underline") },
        $: [link({ color: "neutral" })],
      },
      " and ",
      {
        a: "Privacy Policy",
        href: privacyHref,
        style: { textDecoration: fixed("underline") },
        $: [link({ color: "neutral" })],
      },
      ".",
    ],
    $: [small({ color: "neutral" })],
    // Upstream: FieldDescription `px-6 text-center`, nested inside the narrow
    // `max-w-sm` column so it wraps within ~24rem rather than spanning full width.
    style: {
      display: "block",
      textAlign: "center",
      paddingInline: themeSpacing(6),
    },
  };
}

/** One entry in the social-provider row. */
export interface SocialProvider {
  id: string;
  label: string;
  /** Raw inline SVG string. Defaults to a generic letter-badge glyph. */
  iconSvg?: string;
  onClick?: () => void;
}

function providerButton(provider: SocialProvider): DomphyElement<"button"> {
  return {
    button: [
      {
        span: provider.iconSvg ?? letterBadgeIcon(provider.label.charAt(0)),
        $: [icon({ color: "inherit" })],
      },
      // Upstream renders the full CTA text ("Continue with Apple/Google") as the
      // visible label; that text is the button's accessible name, so no aria-label.
      { span: `Continue with ${provider.label}` },
    ],
    type: "button",
    // Only attach onClick when a handler is given — Domphy requires event
    // props, when present, to resolve to an actual function (even `undefined`
    // throws), so an unset handler must omit the key entirely.
    ...(provider.onClick ? { onClick: provider.onClick } : {}),
    $: [button({ color: "neutral" })],
    style: { width: "100%" },
    _key: provider.id,
  };
}

/** Props for {@link signup05}. */
export interface Signup05Props {
  companyName?: string;
  logoHref?: string;
  greeting?: string;
  signInPrompt?: string;
  signInLinkText?: string;
  signInHref?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  submitLabel?: string;
  providers?: SocialProvider[];
  termsHref?: string;
  privacyHref?: string;
  onSubmit?: (event: SubmitEvent) => void;
}

const DEFAULT_PROVIDERS: SocialProvider[] = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google" },
];

/**
 * shadcn/ui "signup-05" — the most minimal signup form of the set: a
 * welcome header (logo, heading, inline sign-in line), a single Email field,
 * a submit button and two social-provider buttons.
 */
function signup05(props: Signup05Props = {}): DomphyElement<"div"> {
  const {
    companyName = "Acme Inc.",
    logoHref = "#",
    greeting = "Welcome to Acme Inc.",
    signInPrompt = "Already have an account?",
    signInLinkText = "Sign in",
    signInHref = "#",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    submitLabel = "Create Account",
    providers = DEFAULT_PROVIDERS,
    termsHref = "#",
    privacyHref = "#",
    onSubmit,
  } = props;

  const submitButton: DomphyElement<"button"> = {
    button: submitLabel,
    type: "submit",
    dataTone: "shift-17",
    $: [button({ color: "neutral" })],
    style: {
      width: "100%",
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };

  const emailField: DomphyElement<"div"> = {
    div: [
      { label: emailLabel, for: "signup05-email", $: [label()] },
      {
        input: null,
        id: "signup05-email",
        name: "signup05-email",
        type: "email",
        placeholder: emailPlaceholder,
        required: true,
        autocomplete: "email",
        $: [authFieldInput()],
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
    },
  };

  const providerRow: DomphyElement<"div"> = {
    div: providers.map((provider) => providerButton(provider)),
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      // Upstream stacks the provider buttons on mobile and only splits into
      // columns from the `sm` breakpoint up (`grid gap-4 sm:grid-cols-2`).
      "@media (min-width: 40em)": {
        gridTemplateColumns: `repeat(${providers.length}, 1fr)`,
      },
    },
  };

  const signInLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      {
        a: signInLinkText,
        href: signInHref,
        style: { textDecoration: fixed("underline") },
        $: [link({ color: "neutral" })],
      },
    ],
    $: [small({ color: "neutral" })],
  };

  const header: DomphyElement<"div"> = {
    div: [
      logoRow(companyName, logoHref),
      { h1: greeting, $: [heading()] },
      signInLine,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };

  // Upstream nests the header as the FIRST child of the form's <FieldGroup>
  // (`flex flex-col gap-7`), so header and the email field share that gap.
  const formElement: DomphyElement<"form"> = {
    form: [
      header,
      emailField,
      submitButton,
      { div: "Or", $: [divider({ color: "neutral" })] },
      providerRow,
    ],
    onSubmit: (event: Event) => {
      event.preventDefault();
      onSubmit?.(event as SubmitEvent);
    },
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 7),
    },
  };

  // `w-full max-w-sm` column (SignupForm root: `flex flex-col gap-6`) wrapping
  // BOTH the form and the legal line, so the legal copy wraps within ~24rem.
  const contentBlock: DomphyElement<"div"> = {
    div: [formElement, legalLine(termsHref, privacyHref)],
    style: {
      width: "100%",
      maxWidth: themeSpacing(96),
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
    },
  };

  return {
    div: [contentBlock],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      paddingInline: themeFluidSpacing(4, 12),
      paddingBlock: themeFluidSpacing(4, 12),
    },
  };
}

export { signup05 };
