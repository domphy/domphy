// shadcn/ui "login-05" block — clean-room reimplementation.
//
// A minimal passwordless sign-in page collecting only an email address,
// with Apple/Google fallback buttons. No password field and no
// forgot-password affordance — submitting is meant to trigger a magic-link
// handler. See ./login01-05-shared.ts for the reusable field/button/divider
// pieces.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { heading } from "@domphy/ui";
import {
  NARROW_CARD_WIDTH,
  brandBadge,
  dividerRow,
  emailField,
  legalFooter,
  oauthButton,
  signUpLine,
  submitButton,
} from "./login01-05-shared.js";

/** Props for {@link Login05}. */
export interface Login05Props {
  title?: string;
  signUpPrompt?: string;
  signUpLabel?: string;
  signUpHref?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  primaryButtonLabel?: string;
  dividerText?: string;
  appleButtonLabel?: string;
  onAppleClick?: () => void;
  googleButtonLabel?: string;
  onGoogleClick?: () => void;
  termsLabel?: string;
  termsHref?: string;
  privacyLabel?: string;
  privacyHref?: string;
  onSubmit?: (values: { email: string }) => void;
}

/**
 * shadcn/ui "login-05" — passwordless (magic-link) sign-in: a single email
 * field plus Apple/Google fallbacks. Call with no arguments for a fully
 * working demo.
 */
function Login05(props: Login05Props = {}): DomphyElement<"div"> {
  const {
    title = "Welcome to Acme Inc.",
    signUpPrompt = "Don't have an account?",
    signUpLabel = "Sign up",
    signUpHref = "#",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    primaryButtonLabel = "Login",
    dividerText = "Or",
    appleButtonLabel = "Continue with Apple",
    onAppleClick,
    googleButtonLabel = "Continue with Google",
    onGoogleClick,
    termsLabel = "Terms of Service",
    termsHref = "#",
    privacyLabel = "Privacy Policy",
    privacyHref = "#",
    onSubmit,
  } = props;

  // Upstream login-05 stacks the header vertically and centers it: brand mark
  // on top, then the welcome heading, then the "Don't have an account?" line —
  // not a horizontal logo-left / sign-up-right split.
  const headerRow: DomphyElement<"div"> = {
    div: [
      brandBadge(),
      { h1: title, $: [heading()] },
      signUpLine({ promptText: signUpPrompt, linkLabel: signUpLabel, href: signUpHref, align: "center" }),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: themeSpacing(2),
      marginBlockEnd: themeSpacing(6),
    },
  };

  // Upstream places the two provider buttons in a `sm:grid-cols-2` grid —
  // stacked on mobile, side by side from the `sm` breakpoint up.
  const oauthRow: DomphyElement<"div"> = {
    div: [
      oauthButton({ brand: "apple", visibleLabel: appleButtonLabel, accessibleLabel: appleButtonLabel, onClick: onAppleClick }),
      oauthButton({ brand: "google", visibleLabel: googleButtonLabel, accessibleLabel: googleButtonLabel, onClick: onGoogleClick }),
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: themeSpacing(3),
      "@media (min-width: 40em)": { gridTemplateColumns: "1fr 1fr" },
    },
  };

  return {
    div: [
      {
        div: [
          headerRow,
          {
            form: [
              emailField({ id: "login05-email", fieldLabel: emailLabel, placeholder: emailPlaceholder }),
              submitButton(primaryButtonLabel),
              dividerRow(dividerText),
              oauthRow,
            ],
            onSubmit: (event) => {
              event.preventDefault();
              const data = new FormData(event.target as HTMLFormElement);
              onSubmit?.({ email: String(data.get("email") ?? "") });
            },
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(4) },
          },
          {
            div: [legalFooter({ termsLabel, termsHref, privacyLabel, privacyHref })],
            style: { marginBlockStart: themeSpacing(6) },
          },
        ],
        style: { width: "100%", maxWidth: NARROW_CARD_WIDTH },
      },
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: themeSpacing(6),
    },
  };
}

export { Login05 };
