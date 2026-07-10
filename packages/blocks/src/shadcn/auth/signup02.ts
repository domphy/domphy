import type { DomphyElement, Listener, PartialElement } from "@domphy/core";
import {
  themeColor,
  themeDensity,
  themeFluidSpacing,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import {
  button,
  divider,
  heading,
  icon,
  label,
  link,
  paragraph,
  small,
  strong,
} from "@domphy/ui";
import { fixed } from "../../shared/typography.js";

// Generic monochrome letter-badge glyphs — original, brand-neutral placeholders.
// Swap for official brand SVGs in production.
const GITHUB_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" ' +
  'fill="none" stroke="currentColor" stroke-width="1.5">' +
  '<circle cx="12" cy="12" r="9.25" />' +
  '<text x="12" y="16" text-anchor="middle" font-size="10" stroke="none" fill="currentColor">H</text>' +
  "</svg>";

const LOGO_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">' +
  '<path d="M12 3l8 16H4z" />' +
  "</svg>";

/**
 * Visual formula for a bounded text-like `<input>`, matching @domphy/ui's
 * `inputText()` patch. Written as a local patch instead of reusing
 * `inputText()` directly because that patch forces `type="text"` via
 * `_onSchedule`, which would silently unmask `type="password"`/`"email"`
 * fields — see the port's fidelity notes.
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

interface FieldConfig {
  id: string;
  labelText: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  caption?: string;
}

function field(config: FieldConfig): DomphyElement<"div"> {
  const { id, labelText, type = "text", placeholder, caption } = config;
  return {
    div: [
      { label: labelText, for: id, $: [label()] },
      {
        input: null,
        id,
        name: id,
        type,
        placeholder,
        required: true,
        $: [authFieldInput()],
      },
      caption ? { small: caption, $: [small({ color: "neutral" })] } : null,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
    },
  };
}

/** Small accent-colored square badge holding the logo glyph — edge-anchored tone surface. */
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
      borderRadius: (listener: Listener) =>
        themeSpacing(themeDensity(listener) * 1),
      flexShrink: 0,
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", "primary"),
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

/** Props for {@link signup02}. */
export interface Signup02Props {
  companyName?: string;
  logoHref?: string;
  coverImageSrc?: string;
  title?: string;
  subtitle?: string;
  fullNameLabel?: string;
  fullNamePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  emailCaption?: string;
  passwordLabel?: string;
  passwordCaption?: string;
  confirmPasswordLabel?: string;
  confirmPasswordCaption?: string;
  submitLabel?: string;
  showGithubButton?: boolean;
  githubButtonLabel?: string;
  signInPrompt?: string;
  signInLinkText?: string;
  signInHref?: string;
  onSubmit?: (event: SubmitEvent) => void;
}

/**
 * shadcn/ui "signup-02" — a two-column signup page: a branded, uncarded form
 * on the left and a full-bleed cover photograph on the right (hidden below
 * the `lg` breakpoint, no JS involved).
 */
function signup02(props: Signup02Props = {}): DomphyElement<"div"> {
  const {
    companyName = "Acme Inc.",
    logoHref = "#",
    coverImageSrc = "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=1200&q=80",
    title = "Create your account",
    subtitle = "Fill in your details to get started",
    fullNameLabel = "Full Name",
    fullNamePlaceholder = "John Doe",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    emailCaption = "We'll never share your email with anyone else.",
    passwordLabel = "Password",
    passwordCaption = "Must be at least 8 characters long.",
    confirmPasswordLabel = "Confirm Password",
    confirmPasswordCaption = "Please re-enter your password.",
    submitLabel = "Create Account",
    showGithubButton = true,
    githubButtonLabel = "Sign up with GitHub",
    signInPrompt = "Already have an account?",
    signInLinkText = "Sign in",
    signInHref = "#",
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

  const githubButton: DomphyElement<"button"> = {
    button: [
      { span: GITHUB_ICON, $: [icon({ color: "inherit" })] },
      { span: githubButtonLabel },
    ],
    type: "button",
    $: [button({ color: "neutral" })],
    style: { width: "100%" },
  };

  const footerLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      {
        a: signInLinkText,
        href: signInHref,
        style: { textDecoration: fixed("underline") },
        $: [link({ color: "primary" })],
      },
    ],
    $: [small({ color: "neutral" })],
    style: { display: "block", textAlign: "center" },
  };

  // Upstream keeps the GitHub button and the "Already have an account?" line
  // together in the final Field (footer is a FieldDescription under the button).
  const lastField: DomphyElement<"div"> = {
    div: [showGithubButton ? githubButton : null, footerLine],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
    },
  };

  // Upstream nests this header as the first child inside the form's FieldGroup.
  const headerBlock: DomphyElement<"div"> = {
    div: [
      { h1: title, $: [heading()] },
      { p: subtitle, $: [paragraph({ color: "neutral" })] },
    ],
    style: { textAlign: "center" },
  };

  const formElement: DomphyElement<"form"> = {
    form: [
      headerBlock,
      field({
        id: "signup02-name",
        labelText: fullNameLabel,
        placeholder: fullNamePlaceholder,
      }),
      field({
        id: "signup02-email",
        labelText: emailLabel,
        type: "email",
        placeholder: emailPlaceholder,
        caption: emailCaption,
      }),
      field({
        id: "signup02-password",
        labelText: passwordLabel,
        type: "password",
        caption: passwordCaption,
      }),
      field({
        id: "signup02-confirm-password",
        labelText: confirmPasswordLabel,
        type: "password",
        caption: confirmPasswordCaption,
      }),
      submitButton,
      { div: "Or continue with", $: [divider({ color: "neutral" })] },
      lastField,
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

  const contentBlock: DomphyElement<"div"> = {
    div: [formElement],
    style: {
      width: "100%",
      maxWidth: themeSpacing(80),
      display: "flex",
      flexDirection: "column",
    },
  };

  const leftColumn: DomphyElement<"div"> = {
    div: [
      {
        div: [logoRow(companyName, logoHref)],
        style: {
          display: "flex",
          justifyContent: "center",
          paddingInline: themeFluidSpacing(4, 12),
          paddingBlock: themeSpacing(6),
          "@media(min-width:768px)": { justifyContent: "flex-start" },
        },
      },
      {
        div: [contentBlock],
        style: {
          flex: "1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingInline: themeFluidSpacing(4, 12),
          paddingBlock: themeFluidSpacing(4, 12),
        },
      },
    ],
    style: { display: "flex", flexDirection: "column", minHeight: "100svh" },
  };

  const rightColumn: DomphyElement<"div"> = {
    div: [
      {
        img: null,
        src: coverImageSrc,
        alt: "",
        style: {
          position: "absolute",
          inset: "0",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          "@media (prefers-color-scheme: dark)": {
            filter: "brightness(0.45) grayscale(0.4)",
          },
        },
      },
    ],
    style: {
      position: "relative",
      display: "none",
      "@media(min-width:1024px)": { display: "block" },
    },
  };

  return {
    div: [leftColumn, rightColumn],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      minHeight: "100svh",
      "@media(min-width:1024px)": { gridTemplateColumns: "1fr 1fr" },
    },
  };
}

export { signup02 };
