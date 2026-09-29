# Localization and reminders

## Architecture

`src/i18n/core.ts` works in React and the worker. One preference, `tabStory.locale`, lives in chrome.storage.local. Saved preference wins, then supported browser locale, then English. English, Hindi, Spanish, German and Arabic are selectable. Add complete catalogs and a registry entry for more languages. Named keys support parameters, localized numbers and optional plural suffixes. User titles, notes and tags remain unchanged.

The provider reacts to storage changes and sets document language/direction. The selector uses the existing Radix popover. Intl formats dates and times; week start follows the locale. Gregorian arithmetic is used consistently with HTML date inputs, including Arabic locales.

`src/reminders/service.ts` sends commands to the worker; `engine.ts` serializes operations. Dexie scheduledAt remains authoritative. Schema v8 preserves old schedules and adds durable missed-summary state. Optional completion and delivery fields distinguish completed, upcoming, due and overdue tasks.

ScheduleEditor is shared by Calendar and TabMenu. Times use the browser's local time zone when created, then remain fixed epoch timestamps. Invalid dates, past times and DST gaps are rejected. Ambiguous autumn times select the earlier occurrence.

Alarm names are deterministic. Notification IDs contain tab ID and schedule timestamp; actions revalidate the record. Firing never opens tabs automatically. Click opens the URL; the second action snoozes ten minutes. Calendar also provides snooze, completion, rescheduling and clearing.

Initialization, Chrome startup and a one-minute recovery alarm restore future alarms, clean stale entries, and reconcile overdue reminders. Multiple missed schedules become one summary; tasks remain overdue until completed or cleared. API failures leave persisted schedules retryable. Import validates records and remaps folder IDs; deletion and reset reconcile alarms. Optional Google sync failures are reported after the local reminder is saved.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:integration`, and `npm run test:qa` from this directory.

Unit tests exercise production date/localization/reminder functions with mocked Chrome and table methods: replacement, cancellation, completion, stale/deleted records, snooze, localized notifications, recovery, grouping, permissions and API failures. Browser tests use real Chromium extension profiles, IndexedDB, storage, alarms and notifications, including profile restart and worker stop/restart. Screenshots cover narrow German/Arabic layouts.

## Limits and release checks

- Chrome/OS settings and Do Not Disturb may suppress banners even when the API accepts them. Native buttons differ by OS; action handlers are tested, but physical OS button clicks are not automated.
- Chrome cannot deliver while fully closed. Recovery runs after launch; delivery is not a hard real-time guarantee.
- OS notification creation and DB acknowledgment cannot be atomic. Deterministic IDs limit duplicate active notifications, but a crash between those steps can redisplay a reminder.
- Google OAuth needs an authorized account and matching extension configuration. Tests do not sign into user accounts or create external events. This is not bidirectional calendar sync.
- Five languages are included; translations should receive native-speaker review before distribution.

Reload the built `dist` directory at `chrome://extensions`. New manifest access covers alarms, notifications and the Google API host for optional sync.

References: [Chrome alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms), [Chrome notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications).
