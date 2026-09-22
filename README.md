# Tab Story

A Chrome side-panel extension for saving tabs, organizing resources, and scheduling reminders.

- Save tabs into domain folders; search, tag, pin, and add notes.
- Review saved-tab history and restore deleted items.
- Schedule local reminders with desktop alerts and optional website banners.
- Summarize a selected page with Mozilla Readability and your own Gemini API key.
- Optionally back up to Google Drive or create Google Calendar events with email reminders.
- Cross-device sync uses a Tab Story account created with Google sign-in; the sync server URL is supplied at build time, never pasted by users.

Production builds must use an HTTPS sync URL (`VITE_SYNC_SERVER_URL`); plain HTTP is accepted only for local `localhost` development.

## Run locally

Requires Node.js 22.12+ and Chrome 120+.

```sh
npm ci --prefix tab-story --ignore-scripts
npm run build
```

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `tab-story/dist`. Reload after rebuilding.

For a production extension build, provide the deployed HTTPS sync API at build time, for example `VITE_SYNC_SERVER_URL=https://sync.example.com npm run build`. The extension then shows **Continue with Google**; users never paste an API URL or setup secret.

## Important limits

Local reminders need Chrome running and OS notifications enabled. Website banners require site permission and cannot appear on Chrome internal pages. Gemini needs internet, an API key, and available quota; it is not Chrome's built-in local AI.

Google features require a Chrome-extension OAuth client configured for the installed extension ID, enabled Calendar/Drive APIs, and any verification Google requires. Calendar events are separate from local reminders: edit or cancel them in Google Calendar.

Data is local by default. Requested AI summaries send extracted text and your question to Google; enabled backups and Calendar events upload their associated data. See the [privacy policy](PRIVACY.md).

[Chrome Web Store](https://chromewebstore.google.com/detail/tab-story/nhjglpjgddjcjafdabmepgalnaejnleb) · [Report a bug or request a feature](https://github.com/Rawdyrathaur/Tab_story/issues/new) · [MIT license](LICENSE)

By [Manish Rathaur](https://github.com/Rawdyrathaur).
