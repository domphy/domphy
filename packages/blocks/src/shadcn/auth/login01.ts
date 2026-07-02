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
import { themeFluidSpacing, themeSpacing } from "@domphy/theme";
import { card, heading, paragraph } from "@domphy/ui";
import {
  NARROW_CARD_WIDTH,
  emailField,
  oauthButton,
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
    heading: headingText = "Login",
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
                  emailField({ id: "login01-email", fieldLabel: emailLabel, placeholder: emailPlaceholder }),
                  passwordField({
                    id: "login01-password",
                    fieldLabel: passwordLabel,
                    forgotPasswordHref,
                  }),
                  submitButton(primaryButtonLabel),
                  oauthButton({
                    brand: "google",
                    visibleLabel: googleButtonLabel,
                    accessibleLabel: googleButtonLabel,
                    onClick: onGoogleClick,
                  }),
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
          {
            footer: [signUpLine({ promptText: signUpPrompt, linkLabel: signUpLabel, href: signUpHref })],
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
      minHeight: "100dvh",
      paddingInline: themeFluidSpacing(4, 12),
      paddingBlock: themeFluidSpacing(4, 12),
    },
  };
}

export { Login01 };
