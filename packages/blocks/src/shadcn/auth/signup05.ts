import type { DomphyElement, Listener, PartialElement } from "@domphy/core";
import { button, divider, heading, icon, label, link, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeFluidSpacing, themeSize, themeSpacing } from "@domphy/theme";

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
      fontFamily: "inherit",
      lineHeight: "inherit",
      width: "100%",
      boxSizing: "border-box",
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      border: "none",
      outlineOffset: "-1px",
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      "&::placeholder": {
        color: (listener: Listener) => themeColor(listener, "shift-7", "neutral"),
      },
      "&:hover:not([disabled]), &:focus-visible": {
        outline: (listener: Listener) =>
          `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-6", "primary")}`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
        backgroundColor: (listener: Listener) => themeColor(listener, "shift-2", "neutral"),
      },
    },
  };
}

function logoMark(): DomphyElement<"span"> {
  return {
    span: [{ span: LOGO_ICON, $: [icon({ color: "inherit" })] }],
    dataTone: "shift-16",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      height: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      flexShrink: 0,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "primary"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "primary"),
    },
  };
}

function logoRow(companyName: string, href: string): DomphyElement<"a"> {
  return {
    a: [logoMark(), { strong: companyName, $: [strong({ color: "neutral" })] }],
    href,
    $: [link({ color: "neutral" })],
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };
}

function legalLine(termsHref: string, privacyHref: string): DomphyElement<"small"> {
  return {
    small: [
      "By continuing, you agree to our ",
      { a: "Terms of Service", href: termsHref, style: { textDecoration: "underline" }, $: [link({ color: "primary" })] },
      " and ",
      { a: "Privacy Policy", href: privacyHref, style: { textDecoration: "underline" }, $: [link({ color: "primary" })] },
      ".",
    ],
    $: [small({ color: "neutral" })],
    style: { display: "block", textAlign: "center" },
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
      { span: provider.iconSvg ?? letterBadgeIcon(provider.label.charAt(0)), $: [icon({ color: "inherit" })] },
      { span: provider.label },
    ],
    type: "button",
    ariaLabel: `Sign up with ${provider.label}`,
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
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
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
      gridTemplateColumns: `repeat(${providers.length}, 1fr)`,
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  };

  const formElement: DomphyElement<"form"> = {
    form: [
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
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 4),
    },
  };

  const signInLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      { a: signInLinkText, href: signInHref, style: { textDecoration: "underline" }, $: [link({ color: "primary" })] },
    ],
    $: [small({ color: "neutral" })],
  };

  const header: DomphyElement<"div"> = {
    div: [logoRow(companyName, logoHref), { h1: greeting, $: [heading()] }, signInLine],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
    },
  };

  const contentBlock: DomphyElement<"div"> = {
    div: [header, formElement],
    style: {
      width: "100%",
      maxWidth: themeSpacing(96),
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
    },
  };

  return {
    div: [contentBlock, legalLine(termsHref, privacyHref)],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      paddingInline: themeFluidSpacing(4, 12),
      paddingBlock: themeFluidSpacing(4, 12),
    },
  };
}

export { signup05 };
