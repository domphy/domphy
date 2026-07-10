// shadcn/ui "sidebar-09" — an email-client-style layout mirroring upstream
// sidebar-09's documented behavior: a narrow icon-only folder rail nested
// beside a wider message-list panel, both to the left of the main content
// inset. Upstream keeps ONE shared mail pool that every folder button reshuffles
// (random 5–10 slice) rather than per-folder mailboxes; its search box and
// "Unreads" switch are decorative. See ./sidebar09-12-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  avatar,
  buttonGhost,
  inputSearch,
  inputSwitch,
  popover,
  small,
  strong,
} from "@domphy/ui";
import {
  ICON_DRAFTS,
  ICON_INBOX,
  ICON_JUNK,
  ICON_MARK,
  ICON_SEND,
  ICON_SPARKLE,
  ICON_TRASH,
  interactiveRowStyle,
  type SidebarBreadcrumbItem,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  srOnlyLabel,
} from "./sidebar09-12-shared.js";

type Sidebar09Folder = { id: string; label: string; icon: string };
type Sidebar09Message = {
  id: string;
  sender: string;
  timestamp: string;
  subject: string;
  preview: string;
};
type Sidebar09User = { name: string; email: string };

type Sidebar09Props = {
  folders?: Sidebar09Folder[];
  messages?: Sidebar09Message[];
  activeFolderId?: string;
  activeMessageId?: string | null;
  user?: Sidebar09User;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  onFolderSelect?: (folderId: string) => void;
  onMessageSelect?: (messageId: string) => void;
  children?: DomphyElement | DomphyElement[];
};

// Account-menu icons the NavUser dropdown needs (lucide equivalents: Sparkles is
// shared as ICON_SPARKLE; the rest are hand-authored generic line glyphs).
const SVG_OPEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em">';
const ICON_BADGE_CHECK = `${SVG_OPEN}<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`;
const ICON_CREDIT_CARD = `${SVG_OPEN}<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
const ICON_BELL = `${SVG_OPEN}<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
const ICON_LOGOUT = `${SVG_OPEN}<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`;

const DEFAULT_FOLDERS: Sidebar09Folder[] = [
  { id: "inbox", label: "Inbox", icon: ICON_INBOX },
  { id: "drafts", label: "Drafts", icon: ICON_DRAFTS },
  { id: "sent", label: "Sent", icon: ICON_SEND },
  { id: "junk", label: "Junk", icon: ICON_JUNK },
  { id: "trash", label: "Trash", icon: ICON_TRASH },
];

// Upstream keeps a single flat pool of conversational mails (no per-folder
// mailbox, no read/unread state); every folder button reshuffles this same pool.
const DEFAULT_MESSAGES: Sidebar09Message[] = [
  {
    id: "m1",
    sender: "William Smith",
    timestamp: "09:34 AM",
    subject: "Meeting Tomorrow",
    preview:
      "Hi team, just a reminder about our meeting tomorrow at 10 AM.\nPlease come prepared with your project updates.",
  },
  {
    id: "m2",
    sender: "Alice Smith",
    timestamp: "Yesterday",
    subject: "Re: Project Update",
    preview:
      "Thanks for the update. The progress looks great so far.\nLet's schedule a call to discuss the next steps.",
  },
  {
    id: "m3",
    sender: "Bob Johnson",
    timestamp: "2 days ago",
    subject: "Weekend Plans",
    preview:
      "Hey everyone! I'm thinking of organizing a team outing this weekend.\nWould you be interested in a hiking trip or a beach day?",
  },
  {
    id: "m4",
    sender: "Emily Davis",
    timestamp: "2 days ago",
    subject: "Re: Question about Budget",
    preview:
      "I've reviewed the budget numbers you sent over.\nCan we set up a quick call to discuss some potential adjustments?",
  },
  {
    id: "m5",
    sender: "Michael Wilson",
    timestamp: "1 week ago",
    subject: "Important Announcement",
    preview:
      "Please join us for an all-hands meeting this Friday at 3 PM.\nWe have some exciting news to share about the company's future.",
  },
  {
    id: "m6",
    sender: "Sarah Brown",
    timestamp: "1 week ago",
    subject: "Re: Feedback on Proposal",
    preview:
      "Thank you for sending over the proposal. I've reviewed it and have some thoughts.\nCould we schedule a meeting to discuss my feedback in detail?",
  },
  {
    id: "m7",
    sender: "David Lee",
    timestamp: "1 week ago",
    subject: "New Project Idea",
    preview:
      "I've been brainstorming and came up with an interesting project concept.\nDo you have time this week to discuss its potential impact and feasibility?",
  },
  {
    id: "m8",
    sender: "Olivia Wilson",
    timestamp: "1 week ago",
    subject: "Vacation Plans",
    preview:
      "Just a heads up that I'll be taking a two-week vacation next month.\nI'll make sure all my projects are up to date before I leave.",
  },
  {
    id: "m9",
    sender: "James Martin",
    timestamp: "1 week ago",
    subject: "Re: Conference Registration",
    preview:
      "I've completed the registration for the upcoming tech conference.\nLet me know if you need any additional information from my end.",
  },
  {
    id: "m10",
    sender: "Sophia White",
    timestamp: "1 week ago",
    subject: "Team Dinner",
    preview:
      "To celebrate our recent project success, I'd like to organize a team dinner.\nAre you available next Friday evening? Please let me know your preferences.",
  },
];

const DEFAULT_USER: Sidebar09User = {
  name: "Shad Cn",
  email: "shadcn@example.com",
};

/** Upstream's folder click: reshuffle the shared pool and take a random 5–10. */
function shuffledSlice(pool: Sidebar09Message[]): Sidebar09Message[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.max(5, Math.floor(Math.random() * 10) + 1);
  return shuffled.slice(0, count);
}

/** Compact icon-badge logo header at the top of the icon rail. Upstream keeps
 * the "Acme Inc"/"Enterprise" text next to the badge; at icon-rail width it's
 * clipped (overflow hidden) exactly as upstream truncates it. */
function railLogo(): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          sidebarIcon(ICON_MARK, "primary"),
          {
            div: [
              {
                strong: "Acme Inc",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
                $: [strong({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                small: "Enterprise",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              minWidth: "0",
              overflow: "hidden",
              textAlign: "left",
            },
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: themeSpacing(2),
          width: "100%",
          overflow: "hidden",
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: themeSpacing(14),
      flexShrink: "0",
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function folderRailButton(
  folder: Sidebar09Folder,
  activeFolderId: State<string>,
  onSelect: (id: string) => void,
): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [sidebarIcon(folder.icon)],
        type: "button",
        ariaLabel: folder.label,
        ariaCurrent: (l: Listener) =>
          activeFolderId.get(l) === folder.id ? "true" : undefined,
        onClick: () => onSelect(folder.id),
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: themeSpacing(10),
          height: themeSpacing(10),
          border: "none",
          cursor: "pointer",
          borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
          "&[aria-current=true]": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-3", "primary"),
            color: (l: Listener) => themeColor(l, "shift-12", "primary"),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: folder.id,
  } as DomphyElement<"li">;
}

/** One icon + label row inside the account dropdown (upstream DropdownMenuItem). */
function accountMenuItem(icon: string, label: string): DomphyElement {
  return {
    button: [
      sidebarIcon(icon),
      {
        span: label,
        style: { flex: "1", textAlign: "left" },
      } as unknown as DomphyElement,
    ],
    type: "button",
    role: "menuitem",
    style: interactiveRowStyle(true),
  } as unknown as DomphyElement;
}

/**
 * The NavUser account dropdown, matching upstream nav-user.tsx: a header label
 * (avatar + name + email), then separator-delimited groups — "Upgrade to Pro",
 * then Account/Billing/Notifications, then "Log out" — each row with its icon.
 */
function accountDropdown(user: Sidebar09User): DomphyElement<"div"> {
  const groups: { icon: string; label: string }[][] = [
    [{ icon: ICON_SPARKLE, label: "Upgrade to Pro" }],
    [
      { icon: ICON_BADGE_CHECK, label: "Account" },
      { icon: ICON_CREDIT_CARD, label: "Billing" },
      { icon: ICON_BELL, label: "Notifications" },
    ],
    [{ icon: ICON_LOGOUT, label: "Log out" }],
  ];

  const header: DomphyElement = {
    div: [
      {
        span: user.name.slice(0, 1).toUpperCase(),
        $: [avatar({ color: "primary" })],
      } as unknown as DomphyElement,
      {
        div: [
          {
            strong: user.name,
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
          {
            small: user.email,
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            $: [small({ color: "neutral" })],
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          flexDirection: "column",
          minWidth: "0",
          overflow: "hidden",
          textAlign: "left",
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1.5),
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
    },
  } as unknown as DomphyElement;

  const sections = groups.map((items, groupIndex) => ({
    div: items.map((item) => accountMenuItem(item.icon, item.label)),
    // `role="menu"` (below) requires menu-item-family children or a "group"
    // wrapper; this section div carries "group" so each `menuitem` button one
    // level down has a valid parent.
    role: "group",
    style: {
      display: "flex",
      flexDirection: "column",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 1),
      borderBottom:
        groupIndex < groups.length - 1
          ? (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`
          : undefined,
    },
    _key: groupIndex,
  })) as unknown as DomphyElement[];

  return {
    div: [header, ...sections],
    dataTone: "shift-0",
    role: "menu",
    style: {
      display: "flex",
      flexDirection: "column",
      minWidth: themeSpacing(56),
      borderRadius: (l: Listener) => themeSpacing(themeDensity(l) * 2),
      border: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      boxShadow: (l: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(l, "shift-4", "neutral")}`,
      overflow: "hidden",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

/** Round account-avatar footer button at the bottom of the icon rail. */
function railFooter(user: Sidebar09User): DomphyElement<"div"> {
  return {
    div: [
      {
        button: [
          {
            span: user.name.slice(0, 1).toUpperCase(),
            $: [avatar({ color: "primary" })],
          } as unknown as DomphyElement,
        ],
        type: "button",
        ariaLabel: "Account menu",
        style: {
          display: "flex",
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: "0",
        },
        $: [
          popover({ placement: "right-end", content: accountDropdown(user) }),
        ],
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      flexShrink: "0",
      borderTop: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function messageListHeader(
  title: (listener: Listener) => string,
  onCloseMobile: () => void,
): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          // Upstream's second-sidebar header shows the active folder's title
          // (it re-renders on folder switch), not a static workspace name.
          {
            strong: (l: Listener) => title(l),
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
          {
            div: [
              {
                label: [
                  {
                    small: "Unreads",
                    $: [small({ color: "neutral" })],
                  } as unknown as DomphyElement,
                  // Decorative switch (upstream <Switch className="shadow-none" />
                  // has no handler/state and does not filter the list).
                  {
                    input: null,
                    id: "sidebar09-unreads-toggle",
                    type: "checkbox",
                    $: [inputSwitch()],
                  } as unknown as DomphyElement,
                ],
                htmlFor: "sidebar09-unreads-toggle",
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: themeSpacing(2),
                },
              } as unknown as DomphyElement,
              {
                button: "×",
                type: "button",
                ariaLabel: "Close message list",
                onClick: onCloseMobile,
                style: {
                  display: "none",
                  "@media (max-width: 768px)": { display: "inline-flex" },
                },
                $: [buttonGhost({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              display: "flex",
              alignItems: "center",
              gap: themeSpacing(2),
              flexShrink: "0",
            },
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
        },
      } as unknown as DomphyElement,
      {
        div: [
          // Decorative search box (upstream <SidebarInput placeholder="Type to
          // search..." /> is uncontrolled and does not filter the list).
          srOnlyLabel("Search", "sidebar09-message-search"),
          {
            input: null,
            id: "sidebar09-message-search",
            type: "search",
            placeholder: "Type to search...",
            style: { width: "100%" },
            $: [inputSearch()],
          } as unknown as DomphyElement,
        ],
        style: {
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      borderBottom: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function messageRow(
  message: Sidebar09Message,
  selected: boolean,
  onSelect: (id: string) => void,
): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          {
            div: [
              {
                strong: message.sender,
                $: [strong({ color: "neutral" })],
              } as unknown as DomphyElement,
              {
                small: message.timestamp,
                style: { marginInlineStart: "auto", flexShrink: "0" },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: {
              display: "flex",
              alignItems: "center",
              gap: themeSpacing(2),
              width: "100%",
            },
          } as unknown as DomphyElement,
          {
            strong: message.subject,
            style: {
              display: "block",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
          {
            small: message.preview,
            style: {
              display: "-webkit-box",
              WebkitLineClamp: "2",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              whiteSpace: "break-spaces",
            },
            $: [small({ color: "neutral" })],
          } as unknown as DomphyElement,
        ],
        type: "button",
        role: "option",
        ariaSelected: selected,
        onClick: () => onSelect(message.id),
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(1),
          width: "100%",
          textAlign: "left",
          border: "none",
          cursor: "pointer",
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          borderBottom: (l: Listener) =>
            `1px solid ${themeColor(l, "shift-2", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-2", "neutral"),
          },
          "&[aria-selected=true]": {
            backgroundColor: (l: Listener) =>
              themeColor(l, "shift-3", "primary"),
          },
        },
      } as unknown as DomphyElement,
    ],
    // The parent `<ul>` carries `role="listbox"` (see `buildMessageList`) —
    // `role="option"` (on the button above) requires its DIRECT parent to be
    // a listbox/group, but this `<li>` wrapper sits in between with its own
    // native "listitem" role, failing both `aria-required-parent` (option)
    // and `listitem` (the ul no longer reads as a plain list once it's a
    // listbox). `role="presentation"` strips the `<li>`'s own semantics so
    // ARIA parent/child computation skips over it to the `<ul>` beneath.
    role: "presentation",
    style: { "&:last-child > button": { borderBottom: "none" } },
    _key: message.id,
  } as DomphyElement<"li">;
}

function buildMessageList(
  displayedMessages: State<Sidebar09Message[]>,
  activeMessageId: State<string | null>,
  onSelect: (id: string) => void,
): DomphyElement<"ul"> {
  return {
    ul: (listener: Listener) => {
      const list = displayedMessages.get(listener);
      const selected = activeMessageId.get(listener);

      if (list.length === 0) {
        return [
          {
            li: [
              {
                small: "No messages",
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            // Same reasoning as `messageRow`'s `<li>` — the parent `<ul>`
            // carries `role="listbox"`, so a native listitem role here would
            // fail axe-core's `listitem` check the same way.
            role: "presentation",
            _key: "empty",
            style: {
              padding: (l: Listener) => themeSpacing(themeDensity(l) * 4),
              listStyle: "none",
            },
          } as unknown as DomphyElement,
        ];
      }
      return list.map((message) =>
        messageRow(message, message.id === selected, onSelect),
      );
    },
    role: "listbox",
    ariaLabel: "Messages",
    style: {
      listStyle: "none",
      margin: "0",
      padding: "0",
      flex: "1",
      minHeight: "0",
      overflowY: "auto",
    },
  } as unknown as DomphyElement<"ul">;
}

/**
 * Nested-sidebar mail layout: a narrow icon-only folder rail beside a wider
 * message-list panel, both left of the main content inset. Call with no
 * arguments for a fully working demo.
 */
function sidebar09(props: Sidebar09Props = {}): DomphyElement<"div"> {
  const {
    folders = DEFAULT_FOLDERS,
    messages = DEFAULT_MESSAGES,
    user = DEFAULT_USER,
    breadcrumbItems = [{ label: "All Inboxes" }, { label: "Inbox" }],
    onFolderSelect,
    onMessageSelect,
    children,
  } = props;

  const railCollapsed = toState(false);
  const activeFolderId = toState(
    props.activeFolderId ?? folders[0]?.id ?? "inbox",
  );
  const activeMessageId = toState<string | null>(props.activeMessageId ?? null);
  // Upstream seeds the list with the full pool, then reshuffles it on each
  // folder click — folders are triggers over one shared mailbox, not scopes.
  const displayedMessages = toState<Sidebar09Message[]>(messages);
  const mobileListOpen = toState(false);

  const selectFolder = (id: string) => {
    activeFolderId.set(id);
    displayedMessages.set(shuffledSlice(messages));
    mobileListOpen.set(true);
    onFolderSelect?.(id);
  };
  const selectMessage = (id: string) => {
    activeMessageId.set(id);
    onMessageSelect?.(id);
  };

  const iconRail: DomphyElement<"aside"> = {
    aside: [
      railLogo(),
      {
        ul: folders.map((folder) =>
          folderRailButton(folder, activeFolderId, selectFolder),
        ),
        style: {
          listStyle: "none",
          margin: "0",
          padding: (l: Listener) => themeSpacing(themeDensity(l) * 2),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: themeSpacing(1),
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
        },
      } as unknown as DomphyElement,
      railFooter(user),
    ],
    // `listPanel` below is also a plain `<aside>` with no name — without a
    // distinguishing label the two collide as duplicate "complementary"
    // landmarks (axe-core `landmark-unique`).
    ariaLabel: "Folder rail",
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (railCollapsed.get(l) ? "0" : themeSpacing(14)),
      overflow: "hidden",
      transition: "width 180ms ease-out",
      borderInlineEnd: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"aside">;

  const listPanel: DomphyElement<"aside"> = {
    aside: [
      messageListHeader(
        (l: Listener) =>
          folders.find((folder) => folder.id === activeFolderId.get(l))
            ?.label ?? "",
        () => mobileListOpen.set(false),
      ),
      buildMessageList(displayedMessages, activeMessageId, selectMessage),
    ],
    ariaLabel: "Message list",
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: themeSpacing(84),
      minHeight: "0",
      overflow: "hidden",
      borderInlineEnd: (l: Listener) =>
        `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@media (max-width: 768px)": {
        display: (l: Listener) => (mobileListOpen.get(l) ? "flex" : "none"),
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: (l: Listener) =>
          railCollapsed.get(l) ? "0" : themeSpacing(14),
        zIndex: "16",
        width: themeSpacing(84),
        boxShadow: (l: Listener) =>
          `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      sidebarStickyHeader({
        onToggle: () => railCollapsed.set(!railCollapsed.get()),
        breadcrumbItems,
      }),
      sidebarMainContent(children),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      overflow: "hidden",
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
    },
  } as unknown as DomphyElement<"main">;

  return {
    div: [iconRail, listPanel, mainElement],
    dataTone: "shift-0",
    style: {
      display: "flex",
      height: "100dvh",
      overflow: "hidden",
      position: "relative",
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

export { sidebar09 };
export type {
  Sidebar09Folder,
  Sidebar09Message,
  Sidebar09Props,
  Sidebar09User,
};
