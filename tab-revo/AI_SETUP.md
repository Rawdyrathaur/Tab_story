# Page summarization

Tab Revo summarizes the currently active webpage using Mozilla Readability and the user's Gemini API key. The background worker captures the rendered DOM through Chrome scripting; it does not fetch an anonymous copy of the page. Readability parses a detached document in the side panel. Only the cleaned article text is included in AI prompts; page and image URLs remain local to the UI.

Articles up to 12,000 characters use one summary request. Longer articles use sequential chunk summaries followed by a combined summary, with additional reduction rounds if necessary. The maximum article size is 240,000 characters. Long articles cost multiple provider requests. Cancellation stops subsequent chunks. The model writes a normal Markdown summary, with no quote selection, retrieval index, exact-match validation, or citation gate.

The image is selected without AI: Open Graph first, then the largest dimensioned article image (or first article image when dimensions are absent). Images are capped at 200px in the narrow panel. Extracted HTML is never rendered as live markup.

Chrome Summarizer/Gemini Nano and algorithmic summarization fallbacks are removed. Quota and provider failures are reported without substituting a different kind of answer. The Gemini key is kept in Chrome session storage, restricted to trusted extension contexts, and is cleared when the browser session ends. No application backend is involved.

`@mozilla/readability` is bundled with the extension. The production bundle is verified with TypeScript, ESLint, and Vite.

Reference: https://github.com/mozilla/readability
