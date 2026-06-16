export type Difficulty = "easy" | "medium" | "hard" | "very-hard";
export type Category =
  | "display"
  | "controls"
  | "forms"
  | "layout"
  | "data"
  | "overlays";

export interface Task {
  id: string;
  label: string;
  difficulty: Difficulty;
  category: Category;
  /** Prompt sent to LLM (condition A/B/C). */
  prompt: string;
  /** Prompt variant for React baseline (condition D). */
  reactPrompt: string;
  /** HTML tag substrings that must appear in generated code (structure check). */
  requiredTags?: string[];
  /** TS/JS keywords that must appear (import/call check). */
  requiredKeywords?: string[];
}

export const TASKS: Task[] = [
  // ─── Easy ───────────────────────────────────────────────────────────
  {
    id: "hello-world",
    label: "Hello World card",
    difficulty: "easy",
    category: "display",
    prompt:
      "Create a Domphy element tree: a centered card with a large heading 'Hello, World!' and a subtitle paragraph 'Built with Domphy'. Use @domphy/ui patches for typography and the card layout.",
    reactPrompt:
      "Create a React functional component: a centered card with a large heading 'Hello, World!' and a subtitle paragraph 'Built with Domphy'.",
    requiredTags: ["div:", "h1:", "p:", "h2:", "h3:"],
    requiredKeywords: ["heading(", "paragraph(", "card("],
  },
  {
    id: "counter",
    label: "Reactive counter",
    difficulty: "easy",
    category: "controls",
    prompt:
      "Create a Domphy element tree: a counter with a number display and two buttons — decrement (−) and increment (+). Use @domphy/core toState for reactive state, @domphy/ui button() and heading() patches. The displayed count must update reactively when buttons are clicked.",
    reactPrompt:
      "Create a React functional component: a counter with a number display and two buttons — decrement (−) and increment (+). Use useState hook.",
    requiredTags: ["button:"],
    requiredKeywords: ["toState", "button("],
  },
  {
    id: "status-badges",
    label: "Status badge list",
    difficulty: "easy",
    category: "display",
    prompt:
      "Create a Domphy element tree: a horizontal list of status badges — 'Active' (green), 'Pending' (yellow), 'Inactive' (red). Use @domphy/ui badge() patch. Do NOT use inline color values; use themeColor() from @domphy/theme for colors.",
    reactPrompt:
      "Create a React functional component: a horizontal list of status badges — 'Active' (green), 'Pending' (yellow), 'Inactive' (red).",
    requiredTags: ["span:", "div:"],
    requiredKeywords: ["badge("],
  },
  {
    id: "profile-card",
    label: "User profile card",
    difficulty: "easy",
    category: "display",
    prompt:
      "Create a Domphy element tree: a user profile card showing an avatar (img tag), a full name heading, a bio paragraph, and a 'Follow' button. Use @domphy/ui patches: avatar(), heading(), paragraph(), button(), card().",
    reactPrompt:
      "Create a React functional component: a user profile card showing an avatar image, full name, bio, and a 'Follow' button.",
    requiredTags: ["img:", "button:"],
    requiredKeywords: ["avatar(", "heading(", "paragraph(", "button(", "card("],
  },
  {
    id: "alert-error",
    label: "Dismissible error alert",
    difficulty: "easy",
    category: "display",
    prompt:
      "Create a Domphy element tree: an error alert with the message 'Something went wrong. Please try again.' and an × dismiss button that hides the alert when clicked. Use @domphy/ui alert() patch and toState for visibility.",
    reactPrompt:
      "Create a React functional component: an error alert with a dismiss button that hides the alert when clicked.",
    requiredTags: ["div:", "button:"],
    requiredKeywords: ["alert(", "toState"],
  },

  // ─── Medium ─────────────────────────────────────────────────────────
  {
    id: "login-form",
    label: "Login form (email + password)",
    difficulty: "medium",
    category: "forms",
    prompt:
      "Create a Domphy login form with email and password inputs and a submit button. Use @domphy/form (createForm from @domphy/form/domphy) for form state. Bind inputs with value: (l) => field.value(l) and onInput handlers. Use @domphy/ui input-text() patch for inputs, button() for submit, heading() for the title.",
    reactPrompt:
      "Create a React login form component with email and password inputs and a submit button. Use useState for form state and handle onSubmit.",
    requiredTags: ["input:", "button:"],
    requiredKeywords: ["createForm", "input-text(", "button("],
  },
  {
    id: "nav-header",
    label: "Navigation header with links",
    difficulty: "medium",
    category: "layout",
    prompt:
      "Create a Domphy element tree: a site navigation header with a logo/brand text on the left, three nav links (Home, About, Contact) in the center, and a 'Sign In' button on the right. Use @domphy/ui link() and button() patches. No inline typography styles.",
    reactPrompt:
      "Create a React navigation header component with logo, nav links, and a Sign In button.",
    requiredTags: ["nav:", "a:", "button:"],
    requiredKeywords: ["link(", "button("],
  },
  {
    id: "search-bar",
    label: "Search bar with results",
    difficulty: "medium",
    category: "controls",
    prompt:
      "Create a Domphy element tree: a search input with a live-updating results list. As the user types, filter a local array of items (at least 5 sample strings) and display matching items as a list. Use @domphy/ui input-search() patch, toState for query state, and computed() from @domphy/core for filtered results.",
    reactPrompt:
      "Create a React search component with an input and a live-filtered results list. Use useState and useMemo.",
    requiredTags: ["input:", "ul:", "li:"],
    requiredKeywords: ["input-search(", "toState", "computed("],
  },
  {
    id: "tabs-panel",
    label: "Tabbed panel (3 tabs)",
    difficulty: "medium",
    category: "controls",
    prompt:
      "Create a Domphy element tree: a tabbed interface with 3 tabs (Overview, Features, Pricing). Clicking a tab shows its content panel and marks the tab as active. Use @domphy/ui tabs() patch and toState for the active tab index.",
    reactPrompt:
      "Create a React tabbed interface with 3 tabs. Use useState for active tab.",
    requiredTags: ["button:", "div:"],
    requiredKeywords: ["tabs(", "toState"],
  },
  {
    id: "data-table",
    label: "Simple data table",
    difficulty: "medium",
    category: "data",
    prompt:
      "Create a Domphy element tree: a table displaying 5 rows of user data (name, email, role). Use @domphy/ui table() patch. Add a sort button on the Name column header that toggles ascending/descending order. Use toState for sort direction and computed() for sorted rows.",
    reactPrompt:
      "Create a React data table with 5 rows (name, email, role) and a sortable Name column. Use useState and useMemo.",
    requiredTags: ["table:", "thead:", "tbody:", "tr:", "td:"],
    requiredKeywords: ["table(", "toState", "computed("],
  },

  // ─── Hard ────────────────────────────────────────────────────────────
  {
    id: "pricing-cards",
    label: "3-tier pricing cards",
    difficulty: "hard",
    category: "display",
    prompt:
      "Create a Domphy element tree: three pricing tier cards (Free, Pro, Enterprise) arranged horizontally. Each card shows the tier name, price, a feature list, and a CTA button. Use @domphy/ui card(), heading(), paragraph(), button(), unordered-list() patches. Mark the Pro card as 'Most popular' with a badge(). No inline typography.",
    reactPrompt:
      "Create a React pricing section with three tier cards (Free, Pro, Enterprise), each with name, price, feature list, and CTA button.",
    requiredTags: ["ul:", "li:", "button:"],
    requiredKeywords: ["card(", "heading(", "paragraph(", "button(", "badge("],
  },
  {
    id: "form-validation",
    label: "Form with validation messages",
    difficulty: "hard",
    category: "forms",
    prompt:
      "Create a Domphy registration form with: name (required), email (required, email format), password (required, min 8 chars). Use @domphy/form createForm with validators. Show per-field validation error messages reactively. Use @domphy/ui input-text() for inputs, button() for submit. Bind each field's error with (l) => field.state.meta.errors.join(', ').",
    reactPrompt:
      "Create a React registration form with name, email, password fields. Show validation errors for each field (required, email format, min password length). Use useState and custom validation.",
    requiredTags: ["input:", "button:", "form:"],
    requiredKeywords: ["createForm", "input-text(", "validators"],
  },
  {
    id: "modal-confirm",
    label: "Confirmation modal dialog",
    difficulty: "hard",
    category: "overlays",
    prompt:
      "Create a Domphy element tree: a page with a 'Delete Account' button that opens a confirmation modal dialog. The modal has a heading, a warning paragraph, and two buttons (Cancel + Confirm Delete). Use @domphy/ui dialog() patch and toState for open/closed state. Clicking Cancel or Confirm closes the modal.",
    reactPrompt:
      "Create a React page with a button that opens a confirmation modal. The modal has Cancel and Confirm Delete buttons.",
    requiredTags: ["dialog:", "button:"],
    requiredKeywords: ["dialog(", "toState"],
  },
  {
    id: "kanban-board",
    label: "Kanban board (3 columns)",
    difficulty: "hard",
    category: "data",
    prompt:
      "Create a Domphy element tree: a kanban board with three columns (To Do, In Progress, Done). Each column shows a list of task cards (2–3 each). Use @domphy/ui card() for task cards, heading() for column titles. Represent state with RecordState or toState. No drag-and-drop needed — just the visual structure.",
    reactPrompt:
      "Create a React kanban board with three columns (To Do, In Progress, Done), each with 2-3 task cards.",
    requiredTags: ["div:", "h2:", "h3:"],
    requiredKeywords: ["card(", "heading("],
  },
  {
    id: "toast-system",
    label: "Toast notification system",
    difficulty: "hard",
    category: "overlays",
    prompt:
      "Create a Domphy toast notification system: a button 'Show Notification' triggers a toast with a message. Toasts auto-dismiss after 3 seconds. Use @domphy/ui toast() patch, RecordState to manage a list of toasts, and effect() from @domphy/core for the auto-dismiss timer. Render toasts in a fixed overlay container.",
    reactPrompt:
      "Create a React toast notification system with auto-dismiss after 3 seconds. Use useState and useEffect.",
    requiredTags: ["button:", "div:"],
    requiredKeywords: ["toast(", "RecordState", "effect("],
  },

  // ─── Very Hard ───────────────────────────────────────────────────────
  {
    id: "command-palette",
    label: "Keyboard command palette",
    difficulty: "very-hard",
    category: "overlays",
    prompt:
      "Create a Domphy command palette (Cmd+K style). A keyboard shortcut (keydown listener) opens a dialog with a search input. Type to filter a list of 10 commands (name + shortcut). Navigate with arrow keys. Use @domphy/ui command() patch, dialog(), input-search(). Use computed() for filtered list and toState for selection index.",
    reactPrompt:
      "Create a React command palette (Cmd+K opens it). Search input filters a list of 10 commands. Navigate with arrow keys. Use useState, useEffect, useMemo.",
    requiredTags: ["input:", "ul:", "li:", "dialog:"],
    requiredKeywords: ["command(", "dialog(", "computed(", "toState"],
  },
  {
    id: "wizard-form",
    label: "Multi-step wizard form",
    difficulty: "very-hard",
    category: "forms",
    prompt:
      "Create a Domphy 3-step wizard form (Step 1: personal info — name/email; Step 2: preferences — theme/language select; Step 3: review + submit). Show a progress indicator. Use @domphy/form createForm with stepped field groups. Use toState for current step. Validate each step before advancing. Use @domphy/ui input-text(), select(), button(), progress() patches.",
    reactPrompt:
      "Create a React 3-step wizard form (personal info, preferences, review/submit) with a progress indicator. Use useState for step and form state.",
    requiredTags: ["input:", "button:", "select:"],
    requiredKeywords: ["createForm", "toState", "progress("],
  },
  {
    id: "data-grid",
    label: "Sortable filterable data grid",
    difficulty: "very-hard",
    category: "data",
    prompt:
      "Create a Domphy data grid with 10 rows of sample data (id, name, department, salary). Features: column sorting (click header toggles asc/desc), text filter input, row selection via checkboxes. Use @domphy/table (createDomphyTable from @domphy/table/domphy). Use @domphy/ui table(), input-search(), input-checkbox() patches.",
    reactPrompt:
      "Create a React data grid with 10 rows (id, name, department, salary). Features: sortable columns, text filter, row selection checkboxes. Use useState, useMemo.",
    requiredTags: ["table:", "input:", "thead:", "tbody:"],
    requiredKeywords: ["createDomphyTable", "table(", "input-search("],
  },
  {
    id: "infinite-scroll",
    label: "Infinite scroll list",
    difficulty: "very-hard",
    category: "data",
    prompt:
      "Create a Domphy infinite scroll feed: fetch posts page by page (mock the fetch returning 10 posts per page). Use @domphy/query createInfiniteQuery from @domphy/query/domphy. As the user scrolls near the bottom, load the next page. Use @domphy/virtual createVirtualizer from @domphy/virtual/domphy for the list rendering. Show a spinner() while loading.",
    reactPrompt:
      "Create a React infinite scroll list that fetches posts page by page. Use a mock fetch. Use useInfiniteQuery from @tanstack/react-query and IntersectionObserver to trigger next page load.",
    requiredTags: ["div:", "ul:", "li:"],
    requiredKeywords: ["createInfiniteQuery", "createVirtualizer", "spinner("],
  },
  {
    id: "dashboard",
    label: "Analytics dashboard layout",
    difficulty: "very-hard",
    category: "layout",
    prompt:
      "Create a Domphy analytics dashboard layout: a fixed sidebar nav with 5 links, a top header with page title and user avatar, and a main content area with 4 stat cards (Users, Revenue, Orders, Conversion) each showing a number and a trend indicator. Use @domphy/ui card(), heading(), paragraph(), avatar(), badge() patches. Use @domphy/router createRouter for sidebar navigation. No inline typography.",
    reactPrompt:
      "Create a React analytics dashboard with a fixed sidebar nav, top header, and 4 stat cards (Users, Revenue, Orders, Conversion). Use React Router for sidebar navigation.",
    requiredTags: ["nav:", "header:", "main:", "aside:"],
    requiredKeywords: ["card(", "heading(", "createRouter"],
  },
];
