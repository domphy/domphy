import type {
  DomphyElement,
  Listener,
  PartialElement,
  ValueOrState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import {
  alert,
  button,
  card,
  heading,
  label,
  link,
  paragraph,
  small,
  spinner,
} from "@domphy/ui";
import {
  themeColor,
  themeDensity,
  themeFluidSpacing,
  themeSize,
  themeSpacing,
} from "@domphy/theme";

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
        color: (listener: Listener) => themeColor(listener, "shift-7", "neutral"),
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
  autoComplete?: string;
}

function field(config: FieldConfig): DomphyElement<"div"> {
  const { id, labelText, type = "text", placeholder, caption, autoComplete } =
    config;

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

/** Props for {@link signup01}. */
export interface Signup01Props {
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
  showGoogleButton?: boolean;
  googleButtonLabel?: string;
  signInPrompt?: string;
  signInLinkText?: string;
  signInHref?: string;
  /** Reactive busy state — disables the submit button and shows a spinner. */
  loading?: ValueOrState<boolean>;
  /** Reactive error message — renders an inline alert above the submit button when set. */
  error?: ValueOrState<string | null>;
  onSubmit?: (event: SubmitEvent) => void;
}

/**
 * shadcn/ui "signup-01" — a minimal single-card signup form centered in the
 * viewport: Full Name, Email, Password, Confirm Password, a solid submit
 * button and an optional outline Google button.
 */
function signup01(props: Signup01Props = {}): DomphyElement<"div"> {
  const {
    title = "Create an account",
    subtitle = "Enter your details below to create your account",
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
    showGoogleButton = true,
    googleButtonLabel = "Sign up with Google",
    signInPrompt = "Already have an account?",
    signInLinkText = "Sign in",
    signInHref = "#",
    loading = false,
    error = null,
    onSubmit,
  } = props;

  const loadingState = toState(loading, "loading");
  const errorState = toState(error, "error");

  const submitButton: DomphyElement<"button"> = {
    button: (listener: Listener) =>
      loadingState.get(listener)
        ? [{ span: null, $: [spinner({ color: "neutral" })] }, submitLabel]
        : submitLabel,
    type: "submit",
    dataTone: "shift-17",
    disabled: (listener: Listener) => loadingState.get(listener),
    ariaBusy: (listener: Listener) => (loadingState.get(listener) ? "true" : "false"),
    $: [button({ color: "neutral" })],
    style: {
      width: "100%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };

  const googleButton: DomphyElement<"button"> = {
    button: googleButtonLabel,
    type: "button",
    $: [button({ color: "neutral" })],
    style: { width: "100%" },
  };

  const errorBanner: DomphyElement<"div"> = {
    div: (listener: Listener) => errorState.get(listener) ?? "",
    hidden: (listener: Listener) => !errorState.get(listener),
    $: [alert({ color: "error" })],
  };

  const signInLine: DomphyElement<"small"> = {
    small: [
      `${signInPrompt} `,
      { a: signInLinkText, href: signInHref, style: { textDecoration: "underline" }, $: [link({ color: "primary" })] },
    ],
    $: [small({ color: "neutral" })],
    style: { display: "block", textAlign: "center" },
  };

  // Upstream wraps the submit button, Google button and the sign-in prompt in a
  // single <Field> (flex-col gap-3) — a tight cluster separated from the input
  // fields above by the wider form gap. No CardFooter, so no divider.
  const buttonCluster: DomphyElement<"div"> = {
    div: [submitButton, showGoogleButton ? googleButton : null, signInLine],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    },
  };

  const cardBody: DomphyElement<"div"> = {
    div: [
      {
        form: [
          field({
            id: "signup01-name",
            labelText: fullNameLabel,
            placeholder: fullNamePlaceholder,
            autoComplete: "name",
          }),
          field({
            id: "signup01-email",
            labelText: emailLabel,
            type: "email",
            placeholder: emailPlaceholder,
            caption: emailCaption,
            autoComplete: "email",
          }),
          field({
            id: "signup01-password",
            labelText: passwordLabel,
            type: "password",
            caption: passwordCaption,
            autoComplete: "new-password",
          }),
          field({
            id: "signup01-confirm-password",
            labelText: confirmPasswordLabel,
            type: "password",
            caption: confirmPasswordCaption,
            autoComplete: "new-password",
          }),
          errorBanner,
          buttonCluster,
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
      },
    ],
  };

  const cardElement: DomphyElement<"div"> = {
    div: [{ h2: title, $: [heading()] }, { p: subtitle, $: [paragraph({ color: "neutral" })] }, cardBody],
    style: {
      width: "100%",
      maxWidth: themeSpacing(96),
    },
    $: [card({ color: "neutral" })],
  };

  return {
    div: [cardElement],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      paddingInline: themeFluidSpacing(4, 12),
      paddingBlock: themeFluidSpacing(4, 12),
    },
  };
}

export { signup01 };
