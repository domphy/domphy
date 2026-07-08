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

import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";
import { link } from "@domphy/ui";
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

// Visually-hidden but screen-reader-visible text — same recipe as this
// package's other `sr-only` usages (see magicui/text/auroraText.ts).
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

/** Props for {@link Login05}. */
export interface Login05Props {
  brandName?: string;
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
    brandName = "Acme Inc.",
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

  // Upstream login-05 is the one sibling whose brand badge is intentionally
  // UNFILLED: a 32px rounded box holding the mark in the foreground color at
  // 75% (size-6 in a size-8 box), not the filled bg-primary variant that the
  // shared brandBadge() models for login-02/03/04. Reuse the shared badge
  // geometry/glyph, then strip the fill and recolor/resize the mark to match.
  const badge = brandBadge();
  badge.style = {
    ...badge.style,
    // Shared brandBadge() is the login-02/03/04 size (size-6 box). login-05's
    // upstream badge is larger — a size-8 (32px) box — so restore that here.
    width: themeSpacing(8),
    height: themeSpacing(8),
    backgroundColor: "transparent",
    color: (listener: Listener) => themeColor(listener, "shift-11", "neutral"),
  };
  const badgeGlyph = (badge.div as unknown as DomphyElement<"svg">[])[0];
  // 75% of the size-8 box = size-6 (24px) mark, matching upstream.
  badgeGlyph.style = { ...badgeGlyph.style, width: "75%", height: "75%" };

  // Upstream login-05 stacks the header vertically and centers it: brand mark
  // on top, then the welcome heading, then the "Don't have an account?" line —
  // not a horizontal logo-left / sign-up-right split. It nests inside <form>
  // (as FieldGroup's first child), so the form's gap-7 handles the spacing to
  // the fields below — no sibling margin here.
  const headerRow: DomphyElement<"div"> = {
    div: [
      {
        a: [badge, { span: brandName, style: SR_ONLY_STYLE }],
        href: "#",
        style: { display: "flex", flexDirection: "column", alignItems: "center", gap: themeSpacing(2) },
        $: [link()],
      } as DomphyElement<"a">,
      // Upstream h1 is a deliberately small card title: text-xl (1.25rem =
      // themeSize increase-1) font-bold, with no heading margins — not the
      // large heading() step (increase-4) it was rendered at before.
      {
        h1: title,
        style: {
          margin: 0,
          fontSize: (listener: Listener) => themeSize(listener, "increase-1"),
          fontWeight: 700,
          color: (listener: Listener) => themeColor(listener, "shift-11", "neutral"),
        },
      },
      signUpLine({ promptText: signUpPrompt, linkLabel: signUpLabel, href: signUpHref, align: "center" }),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: themeSpacing(2),
    },
  };

  const emailFieldRow = emailField({
    id: "login05-email",
    fieldLabel: emailLabel,
    placeholder: emailPlaceholder,
  });

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
      gap: themeSpacing(4),
      "@media (min-width: 40em)": { gridTemplateColumns: "1fr 1fr" },
    },
  };

  return {
    div: [
      {
        div: [
          {
            form: [
              headerRow,
              emailFieldRow,
              submitButton(primaryButtonLabel),
              dividerRow(dividerText),
              oauthRow,
            ],
            onSubmit: (event) => {
              event.preventDefault();
              const data = new FormData(event.target as HTMLFormElement);
              onSubmit?.({ email: String(data.get("email") ?? "") });
            },
            style: { display: "flex", flexDirection: "column", gap: themeSpacing(7) },
          },
          {
            div: [legalFooter({ termsLabel, termsHref, privacyLabel, privacyHref })],
            style: { marginBlockStart: themeSpacing(6), paddingInline: themeSpacing(6) },
          },
        ],
        style: { width: "100%", maxWidth: NARROW_CARD_WIDTH },
      },
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100svh",
      // Upstream steps padding at the `md` breakpoint (p-6 -> md:p-10) rather
      // than scaling it continuously.
      padding: themeSpacing(6),
      "@media (min-width: 48em)": { padding: themeSpacing(10) },
    },
  };
}

export { Login05 };
