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
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";
import { card, heading, paragraph } from "@domphy/ui";
import { fixed } from "../../shared/typography.js";
import {
  brandBadge,
  dividerRow,
  emailField,
  legalFooter,
  NARROW_CARD_WIDTH,
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

  const logoRow: DomphyElement<"a"> = {
    a: [brandBadge(), brandName],
    href: "#",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      // Upstream logo link is `font-medium` (500) over the whole wordmark —
      // not bold. `strong()` would render it at 700 and read as a heading.
      fontWeight: fixed("500"),
      gap: themeSpacing(2),
      marginBlockEnd: themeSpacing(6),
    },
  };

  const emailFieldRow = emailField({
    id: "login03-email",
    fieldLabel: emailLabel,
    placeholder: emailPlaceholder,
  });

  const passwordFieldRow = passwordField({
    id: "login03-password",
    fieldLabel: passwordLabel,
    forgotPasswordHref,
  });

  const cardElement: DomphyElement<"div"> = {
    div: [
      { h2: headingText, $: [heading()], style: { textAlign: "center" } },
      {
        p: subheading,
        $: [paragraph({ color: "neutral" })],
        // `paragraph()` already sets `style.color` — the doctor tool inspects
        // only this element's own inline style, not patch contributions, so
        // it can't see that and flags a false positive here.
        // (`_doctorDisable` is a doctor-only annotation absent from core's
        // strict element type — build through an untyped literal + cast.)
        _doctorDisable: "missing-color",
        // Upstream CardDescription is `text-sm` (0.875rem), a step below base.
        style: {
          textAlign: "center",
          fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
        },
      } as DomphyElement<"p">,
      {
        div: [
          {
            form: [
              {
                div: [
                  oauthButton({
                    brand: "apple",
                    visibleLabel: appleButtonLabel,
                    accessibleLabel: appleButtonLabel,
                    onClick: onAppleClick,
                  }),
                  oauthButton({
                    brand: "google",
                    visibleLabel: googleButtonLabel,
                    accessibleLabel: googleButtonLabel,
                    onClick: onGoogleClick,
                  }),
                ],
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: themeSpacing(3),
                },
              },
              dividerRow(dividerText),
              emailFieldRow,
              passwordFieldRow,
              {
                div: [
                  submitButton(primaryButtonLabel),
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
            onSubmit: (event: Event) => {
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
              gap: themeSpacing(7),
            },
          } as DomphyElement<"form">,
        ],
      },
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
            div: [
              legalFooter({ termsLabel, termsHref, privacyLabel, privacyHref }),
            ],
            style: {
              marginBlockStart: themeSpacing(6),
              width: "100%",
              maxWidth: NARROW_CARD_WIDTH,
            },
          },
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        },
      },
    ],
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100svh",
      // Upstream steps padding at the `md` breakpoint (p-6 -> md:p-10)
      // rather than scaling it continuously.
      padding: themeSpacing(6),
      "@media (min-width: 48em)": { padding: themeSpacing(10) },
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };
}

export { Login03 };
