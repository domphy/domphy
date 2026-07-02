// shadcn/ui "sidebar-09" — clean-room reimplementation from the public behavior
// description only (no upstream source viewed). An email-client-style layout:
// a narrow icon-only folder rail nested beside a wider message-list panel,
// both to the left of the main content inset. See ./sidebar09-12-shared.ts.

import type { DomphyElement, Listener, State } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, buttonGhost, inputSearch, inputSwitch, menu, popover, small, strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import {
  ICON_DRAFTS,
  ICON_INBOX,
  ICON_JUNK,
  ICON_MARK,
  ICON_SEND,
  ICON_TRASH,
  sidebarIcon,
  sidebarMainContent,
  sidebarStickyHeader,
  type SidebarBreadcrumbItem,
} from "./sidebar09-12-shared.js";

type Sidebar09Folder = { id: string; label: string; icon: string };
type Sidebar09Message = {
  id: string;
  folderId: string;
  sender: string;
  timestamp: string;
  subject: string;
  preview: string;
  unread?: boolean;
};
type Sidebar09User = { name: string; email: string };

type Sidebar09Props = {
  folders?: Sidebar09Folder[];
  messages?: Sidebar09Message[];
  activeFolderId?: string;
  activeMessageId?: string | null;
  searchQuery?: string;
  user?: Sidebar09User;
  breadcrumbItems?: SidebarBreadcrumbItem[];
  onFolderSelect?: (folderId: string) => void;
  onMessageSelect?: (messageId: string) => void;
  onSearchChange?: (query: string) => void;
  children?: DomphyElement | DomphyElement[];
};

const DEFAULT_FOLDERS: Sidebar09Folder[] = [
  { id: "inbox", label: "Inbox", icon: ICON_INBOX },
  { id: "drafts", label: "Drafts", icon: ICON_DRAFTS },
  { id: "sent", label: "Sent", icon: ICON_SEND },
  { id: "junk", label: "Junk", icon: ICON_JUNK },
  { id: "trash", label: "Trash", icon: ICON_TRASH },
];

const DEFAULT_MESSAGES: Sidebar09Message[] = [
  {
    id: "m1",
    folderId: "inbox",
    sender: "William Smith",
    timestamp: "9:34 AM",
    subject: "Meeting Tomorrow",
    preview:
      "Hi, let's have a meeting tomorrow to discuss the project. I've been reviewing the deliverables and have a few thoughts to share.",
    unread: true,
  },
  {
    id: "m2",
    folderId: "inbox",
    sender: "Alice Smith",
    timestamp: "Yesterday",
    subject: "Re: Project Update",
    preview:
      "Thanks for the update — the progress looks great so far. Let's sync up next week to review the remaining milestones.",
    unread: true,
  },
  {
    id: "m3",
    folderId: "inbox",
    sender: "Bob Johnson",
    timestamp: "2 days ago",
    subject: "Weekend Plans",
    preview: "Any plans for the weekend? I was thinking of going hiking if the weather holds up on Saturday.",
    unread: false,
  },
  {
    id: "m4",
    folderId: "inbox",
    sender: "Emily Davis",
    timestamp: "2 days ago",
    subject: "Re: Question about Budget",
    preview: "I've attached the budget breakdown for this quarter — let me know if anything needs adjusting.",
    unread: false,
  },
  {
    id: "m5",
    folderId: "drafts",
    sender: "You",
    timestamp: "3 days ago",
    subject: "Draft: Quarterly Report",
    preview: "This report summarizes our progress over the last quarter and highlights a few key wins.",
    unread: false,
  },
  {
    id: "m6",
    folderId: "sent",
    sender: "You",
    timestamp: "4 days ago",
    subject: "Invoice #1042",
    preview: "Please find attached the invoice for last month's services rendered.",
    unread: false,
  },
  {
    id: "m7",
    folderId: "junk",
    sender: "Prize Notice",
    timestamp: "5 days ago",
    subject: "You've Won!",
    preview: "Claim your prize now before it expires — a limited-time offer just for you.",
    unread: true,
  },
  {
    id: "m8",
    folderId: "trash",
    sender: "Old Newsletter",
    timestamp: "1 week ago",
    subject: "Weekly Digest",
    preview: "Here is everything you missed this week from our newsletter roundup.",
    unread: false,
  },
];

const DEFAULT_USER: Sidebar09User = { name: "Shad Cn", email: "shadcn@example.com" };

/** Compact icon-badge logo header at the top of the icon rail. */
function railLogo(): DomphyElement<"div"> {
  return {
    div: [sidebarIcon(ICON_MARK, "primary")],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: themeSpacing(14),
      flexShrink: "0",
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
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
        ariaCurrent: (l: Listener) => (activeFolderId.get(l) === folder.id ? "true" : undefined),
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
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&[aria-current=true]": {
            backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary"),
            color: (l: Listener) => themeColor(l, "shift-12", "primary"),
          },
        },
      } as unknown as DomphyElement,
    ],
    _key: folder.id,
  } as DomphyElement<"li">;
}

/** Round account-avatar footer button at the bottom of the icon rail. */
function railFooter(user: Sidebar09User): DomphyElement<"div"> {
  const accountMenu: DomphyElement<"div"> = {
    div: null,
    style: { minWidth: themeSpacing(44) },
    $: [menu({ items: [{ label: user.name }, { label: user.email }, { label: "Log out" }] })],
  } as unknown as DomphyElement<"div">;

  return {
    div: [
      {
        button: [
          { span: user.name.slice(0, 1).toUpperCase(), $: [avatar({ color: "primary" })] } as unknown as DomphyElement,
        ],
        type: "button",
        ariaLabel: "Account menu",
        style: { display: "flex", border: "none", background: "none", cursor: "pointer", padding: "0" },
        $: [popover({ placement: "right-end", content: accountMenu })],
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
      flexShrink: "0",
      borderTop: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function messageListHeader(
  workspaceName: string,
  searchQuery: State<string>,
  unreadOnly: State<boolean>,
  onCloseMobile: () => void,
  onSearchChange?: (query: string) => void,
): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          { strong: workspaceName, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
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
          justifyContent: "space-between",
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 2),
        },
      } as unknown as DomphyElement,
      {
        div: [
          {
            input: null,
            type: "search",
            placeholder: "Search mail...",
            value: (l: Listener) => searchQuery.get(l),
            onInput: (e: Event) => {
              const query = (e.target as HTMLInputElement).value;
              searchQuery.set(query);
              onSearchChange?.(query);
            },
            style: { flex: "1" },
            $: [inputSearch()],
          } as unknown as DomphyElement,
          {
            label: [
              { small: "Unreads", $: [small({ color: "neutral" })] } as unknown as DomphyElement,
              {
                input: null,
                type: "checkbox",
                checked: (l: Listener) => unreadOnly.get(l),
                onChange: (e: Event) => unreadOnly.set((e.target as HTMLInputElement).checked),
                $: [inputSwitch()],
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", alignItems: "center", gap: themeSpacing(2), flexShrink: "0" },
          } as unknown as DomphyElement,
        ],
        style: {
          display: "flex",
          alignItems: "center",
          gap: (l: Listener) => themeSpacing(themeDensity(l) * 3),
          paddingInline: (l: Listener) => themeSpacing(themeDensity(l) * 4),
          paddingBlock: (l: Listener) => themeSpacing(themeDensity(l) * 3),
        },
      } as unknown as DomphyElement,
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"div">;
}

function messageRow(message: Sidebar09Message, selected: boolean, onSelect: (id: string) => void): DomphyElement<"li"> {
  return {
    li: [
      {
        button: [
          {
            div: [
              {
                span: null,
                ariaHidden: "true",
                style: {
                  width: themeSpacing(2),
                  height: themeSpacing(2),
                  borderRadius: "50%",
                  flexShrink: "0",
                  display: message.unread ? "inline-block" : "none",
                  color: (l: Listener) => themeColor(l, "shift-9", "primary"),
                  backgroundColor: (l: Listener) => themeColor(l, "inherit", "primary"),
                },
              } as unknown as DomphyElement,
              { strong: message.sender, $: [strong({ color: "neutral" })] } as unknown as DomphyElement,
              {
                small: message.timestamp,
                style: { marginInlineStart: "auto", flexShrink: "0" },
                $: [small({ color: "neutral" })],
              } as unknown as DomphyElement,
            ],
            style: { display: "flex", alignItems: "center", gap: themeSpacing(2), width: "100%" },
          } as unknown as DomphyElement,
          {
            strong: message.subject,
            style: { display: "block", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            $: [strong({ color: "neutral" })],
          } as unknown as DomphyElement,
          {
            small: message.preview,
            style: {
              display: "-webkit-box",
              WebkitLineClamp: "2",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
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
          borderBottom: (l: Listener) => `1px solid ${themeColor(l, "shift-2", "neutral")}`,
          color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
          backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
          "&:hover": { backgroundColor: (l: Listener) => themeColor(l, "shift-2", "neutral") },
          "&[aria-selected=true]": { backgroundColor: (l: Listener) => themeColor(l, "shift-3", "primary") },
        },
      } as unknown as DomphyElement,
    ],
    _key: message.id,
  } as DomphyElement<"li">;
}

function buildMessageList(
  messages: Sidebar09Message[],
  activeFolderId: State<string>,
  activeMessageId: State<string | null>,
  searchQuery: State<string>,
  unreadOnly: State<boolean>,
  onSelect: (id: string) => void,
): DomphyElement<"ul"> {
  return {
    ul: (listener: Listener) => {
      const folder = activeFolderId.get(listener);
      const query = searchQuery.get(listener).trim().toLowerCase();
      const onlyUnread = unreadOnly.get(listener);
      const selected = activeMessageId.get(listener);
      const filtered = messages
        .filter((message) => message.folderId === folder)
        .filter((message) => !onlyUnread || message.unread)
        .filter(
          (message) =>
            !query ||
            message.sender.toLowerCase().includes(query) ||
            message.subject.toLowerCase().includes(query) ||
            message.preview.toLowerCase().includes(query),
        );

      if (filtered.length === 0) {
        return [
          {
            li: [{ small: "No messages", $: [small({ color: "neutral" })] } as unknown as DomphyElement],
            _key: "empty",
            style: { padding: (l: Listener) => themeSpacing(themeDensity(l) * 4), listStyle: "none" },
          } as unknown as DomphyElement,
        ];
      }
      return filtered.map((message) => messageRow(message, message.id === selected, onSelect));
    },
    role: "listbox",
    ariaLabel: "Messages",
    style: { listStyle: "none", margin: "0", padding: "0", flex: "1", minHeight: "0", overflowY: "auto" },
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
    onSearchChange,
    children,
  } = props;

  const railCollapsed = toState(false);
  const activeFolderId = toState(props.activeFolderId ?? folders[0]?.id ?? "inbox");
  const activeMessageId = toState<string | null>(props.activeMessageId ?? null);
  const searchQuery = toState(props.searchQuery ?? "");
  const unreadOnly = toState(false);
  const mobileListOpen = toState(false);

  const selectFolder = (id: string) => {
    activeFolderId.set(id);
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
        ul: folders.map((folder) => folderRailButton(folder, activeFolderId, selectFolder)),
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
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: (l: Listener) => (railCollapsed.get(l) ? "0px" : themeSpacing(14)),
      overflow: "hidden",
      transition: "width 180ms ease-out",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
    },
  } as unknown as DomphyElement<"aside">;

  const listPanel: DomphyElement<"aside"> = {
    aside: [
      messageListHeader("Acme Mail", searchQuery, unreadOnly, () => mobileListOpen.set(false), onSearchChange),
      buildMessageList(messages, activeFolderId, activeMessageId, searchQuery, unreadOnly, selectMessage),
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      flexShrink: "0",
      width: themeSpacing(84),
      minHeight: "0",
      overflow: "hidden",
      borderInlineEnd: (l: Listener) => `1px solid ${themeColor(l, "shift-3", "neutral")}`,
      color: (l: Listener) => themeColor(l, "shift-9", "neutral"),
      backgroundColor: (l: Listener) => themeColor(l, "inherit", "neutral"),
      "@media (max-width: 768px)": {
        display: (l: Listener) => (mobileListOpen.get(l) ? "flex" : "none"),
        position: "fixed",
        insetBlock: "0",
        insetInlineStart: (l: Listener) => (railCollapsed.get(l) ? "0" : themeSpacing(14)),
        zIndex: "16",
        width: themeSpacing(84),
        boxShadow: (l: Listener) => `0 0 ${themeSpacing(6)} ${themeColor(l, "shift-4", "neutral")}`,
      },
    },
  } as unknown as DomphyElement<"aside">;

  const mainElement: DomphyElement<"main"> = {
    main: [
      sidebarStickyHeader({ onToggle: () => railCollapsed.set(!railCollapsed.get()), breadcrumbItems }),
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
export type { Sidebar09Folder, Sidebar09Message, Sidebar09Props, Sidebar09User };
