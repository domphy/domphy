import type { DomphyElement, Listener, PartialElement } from "@domphy/core";
import { button, divider, heading, icon, label, link, paragraph, small } from "@domphy/ui";
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

function legalLine(termsHref: string, privacyHref: string): DomphyElement<"small"> {
  return {
    small: [
      "By continuing, you agree to our ",
      { a: "Terms of Service", href: termsHref, $: [link({ color: "primary" })] },
      " and ",
      { a: "Privacy Policy", href: privacyHref, $: [link({ color: "primary" })] },
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
    button: [{ span: provider.iconSvg ?? letterBadgeIcon(provider.label.charAt(0)), $: [icon({ color: "inherit" })] }],
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

/** Props for {@link signup04}. */
export interface Signup04Props {
  title?: string;
  subtitle?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  emailCaption?: string;
  passwordLabel?: string;
  confirmPasswordLabel?: string;
  passwordCaption?: string;
  submitLabel?: string;
  providers?: SocialProvider[];
  decorativeImageSrc?: string;
  signInPrompt?: string;
  signInLinkText?: string;
  signInHref?: string;
  termsHref?: string;
  privacyHref?: string;
  onSubmit?: (event: SubmitEvent) => void;
}

const DEFAULT_PROVIDERS: SocialProvider[] = [
  { id: "apple", label: "Apple" },
  { id: "google", label: "Google" },
  { id: "meta", label: "Meta" },
];

/**
 * shadcn/ui "signup-04" — an email/password signup form combined with a
 * decorative image inside one contained panel, on a muted page background,
 * offering a row of social-provider icon buttons.
 */
function signup04(props: Signup04Props = {}): DomphyElement<"div"> {
  const {
    title = "Create your account",
    subtitle = "Enter your email below to create your account",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    emailCaption = "We'll never share your email with anyone else.",
    passwordLabel = "Password",
    confirmPasswordLabel = "Confirm Password",
    passwordCaption = "Must be at least 8 characters long.",
    submitLabel = "Create Account",
    providers = DEFAULT_PROVIDERS,
    decorativeImageSrc = "https://images.unsplash.com/photo-1522199755839-a2bacb67c546?w=1200&q=80",
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
      { div: [field({ id: "signup04-password", labelText: passwordLabel, type: "password", autoComplete: "new-password", minLength: 8 })] },
      { div: [field({ id: "signup04-confirm-password", labelText: confirmPasswordLabel, type: "password", autoComplete: "new-password" })] },
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
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
      field({
        id: "signup04-email",
        labelText: emailLabel,
        type: "email",
        placeholder: emailPlaceholder,
        caption: emailCaption,
        autoComplete: "email",
      }),
      passwordGrid,
      { small: passwordCaption, $: [small({ color: "neutral" })] },
      submitButton,
      { div: "Or continue with", $: [divider({ color: "neutral" })] },
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

  const footerLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      { a: signInLinkText, href: signInHref, $: [link({ color: "primary" })] },
    ],
    $: [small({ color: "neutral" })],
  };

  const formSide: DomphyElement<"div"> = {
    div: [{ h2: title, $: [heading()] }, { p: subtitle, $: [paragraph({ color: "neutral" })] }, formElement, footerLine],
    style: {
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  };

  const imageSide: DomphyElement<"div"> = {
    div: [
      {
        img: null,
        src: decorativeImageSrc,
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
      "@media(min-width:768px)": { display: "block" },
    },
  };

  const panel: DomphyElement<"div"> = {
    div: [formSide, imageSide],
    dataTone: "shift-0",
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      overflow: "hidden",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      "@media(min-width:768px)": { gridTemplateColumns: "1fr 1fr" },
    },
  };

  const panelWrap: DomphyElement<"div"> = {
    div: [panel],
    style: {
      width: "100%",
      maxWidth: themeSpacing(96),
      "@media(min-width:768px)": { maxWidth: themeSpacing(224) },
    },
  };

  return {
    div: [panelWrap, legalLine(termsHref, privacyHref)],
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

export { signup04 };
