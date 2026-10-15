# Interface language and direction

Desktop uses i18next and react-i18next. General → General exposes the interface language and layout direction. The twelve supported language values and locale codes match the plugin's interface language registry. Labels use native language names. The selection is a device setting, shared between localhost browser clients and Electron through the existing Zustand store, SQLite repository and revisioned SSE notifications.

`general.language` is independent of Claude's response language. `general.direction` accepts `auto`, `ltr` or `rtl`; automatic direction uses RTL for Arabic and Persian and LTR otherwise. The document's `lang` and `dir` reflect the selected settings. Navigation, interactive hover sidebars and sidebar resizing follow direction. Shortcuts retain isolated LTR ordering. Dates and times use the current interface locale.

## Importing plugin counterparts

The Node backend requests global plugin settings through the existing read-only `GET_SETTINGS` operation only when a desktop field is missing. It imports `uiLanguage` into `general.language` and `uiDirection` into `general.direction`.

Migration checks each field in the persisted desktop record before merging defaults. A missing or null field is eligible; an existing desktop value always wins, including an explicit value equal to the default. Unknown plugin values use validated desktop defaults. The first browser initialization can still import existing browser clock/sidebar settings. For existing desktop records, newly introduced fields are filled transactionally without resetting other groups. Subsequent launches skip the plugin read once all counterparts are stored.

To add a future counterpart, add its type, default and validator to `device-settings`, then register the field and plugin source key in `plugin-settings-migration.mjs`. Preserve this per-field presence rule. Do not use a record's overall revision as a migration marker or continuously import plugin preference changes into desktop values.

## Translation resources

Settings strings live in `src/locales/interface/<locale>.json`; shell strings live in `src/locales/shell/<locale>.json`. The compatibility Korean export remains available for non-renderer navigation consumers. React items consume `useSettingsCopy()` or the shell translation hook directly. These hooks delegate subscription and resolution to react-i18next. Never put translated labels in persisted identifiers or mutate user-provided titles, paths, CLI output or error details.

English is the fallback locale. Every settings catalog has complete key coverage; less common shell messages can fall back to English while their translations are extended. Plugin chat/settings pages continue to consume their existing backend preferences. Desktop updates these preferences through the existing API rather than injecting host-only overrides. Existing project-scoped overrides retain the precedence defined by the plugin.

Tests cover language registry parity, direction resolution, partial and null-field migration, independent edits, reopening, catalog coverage and i18next language notifications. Browser verification exercises selection, RTL placement and resizing, and persistence. Native Electron verification checks shell synchronization and plugin-rendered chat UI updates.

## Propagating explicit desktop edits

After committing an explicit desktop edit, the desktop backend uses the same plugin protocol as its webview: `SAVE_SETTINGS` with `key`, `value` and `scope: 'global'`. Language edits send `uiLanguage` and then the resolved `uiDirection`; direction-only edits send `uiDirection`. Desktop `auto` is resolved to `ltr`/`rtl` before sending, since the plugin accepts those concrete values. Browser initialization and plugin-to-desktop migration do not propagate, and unrelated settings never issue these writes. Claude response language is a separate model setting and is not changed by an interface-language edit.

The plugin owns validation, file selection, scoped persistence and `SETTINGS_CHANGED` notifications. Its code and storage format are unchanged. Other plugin clients can observe the resulting global preferences; exiting desktop does not restore earlier values. Plugin edits do not flow back into an already initialized desktop field.

Requests are serialized within the desktop service and resolve values from current desktop state when executed. A plugin failure returns a successful desktop save with `propagation.status: 'failed'` and per-key errors. The UI retains the saved desktop value and offers a persistent retry notice. Retry submits the current interface settings rather than replaying an obsolete selection. Successful propagation clears that notice. There is no silent rollback or automatic startup overwrite of plugin preferences.
