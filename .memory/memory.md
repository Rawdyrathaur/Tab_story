# 🧠 Tab Revo — AI Memory File

> **Purpose**: Persistent context for the AI assistant. Never committed to git.
> **Last updated**: 2026-06-29T16:02+05:30

---

## 📌 PROJECT IDENTITY

- **Name**: Tab Revo
- **Type**: Chrome Extension (Manifest V3)
- **What it does**: Organize browser tabs by intent — smart clustering by domain, timeline history, scheduling to Google Calendar, Google Drive backup, collections
- **Author**: Manish Rathaur (@Rawdyrathaur)
- **Repo**: https://github.com/Rawdyrathaur/Tab_story
- **License**: MIT

---

## 🏗️ TECH STACK

| Layer            | Technology                             | Version             |
| ---------------- | -------------------------------------- | ------------------- |
| UI Framework     | React                                  | 19.2.6              |
| Language         | TypeScript                             | ~6.0.2              |
| Bundler          | Vite                                   | 8.x                 |
| Extension Plugin | vite-plugin-web-extension              | 4.5.1               |
| Database         | Dexie.js (IndexedDB)                   | 4.4.2               |
| Live Queries     | dexie-react-hooks                      | 4.4.0               |
| Search           | Fuse.js                                | 7.3.0               |
| Icons            | @heroicons/react                       | 2.2.0               |
| Popover          | @radix-ui/react-popover                | 1.1.15              |
| Class Utility    | clsx + tailwind-merge                  | (Tailwind NOT used) |
| Date Utility     | date-fns                               | 4.3.0               |
| Testing          | Playwright (E2E) + Jest (unit, unused) |                     |
| Linting          | ESLint 10 + Prettier                   |                     |
| Node             | >= 18.0.0                              |                     |

---

## 📁 PROJECT STRUCTURE

```
Tab_story/                          ← Root (monorepo-like wrapper)
├── .memory/                        ← THIS FILE (gitignored)
├── .github/workflows/ci.yml        ← CI (currently BROKEN)
├── config/
│   ├── env.config.js               ← Env loader (NOT wired up)
│   ├── csp.json                    ← CSP policy (NOT wired up)
│   ├── manifest.dev.json           ← Dev manifest overlay (NOT wired up)
│   └── manifest.prod.json          ← Prod manifest overlay (NOT wired up)
├── scripts/
│   ├── detect-secrets.sh
│   ├── validate-env.sh
│   ├── clean-history.sh
│   └── hooks/pre-commit.sh, pre-push.sh
├── tests/extension.spec.ts         ← Only E2E test (basic load check)
├── package.json                    ← Root package (v1.0.1)
├── manifest.json                   ← Root manifest (v1.0.1, STALE)
├── eslint.config.js                ← Root ESLint (security rules)
│
└── tab-revo/                      ← ACTUAL EXTENSION SOURCE
    ├── manifest.json               ← Real manifest (v2.0.0, has OAuth2)
    ├── package.json                ← Extension package (v2.0.0)
    ├── vite.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── src/
    │   ├── background.js           ← Service worker (plain JS!)
    │   └── sidepanel/
    │       ├── App.tsx             ← GOD COMPONENT (861 lines, 29KB)
    │       ├── main.tsx            ← Entry point
    │       ├── db.ts               ← Dexie DB (6 schema versions)
    │       ├── index.html
    │       ├── components/
    │       │   ├── CalendarPanel.tsx  (251 lines)
    │       │   ├── TabList.tsx        (483 lines)
    │       │   ├── TabMenu.tsx        (262 lines)
    │       │   ├── Navbar.tsx         (97 lines)
    │       │   ├── EmptyState.tsx     (23 lines)
    │       │   └── MenuButton.tsx     (26 lines, UNUSED)
    │       ├── hooks/
    │       │   ├── useGoogleAuth.ts   (not a hook, plain functions)
    │       │   ├── useSaveTab.ts      (not a hook, plain function)
    │       │   └── useTheme.ts        (actual hook)
    │       ├── context/
    │       │   ├── ThemeContext.tsx
    │       │   └── ThemeProvider.tsx
    │       └── styles/
    │           ├── global.css         (133 lines, CSS vars + utilities)
    │           └── theme.ts           (3 lines: type + storage key)
    └── dist/                       ← Build output
```

---

## 🗄️ DATABASE SCHEMA (Dexie v6)

```typescript
// SavedTab — main entity
interface SavedTab {
  id?: number; // auto-increment
  url: string;
  title: string;
  favicon: string;
  domain: string;
  folderId?: number; // FK to Folder
  tags: string[];
  createdAt: number; // Date.now()
  notes: string;
  pinned: boolean;
  scheduledAt?: number; // Google Calendar integration
}

// Folder — groups tabs by domain OR custom "collection:"
interface Folder {
  id?: number;
  name: string;
  domain: string; // "collection:slug" for custom collections
  createdAt: number;
}

// StudyFolder + StudyTopic — schema defined but NEVER USED in UI
// StickyNote — was in v2-v3, deleted in v4

// Indexes: tabs by url, domain, folderId, createdAt, scheduledAt
//          folders by name, domain
```

**Key pattern**: Custom collections use `domain: "collection:slug-name"` convention to differentiate from auto-created domain-based folders.

---

## 🔑 KEY FEATURES (Current State)

| Feature              | Status     | Notes                                       |
| -------------------- | ---------- | ------------------------------------------- |
| Save current tab     | ✅ Working | Via + button, deduplicates by URL           |
| Save all tabs        | ✅ Working | Saves all window tabs, sequential (slow)    |
| Auto-group by domain | ✅ Working | Creates folders automatically               |
| Custom collections   | ✅ Working | Create named groups, add URLs               |
| Search (fuzzy)       | ✅ Working | Fuse.js, searches title/url/notes/tags      |
| Grid / List view     | ✅ Working | Toggle in Navbar                            |
| Pin tabs             | ✅ Working | Via context menu                            |
| Add notes            | ✅ Working | "Why did you open this tab?"                |
| Schedule to Calendar | ✅ Working | Google Calendar API + Drive backup          |
| Dark/Light theme     | ✅ Working | System preference + manual toggle           |
| Copy URL             | ✅ Working |                                             |
| Delete tab           | ✅ Working |                                             |
| Delete all           | ✅ Working | With confirmation                           |
| Edit Tags            | ❌ Stub    | onClick is empty `() => {}`                 |
| Sort                 | ❌ Stub    | Button renders but no handler               |
| History panel        | ❌ Empty   | Sidebar item exists, no content             |
| Settings panel       | ❌ Empty   | Sidebar item exists, no content             |
| Tags panel           | ❌ Empty   | Sidebar item exists, no content             |
| About panel          | ❌ Empty   | Sidebar item exists, no content             |
| Google Drive backup  | ⚠️ Partial | Happens on schedule only, no manual trigger |

---

## 🐛 IDENTIFIED ISSUES (35 Total)

### 🔴 Critical (4)

| #   | Issue                                                           | File                       | Line(s) |
| --- | --------------------------------------------------------------- | -------------------------- | ------- |
| C1  | CI/CD workflow is broken — duplicate YAML docs in one file      | `.github/workflows/ci.yml` | 1-82    |
| C2  | `window.db = db` exposes entire DB globally                     | `main.tsx`                 | 12      |
| C3  | OAuth2 client_id hardcoded (config system exists but not wired) | `tab-revo/manifest.json`   | 37      |
| C4  | Hour overflow bug: 23:00 → 24:00 (invalid time)                 | `TabMenu.tsx`              | 39      |

### 🟠 High (9)

| #   | Issue                                                             | File                                          |
| --- | ----------------------------------------------------------------- | --------------------------------------------- |
| H1  | App.tsx is 861-line God Component (11 useState hooks)             | `App.tsx`                                     |
| H2  | getDomain/getFavicon duplicated 3 times                           | `useSaveTab.ts`, `App.tsx` (×2)               |
| H3  | Tab-saving logic duplicated (saveCurrentTab vs handleSaveAllTabs) | `useSaveTab.ts`, `App.tsx`                    |
| H4  | Fuse.js instantiated per folder per render                        | `TabList.tsx:396-401`                         |
| H5  | Zero useMemo/useCallback in entire codebase                       | All files                                     |
| H6  | Full table scan `toArray()` called 3x independently               | `App.tsx`, `TabList.tsx`, `CalendarPanel.tsx` |
| H7  | Zero try/catch on 6+ DB operations                                | `App.tsx`, `TabMenu.tsx`                      |
| H8  | Zero unit tests (Jest passes with --passWithNoTests)              | `tests/`                                      |
| H9  | handleSaveAllTabs is O(n) sequential awaits, not batched          | `App.tsx:209-266`                             |

### 🟡 Medium (14)

| #   | Issue                                                                 | Summary                                           |
| --- | --------------------------------------------------------------------- | ------------------------------------------------- |
| M1  | 200+ inline style objects, no design system                           | All components                                    |
| M2  | MenuButton component never imported                                   | `MenuButton.tsx`                                  |
| M3  | StickyNote/StudyFolder/StudyTopic interfaces dead                     | `db.ts`                                           |
| M4  | generateAutoNote function never called                                | `db.ts:51`                                        |
| M5  | Sort button has no onClick                                            | `Navbar.tsx:66-75`                                |
| M6  | Edit Tags has empty handler                                           | `TabMenu.tsx:92`                                  |
| M7  | 4 sidebar panels (History/Settings/Tags/About) have no content        | `App.tsx`                                         |
| M8  | console.log left in production (12 instances)                         | `background.js`, `useSaveTab.ts`, `App.tsx`       |
| M9  | Google API responses not validated                                    | `useGoogleAuth.ts:47`                             |
| M10 | `.env.example` has VITE_AUTH_CLIENT_SECRET (leaks to frontend)        | `.env.example`                                    |
| M11 | Non-null assertions (`!`) used 12+ times                              | `TabMenu.tsx`, `TabList.tsx`, `CalendarPanel.tsx` |
| M12 | CalendarPanel fetches all tabs and filters client-side                | `CalendarPanel.tsx:17-19`                         |
| M13 | Direct DOM manipulation in React (style.background = ...)             | `CalendarPanel.tsx`, `TabMenu.tsx`                |
| M14 | config/ system (env.config.js, csp.json, manifest overlays) not wired | `config/`                                         |

### 🟢 Low (8)

| #   | Issue                                                          | Summary                    |
| --- | -------------------------------------------------------------- | -------------------------- |
| L1  | hooks/ files aren't React hooks (useGoogleAuth, useSaveTab)    | Naming                     |
| L2  | Props interface named generically                              | `TabMenu.tsx:18`           |
| L3  | CSS duplicate rules                                            | `global.css:90-92 = 96-98` |
| L4  | CSS `/* ADD THIS */` leftover comment                          | `global.css:100`           |
| L5  | Inconsistent event param naming (`e` vs `event`)               | Multiple files             |
| L6  | background.js is plain JS not TypeScript                       | `background.js`            |
| L7  | Two manifest.json files with version mismatch (1.0.1 vs 2.0.0) | Root vs tab-revo           |
| L8  | Import ordering messy in main.tsx                              | `main.tsx:12-15`           |

---

## ✅ FIX PLAN (Phases)

### Phase 1 — Critical Fixes

- [ ] Fix broken `ci.yml` (merge into single valid workflow)
- [ ] Remove `window.db = db` from `main.tsx`
- [ ] Fix hour overflow bug in `TabMenu.tsx:39`
- [ ] Add error checking to Google API responses

### Phase 2 — Architecture Refactor

- [ ] Split `App.tsx` into: `Sidebar`, `CollectionsList`, `CollectionDetail`, `CollectionCreateForm`, `MainContent`
- [ ] Create `utils/` directory: `getDomain`, `getFavicon`, `normalizeUrl`, `saveTab`
- [ ] Extract types into `types/index.ts`
- [ ] Rename `hooks/useSaveTab.ts` → `services/tabService.ts`
- [ ] Rename `hooks/useGoogleAuth.ts` → `services/googleAuthService.ts`

### Phase 3 — Code Quality

- [ ] Add `useMemo`/`useCallback` for filtered arrays and Fuse.js
- [ ] Replace inline styles with CSS classes/variables
- [ ] Remove dead code (MenuButton, StickyNote, StudyFolder, generateAutoNote)
- [ ] Remove/wrap `console.log` statements
- [ ] Implement empty handlers (Sort, Edit Tags) or remove UI
- [ ] Add rendering for History/Settings/Tags/About panels
- [ ] Convert `background.js` to TypeScript
- [ ] Add try/catch to all DB operations

### Phase 4 — Testing & Strictness

- [ ] Enable `strict: true` in tsconfig
- [ ] Add unit tests for services and db
- [ ] Add component tests
- [ ] Replace non-null assertions with proper null checks
- [ ] Fix CSS accessibility issues (focus outlines)

---

## 📝 DECISIONS LOG

| Date       | Decision                                  | Reason                                           |
| ---------- | ----------------------------------------- | ------------------------------------------------ |
| 2026-06-29 | Created `.memory/` system                 | Preserve context across sessions, gitignored     |
| 2026-06-29 | Completed full codebase audit (35 issues) | User requested deep analysis before feature work |

---

## 🔄 WORK IN PROGRESS

- **Current**: Completed code quality audit. Awaiting user decision on which fixes to start.
- **Next**: Phase 1 critical fixes recommended.

---

## 💡 IMPORTANT PATTERNS TO REMEMBER

1. **Collection prefix**: Custom collections use `domain: "collection:slug"` — filter with `domain.startsWith("collection:")`
2. **Dexie live queries**: Use `useLiveQuery(() => db.table.toArray())` — returns `undefined` while loading
3. **Theme system**: CSS class `html.dark` toggled by ThemeProvider, CSS vars in `:root` and `html.dark`
4. **Icons pattern**: Each sidebar icon has outline + solid variant, swaps on hover/active
5. **Side panel**: Extension opens as Chrome side panel (not popup), entry at `sidepanel.html`
6. **OAuth2**: Uses `chrome.identity.getAuthToken` for Google Calendar + Drive APIs
