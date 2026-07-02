// shadcn/ui "login-03" block — clean-room reimplementation.
//
// A single centered card on a muted-gray full-page background, offering
// Apple/Google sign-in above a classic email/password form, plus a legal
// disclaimer footer below the card. See ./login01-05-shared.ts for the
// reusable field/button/divider pieces.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { card, heading, paragraph, strong } from "@domphy/ui";
import {
  NARROW_CARD_WIDTH,
  brandBadge,
  dividerRow,
  emailField,
  legalFooter,
  oauthButton,
  passwordField,
  signUpLine,
  submitButton,
} from "./login01-05-shared.js";

/** Props for {@link Login03}. */
export interface Login03Props {
  brandName?: string;
  heading?: string;
  subheading?: string;
  appleButtonLabel?: string;
  onAppleClick?: () => void;
  googleButtonLabel?: string;
  onGoogleClick?: () => void;
  dividerText?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  forgotPasswordHref?: string;
  primaryButtonLabel?: string;
  signUpPrompt?: string;
  signUpLabel?: string;
  signUpHref?: string;
  termsLabel?: string;
  termsHref?: string;
  privacyLabel?: string;
  privacyHref?: string;
  onSubmit?: (values: { email: string; password: string }) => void;
}

/**
 * shadcn/ui "login-03" — muted-background page, OAuth-first card with a
 * legal disclaimer footer. Call with no arguments for a fully working demo.
 */
function Login03(props: Login03Props = {}): DomphyElement<"div"> {
  const {
    brandName = "Acme Inc.",
    heading: headingText = "Welcome back",
    subheading = "Login with your Apple or Google account",
    appleButtonLabel = "Login with Apple",
    onAppleClick,
    googleButtonLabel = "Login with Google",
    onGoogleClick,
    dividerText = "Or continue with",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    passwordLabel = "Password",
    forgotPasswordHref = "#",
    primaryButtonLabel = "Login",
    signUpPrompt = "Don't have an account?",
    signUpLabel = "Sign up",
    signUpHref = "#",
    termsLabel = "Terms of Service",
    termsHref = "#",
    privacyLabel = "Privacy Policy",
    privacyHref = "#",
    onSubmit,
  } = props;

  const logoRow: DomphyElement<"div"> = {
    div: [brandBadge(), { strong: brandName, $: [strong()] }],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: themeSpacing(2),
      marginBlockEnd: themeSpacing(6),
    },
  };

  const cardElement: DomphyElement<"div"> = {
    div: [
      { h2: headingText, $: [heading()], style: { textAlign: "center" } },
      { p: subheading, $: [paragraph({ color: "neutral" })], style: { textAlign: "center" } },
      {
        div: [
          {
            form: [
              oauthButton({ brand: "apple", visibleLabel: appleButtonLabel, accessibleLabel: appleButtonLabel, onClick: onAppleClick }),
              oauthButton({ brand: "google", visibleLabel: googleButtonLabel, accessibleLabel: googleButtonLabel, onClick: onGoogleClick }),
              dividerRow(dividerText),
              emailField({ id: "login03-email", fieldLabel: emailLabel, placeholder: emailPlaceholder }),
              passwordField({ id: "login03-password", fieldLabel: passwordLabel, forgotPasswordHref }),
              submitButton(primaryButtonLabel),
            ],
            onSubmit: (event: Event) => {
              event.preventDefault();
              const data = new FormData(event.target as HTMLFormElement);
              onSubmit?.({
                email: String(data.get("email") ?? ""),
                password: String(data.get("password") ?? ""),
              });
            },
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(4) },
          } as DomphyElement<"form">,
        ],
      },
      { footer: [signUpLine({ promptText: signUpPrompt, linkLabel: signUpLabel, href: signUpHref })] },
    ],
    $: [card({ color: "neutral" })],
    style: { width: "100%", maxWidth: NARROW_CARD_WIDTH },
  };

  return {
    div: [
      {
        div: [
          logoRow,
          cardElement,
          {
            div: [legalFooter({ termsLabel, termsHref, privacyLabel, privacyHref })],
            style: { marginBlockStart: themeSpacing(6), width: "100%", maxWidth: NARROW_CARD_WIDTH },
          },
        ],
        style: { display: "flex", flexDirection: "column", alignItems: "center", width: "100%" },
      },
    ],
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: themeSpacing(6),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };
}

export { Login03 };
