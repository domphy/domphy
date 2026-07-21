// Shared default screenshot for device-frame demos (android / iphone / safari).
// Inline SVG data URI so no-arg factories always show real screen content
// without depending on public assets or network.

/** Mini app UI used when device mocks are called without `src` / `imageSrc`. */
export const DEFAULT_DEVICE_SCREEN_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f8fafc"/>
  <rect width="390" height="100" fill="#0f172a"/>
  <circle cx="48" cy="56" r="16" fill="#d97706"/>
  <text x="76" y="62" fill="#f8fafc" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="600">Domphy</text>
  <rect x="24" y="128" width="342" height="132" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="44" y="176" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="22" font-weight="700">Welcome back</text>
  <text x="44" y="208" fill="#64748b" font-family="system-ui,Segoe UI,sans-serif" font-size="14">Sample app screen for device previews</text>
  <rect x="24" y="284" width="164" height="112" rx="14" fill="#d97706"/>
  <text x="44" y="348" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="16" font-weight="600">Projects</text>
  <rect x="204" y="284" width="162" height="112" rx="14" fill="#64748b"/>
  <text x="224" y="348" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="16" font-weight="600">Activity</text>
  <rect x="24" y="416" width="342" height="72" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="44" y="458" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="15">Ship UI with plain objects</text>
  <rect x="24" y="508" width="342" height="72" rx="12" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="44" y="550" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="15">Theme-aware components</text>
  <rect x="24" y="760" width="342" height="52" rx="26" fill="#0f172a"/>
  <text x="150" y="792" fill="#f8fafc" font-family="system-ui,Segoe UI,sans-serif" font-size="16" font-weight="600">Open app</text>
</svg>`);

/** Wider landscape variant for browser chrome (safari). */
export const DEFAULT_BROWSER_SCREEN_SRC =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" fill="#f8fafc"/>
  <rect width="1200" height="72" fill="#0f172a"/>
  <circle cx="48" cy="36" r="14" fill="#d97706"/>
  <text x="76" y="42" fill="#f8fafc" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="600">Domphy</text>
  <text x="80" y="160" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="40" font-weight="700">Build UI with plain objects</text>
  <text x="80" y="210" fill="#64748b" font-family="system-ui,Segoe UI,sans-serif" font-size="18">Sample landing content for Safari mockups</text>
  <rect x="80" y="260" width="200" height="52" rx="12" fill="#d97706"/>
  <text x="120" y="294" fill="#ffffff" font-family="system-ui,Segoe UI,sans-serif" font-size="18" font-weight="600">Get started</text>
  <rect x="80" y="360" width="320" height="200" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="420" y="360" width="320" height="200" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="760" y="360" width="320" height="200" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <text x="110" y="460" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="600">Patches</text>
  <text x="450" y="460" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="600">Blocks</text>
  <text x="790" y="460" fill="#0f172a" font-family="system-ui,Segoe UI,sans-serif" font-size="20" font-weight="600">Theme</text>
</svg>`);
