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
import { heading, paragraph, strong } from "@domphy/ui";
import {
  MOBILE_MEDIA_QUERY,
  coverImage,
  dividerRow,
  emailField,
  oauthButton,
  passwordField,
  signUpLine,
  submitButton,
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

  const brandRow: DomphyElement<"div"> = {
    div: [
      {
        div: null,
        style: {
          width: themeSpacing(6),
          height: themeSpacing(6),
          borderRadius: themeSpacing(1),
          backgroundColor: (listener: Listener) =>
            themeColor(listener, "inherit", "primary"),
          color: (listener: Listener) => themeColor(listener, "shift-11", "primary"),
        },
      },
      { strong: brandName, $: [strong()] },
    ],
    style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
  };

  const formBlock: DomphyElement<"form"> = {
    form: [
      { h1: headingText, $: [heading()] },
      { p: description, $: [paragraph({ color: "neutral" })] },
      emailField({ id: "login02-email", fieldLabel: emailLabel, placeholder: emailPlaceholder }),
      passwordField({ id: "login02-password", fieldLabel: passwordLabel, forgotPasswordHref }),
      submitButton(primaryButtonLabel),
      dividerRow(dividerText),
      oauthButton({
        brand: "github",
        visibleLabel: githubButtonLabel,
        accessibleLabel: githubButtonLabel,
        onClick: onGithubClick,
      }),
      signUpLine({ promptText: signUpPrompt, linkLabel: signUpLabel, href: signUpHref }),
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
      gap: themeSpacing(4),
      width: "100%",
      maxWidth: themeSpacing(88),
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
          minWidth: "0",
          padding: themeSpacing(6),
        },
      },
      {
        div: [coverImage({ src: coverImageSrc, alt: coverImageAlt, dimInDarkMode: dimCoverInDarkMode })],
        style: {
          minWidth: "0",
          [MOBILE_MEDIA_QUERY]: { display: "none" },
        },
      },
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      minHeight: "100dvh",
      [MOBILE_MEDIA_QUERY]: { gridTemplateColumns: "1fr" },
    },
  };
}

export { Login02 };
