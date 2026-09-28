# Chrome extension AI implementation progress

Status recorded against the supplied implementation spec. The existing dirty calendar and CSS edits are preserved.

| Task | Status | Commit | Notes |
| --- | --- | --- | --- |
| T0.1 Repo map | Complete | `22534e1` | `REPO_MAP.md` maps existing and planned modules. |
| T0.2 Baseline | Complete | Pending | Dependencies already installed. Build, ESLint, 23 unit tests and seven QA suites pass. Browser integration suite: 9 pass, 6 fail before AI implementation. The six failures concern collection and calendar scheduling UI; the current workspace has pre-existing edits to `CalendarPanel.tsx` and `global.css`. Chromium itself cannot launch inside the sandbox, so integration tests were rerun with browser access. |
| T1 Provider config and adapters | Pending | — | |
| T2 Planner, chunker, limiter | Pending | — | |
| T3 Errors, retries, cancel, lock | Pending | — | |
| T4 Permission flow | Pending | — | |
| T5 Group pipeline | Pending | — | Existing uncommitted five-page fix does not meet all T5 criteria yet. |
| T6 Entitlement service | Pending | — | |
| T7 Privacy and consent | Pending | — | |
| T8 Live verification | Pending | — | Requires opt-in provider keys; no keys have been read or requested. |
| T9–T20 UI and quota work | Pending | — | |
| T21–T23 Optional Phase 3 | Deferred | — | Spec says Phase 3 is optional and evidence-dependent. |

## Baseline detail

- `npm run build`: pass. Existing warnings: sidepanel bundle exceeds 500 kB and online manifest-schema validation is skipped because the schema host is unreachable.
- `npm run lint`: pass.
- `npm run test:unit`: 23 pass.
- `npm run test:qa`: seven suites pass.
- `npm run test:integration` outside sandbox: nine pass, six fail. Failures: two collection tests expect a scheduling dialog, one calendar scheduling test times out, and three workflow tests expect the removed “Schedule current tab +” button. These failures precede implementation of this spec.
