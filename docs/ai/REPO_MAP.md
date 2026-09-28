# Chrome extension AI repository map

Mapped on 28 September 2026 before product code changes for the AI implementation spec.

## Existing flow

| Responsibility | Existing file | Current behavior |
| --- | --- | --- |
| AI modal and tool actions | `tab-story/src/sidepanel/components/AIDiscussModal.tsx` | Premium and provider checks, optional host permission request, saved-page extraction, result UI. The five-page group change is present as an uncommitted workspace edit. |
| AI provider settings | `tab-story/src/sidepanel/components/AISettingsCard.tsx` | Provider choice, key entry, connect and disconnect. |
| AI entry points | `tab-story/src/sidepanel/components/TabList.tsx`, `tab-story/src/sidepanel/App.tsx` | Opens the modal with one saved tab or a group. |
| UI/background request bridge | `tab-story/src/ai/service.ts`, `tab-story/src/background.ts` | One-off `chrome.runtime.sendMessage` calls and error responses. No long-lived AI port. |
| Background AI handler | `tab-story/src/ai/background.ts` | Status, key verification, URL resolution, extraction, generation, cancellation. Single-flight lock is an in-memory map. |
| Provider calls | `tab-story/src/ai/background.ts`, `tab-story/src/ai/providers.ts` | Gemini and three OpenAI-compatible APIs. Some model IDs, limits, and endpoints are hard-coded. |
| Key storage | `tab-story/src/ai/background.ts` | API keys in `chrome.storage.session`; provider and model metadata in `chrome.storage.local`. |
| Entitlement | `tab-story/src/sidepanel/components/AIDiscussModal.tsx` | Reads `tabStory.proActive` or `tabStorySync.tier` from local storage. No shared capability service or remote verification. |
| Saved URL to browser tab | `tab-story/src/ai/background.ts` (`resolveTarget`) | Checks permission, reuses an open matching tab or opens an inactive one, waits for load, then returns its ID. Opened tabs are not tracked for cleanup. |
| DOM extraction | `tab-story/src/ai/background.ts` (`extract`) | Injects a script, waits for rendered main content, strips hidden and noisy elements, returns an HTML snapshot. |
| Readable text parsing | `tab-story/src/ai/service.ts` (`parseArticle`) | Mozilla Readability plus conversation and main-element fallbacks. |
| Chunking and condensation | `tab-story/src/ai/summary.ts` | Character-based chunks and sequential intermediate summaries. No provider-specific token planner. |
| Extension i18n | `tab-story/src/i18n/core.ts` and message catalogs in `tab-story/src/i18n/` | Custom `translate()` and React context; English, Hindi, Spanish, German, Arabic, Urdu. No `_locales` directory or `chrome.i18n` message catalog. |
| Design tokens and AI CSS | `tab-story/src/sidepanel/styles/global.css`, `tab-story/src/sidepanel/styles/theme.ts` | Theme CSS variables and `.pwa-ai-*` styles. |
| Build and tests | `tab-story/package.json`, `tab-story/vite.config.ts`, `tab-story/playwright.config.ts`, `tab-story/tests/` | Vite extension build, TypeScript, ESLint, Playwright unit and integration suites. |
| Manifest permissions | `tab-story/manifest.json` | Manifest V3; `scripting`, `tabs`, `storage`, optional HTTP(S) hosts, and existing provider API host permissions. |

## Target module map from spec section 3.1

| Target | Current home or planned location |
| --- | --- |
| `aiProviders.config` | New module in `tab-story/src/ai/`; migrate constants from `providers.ts` and `background.ts`. |
| `providerAdapters/*` | New modules under `tab-story/src/ai/`; current calls in `providers.ts` and `background.ts`. |
| `modelResolver` | New module; current Gemini discovery in `background.ts`. |
| `tokenEstimator` | New module; no existing estimator. |
| `budgetPlanner` | New module; current character limit in `summary.ts`. |
| `chunker` | Refactor or new module; current `splitArticle` in `summary.ts`. |
| `rateLimiter` | New module; limited Gemini retry wait in `background.ts`. |
| `aiRunner` | Refactor from `background.ts`, called through `background.ts` message bridge. |
| `errorMapper` | New module; current scattered error strings in `background.ts` and `providers.ts`. |
| `answerStore` | New module; no answer persistence today. |
| `entitlementService` | New module; current local check in `AIDiscussModal.tsx`. |
| `aiUi/*` | Refactor existing `AIDiscussModal.tsx` and `AISettingsCard.tsx`, with CSS in `global.css`. |

## Repository facts that affect the spec

- The extension uses React, TypeScript and Vite. `tab-story/` is the extension source tree inside the Git repository.
- `docs/ai/` is at the Git repository root, matching the supplied spec.
- The current i18n system is custom. Adding `_locales/en/messages.json` would create a second catalog unless integrated deliberately.
- The previous group fix is not in the checked-in commit. Other dirty files include `CalendarPanel.tsx` and `global.css`; they belong to existing workspace work and must be preserved.
- No new manifest permission is needed for the specified provider APIs or page access.
