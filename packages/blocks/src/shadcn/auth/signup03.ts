import type { DomphyElement, Listener, PartialElement } from "@domphy/core";
import { button, card, heading, icon, label, link, paragraph, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeFluidSpacing, themeSize, themeSpacing } from "@domphy/theme";

// Generic monochrome mark — an original, brand-neutral logo glyph placeholder.
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

interface FieldConfig {
  id: string;
  labelText: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  caption?: string;
  autoComplete?: string;
  minLength?: number;
}

function field(config: FieldConfig): DomphyElement<"div"> {
  const { id, labelText, type = "text", placeholder, caption, autoComplete, minLength } = config;
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
        autocomplete: autoComplete,
        minlength: minLength,
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

/** Props for {@link signup03}. */
export interface Signup03Props {
  companyName?: string;
  logoHref?: string;
  title?: string;
  subtitle?: string;
  fullNameLabel?: string;
  fullNamePlaceholder?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  emailCaption?: string;
  passwordLabel?: string;
  confirmPasswordLabel?: string;
  passwordCaption?: string;
  submitLabel?: string;
  signInPrompt?: string;
  signInLinkText?: string;
  signInHref?: string;
  termsHref?: string;
  privacyHref?: string;
  onSubmit?: (event: SubmitEvent) => void;
}

/**
 * shadcn/ui "signup-03" — a single-column signup form centered on a
 * full-viewport muted page background, with a centered logo above an
 * uncarded form block and a legal-links line beneath it.
 */
function signup03(props: Signup03Props = {}): DomphyElement<"div"> {
  const {
    companyName = "Acme Inc.",
    logoHref = "#",
    title = "Create your account",
    subtitle = "Enter your email below to create your account",
    fullNameLabel = "Full Name",
    fullNamePlaceholder = "John Doe",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    emailCaption = "We'll never share your email with anyone else.",
    passwordLabel = "Password",
    confirmPasswordLabel = "Confirm Password",
    passwordCaption = "Must be at least 8 characters long.",
    submitLabel = "Create Account",
    signInPrompt = "Already have an account?",
    signInLinkText = "Sign in",
    signInHref = "#",
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

  const passwordGrid: DomphyElement<"div"> = {
    div: [
      { div: [field({ id: "signup03-password", labelText: passwordLabel, type: "password", autoComplete: "new-password", minLength: 8 })] },
      { div: [field({ id: "signup03-confirm-password", labelText: confirmPasswordLabel, type: "password", autoComplete: "new-password" })] },
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  };

  const formElement: DomphyElement<"form"> = {
    form: [
      field({ id: "signup03-name", labelText: fullNameLabel, placeholder: fullNamePlaceholder, autoComplete: "name" }),
      field({
        id: "signup03-email",
        labelText: emailLabel,
        type: "email",
        placeholder: emailPlaceholder,
        caption: emailCaption,
        autoComplete: "email",
      }),
      passwordGrid,
      { small: passwordCaption, $: [small({ color: "neutral" })] },
      submitButton,
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

  const footerLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      { a: signInLinkText, href: signInHref, style: { textDecoration: "underline" }, $: [link({ color: "primary" })] },
    ],
    $: [small({ color: "neutral" })],
  };

  // Upstream signup-03 wraps its header + form in a visible Card (with a
  // centered header), sitting on the muted page between the logo above and
  // the legal line below — mirror that instead of rendering the form uncarded.
  const cardElement: DomphyElement<"div"> = {
    div: [
      { h2: title, $: [heading()], style: { textAlign: "center" } },
      { p: subtitle, $: [paragraph({ color: "neutral" })], style: { textAlign: "center" } },
      { div: [formElement] },
      { footer: [footerLine] },
    ],
    $: [card({ color: "neutral" })],
    style: { width: "100%", maxWidth: themeSpacing(96) },
  };

  return {
    div: [logoRow(companyName, logoHref), cardElement, legalLine(termsHref, privacyHref)],
    dataTone: "shift-2",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      paddingInline: themeFluidSpacing(4, 12),
      paddingBlock: themeFluidSpacing(4, 12),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };
}

export { signup03 };
