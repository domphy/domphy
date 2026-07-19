// Minimal global CSS for @domphy/press.
// Layout element styles now live in layout.ts as inline style:{} objects
// so generateCSS() is the single source of truth for component CSS.
// Only rules that CANNOT be expressed as element-scoped styles remain here:
//   1. Global reset (*, html, body, a)
//   2. JS-managed class-state cross-element selectors
//   3. SVG icon masks (class-targeted, third-party)
//   4. Markdown-rendered HTML content (code blocks, custom blocks, etc.)
//   5. Shiki dark-mode override (data-attr on html, targets third-party spans)

import { themeColor, themeSpacing } from "@domphy/theme";

const tc = (tone: string, color?: string): string =>
  themeColor(null, tone as any, color);
const ts = (n: number): string => themeSpacing(n);

const bg = tc("inherit");
const bgSoft = tc("shift-1");
const bgMute = tc("shift-2");
const border = tc("shift-3");
const textSoft = tc("shift-6");
const text = tc("shift-9");
const textStrong = tc("shift-11");
const brand = tc("shift-9", "primary");

const headerH = ts(14);

export function pressCSS(): string {
  return `
/* ------------------------------------------------------------------ reset */
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(${headerH} + ${ts(4)})}
body{margin:0;font-family:var(--dp-font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif);background:${bg};color:${text};line-height:1.6;font-size:16px}
a{color:${brand};text-decoration:none}
a:hover{text-decoration:underline}

/* -------------------------------------------------------- logo theme variants */
/* dp-logo-light/dark classes set in layout.ts img elements */
[data-theme="dark"] .dp-logo-light{display:none}
[data-theme="light"] .dp-logo-dark,.dp-logo-dark{display:none}
[data-theme="dark"] .dp-logo-dark{display:block}

/* ---------------------------------------------------------- social icon masks */
/* dp-social-icon + dp-icon-* classes set in layout.ts socialLinkEl */
.dp-social-icon{display:block;width:${ts(4)};height:${ts(4)};background:currentColor;flex-shrink:0}
.dp-icon-github{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-twitter{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-discord{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.044.032.084.064.107a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01 10.2 10.2 0 0 0 .373.292.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-youtube{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-linkedin{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-mastodon{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-npm{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z'/%3E%3C/svg%3E") center/contain no-repeat}
.dp-icon-bluesky{-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z'/%3E%3C/svg%3E") center/contain no-repeat}

/* ------- sidebar collapsed state (JS toggles 'collapsed' class on group) ------- */
.dp-sidebar-group.collapsed .dp-sidebar-items{display:none}

/* ------- sidebar open state on mobile (JS sets html[data-sidebar="open"]) ------ */
@media(max-width:860px){
  html[data-sidebar="open"] nav[aria-label="Documentation"],
  html[data-sidebar="open"] nav[aria-label="Primary"]{transform:translateX(0)}
}

/* ----------------------------------------------------------------- backdrop */
.dp-sidebar-backdrop{display:none;position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.4);cursor:pointer}
@media(max-width:860px){html[data-sidebar="open"] .dp-sidebar-backdrop{display:block}}

/* -------------------------------------------------------- heading anchors */
.header-anchor{opacity:0;margin-left:${ts(2)};font-weight:400;font-size:.85em;color:${textSoft};transition:opacity .15s}
:is(h1,h2,h3,h4,h5,h6):hover .header-anchor{opacity:1}
.header-anchor:hover{color:${brand};text-decoration:none}

/* ------------------------------------------------------------ code blocks */
.code-block{margin:${ts(4)} 0;border:1px solid ${border};border-radius:${ts(2)};overflow:hidden}
.code-block-title{display:flex;align-items:center;padding:${ts(1.5)} ${ts(4)};background:${bgMute};border-bottom:1px solid ${border};font-size:12px;font-family:var(--dp-font-mono,ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace);color:${textSoft}}
.code-block-inner{position:relative}
.code-block pre{margin:0;padding:${ts(4)} ${ts(5)};background:${bgSoft};border:none;border-radius:0;overflow-x:auto;overflow-y:auto;max-height:32em;font-size:13.5px;line-height:1.5;font-family:var(--dp-font-mono,ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace)}
.code-block code{font-family:inherit;background:none;padding:0;font-size:inherit}
.code-block .line{display:inline-block;width:100%}
.code-block .line.highlighted{background:color-mix(in srgb,${brand} 10%,transparent)}
.code-block .line.diff.add{background:color-mix(in srgb,${tc("shift-7", "success")} 12%,transparent)}
.code-block .line.diff.add::before{content:"+ ";color:${tc("shift-7", "success")}}
.code-block .line.diff.remove{background:color-mix(in srgb,${tc("shift-9", "danger")} 10%,transparent);opacity:.7}
.code-block .line.diff.remove::before{content:"- ";color:${tc("shift-9", "danger")}}
.code-block .line.highlighted.error{background:color-mix(in srgb,${tc("shift-9", "error")} 10%,transparent)}
.code-block .line.highlighted.warning{background:color-mix(in srgb,${tc("shift-7", "warning")} 10%,transparent)}
.code-block pre.has-focus .line:not(.focus){opacity:.4;filter:blur(.4px);transition:opacity .2s,filter .2s}
.code-block pre.has-focus:hover .line{opacity:1;filter:none}
.code-block .line-number{display:inline-block;min-width:2.5em;margin-right:1em;color:${textSoft};text-align:right;user-select:none;font-size:.9em}
.code-copy-btn{position:absolute;top:${ts(2)};right:${ts(2)};padding:${ts(1)} ${ts(2)};border-radius:${ts(1.25)};border:1px solid ${border};background:${bgSoft};color:${textSoft};cursor:pointer;font-size:13px;opacity:0;transition:opacity .15s}
.code-block-inner:hover .code-copy-btn{opacity:1}
.code-copy-btn:hover{background:${bgMute};color:${text}}

/* ------------------------------------------------------------- code groups */
.code-group{margin:${ts(4)} 0;border:1px solid ${border};border-radius:${ts(2)};overflow:hidden}
.code-group>input[type="radio"]{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
.code-group .tabs{display:flex;gap:${ts(0.5)};padding:${ts(1.5)} ${ts(2)};background:${bgSoft};border-bottom:1px solid ${border};flex-wrap:wrap}
.code-group .tabs label{padding:${ts(1)} ${ts(3)};font-size:13px;font-weight:500;color:${textSoft};border-radius:${ts(1.25)};cursor:pointer}
.code-group .blocks>.code-block{display:none;margin:0;border:none;border-radius:0}
.code-group .blocks>.code-block pre{border-radius:0}
${Array.from({ length: 8 }, (_, i) => `.code-group>input:nth-of-type(${i + 1}):checked~.blocks>.code-block:nth-child(${i + 1})`).join(",\n")}{display:block}
${Array.from({ length: 8 }, (_, i) => `.code-group>input:nth-of-type(${i + 1}):checked~.tabs>label:nth-child(${i + 1})`).join(",\n")}{color:${brand};background:${bgMute}}

/* ---------------------------------------------------------- card containers */
.custom-block.card{background:${bgSoft};border:1px solid ${border};border-radius:${ts(3)};padding:${ts(5)} ${ts(6)};margin:${ts(3)} 0}
.custom-block.card .card-title{font-size:16px;font-weight:600;color:${textStrong};margin:0 0 ${ts(2)}}
.custom-block.card-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(${ts(56)},1fr));gap:${ts(4)};margin:${ts(4)} 0}
a.custom-block.link-card{display:block;background:${bgSoft};border:1px solid ${border};border-radius:${ts(3)};padding:${ts(5)} ${ts(6)};margin:${ts(3)} 0;transition:border-color .15s,background .15s;text-decoration:none;color:${text}}
a.custom-block.link-card:hover{border-color:${brand};background:${bgMute};text-decoration:none}
a.custom-block.link-card .link-card-title{font-size:16px;font-weight:600;color:${brand};margin:0 0 ${ts(2)}}
.custom-block.card-grid .custom-block.card,.custom-block.card-grid a.custom-block.link-card{margin:0}

/* --------------------------------------------------------- custom blocks */
.custom-block{margin:${ts(4)} 0;padding:${ts(3)} ${ts(4)};border-radius:${ts(2)};border:1px solid transparent;font-size:14.5px}
.custom-block p{margin:${ts(2)} 0}
.custom-block-title{font-weight:700;margin:0 0 ${ts(1)} !important;font-size:13px}
.custom-block.tip,.custom-block.success{background:color-mix(in srgb,${brand} 8%,${bg});border-color:color-mix(in srgb,${brand} 28%,transparent)}
.custom-block.info,.custom-block.note,.custom-block.abstract{background:${bgSoft};border-color:${border}}
.custom-block.warning,.custom-block.question{background:color-mix(in srgb,${tc("shift-6", "warning")} 10%,${bg});border-color:${tc("shift-6", "warning")}}
.custom-block.danger,.custom-block.failure,.custom-block.bug{background:color-mix(in srgb,${tc("shift-7", "danger")} 10%,${bg});border-color:${tc("shift-7", "danger")}}
.custom-block.example{background:color-mix(in srgb,${tc("shift-7", "secondary")} 10%,${bg});border-color:${tc("shift-7", "secondary")}}
.custom-block.quote{background:${bgSoft};border-color:${border};border-left-width:4px;border-radius:0 ${ts(2)} ${ts(2)} 0}
details.custom-block summary{cursor:pointer;font-weight:600}

/* ------------------------------------------------------------------- steps */
.custom-block.steps{background:none;border:none;padding:0}
.custom-block.steps>ol{counter-reset:step;list-style:none;padding:0;margin:0}
.custom-block.steps>ol>li{counter-increment:step;display:grid;grid-template-columns:${ts(9)} 1fr;gap:0 ${ts(4)};margin-bottom:${ts(6)}}
.custom-block.steps>ol>li::before{content:counter(step);display:flex;align-items:center;justify-content:center;width:${ts(7.5)};height:${ts(7.5)};border-radius:50%;background:${brand};color:${bg};font-size:13px;font-weight:700;flex-shrink:0}

/* ----------------------------------------------------------------- mermaid */
.dp-mermaid{margin:${ts(5)} 0;text-align:center;overflow-x:auto}
.dp-mermaid svg{max-width:100%;height:auto}

/* --------------------------------------------------------------- task lists */
.task-list-item{list-style:none;margin-left:-1.4em;padding-left:1.8em;position:relative}
.task-list-check{position:absolute;left:0;top:.25em;width:14px;height:14px;cursor:default;accent-color:${brand}}

/* ---------------------------------------------------------------- shiki dark */
html[data-theme="dark"] .shiki span{color:var(--shiki-dark,inherit) !important}
html[data-theme="dark"] .shiki{color:var(--shiki-dark,inherit) !important;background-color:transparent !important}

/* ------------------------------------------------------------------ badges */
.dp-badge{display:inline-block;padding:2px ${ts(2)};font-size:12px;font-weight:600;border-radius:${ts(1.5)};line-height:1.7;vertical-align:middle;white-space:nowrap}
.dp-badge-tip,.dp-badge-info{background:color-mix(in srgb,${brand} 15%,transparent);color:${brand}}
.dp-badge-warning{background:color-mix(in srgb,${tc("shift-6", "warning")} 15%,transparent);color:${tc("shift-7", "warning")}}
.dp-badge-danger,.dp-badge-error{background:color-mix(in srgb,${tc("shift-7", "danger")} 15%,transparent);color:${tc("shift-8", "danger")}}
`;
}
