# Chrome extension AI implementation decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 28 Sep 2026 | Place AI documentation in the Git repository's root `docs/ai/` directory. | The supplied spec explicitly names these paths; the extension source itself is under `tab-story/`. |
| 28 Sep 2026 | Preserve the existing custom i18n catalog while integrating AI copy. | The extension already supports six languages through `src/i18n/core.ts`; a separate Chrome `_locales` catalog would duplicate UI translations unless there is a concrete integration need. |
| 28 Sep 2026 | Treat calendar and collection integration failures as baseline failures. | They reproduce before AI spec changes and coincide with existing workspace edits in the scheduling UI. The AI implementation must not overwrite those edits. |
| 28 Sep 2026 | Keep Phase 3 flags off by default. | The spec makes auto-fallback, streaming, and telemetry optional and dependent on live evidence or consent. |
