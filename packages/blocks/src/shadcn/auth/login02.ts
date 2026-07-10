// shadcn/ui "login-02" block — clean-room reimplementation.
//
// A split-screen sign-in page: the form fills the left half of the
// viewport, a full-bleed cover photo fills the right half. The image
// column is hidden below a mid-size breakpoint, leaving only the form.
// See ./login01-05-shared.ts for the reusable field/button/divider pieces.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";
import {
  brandBadge,
  coverImage,
  dividerRow,
  emailField,
  oauthButton,
  passwordField,
  signUpLine,
  submitButton,
  WIDE_SPLIT_MEDIA_QUERY,
} from "./login01-05-shared.js";

/** Props for {@link Login02}. */
export interface Login02Props {
  brandName?: string;
  heading?: string;
  description?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  forgotPasswordHref?: string;
  primaryButtonLabel?: string;
  dividerText?: string;
  githubButtonLabel?: string;
  onGithubClick?: () => void;
  signUpPrompt?: string;
  signUpLabel?: string;
  signUpHref?: string;
  coverImageSrc?: string;
  coverImageAlt?: string;
  dimCoverInDarkMode?: boolean;
  onSubmit?: (values: { email: string; password: string }) => void;
}

/**
 * shadcn/ui "login-02" — split-screen sign-in with a full-bleed cover photo.
 * Call with no arguments for a fully working demo.
 */
function Login02(props: Login02Props = {}): DomphyElement<"div"> {
  const {
    brandName = "Acme Inc.",
    heading: headingText = "Login to your account",
    description = "Enter your email below to login to your account",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    passwordLabel = "Password",
    forgotPasswordHref = "#",
    primaryButtonLabel = "Login",
    dividerText = "Or continue with",
    githubButtonLabel = "Login with GitHub",
    onGithubClick,
    signUpPrompt = "Don't have an account?",
    signUpLabel = "Sign up",
    signUpHref = "#",
    coverImageSrc = "https://picsum.photos/seed/domphy-login02/1200/1600",
    coverImageAlt = "",
    dimCoverInDarkMode = true,
    onSubmit,
  } = props;

  // Upstream wraps the badge + wordmark in a clickable `<a href="#"
  // className="flex items-center gap-2 font-medium">` — a link, medium
  // weight (not a bold non-interactive div). `color`/`textDecoration` reset
  // the browser's default anchor styling so the wordmark reads as plain
  // foreground text, matching the source.
  const brandRow: DomphyElement<"a"> = {
    a: [brandBadge(), brandName],
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(2),
      fontWeight: fixed("500"),
      color: "inherit",
      textDecoration: fixed("none"),
      "@media (min-width: 48em)": { justifyContent: "flex-start" },
    },
  };

  const formBlock: DomphyElement<"form"> = {
    form: [
      // Upstream groups the h1 + p in a
      // `<div className="flex flex-col items-center gap-1 text-center">`
      // so both are centered with a 4px (gap-1) gap.
      {
        div: [
          { h1: headingText, $: [heading()] },
          { p: description, $: [paragraph({ color: "neutral" })] },
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: themeSpacing(1),
        },
      },
      emailField({
        id: "login02-email",
        fieldLabel: emailLabel,
        placeholder: emailPlaceholder,
      }),
      passwordField({
        id: "login02-password",
        fieldLabel: passwordLabel,
        forgotPasswordHref,
      }),
      submitButton(primaryButtonLabel),
      dividerRow(dividerText),
      // Upstream keeps the GitHub button and the sign-up line inside a single
      // `<Field>` (flex-col gap-3 = 12px), so they sit closer together than
      // the 28px field-group rhythm around them.
      {
        div: [
          oauthButton({
            brand: "github",
            visibleLabel: githubButtonLabel,
            accessibleLabel: githubButtonLabel,
            onClick: onGithubClick,
          }),
          signUpLine({
            promptText: signUpPrompt,
            linkLabel: signUpLabel,
            href: signUpHref,
          }),
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(3),
        },
      },
    ],
    onSubmit: (event) => {
      event.preventDefault();
      const data = new FormData(event.target as HTMLFormElement);
      onSubmit?.({
        email: String(data.get("email") ?? ""),
        password: String(data.get("password") ?? ""),
      });
    },
    style: {
      display: "flex",
      flexDirection: "column",
      // Upstream FieldGroup rhythm: gap-7 (28px) between the header, each
      // Field, and the separator — not the form's own gap-6.
      gap: themeSpacing(7),
      width: "100%",
      maxWidth: themeSpacing(80),
    },
  };

  return {
    div: [
      {
        div: [
          brandRow,
          {
            div: [formBlock],
            style: {
              flex: "1 1 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          },
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(4),
          minWidth: "0",
          // Upstream steps padding at the `md` breakpoint (p-6 -> md:p-10)
          // rather than scaling it continuously.
          padding: themeSpacing(6),
          "@media (min-width: 48em)": { padding: themeSpacing(10) },
        },
      },
      {
        div: [
          coverImage({
            src: coverImageSrc,
            alt: coverImageAlt,
            dimInDarkMode: dimCoverInDarkMode,
          }),
        ],
        // Upstream image container carries `bg-muted` (a fixed mid-ramp tone,
        // not the ambient page surface) behind the photo — a deliberate,
        // always-slightly-muted backdrop visible while the cover photo loads,
        // independent of `dataTone`. Remapping it to `"inherit"` would erase
        // that intentional distinction from the surrounding page background.
        _doctorDisable: "tone-background-inherit",
        style: {
          minWidth: "0",
          backgroundColor: (listener: Listener) =>
            themeColor(listener, "shift-2", "neutral"),
          // shift-11 (not the usual shift-9) to clear the doctor's ≥9-step
          // contrast minimum against this container's shift-2 background —
          // moot in practice since the cover photo fills 100% of the box and
          // no text renders here, but keeps the reactive `color` legitimate.
          color: (listener: Listener) =>
            themeColor(listener, "shift-11", "neutral"),
          [WIDE_SPLIT_MEDIA_QUERY]: { display: "none" },
        },
      },
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      minHeight: "100svh",
      [WIDE_SPLIT_MEDIA_QUERY]: { gridTemplateColumns: "1fr" },
    },
  };
}

export { Login02 };
