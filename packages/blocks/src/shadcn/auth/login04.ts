// shadcn/ui "login-04" block — clean-room reimplementation.
//
// A two-column sign-in layout wrapped inside a single visible card frame:
// form on the left, a full-bleed cover photo on the right (hidden below a
// breakpoint, at which point the card collapses to one column). Three OAuth
// providers plus the classic email/password form, and a legal disclaimer
// footer below the card. See ./login01-05-shared.ts for the reusable
// field/button/divider pieces.
//
// The card frame here is hand-styled (not `card()`'s patch) because that
// patch's fixed grid-template-areas (image/title/aside/desc/content/footer,
// each a single full-width row) can't express a form|image split where only
// the image side is edge-to-edge with zero padding — the two areas need
// independent padding, which `card()`'s single shared "content" padding
// can't give them. The surface treatment (radius/outline/overflow) mirrors
// `card()`'s own formula for visual consistency with the rest of the
// design system.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream shadcn/ui source was viewed or copied.

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { heading, paragraph } from "@domphy/ui";
import {
  MOBILE_MEDIA_QUERY,
  SPLIT_CARD_WIDTH,
  coverImage,
  dividerRow,
  emailField,
  legalFooter,
  oauthButton,
  passwordField,
  signUpLine,
  submitButton,
} from "./login01-05-shared.js";

/** Props for {@link Login04}. */
export interface Login04Props {
  brandName?: string;
  heading?: string;
  description?: string;
  emailLabel?: string;
  emailPlaceholder?: string;
  passwordLabel?: string;
  forgotPasswordHref?: string;
  primaryButtonLabel?: string;
  dividerText?: string;
  appleAccessibleLabel?: string;
  onAppleClick?: () => void;
  googleAccessibleLabel?: string;
  onGoogleClick?: () => void;
  metaAccessibleLabel?: string;
  onMetaClick?: () => void;
  signUpPrompt?: string;
  signUpLabel?: string;
  signUpHref?: string;
  termsLabel?: string;
  termsHref?: string;
  privacyLabel?: string;
  privacyHref?: string;
  coverImageSrc?: string;
  coverImageAlt?: string;
  dimCoverInDarkMode?: boolean;
  onSubmit?: (values: { email: string; password: string }) => void;
}

/**
 * shadcn/ui "login-04" — two-column card frame (form + cover photo) on a
 * muted page background, with three OAuth providers. Call with no
 * arguments for a fully working demo.
 */
function Login04(props: Login04Props = {}): DomphyElement<"div"> {
  const {
    brandName = "Acme Inc.",
    heading: headingText = "Welcome back",
    description = `Login to your ${brandName} account`,
    emailLabel = "Email",
    emailPlaceholder = "m@example.com",
    passwordLabel = "Password",
    forgotPasswordHref = "#",
    primaryButtonLabel = "Login",
    dividerText = "Or continue with",
    appleAccessibleLabel = "Login with Apple",
    onAppleClick,
    googleAccessibleLabel = "Login with Google",
    onGoogleClick,
    metaAccessibleLabel = "Login with Meta",
    onMetaClick,
    signUpPrompt = "Don't have an account?",
    signUpLabel = "Sign up",
    signUpHref = "#",
    termsLabel = "Terms of Service",
    termsHref = "#",
    privacyLabel = "Privacy Policy",
    privacyHref = "#",
    coverImageSrc = "https://picsum.photos/seed/domphy-login04/1200/1600",
    coverImageAlt = "",
    dimCoverInDarkMode = true,
    onSubmit,
  } = props;

  const oauthRow: DomphyElement<"div"> = {
    div: [
      oauthButton({ brand: "apple", accessibleLabel: appleAccessibleLabel, onClick: onAppleClick }),
      oauthButton({ brand: "google", accessibleLabel: googleAccessibleLabel, onClick: onGoogleClick }),
      oauthButton({ brand: "meta", accessibleLabel: metaAccessibleLabel, onClick: onMetaClick }),
    ],
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: themeSpacing(3),
    },
  };

  const formColumn: DomphyElement<"div"> = {
    div: [
      {
        form: [
          { h2: headingText, $: [heading()] },
          { p: description, $: [paragraph({ color: "neutral" })] },
          emailField({ id: "login04-email", fieldLabel: emailLabel, placeholder: emailPlaceholder }),
          passwordField({ id: "login04-password", fieldLabel: passwordLabel, forgotPasswordHref }),
          submitButton(primaryButtonLabel),
          dividerRow(dividerText),
          oauthRow,
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
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(4) },
      },
    ],
    style: {
      padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      minWidth: "0",
    },
  };

  const imageColumn: DomphyElement<"div"> = {
    div: [coverImage({ src: coverImageSrc, alt: coverImageAlt, dimInDarkMode: dimCoverInDarkMode })],
    style: {
      minWidth: "0",
      [MOBILE_MEDIA_QUERY]: { display: "none" },
    },
  };

  const cardFrame: DomphyElement<"div"> = {
    div: [formColumn, imageColumn],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      overflow: "hidden",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      outlineOffset: "-1px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-10", "neutral"),
      width: "100%",
      maxWidth: SPLIT_CARD_WIDTH,
      [MOBILE_MEDIA_QUERY]: { gridTemplateColumns: "1fr" },
    },
  };

  return {
    div: [
      cardFrame,
      {
        div: [legalFooter({ termsLabel, termsHref, privacyLabel, privacyHref })],
        style: { marginBlockStart: themeSpacing(6), width: "100%", maxWidth: SPLIT_CARD_WIDTH },
      },
    ],
    dataTone: "shift-2",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100dvh",
      padding: themeSpacing(6),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
    },
  };
}

export { Login04 };
