# Privacy Policy

Updated September 13, 2026

Tab Revo stores saved tab URLs, titles, folders, tags, notes, schedules, saved-item history, and preferences in your local Chrome profile. These records may contain personal information you choose to save. Tab Revo has no application backend, advertising, analytics, or data-selling service.

## Optional data sharing

- **Gemini summaries:** when you request a summary or focused answer, the extension reads the selected page, cleans its content locally using Mozilla Readability, and sends extracted text and your question directly to Google Gemini. The page can contain personal information; request summaries only for content you want Google to process. Page and image URLs are not separately attached, and HTTP(S) links in article text are replaced. AI output can be inaccurate. Google's service terms, retention rules, and privacy policy apply.
- **API keys:** your Gemini key is held in Chrome session storage, limited to trusted extension contexts, and sent to Gemini for authentication. It is excluded from backups. Disconnect AI to remove it; session storage is cleared at browser-session end.
- **Google Drive backup:** connecting your account and enabling backup uploads saved records and selected preferences to the app-data folder of your Google Drive. Daily backup runs while Chrome is available. API keys and OAuth tokens are excluded. Restore downloads a selected backup and replaces local records; a local recovery copy of prior records is retained. Disconnecting stops future app backups but does not delete existing Drive copies.
- **Google Calendar:** selecting Calendar + email when scheduling sends the saved page title, URL, description, and event time to your primary Google Calendar. Google handles popup/email reminders. These events are independent of local schedules; changing or deleting a local reminder does not change the Google event.

Google services receive the network and account information needed to service these requests. See [Google's Privacy Policy](https://policies.google.com/privacy). OAuth authorization and tokens are handled through Chrome identity and Google.

## Permissions and reminders

`tabs` supports saving and locating pages; `storage` stores preferences; `sidePanel` displays the app; `favicon` accesses Chrome's favicon endpoint. `alarms` and `notifications` support local reminders. `identity` connects optional Google features. `activeTab` and `scripting` support page extraction and optional website banners.

Required host access covers Google API endpoints. Summarization asks for access to the selected website. Enabling website banners optionally requests access to HTTP(S) websites so reminders can appear on the visible page. Banner text is inserted into that page and can include saved titles, domains, URLs, and reminder times; only enable this feature if you want those details displayed there. Site permissions persist until revoked in Chrome settings. The extension does not continuously collect page content for tracking.

Native reminders may show saved titles and domains on your desktop or lock screen, subject to system settings. Chrome must be running; alarms can be delayed by sleep or browser shutdown. Chrome internal pages do not support injected banners.

## Your control and retention

Use the extension to delete saved records or clear extension data through Chrome. Uninstalling removes extension-local storage but not copies already uploaded to Google. Manage Calendar events in Google Calendar and app-data backups through Google Drive's connected-app settings. Disable daily backup or disconnect Google in Settings to stop future backups. Revoke Google access through your Google account; revoke website access through Chrome extension settings. Local data is retained until removed, subject to browser storage limits. Third-party retention follows the relevant Google service policies.

Tab Revo uses Google API information only to provide its user-facing features, in accordance with the Chrome Web Store User Data Policy and Google API Services User Data Policy, including their Limited Use requirements. Data is not sold, used for advertising, or sent to Tab Revo servers.

Tab Revo is not directed to children under 13. Policy changes will be reflected here with an updated date.

Contact: [Manish Rathaur / GitHub Issues](https://github.com/Rawdyrathaur/Tab_story/issues). Do not include API keys or private page content in public reports.
