// shadcn/ui "login-01" block — clean-room reimplementation.
//
// A minimal single-card sign-in form centered on a blank page: email +
// password fields, an inline "Forgot your password?" link, a solid submit
// button and an outline "Login with Google" fallback. See
// ./login01-05-shared.ts for the reusable field/button/divider pieces.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, card, heading, paragraph } from "@domphy/ui";
import {
  emailField,
  NARROW_CARD_WIDTH,
  passwordField,
  signUpLine,
  submitButton,
} from "./login01-05-shared.js";

/** Props for {@link Login01}. */
export interface Login01Props {
  heading?: string;
  description?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  forgotPasswordHref?: string;
  primaryButtonLabel?: string;
  googleButtonLabel?: string;
  onGoogleClick?: () => void;
  signUpPrompt?: string;
  signUpLabel?: string;
  signUpHref?: string;
  onSubmit?: (values: { email: string; password: string }) => void;
}

/**
 * shadcn/ui "login-01" — a minimal centered sign-in card. Call with no
 * arguments for a fully working demo.
 */
function Login01(props: Login01Props = {}): DomphyElement<"div"> {
  const {
    heading: headingText = "Login to your account",
    description = "Enter your email below to login to your account",
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    passwordLabel = "Password",
    forgotPasswordHref = "#",
    primaryButtonLabel = "Login",
    googleButtonLabel = "Login with Google",
    onGoogleClick,
    signUpPrompt = "Don't have an account?",
    signUpLabel = "Sign up",
    signUpHref = "#",
    onSubmit,
  } = props;

  const emailFieldRow = emailField({
    id: "login01-email",
    fieldLabel: emailLabel,
    placeholder: emailPlaceholder,
  });

  const passwordFieldRow = passwordField({
    id: "login01-password",
    fieldLabel: passwordLabel,
    forgotPasswordHref,
  });

  return {
    div: [
      {
        div: [
          { h2: headingText, $: [heading()] },
          { p: description, $: [paragraph({ color: "neutral" })] },
          {
            div: [
              {
                form: [
                  emailFieldRow,
                  passwordFieldRow,
                  {
                    // Upstream groups the submit button, OAuth button and the
                    // "Sign up" line into their own <Field> (gap-3) — tighter
                    // than the gap-7 separating this cluster from the fields
                    // above.
                    div: [
                      submitButton(primaryButtonLabel),
                      {
                        // Unlike login-02..05, upstream login-01's Google
                        // button is plain text with no icon — built inline
                        // here (not via the shared oauthButton() helper,
                        // which always prepends a brand glyph).
                        button: googleButtonLabel,
                        type: "button",
                        ...(onGoogleClick ? { onClick: onGoogleClick } : {}),
                        $: [button({ color: "neutral" })],
                        style: { width: "100%" },
                      } as DomphyElement<"button">,
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
      },
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100svh",
      // Upstream steps padding at the `md` breakpoint (p-6 -> md:p-10)
      // rather than scaling it continuously.
      padding: themeSpacing(6),
      "@media (min-width: 48em)": { padding: themeSpacing(10) },
    },
  };
}

export { Login01 };
